import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ModuleTileCard } from "@/components/module-tile";
import { getMe, getMyModules } from "@/lib/dal";
import { getDict } from "@/lib/i18n";

export default async function HomePage() {
  const [me, { t, lang }] = await Promise.all([getMe(), getDict()]);
  if (me.mustChangePassword) redirect("/cambiar-contrasena");

  const modules = me.organizationId ? await getMyModules(me.organizationId) : [];
  const isStudent = me.role === "alumno";

  return (
    <div className="min-h-screen">
      <AppHeader t={t} lang={lang} orgName={me.organizationName} firstName={me.firstName} isAdmin={me.isAdmin} />
      <main className="mx-auto w-full max-w-[1600px] px-5 md:px-10 pb-20 pt-14">
        <section className="mp-fade-up max-w-2xl">
          <p className="eyebrow">{t.yourSpace}</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            {t.hello}, {me.firstName}.
          </h1>
          <p className="mt-6 text-[17px] leading-relaxed text-muted">{isStudent ? t.leadStudent : t.leadStaff}</p>
          <div className="mt-6 h-0.5 w-12 bg-celeste" />
        </section>

        {me.organizationId ? (
          <section className="mt-20">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 className="eyebrow">{t.explore}</h2>
              <p className="text-sm text-muted">{t.spaces(modules.length)}</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
              {modules.map((m, i) => (
                <div key={m.id} className={`mp-fade-up ${i < 2 ? "md:col-span-3" : "md:col-span-2"}`} style={{ animationDelay: `${0.05 + i * 0.07}s` }}>
                  <ModuleTileCard m={m} t={t} lang={lang} large={i < 2} />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-16 rounded-xl border border-line bg-surface p-6 text-muted">{t.noOrg}</p>
        )}
      </main>
    </div>
  );
}
