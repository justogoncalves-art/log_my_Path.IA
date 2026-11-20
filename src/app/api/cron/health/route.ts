import { timingSafeEqual } from "node:crypto";
import { requestIp, runHealthCheck, securityEvent } from "@/lib/health";

// Respaldo diario del control de salud (Vercel Cron), por si la base no puede avisar al servidor.
export const maxDuration = 60;

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    await securityEvent("cron_no_autorizado", requestIp(request.headers));
    return new Response("No autorizado", { status: 401 });
  }
  return Response.json(await runHealthCheck());
}
