"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav";

// Pestañas con la activa resaltada (comparan la ruta sin parámetros)
export function Tabs({ tabs }: { tabs: { href: string; label: string; icon: string; exact?: boolean }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
      {tabs.map((t) => {
        const base = t.href.split("?")[0];
        const active = t.exact ? path === base : path.startsWith(base);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 font-display text-sm font-medium transition-colors ${
              active ? "bg-opulent text-white shadow-sm" : "text-muted hover:bg-oat hover:text-ink"
            }`}
          >
            <NavIcon name={t.icon} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
