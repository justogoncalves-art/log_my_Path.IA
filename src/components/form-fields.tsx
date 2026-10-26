"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function Field({
  label,
  hint,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = input.id ?? input.name;
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block font-display text-sm font-medium">{label}</span>
      <input
        id={id}
        {...input}
        className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-faint focus:border-celeste"
      />
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full cursor-pointer rounded-lg bg-opulent px-5 py-3 font-display text-[15px] font-semibold text-white transition-[transform,opacity] hover:-translate-y-px disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      {message}
    </p>
  );
}

// Contraseña con botón de ojo para ver lo que se escribe
export function PasswordField({
  label,
  hint,
  showLabel,
  hideLabel,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; showLabel: string; hideLabel: string }) {
  const id = input.id ?? input.name;
  const [visible, setVisible] = useState(false);
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block font-display text-sm font-medium">{label}</span>
      <span className="relative block">
        <input
          id={id}
          {...input}
          type={visible ? "text" : "password"}
          className="w-full rounded-lg border border-line bg-surface py-3 pl-4 pr-12 text-[15px] outline-none transition-colors placeholder:text-faint focus:border-celeste"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible ? null : <path d="M3 3l18 18" />}
          </svg>
        </button>
      </span>
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
