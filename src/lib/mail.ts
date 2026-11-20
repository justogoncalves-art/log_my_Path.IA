import "server-only";
import { headers } from "next/headers";

// Envío por Resend (send.mypathia.app). La clave vive en RESEND_API_KEY, nunca en el código.

export type Mail = { to: string; subject: string; html: string };

const FROM = process.env.MAIL_FROM ?? "MY PATH.IA <hola@send.mypathia.app>";

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Reemplaza {{nombre}}, {{apellido}}, {{mail}}, {{contrasena}} y {{link}} con los datos escapados
export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? escapeHtml(values[key]) : match,
  );
}

// Hasta 100 mails por llamada. Devuelve, por mail, si salió o no.
export async function sendBatch(mails: Mail[]): Promise<boolean[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY");
  const results: boolean[] = [];
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(chunk.map((m) => ({ from: FROM, to: [m.to], subject: m.subject, html: m.html }))),
    });
    results.push(...chunk.map(() => res.ok));
  }
  return results;
}

const PROD_URL = "https://app.mypathia.app";

// Dirección de la plataforma para los links de los mails: en producción la oficial;
// en la versión de prueba, la misma desde la que se hizo el envío.
export async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_ENV === "production") return PROD_URL;
  try {
    const host = (await headers()).get("host") ?? "";
    if (/^[a-z0-9-]+\.vercel\.app$/.test(host) || /^localhost(:\d+)?$/.test(host)) {
      return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
    }
  } catch {
    // Fuera de una petición (no debería pasar)
  }
  return PROD_URL;
}
