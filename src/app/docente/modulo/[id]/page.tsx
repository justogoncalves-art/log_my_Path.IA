import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { MODULE_IMAGES } from "@/components/module-tile";
import { getMe, getMyModules } from "@/lib/dal";
import { getDict } from "@/lib/i18n";
import { InterestButton } from "./interest-button";

// Ficha de un módulo que la organización todavía no contrató: qué es y "Quiero saber más".
export default async function ModuleInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, { t, lang }] = await Promise.all([getMe(), getDict()]);
  if (me.role === "alumno" || !me.organizationId) redirect("/");
  const mod = (await getMyModules(me.organizationId)).find((m) => m.id === id);
  if (!mod) notFound();
  if (mod.active) redirect(`/m/${id}`);
  const img = MODULE_IMAGES[id] ?? MODULE_IMAGES.edfin;
  const en = lang === "en";

  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <main className="mx-auto w-full max-w-[1600px] px-5 pb-24 pt-8 md:px-10">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← {t.home}
        </Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="relative h-[320px] overflow-hidden rounded-2xl lg:h-[460px]">
            <Image src={img.src} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" style={{ objectPosition: img.pos }} />
            <div className="absolute inset-0 bg-gradient-to-t from-opulent/70 to-transparent" />
          </div>
          <div>
            <p className="eyebrow">{en ? "Not included in your plan yet" : "Todavía no está en tu plan"}</p>
            <h1 className="mt-3 font-display text-4xl font-bold md:text-5xl">{mod.name}</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">{en ? mod.summaryEn : mod.summaryEs}</p>
            <ul className="mt-6 flex max-w-xl flex-col gap-2 text-sm">
              {(en
                ? ["Works with the classes and students you already have", "Reports and statistics for teachers", "Same account, nothing new to install"]
                : ["Funciona con las clases y los alumnos que ya tenés", "Reportes y estadísticas para el docente", "La misma cuenta, nada nuevo que instalar"]
              ).map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="text-celeste" aria-hidden>✓</span>
                  {x}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <InterestButton moduleId={mod.id} lang={lang} />
              {mod.infoUrl ? (
                <a href={mod.infoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-opulent hover:underline">
                  {en ? "Visit the website" : "Ver el sitio"} ↗
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
