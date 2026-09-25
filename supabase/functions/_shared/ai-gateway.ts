// Centralized configuration for the external AI gateway used by ai-coach,
// ai-stats-analysis and analyze-sparring Edge Functions.
//
// Both URL and bearer token are read from Deno env so they can be rotated or
// pointed to an alternative provider without code changes. Historical env var
// names are still accepted to preserve backward compatibility with the
// currently provisioned Supabase secrets.

import { PublicError } from "./http.ts";

export const AI_GATEWAY_URL =
  Deno.env.get("AI_GATEWAY_URL") ??
  "https://ai-gateway.internal/v1/chat/completions";

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

// Streaming chat completion. Throws a PublicError when the gateway refuses.
export async function streamChatCompletion(body: Record<string, unknown>): Promise<ReadableStream<Uint8Array> | null> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAiGatewayKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, stream: true }),
  });
  await assertGatewayOk(response);
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
