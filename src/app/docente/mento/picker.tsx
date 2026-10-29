"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

// Selector que cambia un parámetro de la URL (clase o programa)
export function UrlSelect({ name, label, value, options, reset = [] }: { name: string; label: string; value: string; options: Option[]; reset?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set(name, e.target.value);
          for (const r of reset) next.delete(r);
          router.push(`${pathname}?${next.toString()}`);
        }}
        className="min-w-56 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-celeste"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
