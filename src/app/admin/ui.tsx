"use client";

import { useActionState, useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/actions";

export const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-celeste";
export const btnCls =
  "cursor-pointer rounded-lg bg-opulent px-4 py-2 font-display text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhostCls =
  "cursor-pointer rounded-lg border border-line bg-surface px-3 py-1.5 font-display text-sm font-medium hover:border-celeste disabled:opacity-50";

export function Result({ result }: { result?: ActionResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="text-sm text-ok">
      {result.message ?? "Listo"}
    </p>
  ) : (
    <p role="alert" className="text-sm text-danger">
      {result.error}
    </p>
  );
}

// Formulario conectado a una server action que devuelve ActionResult
export function ActionForm({
  action,
  children,
  submit,
  className,
}: {
  action: (prev: ActionResult | undefined, form: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submit: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnCls}>
          {pending ? "Guardando…" : submit}
        </button>
        <Result result={state} />
      </div>
    </form>
  );
}

// Para acciones que se llaman desde un botón
export function useAction() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  function run(fn: () => Promise<ActionResult>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => setResult(await fn()));
  }
  return { pending, result, run, clear: () => setResult(null) };
}

export function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-sm font-medium">{text}</span>
      {children}
    </label>
  );
}
