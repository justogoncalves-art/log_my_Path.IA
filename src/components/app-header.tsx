import Link from "next/link";
import { logout, setLang } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
import type { Dict, Lang } from "@/lib/i18n";

export function AppHeader({
  t,
  lang,
  orgName,
  firstName,
  isAdmin,
}: {
  t: Dict;
  lang: Lang;
  orgName: string | null;
  firstName: string;
  isAdmin: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-4">
        <Brand compact />
        {orgName ? (
          <span className="hidden truncate border-l border-line pl-4 font-display text-sm font-medium sm:inline">{orgName}</span>
        ) : null}
        <span className="hidden items-center gap-2 border-l border-line pl-4 md:inline-flex">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-celeste/15 font-display text-sm">
            {firstName.slice(0, 1).toUpperCase()}
          </span>
          <span className="font-display text-sm">{firstName}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Link href="/admin" className="rounded-lg border border-line px-3 py-2 font-display text-xs font-medium hover:border-celeste">
            {t.admin}
          </Link>
        ) : null}
        <form action={setLang} className="flex rounded-full border border-line p-0.5">
          {(["es", "en"] as const).map((l) => (
            <button
              key={l}
              name="lang"
              value={l}
              aria-pressed={lang === l}
              className={`cursor-pointer rounded-full px-3 py-1 font-mono text-[11px] uppercase ${
                lang === l ? "bg-opulent text-white" : "text-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </form>
        <form action={logout}>
          <button className="cursor-pointer rounded-lg bg-danger px-3.5 py-2 font-display text-sm font-medium text-white hover:opacity-90">
            {t.logout}
          </button>
        </form>
      </div>
    </header>
  );
}
