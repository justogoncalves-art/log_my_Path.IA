import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow">Administración</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Resumen</h1>
      <p className="mt-4 text-muted">Las estadísticas por colegio y por reseller llegan en la próxima entrega.</p>
      <Link href="/admin/alta" className="mt-8 inline-block rounded-lg bg-opulent px-4 py-2.5 font-display text-sm font-semibold text-white">
        Alta de personas
      </Link>
    </div>
  );
}
