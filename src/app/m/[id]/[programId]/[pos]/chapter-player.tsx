"use client";

import MuxPlayer from "@mux/mux-player-react/lazy";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { answerQuestion, completeChapter, heartbeat, rateProgram } from "@/app/actions/program";
import { programText, type ProgramLang } from "@/lib/i18n-program";
import type { ChapterContent } from "@/lib/programs";

type Answer = { optionId: string | null; text: string | null };

export function ChapterPlayer({
  lang,
  content,
  programId,
  completed,
  nextHref,
  isLast,
  askMid,
  askFinal,
}: {
  lang: ProgramLang;
  content: ChapterContent;
  programId: string;
  completed: boolean;
  nextHref: string;
  isLast: boolean;
  askMid: boolean;
  askFinal: boolean;
}) {
  const p = programText(lang);
  const router = useRouter();
  const [videoDone, setVideoDone] = useState(completed || !content.playbackId);
  const [answers, setAnswers] = useState<Record<string, Answer | null>>(
    Object.fromEntries(content.questions.map((q) => [q.id, q.answer])),
  );
  const [rating, setRating] = useState<"mitad" | "final" | null>(null);
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

  const pending = content.questions.filter((q) => {
    const a = answers[q.id];
    return !a || (q.kind === "simple" ? !a.optionId : !a.text);
  }).length;
  const canFinish = videoDone && pending === 0;

  function finish() {
    startFinish(async () => {
      if (!completed) {
        const seconds = Math.max(watched.current.seconds, (Date.now() - started.current) / 1000);
        const res = await completeChapter(content.id, seconds);
        if (!res.ok) return;
      }
      if (askMid) setRating("mitad");
      else if (askFinal) setRating("final");
      else router.push(nextHref);
    });
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {content.playbackId ? (
        <div className="overflow-hidden rounded-2xl bg-black">
          <MuxPlayer
            playbackId={content.playbackId}
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

      <fieldset disabled={!videoDone} className={`flex flex-col gap-6 ${videoDone ? "" : "opacity-50"}`}>
        {content.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i + 1}
            q={q}
            lang={lang}
            answer={answers[q.id]}
            onSaved={(a) => setAnswers((s) => ({ ...s, [q.id]: a }))}
          />
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={finish}
          disabled={!canFinish || finishing}
          className="cursor-pointer rounded-lg bg-opulent px-6 py-3 font-display font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLast ? p.finishProgram : p.nextChapter} →
        </button>
        {videoDone && pending > 0 ? <span className="text-sm text-muted">{p.pending(pending)}</span> : null}
      </div>

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

function QuestionCard({
  index,
  q,
  lang,
  answer,
  onSaved,
}: {
  index: number;
  q: ChapterContent["questions"][number];
  lang: ProgramLang;
  answer: Answer | null;
  onSaved: (a: Answer) => void;
}) {
  const p = programText(lang);
  const [text, setText] = useState(answer?.text ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(answer ? "saved" : "idle");

  async function save(optionId: string | null, value: string | null) {
    setState("saving");
    const res = await answerQuestion(q.id, optionId, value);
    if (res.ok) {
      setState("saved");
      onSaved({ optionId, text: value });
    } else setState("error");
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 md:p-6">
      <p className="font-mono text-xs text-muted">{index}</p>
      <h2 className="mt-1 text-[17px] font-medium leading-relaxed">{q.prompt}</h2>
      {q.kind === "simple" ? (
        <div role="radiogroup" aria-label={q.prompt} className="mt-4 flex flex-col gap-2">
          {q.options.map((o) => {
            const checked = answer?.optionId === o.id;
            return (
              <label
                key={o.id}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 text-[15px] leading-relaxed transition-colors ${
                  checked ? "border-celeste bg-celeste/10" : "border-line hover:border-celeste/60"
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  className="mt-1 accent-[#399ab8]"
                  checked={checked}
                  onChange={() => save(o.id, null)}
                />
                <span>{o.text}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <textarea
            value={text}
            maxLength={4000}
            rows={5}
            onChange={(e) => {
              setText(e.target.value);
              if (state === "saved") setState("idle");
            }}
            placeholder={p.writeHere}
            className="w-full rounded-xl border border-line bg-bg p-3.5 text-[15px] leading-relaxed outline-none focus:border-celeste"
          />
          <button
            type="button"
            onClick={() => save(null, text)}
            disabled={!text.trim() || state === "saving" || (state === "saved" && text === answer?.text)}
            className="mt-2 cursor-pointer rounded-lg border border-line px-4 py-2 font-display text-sm font-medium hover:border-celeste disabled:opacity-50"
          >
            {p.saveAnswer}
          </button>
        </div>
      )}
      <p aria-live="polite" className={`mt-2 h-4 text-xs ${state === "error" ? "text-danger" : "text-ok"}`}>
        {state === "saved" ? `✓ ${p.saved}` : state === "error" ? p.saveError : ""}
      </p>
    </section>
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
