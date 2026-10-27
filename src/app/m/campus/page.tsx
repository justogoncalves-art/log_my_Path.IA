import Image from "next/image";
import Link from "next/link";
import { countryStats, hollandCode, homeCountry, myRiasec } from "@/lib/campus";
import { getDict } from "@/lib/i18n";
import { campusText, RIASEC_NAMES } from "@/lib/i18n-campus";
import { requireModule } from "@/lib/module-access";
import { CampusShell } from "./shell";

// Inicio de My Campus.IA: mosaico de accesos con foto, de distintos tamaños
export default async function CampusHome() {
  const [{ me }, { t, lang }] = await Promise.all([requireModule("campus"), getDict()]);
  const c = campusText(lang);
  const [stats, riasec, home] = await Promise.all([countryStats(), myRiasec(), homeCountry(me.organizationId)]);
  const totals = stats.reduce((a, s) => ({ u: a.u + s.universities, p: a.p + s.programs }), { u: 0, p: 0 });
  const code = hollandCode(riasec);
  const homeName = home ? (new Intl.DisplayNames([lang], { type: "region" }).of(home) ?? home) : null;
  const hasHome = !!home && stats.some((s) => s.country_code === home);

  type Tile = { href: string; title: string; body: string; img: string; span: string; tag?: string; big?: boolean };
  const tiles: Tile[] = [
    {
      href: "/m/campus/afinidad",
      title: c.cardAffinityTitle,
      body: code ? `${c.yourCode}: ${code} · ${code.split("").map((l) => RIASEC_NAMES[lang][l]).join(" · ")}` : c.cardAffinityBody,
      img: "/img/campus/students.jpg",
      span: "md:col-span-2 md:row-span-2",
      tag: "Mento.IA",
      big: true,
    },
    { href: "/m/campus/carreras", title: c.cardProgramsTitle, body: c.cardProgramsBody, img: "/img/campus/uni-09.jpg", span: "md:col-span-2" },
    { href: "/m/campus/comparar", title: c.cardCompareTitle, body: c.cardCompareBody, img: "/img/campus/uni-07.jpg", span: "" },
    { href: "/m/campus/universidades", title: c.cardUnisTitle, body: c.cardUnisBody, img: "/img/campus/uni-03.jpg", span: "" },
    { href: "/m/campus/universidades?qs=100&pais=todos", title: c.tileTop, body: c.tileTopBody, img: "/img/campus/uni-05.jpg", span: "md:col-span-2" },
    ...(hasHome
      ? [{ href: `/m/campus/universidades?pais=${home}`, title: c.tileHome(homeName!), body: c.tileHomeBody, img: "/img/campus/study-group.jpg", span: "" }]
      : []),
    { href: "/m/campus/carreras?modalidad=hibrida", title: c.tileHybrid, body: c.tileHybridBody, img: "/img/campus/uni-08.jpg", span: hasHome ? "" : "md:col-span-2" },
  ];

  return (
    <CampusShell me={me} t={t} lang={lang} section="home">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{c.module}</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-5xl">{c.heroTitle}</h1>
          <p className="mt-3 max-w-2xl text-muted">{c.mosaicLead}</p>
        </div>
        {totals.u ? <p className="font-mono text-xs text-muted">{c.catalog(totals.u, totals.p, stats.length)}</p> : null}
      </div>

      <div className="mt-8 grid grid-flow-dense auto-rows-[220px] grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[210px] xl:auto-rows-[240px]">
        {tiles.map((k, i) => (
          <Link
            key={k.href}
            href={k.href}
            className={`group relative overflow-hidden rounded-2xl ${k.span} mp-fade-up`}
            style={{ animationDelay: `${0.04 + i * 0.05}s` }}
          >
            <Image
              src={k.img}
              alt=""
              fill
              priority={i < 2}
              sizes={k.big ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 100vw"}
              className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-opulent via-opulent/50 to-opulent/5" />
            <span className="absolute inset-x-5 bottom-5 text-white md:inset-x-6 md:bottom-6">
              {k.tag ? <span className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]">{k.tag}</span> : null}
              <span className={`block font-display font-bold leading-tight ${k.big ? "text-3xl md:text-4xl" : "text-xl"}`}>{k.title}</span>
              <span className={`mt-1.5 block text-white/85 ${k.big ? "text-base" : "text-sm"}`}>{k.body}</span>
              <span className="mt-3 inline-block font-display text-sm font-semibold text-celeste">{c.open} →</span>
            </span>
          </Link>
        ))}
      </div>
    </CampusShell>
  );
}
