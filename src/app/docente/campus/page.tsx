import Image from "next/image";
import Link from "next/link";
import { CampusShell } from "@/app/m/campus/shell";
import { getDict } from "@/lib/i18n";
import { campusText } from "@/lib/i18n-campus";
import { requireStaff } from "../access";

// Campus para docentes y coordinadores: 4 bloques
export default async function StaffCampusHome() {
  const [{ me }, { t, lang }] = await Promise.all([requireStaff("campus"), getDict()]);
  const c = campusText(lang);
  const tiles = [
    { href: "/m/campus/universidades", title: c.cardUnisTitle, body: c.cardUnisBody, img: "/img/campus/uni-03.jpg" },
    { href: "/m/campus/carreras", title: c.cardProgramsTitle, body: c.cardProgramsBody, img: "/img/campus/uni-09.jpg" },
    { href: "/docente/campus/alumnos", title: c.tileStudents, body: c.tileStudentsBody, img: "/img/campus/students.jpg" },
    { href: "/docente/campus/clase", title: c.tileClass, body: c.tileClassBody, img: "/img/campus/study-group.jpg" },
  ];
  return (
    <CampusShell me={me} t={t} lang={lang} section="home">
      <p className="eyebrow">{c.staffEyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-bold md:text-5xl">{c.staffTitle}</h1>
      <p className="mt-3 max-w-2xl text-muted">{c.staffLead}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {tiles.map((k, i) => (
          <Link key={k.href} href={k.href} className="group relative h-64 overflow-hidden rounded-2xl mp-fade-up xl:h-72" style={{ animationDelay: `${0.04 + i * 0.05}s` }}>
            <Image src={k.img} alt="" fill priority={i < 2} sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
            <span className="absolute inset-0 bg-gradient-to-t from-opulent via-opulent/50 to-opulent/5" />
            <span className="absolute inset-x-6 bottom-6 text-white">
              <span className="block font-display text-2xl font-bold leading-tight md:text-3xl">{k.title}</span>
              <span className="mt-1.5 block text-white/85">{k.body}</span>
              <span className="mt-3 inline-block font-display text-sm font-semibold text-celeste">{c.open} →</span>
            </span>
          </Link>
        ))}
      </div>
    </CampusShell>
  );
}
