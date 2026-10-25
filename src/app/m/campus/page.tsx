import Image from "next/image";
import Link from "next/link";
import { countryStats, hollandCode, myRiasec } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText, RIASEC_NAMES } from "@/lib/i18n-campus";
import { requireModule } from "@/lib/module-access";
import { CampusShell } from "./shell";

export default async function CampusHome() {
  const [{ me }, { t, lang }] = await Promise.all([requireModule("campus"), getDict()]);
  const c = campusText(lang);
  const [stats, riasec] = await Promise.all([countryStats(), myRiasec()]);
  const totals = stats.reduce((a, s) => ({ u: a.u + s.universities, p: a.p + s.programs }), { u: 0, p: 0 });
  const code = hollandCode(riasec);

  const cards = [
    { href: "/m/campus/afinidad", title: c.cardAffinityTitle, body: code ? `${c.yourCode}: ${code}` : c.cardAffinityBody, n: "01" },
    { href: "/m/campus/carreras", title: c.cardProgramsTitle, body: c.cardProgramsBody, n: "02" },
    { href: "/m/campus/universidades", title: c.cardUnisTitle, body: c.cardUnisBody, n: "03" },
    { href: "/m/campus/comparar", title: c.cardCompareTitle, body: c.cardCompareBody, n: "04" },
  ];

  return (
    <CampusShell me={me} t={t} lang={lang} section="home">
      <section className="relative overflow-hidden rounded-2xl">
        <Image src="/img/imagen-my-unni.jpg" alt="" fill priority sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" style={{ objectPosition: "center 60%" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-opulent via-opulent/70 to-opulent/20" />
        <div className="relative flex min-h-[320px] flex-col justify-end p-7 text-white md:p-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-celeste">{c.module}</span>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold md:text-5xl">{c.heroTitle}</h1>
          <p className="mt-3 max-w-2xl text-white/85">{c.heroLead}</p>
          {totals.u ? <p className="mt-4 font-mono text-xs text-white/70">{c.catalog(totals.u, totals.p, stats.length)}</p> : null}
        </div>
      </section>

      {code ? (
        <p className="mt-6 text-sm text-muted">
          {c.yourCode}: <strong className="font-display text-ink">{code}</strong> ·{" "}
          {code
            .split("")
            .map((l) => RIASEC_NAMES[lang][l])
            .join(" · ")}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((k) => (
          <Link
            key={k.href}
            href={k.href}
            className="group flex min-h-[160px] flex-col justify-between rounded-2xl border border-line bg-surface p-6 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-celeste"
          >
            <span className="font-display text-xl font-bold text-celeste">{k.n}</span>
            <div>
              <h2 className="font-display text-xl font-semibold">{k.title}</h2>
              <p className="mt-1 text-sm text-muted">{k.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </CampusShell>
  );
}
