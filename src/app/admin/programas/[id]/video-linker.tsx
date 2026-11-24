"use client";

import { useState, useTransition } from "react";
import { listVideos, setChapterVideos } from "@/app/admin/actions";
import { btnCls, btnGhostCls, inputCls, Result, useAction } from "@/app/admin/ui";
import { matchAsset, type MuxAssetInfo } from "@/lib/mux-match";

type Chapter = { id: string; position: number; title: string; mux_playback_id: string | null; mux_signed: boolean; questions: number };
type Choice = { playbackId: string | null; signed: boolean };

const fmt = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");

export function VideoLinker({ chapters, grade, title, excelLang }: { chapters: Chapter[]; grade: number; title: string; excelLang: string }) {
  const [assets, setAssets] = useState<MuxAssetInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<Record<string, Choice>>(
    Object.fromEntries(chapters.map((c) => [c.id, { playbackId: c.mux_playback_id, signed: c.mux_signed }])),
  );
  const [loading, startLoad] = useTransition();
  const save = useAction();

  function load() {
    setError(null);
    startLoad(async () => {
      const res = await listVideos();
      if (!res.ok) return setError(res.error);
      setAssets(res.assets);
      // Une automáticamente los capítulos cuyo video tiene el nombre esperado
      setChoice((prev) => {
        const next = { ...prev };
        for (const c of chapters) {
          const m = matchAsset(res.assets, grade, title, excelLang, c.position);
          if (m?.playbackId) next[c.id] = { playbackId: m.playbackId, signed: m.signed };
        }
        return next;
      });
    });
  }

  const assetByPb = new Map((assets ?? []).map((a) => [a.playbackId, a]));
  const changed = chapters.filter((c) => choice[c.id].playbackId !== c.mux_playback_id || choice[c.id].signed !== c.mux_signed);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className={btnGhostCls} onClick={load} disabled={loading}>
          {loading ? "Buscando videos…" : assets ? "Volver a buscar" : "Buscar videos en Mux"}
        </button>
        {assets ? <span className="text-sm text-muted">{assets.length} videos listos en Mux</span> : null}
        {error ? <span className="text-sm text-danger">{error}</span> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="border-b border-line px-2 py-2 font-semibold">Capítulo</th>
              <th className="border-b border-line px-2 py-2 font-semibold">Video</th>
              <th className="border-b border-line px-2 py-2 font-semibold">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((c) => {
              const ch = choice[c.id];
              const a = ch.playbackId ? assetByPb.get(ch.playbackId) : undefined;
              return (
                <tr key={c.id}>
                  <td className="border-b border-line/60 px-2 py-2">
                    <span className="text-muted">{c.position}.</span> {c.title}
                    <span className="block text-xs text-muted">{c.questions} preguntas</span>
                  </td>
                  <td className="border-b border-line/60 px-2 py-2">
                    {assets ? (
                      <select
                        className={inputCls}
                        value={ch.playbackId ?? ""}
                        onChange={(e) => {
                          const sel = assets.find((x) => x.playbackId === e.target.value);
                          setChoice((s) => ({ ...s, [c.id]: { playbackId: sel?.playbackId ?? null, signed: sel?.signed ?? false } }));
                        }}
                      >
                        <option value="">Sin video</option>
                        {ch.playbackId && !a ? <option value={ch.playbackId}>Actual: {ch.playbackId.slice(0, 12)}… (otro entorno)</option> : null}
                        {assets.map((x) => (
                          <option key={x.id} value={x.playbackId ?? ""}>
                            {x.title || x.id} {x.duration ? `· ${fmt(x.duration)}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : ch.playbackId ? (
                      <span className="font-mono text-xs">{ch.playbackId.slice(0, 16)}…</span>
                    ) : (
                      <span className="text-danger">Sin video</span>
                    )}
                  </td>
                  <td className="border-b border-line/60 px-2 py-2">
                    {ch.playbackId ? (ch.signed ? <span className="text-ok">Protegido</span> : <span className="text-[#7a5310]">Público</span>) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={btnCls}
          disabled={!changed.length || save.pending}
          onClick={() =>
            save.run(() => setChapterVideos(changed.map((c) => ({ chapterId: c.id, playbackId: choice[c.id].playbackId, signed: choice[c.id].signed }))))
          }
        >
          Guardar {changed.length ? `${changed.length} cambios` : ""}
        </button>
        <Result result={save.result} />
      </div>
    </div>
  );
}
