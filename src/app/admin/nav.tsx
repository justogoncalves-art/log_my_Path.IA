"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

const GROUPS = [
  { title: "General", items: [{ href: "/admin", label: "Resumen", icon: "resumen" }, { href: "/admin/estado", label: "Estado", icon: "estado" }] },
  { title: "Gestión", items: [{ href: "/admin/organizaciones", label: "Organizaciones", icon: "orgs" }, { href: "/admin/alta", label: "Alta de personas", icon: "alta" }] },
  { title: "Contenido", items: [{ href: "/admin/programas", label: "Programas", icon: "programas" }, { href: "/admin/campus", label: "Campus", icon: "campus" }] },
];

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
