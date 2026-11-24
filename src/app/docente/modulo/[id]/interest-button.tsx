"use client";

import { useState, useTransition } from "react";
import { registerInterest } from "@/app/docente/actions";

export function InterestButton({ moduleId, lang }: { moduleId: string; lang: "es" | "en" }) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const en = lang === "en";
  if (done) {
    return <p className="rounded-lg bg-ok/10 px-4 py-3 text-sm text-ok">✓ {en ? "Thanks! The MY PATH team will contact you." : "¡Gracias! El equipo de MY PATH se va a comunicar con ustedes."}</p>;
  }
  return (
    <button
      onClick={() => start(async () => setDone((await registerInterest(moduleId)).ok))}
      disabled={pending}
      className="cursor-pointer rounded-lg bg-opulent px-6 py-3 font-display font-semibold text-white disabled:opacity-50"
    >
      {en ? "I want to know more" : "Quiero saber más"}
    </button>
  );
}
