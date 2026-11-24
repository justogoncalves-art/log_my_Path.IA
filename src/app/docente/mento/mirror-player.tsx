"use client";

import MuxPlayer from "@mux/mux-player-react/lazy";
import { useState } from "react";
import { staffText, type StaffLang } from "@/lib/i18n-staff";
import type { PlaybackTokens } from "@/lib/mux";

type Question = { id: string; kind: "simple" | "abierta"; prompt: string; options: { id: string; text: string }[] };

// Espejo del capítulo: el docente ve y prueba lo mismo que el alumno, pero todo queda en el navegador (nada se guarda).
export function MirrorPlayer({ lang, title, playbackId, tokens, questions }: {
  lang: StaffLang; title: string; playbackId: string | null; tokens: PlaybackTokens | null; questions: Question[];
}) {
  const s = staffText(lang);
  const [picked, setPicked] = useState<Record<string, string>>({});
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <p className="mt-2 inline-flex rounded-lg bg-celeste/10 px-3 py-1.5 text-sm text-opulent">{s.mirrorNote}</p>
      </div>
      {playbackId ? (
        <div className="overflow-hidden rounded-2xl bg-black shadow-sm">
          <MuxPlayer
            playbackId={playbackId}
            tokens={tokens ?? undefined}
            streamType="on-demand"
            disableTracking
            accentColor="#399ab8"
            style={{ aspectRatio: "16 / 9", width: "100%" }}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">{s.noVideo}</p>
      )}
      {questions.length ? (
        <section>
          <h3 className="font-display text-lg font-semibold">
            {s.questions} ({questions.length})
          </h3>
          <ol className="mt-4 grid gap-4 2xl:grid-cols-2">
            {questions.map((q, i) => (
              <li key={q.id} className="rounded-2xl border border-line bg-surface p-5">
                <p className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
                  {i + 1} · {q.kind === "simple" ? s.simple : s.open}
                </p>
                <p className="mt-2 font-medium leading-relaxed">{q.prompt}</p>
                {q.kind === "simple" ? (
                  <div role="radiogroup" aria-label={q.prompt} className="mt-4 flex flex-col gap-2">
                    {q.options.map((o) => (
                      <label
                        key={o.id}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm leading-relaxed ${picked[q.id] === o.id ? "border-celeste bg-celeste/10" : "border-line hover:border-celeste/60"}`}
                      >
                        <input
                          type="radio"
                          name={`mirror-${q.id}`}
                          className="mt-0.5 accent-[#399ab8]"
                          checked={picked[q.id] === o.id}
                          onChange={() => setPicked((p) => ({ ...p, [q.id]: o.id }))}
                        />
                        <span>{o.text}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={3}
                    placeholder={s.openPlaceholder}
                    className="mt-4 w-full rounded-xl border border-line bg-bg p-3 text-sm outline-none focus:border-celeste"
                  />
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
