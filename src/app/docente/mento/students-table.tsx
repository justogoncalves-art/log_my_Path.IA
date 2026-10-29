"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { staffText, type StaffLang } from "@/lib/i18n-staff";

export type Row = {
  id: string; name: string; completed: number; total: number; nextTitle: string | null; nextPosition: number | null;
  lastSeen: string | null; lastSeenLabel: string; minutes: number; days30: number; minutes30: number; report: string | null; finished: boolean;
};

type Filter = "all" | "not_started" | "in_progress" | "done" | "inactive";

// Lista de alumnos con búsqueda y filtros rápidos
export function StudentsTable({ lang, rows, hrefBase, hrefQuery, now }: { lang: StaffLang; rows: Row[]; hrefBase: string; hrefQuery: string; now: number }) {
  const s = staffText(lang);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const weekAgo = now - 7 * 86400000;
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (term && !r.name.toLowerCase().includes(term)) return false;
      if (filter === "not_started") return r.completed === 0;
      if (filter === "in_progress") return r.completed > 0 && !r.finished;
      if (filter === "done") return r.finished;
      if (filter === "inactive") return !r.lastSeen || new Date(r.lastSeen).getTime() < weekAgo;
      return true;
    });
  }, [rows, q, filter, weekAgo]);
  const filters: [Filter, string][] = [
    ["all", s.filterAll],
    ["not_started", s.filterNotStarted],
    ["in_progress", s.filterInProgress],
    ["done", s.filterDone],
    ["inactive", s.filterInactive],
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={s.search}
          aria-label={s.search}
          className="min-w-56 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-celeste"
        />
        <div className="flex flex-wrap gap-1.5" role="group">
          {filters.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold ${filter === k ? "bg-opulent text-white" : "bg-line/60 text-ink hover:bg-line"}`}
            >
              {label} ({rows.filter((r) => (k === "all" ? true : k === "not_started" ? r.completed === 0 : k === "in_progress" ? r.completed > 0 && !r.finished : k === "done" ? r.finished : !r.lastSeen || new Date(r.lastSeen).getTime() < weekAgo)).length})
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="border-b border-line px-4 py-3 font-semibold">{s.colStudent}</th>
              <th className="border-b border-line px-4 py-3 font-semibold">{s.colProgress}</th>
              <th className="border-b border-line px-4 py-3 font-semibold">{s.colNext}</th>
              <th className="border-b border-line px-4 py-3 font-semibold">{s.colLastSeen}</th>
              <th className="border-b border-line px-4 py-3 font-semibold">{s.colTime}</th>
              <th className="border-b border-line px-4 py-3 font-semibold">{s.colReport}</th>
              <th className="border-b border-line px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const pct = r.total ? Math.round((r.completed / r.total) * 100) : 0;
              return (
                <tr key={r.id} className="hover:bg-oat/50">
                  <td className="border-b border-line/60 px-4 py-3">
                    <Link href={`${hrefBase}/${r.id}${hrefQuery}`} className="font-semibold hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="border-b border-line/60 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line" aria-hidden>
                        <span className="block h-full rounded-full bg-celeste" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="text-xs text-muted">
                        {r.completed}/{r.total}
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-line/60 px-4 py-3 text-muted">{r.finished ? s.finished : r.nextPosition ? `${r.nextPosition}. ${r.nextTitle}` : "—"}</td>
                  <td className="border-b border-line/60 px-4 py-3">
                    {r.lastSeenLabel}
                    <span className="block text-xs text-muted">{s.days30(r.days30, r.minutes30)}</span>
                  </td>
                  <td className="border-b border-line/60 px-4 py-3">{s.minutes(r.minutes)}</td>
                  <td className="border-b border-line/60 px-4 py-3">
                    {r.report === "listo" ? (
                      <span className="rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-semibold text-ok">{s.reportReady}</span>
                    ) : r.finished ? (
                      <span className="rounded-full bg-celeste/15 px-2.5 py-0.5 text-xs font-semibold text-opulent">{s.reportPending}</span>
                    ) : (
                      <span className="text-muted">{s.reportNone}</span>
                    )}
                  </td>
                  <td className="border-b border-line/60 px-4 py-3 text-right">
                    <Link href={`${hrefBase}/${r.id}${hrefQuery}`} className="text-opulent hover:underline">
                      {s.view} →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
