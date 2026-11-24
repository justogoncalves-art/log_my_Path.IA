import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { campusUnlocked } from "@/lib/campus-access";
import { getDict } from "@/lib/i18n";
import { campusText } from "@/lib/i18n-campus";
import { requireModule } from "@/lib/module-access";

// El alumno todavía no terminó Mento.IA: Campus espera
export default async function CampusLocked() {
  const [{ me }, { t, lang }] = await Promise.all([requireModule("campus"), getDict()]);
  if (await campusUnlocked(me)) redirect("/m/campus");
  const c = campusText(lang);
  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <main className="mx-auto grid w-full max-w-[1600px] gap-8 px-5 pb-24 pt-10 md:px-10 lg:grid-cols-2 lg:items-center">
        <div className="relative h-72 overflow-hidden rounded-2xl lg:h-[440px]">
          <Image src="/img/campus/students.jpg" alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover grayscale-[0.3]" />
          <span className="absolute inset-0 bg-gradient-to-t from-opulent/80 to-transparent" />
          <span className="absolute left-6 top-6 inline-flex size-12 items-center justify-center rounded-full bg-white/90 text-opulent" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
        </div>
        <div>
          <p className="eyebrow">{c.module}</p>
          <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{c.lockedTitle}</h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-muted">{c.lockedBody}</p>
          <Link href="/m/mento" className="mt-8 inline-block rounded-lg bg-opulent px-6 py-3 font-display font-semibold text-white">
            {c.lockedCta} →
          </Link>
        </div>
      </main>
    </div>
  );
}
