"use client";

import { useState } from "react";
import { cancelWelcome, scheduleWelcome, sendWelcomeNow } from "@/app/admin/actions";
import { ActionForm, btnGhostCls, inputCls, Label, Result, useAction } from "@/app/admin/ui";
import type { Campaign } from "@/lib/admin-data";

const STATUS: Record<string, string> = { programado: "Programado", enviando: "Enviando", enviado: "Enviado", cancelado: "Cancelado" };

const SAMPLE = `<p>Hola {{nombre}}:</p>
<p>Te damos la bienvenida a MY PATH.IA.</p>
<p>Tu usuario es <strong>{{mail}}</strong> y tu contraseña inicial es <strong>{{contrasena}}</strong>.</p>
<p>Entrá en <a href="{{link}}">{{link}}</a>. La primera vez te vamos a pedir que elijas una contraseña propia.</p>`;

export function CampaignList({ campaigns, classNames }: { campaigns: Campaign[]; classNames: Record<string, string> }) {
  const a = useAction();
  if (!campaigns.length) return <p className="mt-3 text-sm text-muted">Todavía no hay mails programados.</p>;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="text-left text-xs text-muted">
          <tr>
            <th className="border-b border-line px-2 py-2 font-semibold">Fecha</th>
            <th className="border-b border-line px-2 py-2 font-semibold">Asunto</th>
            <th className="border-b border-line px-2 py-2 font-semibold">Para</th>
            <th className="border-b border-line px-2 py-2 font-semibold">Estado</th>
            <th className="border-b border-line px-2 py-2 font-semibold">Enviados</th>
            <th className="border-b border-line px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id}>
              <td className="border-b border-line/60 px-2 py-2">{new Date(c.send_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</td>
              <td className="border-b border-line/60 px-2 py-2">{c.subject}</td>
              <td className="border-b border-line/60 px-2 py-2">
                {c.class_id ? classNames[c.class_id] ?? "Clase" : "Toda la organización"}
                {c.only_new ? <span className="block text-xs text-muted">Solo quienes no ingresaron</span> : null}
              </td>
              <td className="border-b border-line/60 px-2 py-2">{STATUS[c.status] ?? c.status}</td>
              <td className="border-b border-line/60 px-2 py-2">
                {c.sent_count}
                {c.failed_count ? <span className="text-danger"> · {c.failed_count} con error</span> : null}
              </td>
              <td className="border-b border-line/60 px-2 py-2 text-right">
                {c.status === "programado" || c.status === "enviando" ? (
                  <span className="inline-flex gap-2">
                    <button
                      className={btnGhostCls}
                      disabled={a.pending}
                      onClick={() => a.run(() => sendWelcomeNow(c.id), "¿Enviar ahora? Se generan las contraseñas y salen los mails.")}
                    >
                      Enviar ahora
                    </button>
                    {c.status === "programado" ? (
                      <button className={btnGhostCls} disabled={a.pending} onClick={() => a.run(() => cancelWelcome(c.id), "¿Cancelar este envío?")}>
                        Cancelar
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3">{a.pending ? <span className="text-sm text-muted">Procesando…</span> : <Result result={a.result} />}</div>
    </div>
  );
}

function preview(html: string) {
  const values: Record<string, string> = { nombre: "Ana", apellido: "Prueba", mail: "ana@colegio.edu", contrasena: "Xk7pR2mQ9a", link: "https://app.mypathia.app/login" };
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => values[k] ?? m);
}

export function WelcomeForm({ orgId, classes }: { orgId: string; classes: Array<{ id: string; name: string }> }) {
  const [html, setHtml] = useState(SAMPLE);
  // Diferencia con UTC de la fecha elegida, según el navegador (respeta horario de verano)
  const [tz, setTz] = useState(0);

  async function loadFile(file?: File) {
    if (!file || file.size > 200_000) return;
    setHtml(await file.text());
  }

  return (
    <ActionForm action={scheduleWelcome} submit="Programar" className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="org" value={orgId} />
      <input type="hidden" name="tz" value={tz} />
      <div className="grid gap-3 md:grid-cols-3">
        <Label text="Para">
          <select name="classId" className={inputCls} defaultValue="">
            <option value="">Toda la organización</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Label>
        <Label text="Fecha y hora de envío">
          <input
            type="datetime-local"
            name="sendAt"
            required
            className={inputCls}
            onChange={(e) => setTz(new Date(e.target.value).getTimezoneOffset())}
          />
        </Label>
        <Label text="Asunto">
          <input name="subject" required maxLength={200} defaultValue="Bienvenido a MY PATH.IA" className={inputCls} />
        </Label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="onlyNew" defaultChecked /> Solo a quienes todavía no ingresaron (no le cambia la contraseña a quien ya entró)
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sm font-medium">Plantilla HTML</span>
            <label className="cursor-pointer text-sm text-celeste underline">
              Subir .html
              <input type="file" accept=".html,text/html" className="sr-only" onChange={(e) => loadFile(e.target.files?.[0])} />
            </label>
          </div>
          <textarea
            name="html"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={16}
            className={`${inputCls} mt-1 font-mono text-xs`}
          />
          <p className="mt-1 text-xs text-muted">
            Campos: {"{{nombre}}"}, {"{{apellido}}"}, {"{{mail}}"}, {"{{contrasena}}"} (obligatorio) y {"{{link}}"}.
          </p>
        </div>
        <div>
          <span className="font-display text-sm font-medium">Vista previa</span>
          <iframe title="Vista previa del mail" sandbox="" srcDoc={preview(html)} className="mt-1 h-[340px] w-full rounded-lg border border-line bg-white" />
          <p className="mt-1 text-xs text-muted">Las imágenes externas no se ven en la vista previa, pero sí en el mail.</p>
        </div>
      </div>
    </ActionForm>
  );
}
