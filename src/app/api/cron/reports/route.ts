import { timingSafeEqual } from "node:crypto";
import { requestIp, securityEvent } from "@/lib/health";
import { processClassReportQueue } from "@/lib/class-report";
import { processReportQueue } from "@/lib/report";

// Vercel Cron llama acá con "Authorization: Bearer $CRON_SECRET" para generar los reportes
// que quedaron en cola (sin saldo, tope del mes, errores de la IA).
export const maxDuration = 300;

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
  const [reports, classes] = await Promise.all([processReportQueue(5), processClassReportQueue(3)]);
  return Response.json({ ...reports, classes: classes.processed });
}
