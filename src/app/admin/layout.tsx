import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
import { getMe } from "@/lib/dal";
import { AdminNav } from "./nav";

// El panel de administración solo lo usa My Path: por ahora en español.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (me.mustChangePassword) redirect("/cambiar-contrasena");
  if (!me.isAdmin) notFound();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav aria-label="Administración" className="flex shrink-0 flex-col gap-6 bg-opulent px-4 py-6 text-oat md:sticky md:top-0 md:h-screen md:w-64">
        <Link href="/admin" className="px-2">
          <Brand compact />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#9fb7bf]">Administración</p>
        </Link>
        <AdminNav />
        <div className="mt-auto flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-celeste/25 font-display text-sm font-bold text-white">
            {me.firstName.slice(0, 1)}
            {me.lastName.slice(0, 1)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm text-white">
              {me.firstName} {me.lastName}
            </span>
            <span className="block text-xs text-[#9fb7bf]">Admin de My Path</span>
          </span>
          <form action={logout} className="ml-auto">
            <button type="submit" className="cursor-pointer rounded-md px-2 py-1 font-display text-xs text-[#9fb7bf] hover:bg-white/10 hover:text-white">
              Salir
            </button>
          </form>
        </div>
      </nav>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
