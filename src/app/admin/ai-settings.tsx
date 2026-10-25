"use client";

import { setAiSettings } from "@/app/admin/actions";
import { ActionForm, inputCls, Label } from "@/app/admin/ui";

export function AiSettingsForm({ enabled, budget, daily, email }: { enabled: boolean; budget: number; daily: number; email: string }) {
  return (
    <ActionForm action={setAiSettings} submit="Guardar" className="mt-5 flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4" />
        Generar reportes con IA (si lo apagás, quedan en cola)
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <Label text="Tope mensual (US$)">
          <input name="budget" type="number" min={0} max={1000} step="1" defaultValue={budget} className={inputCls} />
        </Label>
        <Label text="Máximo de llamadas en 24 h">
          <input name="daily" type="number" min={0} max={5000} step="1" defaultValue={daily} className={inputCls} />
        </Label>
        <Label text="Mail para avisos">
          <input name="email" type="email" defaultValue={email} placeholder="admin@…" className={inputCls} />
        </Label>
      </div>
    </ActionForm>
  );
}
