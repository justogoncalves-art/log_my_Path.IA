import { requestIp, runHealthCheck, securityEvent } from "@/lib/health";
import { serviceClient } from "@/lib/supabase/admin";

// La base llama acá cada 5 minutos (pg_cron + pg_net) con su token interno:
// el servidor suma CPU, RAM, disco y tiempos de respuesta, y manda las alertas pendientes.
export const maxDuration = 60;

export async function POST(request: Request) {
  const token = request.headers.get("x-health-token") ?? "";
  const db = serviceClient();
  const valid = /^[0-9a-f]{64}$/.test(token) && db ? (await db.rpc("health_ping_valid", { p_token: token })).data === true : false;
  if (!valid) {
    await securityEvent("ping_no_autorizado", requestIp(request.headers));
    return new Response("No autorizado", { status: 401 });
  }
  return Response.json(await runHealthCheck());
}
