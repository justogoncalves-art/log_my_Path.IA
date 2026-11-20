"use client";

import { useState, useTransition } from "react";
import { staffText, type StaffLang } from "@/lib/i18n-staff";
import { createShare, emailShare, revokeShare } from "../../../actions";

type Share = { id: string; created_at: string; expires_at: string; revoked_at: string | null; views: number; last_view_at: string | null };

// Compartir el reporte: link que se abre en el navegador sin cuenta, por WhatsApp o por mail.
// El link completo solo se ve al crearlo (la base guarda su huella, no el link).
export function SharePanel({ lang, personId, programId, studentName, programLabel, ready, now, shares }: {
  lang: StaffLang; personId: string; programId: string; studentName: string; programLabel: string; ready: boolean; now: number; shares: Share[];
}) {
  const s = staffText(lang);
  const [days, setDays] = useState(30);
  const [link, setLink] = useState<{ url: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" });
  const errorText = lang === "en" ? "It couldn't be done. Try again." : "No se pudo. Probá de nuevo.";

  const create = () =>
    start(async () => {
      setMsg(null);
      const r = await createShare(personId, programId, days);
      if (r.ok) setLink({ url: r.url, token: r.token });
      else setMsg({ ok: false, text: errorText });
    });

  const wa = link ? `https://wa.me/?text=${encodeURIComponent(`${s.shareMessage(studentName, programLabel)} ${link.url}`)}` : "#";

  return (
    <aside className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
      <div>
        <h2 className="font-display text-lg font-semibold">{s.share}</h2>
        <p className="mt-1 text-sm text-muted">{ready ? s.shareLead : s.reportNotYet}</p>
      </div>
      {ready ? (
        <>
          {!link ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{s.expiresIn}</span>
                <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-line bg-bg px-3 py-2">
                  {[7, 30, 90].map((d) => (
                    <option key={d} value={d}>
                      {s.days(d)}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={create} disabled={pending} className="cursor-pointer rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50">
                {s.createLink}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input readOnly value={link.url} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 font-mono text-xs" aria-label="Link" />
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(link.url).catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm hover:border-celeste"
                >
                  {copied ? s.copied : s.copy}
                </button>
              </div>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f7a4d] px-4 py-2.5 font-display text-sm font-semibold text-white">
                {s.whatsapp} ↗
              </a>
              <form
                className="flex flex-col gap-2 border-t border-line pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  start(async () => {
                    const r = await emailShare(link.token, to, note);
                    setMsg(r.ok ? { ok: true, text: s.sent(r.sent) } : { ok: false, text: errorText });
                    if (r.ok) setTo("");
                  });
                }}
              >
                <p className="font-display text-sm font-semibold">{s.sendMail}</p>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-muted">{s.mailTo}</span>
                  <input value={to} onChange={(e) => setTo(e.target.value)} required maxLength={2000} className="rounded-lg border border-line bg-bg px-3 py-2" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-muted">{s.mailNote}</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={600} className="rounded-lg border border-line bg-bg px-3 py-2" />
                </label>
                <button type="submit" disabled={pending || !to.trim()} className="cursor-pointer self-start rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50">
                  {s.send}
                </button>
              </form>
            </div>
          )}
          <p aria-live="polite" className={`text-sm ${msg?.ok ? "text-ok" : "text-danger"}`}>
            {msg?.text}
          </p>
        </>
      ) : null}

      {shares.length ? (
        <div className="border-t border-line pt-4">
          <p className="font-display text-sm font-semibold">{s.links}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {shares.map((x) => {
              const expired = new Date(x.expires_at).getTime() < now;
              const state = x.revoked_at ? s.revoked : expired ? s.expired : `${s.expiresIn} ${fmt.format(new Date(x.expires_at))}`;
              return (
                <li key={x.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block">{fmt.format(new Date(x.created_at))} · {s.views(x.views)}</span>
                    <span className="block text-xs text-muted">{state}</span>
                  </span>
                  {!x.revoked_at && !expired ? (
                    <button onClick={() => start(async () => void (await revokeShare(x.id)))} disabled={pending} className="cursor-pointer text-xs text-danger hover:underline">
                      {s.revoke}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
