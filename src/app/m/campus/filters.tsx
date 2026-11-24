"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { campusText, type CampusLang } from "@/lib/i18n-campus";

type Stat = { country_code: string; universities: number; programs: number };

export const selectCls = "rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-celeste";

// Selector de país que actualiza la URL al cambiar
export function CountrySelect({ lang, stats, value }: { lang: CampusLang; stats: Stat[]; value: string }) {
  const c = campusText(lang);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const names = new Intl.DisplayNames([lang], { type: "region" });
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">{c.inCountry}</span>
      <select
        className={selectCls}
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("pais", e.target.value);
          next.delete("pagina");
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        <option value="todos">{c.allCountries}</option>
        {stats
          .map((s) => ({ code: s.country_code, name: names.of(s.country_code) ?? s.country_code }))
          .sort((a, b) => a.name.localeCompare(b.name, lang))
          .map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
      </select>
    </label>
  );
}
