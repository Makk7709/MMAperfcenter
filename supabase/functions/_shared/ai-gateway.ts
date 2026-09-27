// Centralized configuration for the external AI gateway used by ai-coach,
// ai-stats-analysis and analyze-sparring Edge Functions.
//
// Both URL and bearer token are read from Deno env so they can be rotated or
// pointed to an alternative provider without code changes. Historical env var
// names are still accepted to preserve backward compatibility with the
// currently provisioned Supabase secrets.

import { PublicError } from "./http.ts";

export function getAiGatewayUrl(): string {
  const url = Deno.env.get("AI_GATEWAY_URL");
  if (!url) throw new Error("AI gateway URL is not configured (set AI_GATEWAY_URL)");
  return url;
}

export function getAiGatewayKey(): string {
  const key =
    Deno.env.get("AI_GATEWAY_API_KEY") ?? Deno.env.get("LEGACY_AI_GATEWAY_KEY");
  if (!key) {
    throw new Error(
      "AI gateway API key is not configured (set AI_GATEWAY_API_KEY)",
    );
  }
  return key;
}

// Model names change when the provider retires one: they are secrets
// (AI_MODEL_FAST / AI_MODEL_PRO), so switching needs no redeploy of the code.
const DEFAULT_MODELS = {
  fast: "google/gemini-2.5-flash",
  pro: "google/gemini-2.5-pro",
} as const;

export function aiModel(kind: keyof typeof DEFAULT_MODELS): string {
  const name = kind === "fast" ? Deno.env.get("AI_MODEL_FAST") : Deno.env.get("AI_MODEL_PRO");
  return name?.trim() || DEFAULT_MODELS[kind];
}

// Time allowed for the gateway to start answering. The stream itself is not
// bounded here: a long answer keeps flowing after the headers arrive.
const FIRST_BYTE_TIMEOUT_MS = 30_000;

// Streaming chat completion. Throws a PublicError when the gateway refuses
// or does not answer in time.
export async function streamChatCompletion(body: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIRST_BYTE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(getAiGatewayUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAiGatewayKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal: controller.signal,
    });
  } catch (error) {
    console.error("AI gateway unreachable:", error instanceof Error ? error.message : String(error));
    throw new PublicError("Le service IA ne répond pas, réessayez dans quelques instants.", 504);
  } finally {
    clearTimeout(timer);
  }
  await assertGatewayOk(response);
  if (!response.body) throw new Error("AI gateway returned no stream body");
  return response.body;
}

export async function assertGatewayOk(response: Response): Promise<void> {
  if (response.ok) return;
  const detail = await response.text().catch(() => "");
  console.error("AI gateway error:", response.status, detail.substring(0, 500));
  if (response.status === 429) {
    throw new PublicError("Limite de requêtes atteinte, réessayez dans quelques instants.", 429);
  }
  if (response.status === 402) {
    throw new PublicError("Service IA momentanément indisponible, contactez le support.", 503);
  }
  if (response.status === 413) {
    throw new PublicError("Contenu trop volumineux pour l'analyse.", 413);
  }
  throw new PublicError("Erreur du service IA, réessayez plus tard.", 502);
}
