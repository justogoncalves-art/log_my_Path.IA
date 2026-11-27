"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Íconos de línea simples (24×24, trazo actual)
const ICONS: Record<string, React.ReactNode> = {
  resumen: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z" />,
  estado: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  orgs: <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 10h.01M15 10h.01" />,
  alta: <path d="M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6" />,
  programas: <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5M10 8l4 2.5-4 2.5z" />,
  campus: <path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6" />,
  volver: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />,
};

const GROUPS = [
  { title: "General", items: [{ href: "/admin", label: "Resumen", icon: "resumen" }, { href: "/admin/estado", label: "Estado", icon: "estado" }] },
  { title: "Gestión", items: [{ href: "/admin/organizaciones", label: "Organizaciones", icon: "orgs" }, { href: "/admin/alta", label: "Alta de personas", icon: "alta" }] },
  { title: "Contenido", items: [{ href: "/admin/programas", label: "Programas", icon: "programas" }, { href: "/admin/campus", label: "Campus", icon: "campus" }] },
];

function Icon({ name }: { name: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {ICONS[name]}
    </svg>
  );
}

export function AdminNav() {
  const path = usePathname();
  const isActive = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  return (
    <div className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#7f9ba4]">{g.title}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((n) => {
              const active = isActive(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-display text-sm transition-colors ${
                      active ? "bg-white text-opulent shadow-sm" : "text-[#d6e3e7] hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon name={n.icon} />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function NavIcon({ name }: { name: string }) {
  return <Icon name={name} />;
}
