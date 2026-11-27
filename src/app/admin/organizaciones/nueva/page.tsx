import Link from "next/link";
import { z } from "zod";
import { AltaStep } from "./alta-step";
import { ClassesStep, ModulesStep, OrgStep, ProgramsStep, StepNav } from "./steps";
import { CampaignList, WelcomeForm } from "../[id]/mails/welcome";
import { getOrg, listCampaigns, listPrograms, listResellers, orgClasses, orgModules, orgSummary } from "@/lib/admin-data";
import { isCountryCode } from "@/lib/countries";
import { programName } from "@/lib/program-names";
import { NavIcon } from "../../nav";
import { PageHeader } from "../../page-header";

const STEPS = ["Organización", "Personas", "Clases", "Módulos y licencias", "Programas", "Mail de bienvenida", "Revisión"];
const ICONS = ["orgs", "personas", "clases", "resumen", "programas", "mail", "revisar"];
const HINTS = ["Nombre, tipo y país", "Excel del colegio", "Nivel y año", "Fechas y cupos", "Por clase", "Usuario y contraseña", "Antes de terminar"];

// Asistente de alta: cada paso guarda en la base, así se puede cortar y retomar (?org=…&paso=…)
export default async function NewOrgWizard({ searchParams }: { searchParams: Promise<{ org?: string; paso?: string }> }) {
  const sp = await searchParams;
  const orgId = z.uuid().safeParse(sp.org).success ? sp.org! : null;
  const org = orgId ? await getOrg(orgId) : null;
  const step = org ? Math.min(Math.max(Number(sp.paso) || 1, 1), STEPS.length) : 1;
  const href = (n: number) => (org ? `/admin/organizaciones/nueva?org=${org.id}&paso=${n}` : "/admin/organizaciones/nueva");

  const pct = Math.round(((step - 1) / (STEPS.length - 1)) * 100);
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <Link href="/admin/organizaciones" className="text-sm text-muted hover:text-ink">
        ← Organizaciones
      </Link>
      <div className="mt-3">
        <PageHeader icon="orgs" eyebrow="Alta paso a paso" title={org ? org.name : "Nueva organización"} lead="Cada paso se guarda solo: podés cortar y retomar cuando quieras." />
      </div>

      {/* Avance general */}
      <div className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-display font-semibold">
            Paso {step} de {STEPS.length} · {STEPS[step - 1]}
          </span>
          <span className="tabular-nums text-muted">{pct} %</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-gradient-to-r from-celeste to-opulent transition-[width] duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Pasos */}
        <ol className="flex gap-2 overflow-x-auto xl:sticky xl:top-6 xl:h-fit xl:flex-col xl:gap-0 xl:overflow-visible">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const current = n === step;
            const done = n < step;
            const reachable = !!org || n === 1;
            const inner = (
              <span
                className={`group relative flex min-w-44 items-center gap-3 rounded-xl px-3 py-3 transition-colors xl:min-w-0 ${
                  current ? "bg-opulent text-white shadow-sm" : reachable ? "hover:bg-surface" : "opacity-50"
                }`}
              >
                <span
                  className={`relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 [&>svg]:size-4 ${
                    current ? "border-white bg-white text-opulent" : done ? "border-ok bg-ok text-white" : "border-line bg-surface text-muted"
                  }`}
                >
                  {done ? "✓" : <NavIcon name={ICONS[i]} />}
                </span>
                <span className="min-w-0">
                  <span className={`block font-mono text-[10px] uppercase tracking-[0.15em] ${current ? "text-white/70" : "text-muted"}`}>Paso {n}</span>
                  <span className="block font-display text-sm font-semibold leading-tight">{label}</span>
                  <span className={`hidden text-xs xl:block ${current ? "text-white/75" : "text-muted"}`}>{HINTS[i]}</span>
                </span>
              </span>
            );
            return (
              <li key={label} className="relative shrink-0 xl:pb-1">
                {/* Línea que une los pasos (escritorio) */}
                {n < STEPS.length ? <span className={`absolute left-[29px] top-12 hidden h-[calc(100%-36px)] w-0.5 xl:block ${done ? "bg-ok" : "bg-line"}`} aria-hidden /> : null}
                {reachable && !current ? <Link href={href(n)}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ol>

        <section className="rounded-2xl border border-line bg-surface p-6 md:p-8">
          <Step step={step} org={org} />
        </section>
      </div>
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
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { n: checks.filter((c) => c.ok).length, label: "Listos", cls: "bg-ok/10 text-ok" },
          { n: checks.filter((c) => !c.ok && c.warn).length, label: "Avisos", cls: "bg-[#f5e3c0]/60 text-[#7a5310]" },
          { n: blocking, label: "Obligatorios pendientes", cls: blocking ? "bg-danger/10 text-danger" : "bg-oat/60 text-muted" },
        ].map((b) => (
          <div key={b.label} className={`rounded-xl px-4 py-3 ${b.cls}`}>
            <p className="font-display text-3xl font-bold tabular-nums">{b.n}</p>
            <p className="text-xs font-semibold uppercase tracking-wide">{b.label}</p>
          </div>
        ))}
      </div>
      <ul className="mt-6 flex flex-col gap-2">
        {checks.map((c, i) => (
          <li
            key={i}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              c.ok ? "border-line" : c.warn ? "border-[#c98a1b]/40 bg-[#f5e3c0]/25" : "border-danger/30 bg-danger/5"
            }`}
          >
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
          <Link href={`/admin/organizaciones/${id}/personas`} className="rounded-lg bg-ok px-6 py-3 font-display text-sm font-semibold text-white shadow-sm hover:bg-ok/90">
            ✓ Finalizar alta
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
