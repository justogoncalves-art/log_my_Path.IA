import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getMe } from "@/lib/dal";

// El panel de administración solo lo usa My Path: por ahora en español.
const NAV = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/organizaciones", label: "Organizaciones" },
  { href: "/admin/alta", label: "Alta de personas" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (me.mustChangePassword) redirect("/cambiar-contrasena");
  if (!me.isAdmin) notFound();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav aria-label="Administración" className="flex shrink-0 flex-col gap-1 bg-opulent px-4 py-6 text-oat md:w-60">
        <div className="mb-6 px-2">
          <Brand compact />
          <p className="mt-2 text-xs text-[#9fb7bf]">Administración</p>
        </div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2.5 font-display text-sm text-[#d6e3e7] hover:bg-white/10">
            {n.label}
          </Link>
        ))}
        <Link href="/" className="mt-auto rounded-lg px-3 py-2.5 font-display text-xs text-[#9fb7bf] hover:bg-white/10">
          ← Volver a la plataforma
        </Link>
      </nav>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
