import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Administración</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Resumen</h1>
      <p className="mt-4 text-muted">Las estadísticas por colegio y por reseller llegan en la próxima entrega.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/organizaciones" className="rounded-lg bg-opulent px-4 py-2.5 font-display text-sm font-semibold text-white">
          Organizaciones
        </Link>
        <Link href="/admin/alta" className="rounded-lg border border-line px-4 py-2.5 font-display text-sm font-semibold">
          Alta de personas
        </Link>
      </div>
    </div>
  );
}
