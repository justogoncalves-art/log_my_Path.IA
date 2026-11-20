"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/campus";
import { campusText, type CampusLang } from "@/lib/i18n-campus";

// Corazón para guardar una carrera o universidad en favoritos
export function FavoriteButton({ kind, id, saved, lang, variant = "light" }: {
  kind: "carrera" | "universidad"; id: string; saved: boolean; lang: CampusLang; variant?: "light" | "overlay";
}) {
  const c = campusText(lang);
  const [on, setOn] = useState(saved);
  const [pending, start] = useTransition();
  const label = on ? c.unsave : c.save;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOn(!on);
          const r = await toggleFavorite(kind, id);
          if (r === null) setOn(on);
          else setOn(r);
        })
      }
      className={`inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${
        variant === "overlay" ? "bg-white/90 hover:bg-white" : "border border-line bg-surface hover:border-celeste"
      } ${on ? "text-danger" : "text-muted"}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
        <path d="M12 20s-7-4.4-9.2-8.6C1.4 8.7 3 5.5 6.2 5.1c1.9-.2 3.3.8 4.1 2 .4.6 1 .6 1.4 0 .8-1.2 2.2-2.2 4.1-2 3.2.4 4.8 3.6 3.4 6.3C19 15.6 12 20 12 20Z" />
      </svg>
    </button>
  );
}
