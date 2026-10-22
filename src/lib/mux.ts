import "server-only";
import { createSign } from "node:crypto";
import type { MuxAssetInfo } from "@/lib/mux-match";

// Mux: firma de reproducción (videos "signed") y lectura de los videos del entorno MY PATH.
// Claves en Vercel: MUX_SIGNING_KEY_ID / MUX_SIGNING_KEY_PRIVATE (firma) y MUX_TOKEN_ID / MUX_TOKEN_SECRET (lectura).

const b64url = (v: Buffer | string) => Buffer.from(v).toString("base64url");

export function muxSigningConfigured() {
  return Boolean(process.env.MUX_SIGNING_KEY_ID && process.env.MUX_SIGNING_KEY_PRIVATE);
}

export type PlaybackTokens = { playback: string; thumbnail: string; storyboard: string };

// Permiso temporal para un video: vale unas horas y solo para ese Playback ID
export function signPlayback(playbackId: string, hours = 6): PlaybackTokens | null {
  const kid = process.env.MUX_SIGNING_KEY_ID;
  const keyB64 = process.env.MUX_SIGNING_KEY_PRIVATE;
  if (!kid || !keyB64) return null;
  const key = Buffer.from(keyB64, "base64").toString("utf8");
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;
  const sign = (aud: "v" | "t" | "s") => {
    const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
    const body = b64url(JSON.stringify({ sub: playbackId, aud, exp, kid }));
    const signer = createSign("RSA-SHA256");
    signer.update(`${head}.${body}`);
    return `${head}.${body}.${b64url(signer.sign(key))}`;
  };
  return { playback: sign("v"), thumbnail: sign("t"), storyboard: sign("s") };
}

export type MuxAsset = MuxAssetInfo;

export function muxApiConfigured() {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

// Todos los videos del entorno (hasta 1000)
export async function listMuxAssets(): Promise<MuxAsset[]> {
  const id = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;
  if (!id || !secret) throw new Error("Faltan MUX_TOKEN_ID y MUX_TOKEN_SECRET");
  const auth = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  const out: MuxAsset[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://api.mux.com/video/v1/assets?limit=100&page=${page}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Mux respondió ${res.status}`);
    const json = (await res.json()) as {
      data: Array<{
        id: string;
        status: string;
        duration?: number;
        created_at: string;
        passthrough?: string;
        meta?: { title?: string };
        playback_ids?: Array<{ id: string; policy: string }>;
      }>;
    };
    for (const a of json.data) {
      const pb = a.playback_ids?.find((p) => p.policy === "signed") ?? a.playback_ids?.[0];
      out.push({
        id: a.id,
        title: a.meta?.title || a.passthrough || "",
        playbackId: pb?.id ?? null,
        signed: pb?.policy === "signed",
        status: a.status,
        duration: a.duration ?? null,
        createdAt: new Date(Number(a.created_at) * 1000).toISOString(),
      });
    }
    if (json.data.length < 100) break;
  }
  return out;
}
