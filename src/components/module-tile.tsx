import Image from "next/image";
import type { ModuleTile } from "@/lib/dal";
import type { Dict, Lang } from "@/lib/i18n";

const IMAGES: Record<string, { src: string; pos: string }> = {
  mento: { src: "/img/mento-hero.jpg", pos: "center 25%" },
  campus: { src: "/img/imagen-my-unni.jpg", pos: "center 60%" },
  mind: { src: "/img/imagen-my-mind.jpg", pos: "center 20%" },
  cognition: { src: "/img/pexels-ruben-min.jpg", pos: "center" },
  linno: { src: "/img/imagen-my-path-healthcare.avif", pos: "center 30%" },
  edfin: { src: "/img/works-globe.jpeg", pos: "center" },
};

export const MODULE_IMAGES = IMAGES;

export function ModuleTileCard({ m, t, lang, large, staff = false }: { m: ModuleTile; t: Dict; lang: Lang; large: boolean; staff?: boolean }) {
  const img = IMAGES[m.id] ?? IMAGES.edfin;
  const summary = lang === "es" ? m.summaryEs : m.summaryEn;
  const body = (
    <>
      <Image
        src={img.src}
        alt=""
        fill
        sizes={large ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 33vw, 100vw"}
        className={`object-cover transition-transform duration-700 group-hover:scale-[1.03] ${m.active ? "" : "grayscale-[0.35] brightness-[0.68]"}`}
        style={{ objectPosition: img.pos }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-opulent/95 via-opulent/40 to-transparent" />
      <span
        className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
          m.active ? "bg-ok/25 text-white" : "bg-black/40 text-white/60"
        }`}
      >
        <span className={`size-1.5 rounded-full ${m.active ? "bg-ok" : "bg-white/40"}`} />
        {m.active ? t.active : t.inactive}
      </span>
      <div className="absolute inset-x-6 bottom-6">
        <h3 className={`font-display font-semibold ${large ? "text-2xl" : "text-xl"} ${m.active ? "text-white" : "text-white/60"}`}>
          {m.name} <span aria-hidden className="text-celeste">→</span>
        </h3>
        <p className={`mt-2 max-w-md text-sm leading-relaxed ${m.active ? "text-white/85" : "text-white/50"}`}>{summary}</p>
      </div>
    </>
  );

  const className = `group relative block overflow-hidden rounded-2xl border-t-2 ${
    m.active ? "border-celeste" : "border-opulent"
  } ${large ? "h-[380px]" : "h-[240px]"}`;

  // Los módulos se van conectando de a uno; por ahora el activo abre su ruta y el inactivo su sitio informativo.
  if (m.active) {
    return (
      <a href={`/m/${m.id}`} className={className}>
        {body}
      </a>
    );
  }
  // Docentes y coordinadores: ficha del módulo con "Quiero saber más"
  if (staff) {
    return (
      <a href={`/docente/modulo/${m.id}`} className={className}>
        {body}
      </a>
    );
  }
  if (m.infoUrl) {
    return (
      <a href={m.infoUrl} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }
  return <div className={className}>{body}</div>;
}
