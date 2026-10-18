import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getMe, getMyModules } from "@/lib/dal";

// Punto de entrada de cada módulo. Solo se accede si el módulo está activo para el usuario.
export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMe();
  if (me.mustChangePassword) redirect("/cambiar-contrasena");
  if (!me.organizationId) notFound();

  const mod = (await getMyModules(me.organizationId)).find((m) => m.id === id);
  if (!mod?.active) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center px-6">
      <p className="eyebrow">MY PATH.IA</p>
      <h1 className="mt-3 font-display text-4xl font-bold">{mod.name}</h1>
      <p className="mt-4 text-muted">Este módulo se está integrando a la plataforma.</p>
      <Link href="/" className="mt-8 font-display text-sm text-celeste hover:underline">
        ← Volver al inicio
      </Link>
    </main>
  );
}
