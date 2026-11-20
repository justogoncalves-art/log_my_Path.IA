import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { mailConfigured, sendBatch } from "@/lib/mail";
import { serviceClient } from "@/lib/supabase/admin";

// Control de salud de la plataforma: CPU, RAM y disco de la base (métricas de Supabase, formato Prometheus),
// tiempo de respuesta de la base y del login, y envío de las alertas pendientes por mail.

type Prom = { name: string; labels: Record<string, string>; value: number }[];

function parseProm(text: string): Prom {
  const out: Prom = [];
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([a-zA-Z_:][\w:]*)(?:\{([^}]*)\})?\s+([-+eE\d.]+|NaN)/);
    if (!m) continue;
    const labels: Record<string, string> = {};
    for (const l of (m[2] ?? "").matchAll(/(\w+)="([^"]*)"/g)) labels[l[1]] = l[2];
    out.push({ name: m[1], labels, value: Number(m[3]) });
  }
  return out;
}

const sum = (p: Prom, name: string, f: (l: Record<string, string>) => boolean = () => true) =>
  p.filter((x) => x.name === name && f(x.labels)).reduce((a, x) => a + x.value, 0);

// Métricas del servidor de la base. Requiere la clave secreta (Basic auth service_role:<clave>).
async function infraMetrics() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${env.supabaseUrl}/customer/v1/privileged/metrics`, {
      headers: { Authorization: `Basic ${Buffer.from(`service_role:${key}`).toString("base64")}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return { infra_error: res.status };
    const p = parseProm(await res.text());
    const cpuTotal = sum(p, "node_cpu_seconds_total");
    const cpuIdle = sum(p, "node_cpu_seconds_total", (l) => l.mode === "idle" || l.mode === "iowait");
    const memTotal = sum(p, "node_memory_MemTotal_bytes");
    const memAvail = sum(p, "node_memory_MemAvailable_bytes");
    const root = (l: Record<string, string>) => l.mountpoint === "/data" || l.mountpoint === "/";
    const diskSize = sum(p, "node_filesystem_size_bytes", root);
    const diskAvail = sum(p, "node_filesystem_avail_bytes", root);
    return {
      cpu_total_s: cpuTotal,
      cpu_idle_s: cpuIdle,
      cores: new Set(p.filter((x) => x.name === "node_cpu_seconds_total").map((x) => x.labels.cpu)).size || null,
      load1: sum(p, "node_load1") || null,
      mem_pct: memTotal ? Math.round((1 - memAvail / memTotal) * 1000) / 10 : null,
      mem_total_bytes: memTotal || null,
      disk_pct: diskSize ? Math.round((1 - diskAvail / diskSize) * 1000) / 10 : null,
      disk_total_bytes: diskSize || null,
    };
  } catch {
    return { infra_error: "red" };
  }
}

async function timed<T>(fn: () => Promise<T>) {
  const t = performance.now();
  try {
    const value = await fn();
    return { ok: true as const, ms: Math.round(performance.now() - t), value };
  } catch {
    return { ok: false as const, ms: Math.round(performance.now() - t), value: null };
  }
}

export async function runHealthCheck() {
  const db = serviceClient();
  if (!db) return { ok: false };
  const [infra, dbProbe, authProbe, prev] = await Promise.all([
    infraMetrics(),
    timed(async () => {
      const { error } = await db.rpc("health_last_server");
      if (error) throw error;
    }),
    timed(async () => {
      const res = await fetch(`${env.supabaseUrl}/auth/v1/health`, { headers: { apikey: env.supabasePublishableKey }, signal: AbortSignal.timeout(8000), cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
    }),
    db.rpc("health_last_server").then((r) => r.data as Record<string, number> | null),
  ]);

  // % de CPU = tiempo no ocioso entre esta lectura y la anterior
  let cpu_pct: number | null = null;
  const total = infra && "cpu_total_s" in infra ? (infra.cpu_total_s ?? 0) : 0;
  const idle = infra && "cpu_idle_s" in infra ? (infra.cpu_idle_s ?? 0) : 0;
  if (total && prev?.cpu_total_s && total > prev.cpu_total_s) {
    const dt = total - prev.cpu_total_s;
    const di = idle - (prev.cpu_idle_s ?? 0);
    cpu_pct = Math.max(0, Math.min(100, Math.round((1 - di / dt) * 1000) / 10));
  }
  const metrics = { ...infra, cpu_pct, db_ok: dbProbe.ok, db_ms: dbProbe.ms, auth_ok: authProbe.ok, auth_ms: authProbe.ms };
  await db.rpc("health_record_server", { p_metrics: metrics });
  await sendPendingAlerts();
  return { ok: true };
}

const escape = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Un solo mail con todas las alertas nuevas
export async function sendPendingAlerts() {
  const db = serviceClient();
  if (!db || !mailConfigured()) return 0;
  const { data } = await db.rpc("health_pending_alerts");
  const alerts = (data ?? []) as { id: number; level: string; message: string; created_at: string }[];
  if (!alerts.length) return 0;
  const { data: settings } = await db.from("ai_settings").select("alert_email").eq("id", 1).maybeSingle();
  const to = settings?.alert_email || process.env.ALERT_EMAIL;
  if (!to) return 0;
  const critical = alerts.some((a) => a.level === "critico");
  const fmt = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });
  const rows = alerts.map((a) => `<li><strong>${a.level === "critico" ? "CRÍTICO" : "Aviso"}</strong> · ${escape(fmt.format(new Date(a.created_at)))} · ${escape(a.message)}</li>`).join("");
  const sent = await sendBatch([
    {
      to,
      subject: `MY PATH · ${critical ? "ALERTA CRÍTICA" : "Aviso"} de la plataforma (${alerts.length})`,
      html: `<p>Se detectó lo siguiente:</p><ul>${rows}</ul><p>Más detalle en admin → Estado.</p>`,
    },
  ]).catch(() => [false]);
  if (sent[0]) await db.rpc("health_mark_notified", { p_ids: alerts.map((a) => a.id) });
  return alerts.length;
}

// Evento de seguridad con la huella de la IP (nunca la IP)
export async function securityEvent(kind: "share_invalido" | "login_bloqueado" | "recuperar_bloqueado" | "cron_no_autorizado" | "ping_no_autorizado", ip: string) {
  const db = serviceClient();
  if (!db) return;
  const ipHash = createHmac("sha256", process.env.SUPABASE_SECRET_KEY ?? "").update(ip).digest("hex");
  await db.rpc("security_event", { p_kind: kind, p_ip_hash: ipHash }).then(() => undefined, () => undefined);
}

export function requestIp(h: Headers) {
  return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || "sin-ip";
}
