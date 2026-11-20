import Link from "next/link";
import { z } from "zod";
import { AltaStep } from "./alta-step";
import { ClassesStep, ModulesStep, OrgStep, ProgramsStep, StepNav } from "./steps";
import { CampaignList, WelcomeForm } from "../[id]/mails/welcome";
import { getOrg, listCampaigns, listPrograms, listResellers, orgClasses, orgModules, orgSummary } from "@/lib/admin-data";
import { isCountryCode } from "@/lib/countries";
import { programName } from "@/lib/program-names";

const STEPS = ["Organización", "Personas", "Clases", "Módulos y licencias", "Programas", "Mail de bienvenida", "Revisión"];

// Asistente de alta: cada paso guarda en la base, así se puede cortar y retomar (?org=…&paso=…)
export default async function NewOrgWizard({ searchParams }: { searchParams: Promise<{ org?: string; paso?: string }> }) {
  const sp = await searchParams;
  const orgId = z.uuid().safeParse(sp.org).success ? sp.org! : null;
  const org = orgId ? await getOrg(orgId) : null;
  const step = org ? Math.min(Math.max(Number(sp.paso) || 1, 1), STEPS.length) : 1;
  const href = (n: number) => (org ? `/admin/organizaciones/nueva?org=${org.id}&paso=${n}` : "/admin/organizaciones/nueva");

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <Link href="/admin/organizaciones" className="text-sm text-muted hover:text-ink">
        ← Organizaciones
      </Link>
      <p className="eyebrow mt-4">Alta paso a paso</p>
      <h1 className="mt-2 font-display text-3xl font-bold">{org ? org.name : "Nueva organización"}</h1>

      <ol className="mt-6 grid gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const current = n === step;
          const reachable = !!org || n === 1;
          const inner = (
            <span
              className={`flex h-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${
                current ? "border-opulent bg-opulent text-white" : n < step ? "border-celeste/50 bg-celeste/10" : "border-line bg-surface text-muted"
              }`}
            >
              <span className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${current ? "bg-white text-opulent" : "bg-line text-ink"}`}>
                {n < step ? "✓" : n}
              </span>
              <span className="font-display font-medium leading-tight">{label}</span>
            </span>
          );
          return <li key={label}>{reachable && !current ? <Link href={href(n)}>{inner}</Link> : inner}</li>;
        })}
      </ol>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-6 md:p-8">
        <Step step={step} org={org} />
      </section>
    </div>
  );
}

async function Step({ step, org }: { step: number; org: Awaited<ReturnType<typeof getOrg>> }) {
  if (step === 1 || !org) {
    const resellers = await listResellers();
    return <OrgStep resellers={resellers} org={org ?? undefined} />;
  }
  const id = org.id;

  if (step === 2) {
    const summary = await orgSummary(id);
    return (
      <>
        <StepHeader title="Personas" text="Subí el Excel del colegio. Primero ves cómo queda cada fila y después confirmás; si hay un error no se guarda nada." />
        <p className="mt-4 text-sm">
          Hoy hay <strong>{summary.people}</strong> personas cargadas
          {summary.people ? ` (${Object.entries(summary.byRole).map(([r, n]) => `${n} ${r}`).join(", ")})` : ""}.
        </p>
        <AltaStep org={{ id: org.id, name: org.name, country: org.country }} />
        <StepNav org={id} step={step} canNext={summary.people > 0} nextHint="Cargá al menos una persona para seguir." />
      </>
    );
  }

  if (step === 3) {
    const classes = await orgClasses(id);
    return (
      <>
        <StepHeader title="Clases" text="Confirmá el nivel y el año de cada clase que vino en el Excel. Se usan para elegir los programas y para habilitar Campus (desde 5º de secundaria)." />
        <ClassesStep org={id} classes={classes.map((c) => ({ id: c.id, name: c.name, level: c.level, grade: c.grade, students: c.students }))} />
      </>
    );
  }

  if (step === 4) {
    const [modules, classes] = await Promise.all([orgModules(id), orgClasses(id)]);
    const students = classes.reduce((a, c) => a + c.students, 0);
    return (
      <>
        <StepHeader title="Módulos y licencias" text="Elegí qué módulos contrató, desde y hasta cuándo, y cuántos cupos. Los módulos elegidos se habilitan en todas las clases." />
        <ModulesStep
          org={id}
          students={students}
          classIds={classes.map((c) => c.id)}
          minGrade={Math.min(...classes.map((c) => c.grade ?? 99))}
          modules={modules.map((m) => ({ id: m.id, name: m.name, contract: m.contract }))}
          today={isoDate(0)}
          inAYear={isoDate(1)}
        />
      </>
    );
  }

  if (step === 5) {
    const [classes, programs, modules] = await Promise.all([orgClasses(id), listPrograms(), orgModules(id)]);
    const active = modules.filter((m) => m.contract?.active).map((m) => ({ id: m.id, name: m.name }));
    return (
      <>
        <StepHeader title="Programas" text="Elegí los programas de cada clase. Se sugiere el idioma según el país del colegio." />
        <ProgramsStep
          org={id}
          country={org.country}
          modules={active}
          classes={classes.map((c) => ({ id: c.id, name: c.name, level: c.level, grade: c.grade, programs: c.programs.map((p) => p.id) }))}
          programs={programs.map((p) => ({ ...p, label: programName(p.title, p.language) }))}
        />
      </>
    );
  }

  if (step === 6) {
    const [campaigns, classes] = await Promise.all([listCampaigns(id), orgClasses(id)]);
    return (
      <>
        <StepHeader title="Mail de bienvenida" text="Programá el mail con el usuario y la contraseña inicial. Podés dejarlo para después y hacerlo desde la ficha de la organización." />
        <div className="mt-4">
          <CampaignList campaigns={campaigns} classNames={Object.fromEntries(classes.map((c) => [c.id, c.name]))} />
        </div>
        <div className="mt-6 border-t border-line pt-6">
          <WelcomeForm orgId={id} classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
        <StepNav org={id} step={step} canNext nextLabel={campaigns.length ? "Siguiente" : "Seguir sin programar"} />
      </>
    );
  }

  // Revisión final
  const [summary, classes, modules] = await Promise.all([orgSummary(id), orgClasses(id), orgModules(id)]);
  const active = modules.filter((m) => m.contract?.active);
  const students = summary.byRole.alumno ?? 0;
  type Check = { ok: boolean; warn?: boolean; text: string; step: number };
  const checks: Check[] = [
    { ok: isCountryCode(org.country), text: `País: ${org.country}`, step: 1 },
    { ok: summary.people > 0, text: `${summary.people} personas (${Object.entries(summary.byRole).map(([r, n]) => `${n} ${r}`).join(", ") || "ninguna"})`, step: 2 },
    { ok: summary.studentsWithoutClass === 0, text: summary.studentsWithoutClass ? `${summary.studentsWithoutClass} alumnos sin clase` : "Todos los alumnos tienen clase", step: 2 },
    {
      ok: summary.minorsWithoutConsent === 0,
      warn: true,
      text: summary.minorsWithoutConsent ? `${summary.minorsWithoutConsent} alumnos menores sin consentimiento del tutor` : "Consentimiento del tutor de todos los menores",
      step: 2,
    },
    { ok: classes.length > 0 && classes.every((c) => c.level && c.grade), text: `${classes.length} clases con nivel y año`, step: 3 },
    { ok: active.length > 0, text: active.length ? `Módulos: ${active.map((m) => m.name).join(", ")}` : "Ningún módulo activo", step: 4 },
    ...active.map((m) => ({
      ok: !!m.contract?.starts_at && !!m.contract?.ends_at && (m.contract?.seats ?? 0) >= students,
      warn: (m.contract?.seats ?? 0) < students,
      text: `${m.name}: ${m.contract?.starts_at ?? "?"} a ${m.contract?.ends_at ?? "?"} · ${m.contract?.seats ?? 0} cupos para ${students} alumnos`,
      step: 4,
    })),
    ...classes.map((c) => ({ ok: c.programs.length > 0, text: `${c.name}: ${c.programs.length ? c.programs.map((p) => programName(p.title, p.language)).join(", ") : "sin programas"}`, step: 5 })),
    { ok: summary.campaigns > 0, warn: true, text: summary.campaigns ? "Mail de bienvenida programado" : "Mail de bienvenida sin programar", step: 6 },
  ];
  const blocking = checks.filter((c) => !c.ok && !c.warn).length;

  return (
    <>
      <StepHeader title="Revisión" text="Controlá que esté todo antes de terminar. Los avisos en amarillo no impiden finalizar." />
      <ul className="mt-6 flex flex-col gap-2">
        {checks.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm">
            <span className="flex items-center gap-3">
              <span
                className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  c.ok ? "bg-ok/15 text-ok" : c.warn ? "bg-[#f5e3c0] text-[#7a5310]" : "bg-danger/10 text-danger"
                }`}
              >
                {c.ok ? "✓" : "!"}
              </span>
              {c.text}
            </span>
            {!c.ok ? (
              <Link href={`/admin/organizaciones/nueva?org=${id}&paso=${c.step}`} className="shrink-0 text-opulent hover:underline">
                Corregir
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/organizaciones/nueva?org=${id}&paso=6`} className="text-sm text-muted hover:text-ink">
          ← Anterior
        </Link>
        {blocking ? (
          <span className="text-sm text-danger">Faltan {blocking} puntos obligatorios.</span>
        ) : (
          <Link href={`/admin/organizaciones/${id}`} className="rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white">
            Finalizar alta →
          </Link>
        )}
      </div>
    </>
  );
}

// Hoy o dentro de N años, en formato AAAA-MM-DD
function isoDate(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function StepHeader({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="mt-1 max-w-3xl text-muted">{text}</p>
    </div>
  );
}
