// Centralized configuration for the external AI gateway used by ai-coach,
// ai-stats-analysis and analyze-sparring Edge Functions.
//
// Both URL and bearer token are read from Deno env so they can be rotated or
// pointed to an alternative provider without code changes. Historical env var
// names are still accepted to preserve backward compatibility with the
// currently provisioned Supabase secrets.

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
