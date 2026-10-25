import Link from "next/link";
import { campusText, type CampusLang } from "@/lib/i18n-campus";

// Paginación que conserva los filtros de la URL
export function Pager({ lang, base, params, page, total, size }: { lang: CampusLang; base: string; params: Record<string, string | undefined>; page: number; total: number; size: number }) {
  const c = campusText(lang);
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1] && e[0] !== "pagina"));
    q.set("pagina", String(p));
    return `${base}?${q.toString()}`;
  };
  return (
    <nav className="mt-8 flex items-center justify-between gap-3 text-sm" aria-label={c.page(page, pages)}>
      {page > 1 ? (
        <Link href={href(page - 1)} className="rounded-lg border border-line bg-surface px-4 py-2 hover:border-celeste">
          ← {c.prev}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted">{c.page(page, pages)}</span>
      {page < pages ? (
        <Link href={href(page + 1)} className="rounded-lg border border-line bg-surface px-4 py-2 hover:border-celeste">
          {c.next} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
