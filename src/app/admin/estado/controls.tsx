"use client";

import { checkHealthNow, setHealthSettings } from "@/app/admin/actions";
import { ActionForm, btnGhostCls, inputCls, Label, Result, useAction } from "@/app/admin/ui";

export function HealthControls({ appUrl, enabled }: { appUrl: string; enabled: boolean }) {
  const { pending, result, run } = useAction();
  return (
    <section className="mt-8 rounded-xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Configuración</h2>
        <div className="flex items-center gap-3">
          <Result result={result} />
          <button className={btnGhostCls} disabled={pending} onClick={() => run(checkHealthNow)}>
            {pending ? "Midiendo…" : "Medir ahora"}
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        Los avisos llegan al «Mail para avisos» de Resumen → IA. La base avisa a la plataforma cada 5 minutos en esta dirección
        (en producción: https://app.mypathia.app). Sin dirección, la CPU, la RAM y los mails se actualizan una vez por día o con «Medir ahora».
      </p>
      <ActionForm action={setHealthSettings} submit="Guardar" className="mt-4 flex flex-col gap-4">
        <div className="max-w-xl">
          <Label text="Dirección pública de la plataforma">
            <input name="app_url" type="url" defaultValue={appUrl} placeholder="https://app.mypathia.app" className={inputCls} />
          </Label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4" />
          Enviar alertas por mail
        </label>
      </ActionForm>
    </section>
  );
}
