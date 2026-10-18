import Link from "next/link";
import { notFound } from "next/navigation";
import { getMe } from "@/lib/dal";

export default async function AdminPage() {
  const me = await getMe();
  if (!me.isAdmin) notFound();
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center px-6">
      <p className="eyebrow">Administración</p>
      <h1 className="mt-3 font-display text-4xl font-bold">Panel de administración</h1>
      <p className="mt-4 text-muted">En construcción: usuarios, carga masiva, módulos, estadísticas y mails programados.</p>
      <Link href="/" className="mt-8 font-display text-sm text-celeste hover:underline">
        ← Volver al inicio
      </Link>
    </main>
  );
}
