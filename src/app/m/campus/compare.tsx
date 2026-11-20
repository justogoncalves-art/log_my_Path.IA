"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { campusText, COMPARE_KEY, COMPARE_MAX, type CampusLang } from "@/lib/i18n-campus";

// Selección para comparar: vive en el navegador (es una comodidad, no un dato que haya que guardar)
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let cache: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY };

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    if (raw === cache.raw) return cache.ids;
    const ids = raw ? (JSON.parse(raw) as unknown[]).filter((x): x is string => typeof x === "string").slice(0, COMPARE_MAX) : EMPTY;
    cache = { raw, ids };
    return ids;
  } catch {
    return EMPTY;
  }
}
function write(ids: string[]) {
  try {
    window.localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
  } catch {
    // Sin almacenamiento (modo privado): la selección no se recuerda
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === COMPARE_KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}
export function useCompare() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    ids,
    toggle: (id: string) => write(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-COMPARE_MAX)),
    remove: (id: string) => write(ids.filter((x) => x !== id)),
    clear: () => write([]),
    set: (next: string[]) => write(next.slice(0, COMPARE_MAX)),
  };
}

export function CompareButton({ id, lang }: { id: string; lang: CampusLang }) {
  const c = campusText(lang);
  const { ids, toggle } = useCompare();
  const on = ids.includes(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => toggle(id)}
      className={`shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 font-display text-xs font-semibold transition-colors ${
        on ? "border-opulent bg-opulent text-white" : "border-line bg-surface text-ink hover:border-celeste"
      }`}
    >
      {on ? `✓ ${c.inCompare}` : `+ ${c.addCompare}`}
    </button>
  );
}

export function CompareBar({ lang, hidden }: { lang: CampusLang; hidden?: boolean }) {
  const c = campusText(lang);
  const { ids, clear } = useCompare();
  if (hidden || !ids.length) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full bg-opulent py-2 pl-5 pr-2 text-white shadow-lg">
        <span className="text-sm">{c.compareBar(ids.length)}</span>
        <button type="button" onClick={clear} className="cursor-pointer px-2 text-sm text-white/70 hover:text-white">
          {c.clear}
        </button>
        <Link href={`/m/campus/comparar?c=${ids.join(",")}`} className="rounded-full bg-white px-4 py-2 font-display text-sm font-semibold text-opulent">
          {c.compare} →
        </Link>
      </div>
    </div>
  );
}
