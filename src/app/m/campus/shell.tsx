import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import type { Dict, Lang } from "@/lib/i18n";
import { campusText } from "@/lib/i18n-campus";
import type { Me } from "@/lib/dal";
import { CompareBar } from "./compare";

export type CampusSection = "home" | "afinidad" | "carreras" | "universidades" | "comparar";

// Marco común de My Campus.IA: encabezado, menú de secciones y barra de comparación
export function CampusShell({ me, t, lang, section, children }: { me: Me; t: Dict; lang: Lang; section: CampusSection; children: React.ReactNode }) {
  const c = campusText(lang);
  const tabs: [CampusSection, string, string][] = [
    ["home", c.home, "/m/campus"],
    ["afinidad", c.affinity, "/m/campus/afinidad"],
    ["carreras", c.programs, "/m/campus/carreras"],
    ["universidades", c.universities, "/m/campus/universidades"],
    ["comparar", c.compare, "/m/campus/comparar"],
  ];
  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <nav aria-label={c.module} className="border-b border-line bg-surface">
        <ul className="mx-auto flex w-full max-w-[1600px] gap-1 overflow-x-auto px-5 md:px-10">
          {tabs.map(([key, label, href]) => (
            <li key={key}>
              <Link
                href={href}
                aria-current={section === key ? "page" : undefined}
                className={`block whitespace-nowrap border-b-2 px-3 py-3.5 font-display text-sm font-medium transition-colors ${
                  section === key ? "border-opulent text-opulent" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto w-full max-w-[1600px] px-5 md:px-10 pb-28 pt-8">{children}</main>
      <CompareBar lang={lang} hidden={section === "comparar"} />
    </div>
  );
}
