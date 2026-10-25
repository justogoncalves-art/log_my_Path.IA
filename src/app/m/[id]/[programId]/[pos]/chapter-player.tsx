"use client";

import MuxPlayer from "@mux/mux-player-react/lazy";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { answerQuestion, completeChapter, heartbeat, rateProgram } from "@/app/actions/program";
import { programText, type ProgramLang } from "@/lib/i18n-program";
import type { PlaybackTokens } from "@/lib/mux";
import type { ChapterContent } from "@/lib/programs";

type Answer = { optionId: string | null; text: string | null };
type Question = ChapterContent["questions"][number];

const isAnswered = (q: Question, a: Answer | null | undefined) => !!a && (q.kind === "simple" ? !!a.optionId : !!a.text?.trim());

export function ChapterPlayer({
  lang,
  content,
  tokens,
  programId,
  position,
  completed,
  nextHref,
  isLast,
  askMid,
  askFinal,
}: {
  lang: ProgramLang;
  content: ChapterContent;
  tokens: PlaybackTokens | null;
  programId: string;
  position: number;
  completed: boolean;
  nextHref: string;
  isLast: boolean;
  askMid: boolean;
  askFinal: boolean;
}) {
  const p = programText(lang);
  const router = useRouter();
  const questions = content.questions;
  const [videoDone, setVideoDone] = useState(completed || !content.playbackId);
  const [answers, setAnswers] = useState<Record<string, Answer | null>>(Object.fromEntries(questions.map((q) => [q.id, q.answer])));
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(questions.filter((q) => q.kind === "abierta").map((q) => [q.id, q.answer?.text ?? ""])),
  );
  // Un capítulo terminado queda cerrado: sus respuestas se ven pero no se cambian (la base también lo impide)
  const locked = completed;
  // Arranca en la primera pregunta sin responder
  const [step, setStep] = useState(() => {
    const i = questions.findIndex((q) => !isAnswered(q, q.answer));
    return i < 0 ? 0 : i;
  });
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [rating, setRating] = useState<"mitad" | "final" | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [finishing, startFinish] = useTransition();
  const watched = useRef({ seconds: 0, last: 0 });
  const started = useRef(0);

  // Latido de conexión cada minuto mientras la pestaña está visible
  useEffect(() => {
    started.current = Date.now();
    const beat = () => document.visibilityState === "visible" && heartbeat();
    beat();
    const t = setInterval(beat, 60_000);
    return () => clearInterval(t);
  }, []);

  function onTimeUpdate(e: Event) {
    const v = e.target as HTMLVideoElement;
    const delta = v.currentTime - watched.current.last;
    // Solo cuenta lo que se mira de corrido (adelantar no suma)
    if (delta > 0 && delta < 2) watched.current.seconds += delta;
    watched.current.last = v.currentTime;
    if (!videoDone && v.duration > 0 && watched.current.seconds >= v.duration * 0.9) setVideoDone(true);
  }

  async function save(q: Question, optionId: string | null, text: string | null) {
    setSaving("saving");
    const res = await answerQuestion(q.id, optionId, text);
    if (!res.ok) {
      setSaving("error");
      return false;
    }
    setAnswers((s) => ({ ...s, [q.id]: { optionId, text } }));
    setSaving("saved");
    return true;
  }

  const current = questions[step];
  const allAnswered = questions.every((q) => isAnswered(q, answers[q.id]));
  const draft = current?.kind === "abierta" ? (drafts[current.id] ?? "") : "";
  const currentReady = current ? (current.kind === "simple" ? isAnswered(current, answers[current.id]) : !!draft.trim()) : true;
  const onLast = !current || step === questions.length - 1;

  // Las abiertas se guardan al avanzar (si cambió el texto)
  async function saveDraftIfNeeded() {
    if (locked || !current || current.kind !== "abierta") return true;
    if (draft.trim() === (answers[current.id]?.text ?? "").trim()) return true;
    return save(current, null, draft);
  }

  async function goNext() {
    if (!(await saveDraftIfNeeded())) return;
    setSaving("idle");
    setStep((s) => Math.min(s + 1, questions.length - 1));
  }

  function finish() {
    startFinish(async () => {
      if (!(await saveDraftIfNeeded())) return;
      if (!completed) {
        const seconds = Math.max(watched.current.seconds, (Date.now() - started.current) / 1000);
        const res = await completeChapter(content.id, seconds);
        if (!res.ok) return setSaving("error");
        setCelebrate(true);
      } else {
        router.push(nextHref);
      }
    });
  }

  // Después del cuadro de felicitación: encuesta (si toca) y luego al capítulo siguiente
  function afterCelebrate() {
    setCelebrate(false);
    if (askMid) setRating("mitad");
    else if (askFinal) setRating("final");
    else router.push(nextHref);
  }

  const finishEnabled = videoDone && (questions.length === 0 || (onLast && currentReady && questions.every((q) => q.id === current?.id || isAnswered(q, answers[q.id]))));

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* El video ocupa todo el ancho mientras se mira; al terminar se achica y las preguntas pasan al frente */}
      {content.playbackId ? (
        <div
          className={`overflow-hidden rounded-2xl bg-black shadow-sm transition-[max-width] duration-700 ease-out motion-reduce:transition-none ${
            videoDone && questions.length ? "w-full max-w-sm" : "w-full max-w-none"
          }`}
        >
          <MuxPlayer
            playbackId={content.playbackId}
            tokens={tokens ?? undefined}
            streamType="on-demand"
            disableTracking
            accentColor="#399ab8"
            style={{ aspectRatio: "16 / 9", width: "100%" }}
            onTimeUpdate={onTimeUpdate}
            onEnded={() => setVideoDone(true)}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">{p.noVideo}</p>
      )}

      {!videoDone ? <p className="text-sm text-muted">{p.watchFirst}</p> : null}

      {videoDone && current ? (
        <section className="mx-auto w-full max-w-3xl">
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{p.questionOf(step + 1, questions.length)}</p>
            <div className="flex gap-1.5" aria-hidden>
              {questions.map((q, i) => (
                <span
                  key={q.id}
                  className={`h-1.5 w-6 rounded-full ${i === step ? "bg-opulent" : isAnswered(q, answers[q.id]) ? "bg-celeste" : "bg-line"}`}
                />
              ))}
            </div>
          </div>

          {locked ? (
            <p className="mt-4 rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">✓ {p.chapterClosed}</p>
          ) : null}
          <div key={current.id} className="mp-fade-up mt-4 rounded-2xl border border-line bg-surface p-6 md:p-8">
            <h2 className="text-lg font-medium leading-relaxed md:text-xl">{current.prompt}</h2>
            {current.kind === "simple" ? (
              <div role="radiogroup" aria-label={current.prompt} className="mt-6 flex flex-col gap-2.5">
                {current.options.map((o) => {
                  const checked = answers[current.id]?.optionId === o.id;
                  return (
                    <label
                      key={o.id}
                      className={`flex gap-3 rounded-xl border p-4 text-[15px] leading-relaxed transition-colors ${
                        checked ? "border-celeste bg-celeste/10" : locked ? "border-line opacity-60" : "cursor-pointer border-line hover:border-celeste/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name={current.id}
                        className="mt-1 accent-[#399ab8]"
                        checked={checked}
                        disabled={locked}
                        onChange={() => !locked && save(current, o.id, null)}
                      />
                      <span>{o.text}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={draft}
                readOnly={locked}
                maxLength={4000}
                rows={6}
                onChange={(e) => {
                  setDrafts((s) => ({ ...s, [current.id]: e.target.value }));
                  setSaving("idle");
                }}
                onBlur={() => saveDraftIfNeeded()}
                placeholder={p.writeHere}
                className="mt-6 w-full rounded-xl border border-line bg-bg p-4 text-[15px] leading-relaxed outline-none focus:border-celeste"
              />
            )}
            <p aria-live="polite" className={`mt-3 h-4 text-xs ${saving === "error" ? "text-danger" : "text-ok"}`}>
              {saving === "saved" ? `✓ ${p.saved}` : saving === "error" ? p.saveError : ""}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={async () => {
                if (await saveDraftIfNeeded()) setStep((s) => Math.max(0, s - 1));
              }}
              disabled={step === 0}
              className="cursor-pointer px-2 py-2 font-display text-sm text-muted hover:text-ink disabled:invisible"
            >
              ← {p.previous}
            </button>
            {onLast ? (
              <button
                onClick={finish}
                disabled={!finishEnabled || finishing}
                className="cursor-pointer rounded-lg bg-opulent px-6 py-3 font-display font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLast ? p.finishProgram : p.nextChapter} →
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!currentReady || saving === "saving"}
                className="cursor-pointer rounded-lg bg-opulent px-6 py-3 font-display font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {p.next} →
              </button>
            )}
          </div>
          {onLast && !allAnswered && !finishEnabled && currentReady ? (
            <p className="mt-3 text-right text-sm text-muted">{p.pending(questions.filter((q) => !isAnswered(q, answers[q.id])).length)}</p>
          ) : null}
        </section>
      ) : null}

      {videoDone && !current ? (
        <div>
          <button
            onClick={finish}
            disabled={finishing}
            className="cursor-pointer rounded-lg bg-opulent px-6 py-3 font-display font-semibold text-white disabled:opacity-50"
          >
            {isLast ? p.finishProgram : p.nextChapter} →
          </button>
        </div>
      ) : null}

      {celebrate ? <DoneDialog lang={lang} position={position} isLast={isLast} onContinue={afterCelebrate} /> : null}

      {rating ? (
        <RatingDialog
          lang={lang}
          onDone={async (stars, comment) => {
            if (stars) await rateProgram(programId, rating, stars, comment);
            if (rating === "mitad" && askFinal) setRating("final");
            else router.push(nextHref);
          }}
        />
      ) : null}
    </div>
  );
}

function DoneDialog({ lang, position, isLast, onContinue }: { lang: ProgramLang; position: number; isLast: boolean; onContinue: () => void }) {
  const p = programText(lang);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="done-title"
      onCancel={(e) => {
        e.preventDefault();
        onContinue();
      }}
      className="m-auto w-[min(92vw,440px)] rounded-2xl border border-line bg-surface p-7 text-center text-ink backdrop:bg-opulent/60"
    >
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-celeste/20 text-2xl text-opulent" aria-hidden>
        ✓
      </span>
      <h2 id="done-title" className="mt-4 font-display text-2xl font-semibold">
        {isLast ? p.doneLastTitle : p.doneTitle(position)}
      </h2>
      <p className="mt-2 text-muted">{isLast ? p.doneLast : p.doneNext}</p>
      <button
        type="button"
        autoFocus
        onClick={onContinue}
        className="mt-6 w-full cursor-pointer rounded-lg bg-opulent px-5 py-3 font-display font-semibold text-white"
      >
        {isLast ? p.seeReport : p.keepGoing} →
      </button>
    </dialog>
  );
}

function RatingDialog({ lang, onDone }: { lang: ProgramLang; onDone: (stars: number | null, comment: string) => Promise<void> }) {
  const p = programText(lang);
  const ref = useRef<HTMLDialogElement>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, start] = useTransition();

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="rate-title"
      onCancel={(e) => {
        e.preventDefault();
        start(() => onDone(null, ""));
      }}
      className="m-auto w-[min(92vw,440px)] rounded-2xl border border-line bg-surface p-6 text-ink backdrop:bg-opulent/60"
    >
      <h2 id="rate-title" className="font-display text-2xl font-semibold">
        {p.rateTitle}
      </h2>
      <div role="radiogroup" aria-label={p.rateTitle} className="mt-5 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={p.rateStars(n)}
            onClick={() => setStars(n)}
            className={`cursor-pointer text-4xl leading-none transition-transform hover:scale-110 ${n <= stars ? "text-[#e3a72f]" : "text-line"}`}
          >
            ★
          </button>
        ))}
      </div>
      {stars > 0 && stars <= 3 ? (
        <label className="mt-5 block">
          <span className="mb-1.5 block font-display text-sm font-medium">{p.improveQ}</span>
          <textarea
            value={comment}
            maxLength={2000}
            rows={4}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg p-3 text-[15px] outline-none focus:border-celeste"
          />
        </label>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" disabled={sending} onClick={() => start(() => onDone(null, ""))} className="cursor-pointer px-3 py-2 text-sm text-muted">
          {p.later}
        </button>
        <button
          type="button"
          disabled={!stars || sending}
          onClick={() => start(() => onDone(stars, comment))}
          className="cursor-pointer rounded-lg bg-opulent px-5 py-2.5 font-display text-sm font-semibold text-white disabled:opacity-50"
        >
          {p.send}
        </button>
      </div>
    </dialog>
  );
}
