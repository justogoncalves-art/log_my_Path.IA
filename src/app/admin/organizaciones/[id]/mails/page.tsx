import { listCampaigns, orgClasses } from "@/lib/admin-data";
import { CampaignList, WelcomeForm } from "./welcome";

export default async function MailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaigns, classes] = await Promise.all([listCampaigns(id), orgClasses(id)]);
  const classNames = Object.fromEntries(classes.map((c) => [c.id, c.name]));
  const configured = Boolean(process.env.SUPABASE_SECRET_KEY && process.env.RESEND_API_KEY);
  return (
    <div className="flex flex-col gap-8">
      {!configured ? (
        <p className="rounded-lg border border-[#c98a1b]/40 bg-[#c98a1b]/10 px-4 py-3 text-sm text-[#7a5310]">
          Podés programar mails, pero para que salgan faltan cargar en Vercel SUPABASE_SECRET_KEY, RESEND_API_KEY y CRON_SECRET.
        </p>
      ) : null}
      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Programados y enviados</h2>
        <CampaignList campaigns={campaigns} classNames={classNames} />
      </section>
      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold">Programar mail de bienvenida</h2>
        <p className="mt-1 text-sm text-muted">
          Sale el día elegido a las 7 h (hora Argentina), o al instante con “Enviar ahora”. A cada persona se le genera una contraseña al
          azar que va solo en el mail.
        </p>
        <WelcomeForm orgId={id} classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
      </section>
    </div>
  );
}
