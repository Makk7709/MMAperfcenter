// CORS + JSON helpers shared by every Edge Function.
//
// ALLOWED_ORIGINS (comma-separated) restricts browser origins in production,
// e.g. "https://app.korev-ai.com,http://localhost:8080". When unset, any origin
// is accepted so local development keeps working.

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOW_HEADERS = "authorization, x-client-info, apikey, content-type";

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  let allowOrigin = "*";
  if (ALLOWED_ORIGINS.length > 0) {
    allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

// Base URL used for redirects back to the app (Stripe success/cancel/return).
// SITE_URL is authoritative; otherwise the request origin is used only if it
// is an allowed origin (or when no allow-list is configured, in development).
export function appBaseUrl(req: Request): string {
  const site = Deno.env.get("SITE_URL");
  if (site) return site.replace(/\/+$/, "");
  const origin = req.headers.get("origin") ?? "";
  if (origin && (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))) return origin;
  throw new Error("SITE_URL is not configured and the request origin is not allowed");
}

export function preflight(req: Request): Response | null {
  return req.method === "OPTIONS" ? new Response(null, { headers: corsHeaders(req) }) : null;
}

export function jsonResponse(req: Request, body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", ...extraHeaders },
  });
}

export function streamResponse(req: Request, body: ReadableStream<Uint8Array> | null): Response {
  return new Response(body, {
    headers: { ...corsHeaders(req), "Content-Type": "text/event-stream" },
  });
}

// Error raised on purpose with a message that is safe to show to the user.
export class PublicError extends Error {
  constructor(message: string, readonly status = 400, readonly code?: string) {
    super(message);
  }
}

// Converts any thrown value into a response without leaking internal details.
export function errorResponse(req: Request, error: unknown, context: string): Response {
  if (error instanceof PublicError) {
    return jsonResponse(req, { error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status);
  }
  console.error(`[${context}]`, error);
  return jsonResponse(req, { error: "Erreur interne, réessayez plus tard." }, 500);
}
