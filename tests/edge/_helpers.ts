// Shared request/response helpers for offline Edge Function tests.

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

export function makeRequest(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: BodyInit | null } = {},
): Request {
  return new Request(url, {
    method: init.method ?? "POST",
    headers: init.headers ?? { "content-type": "application/json" },
    body: init.body ?? null,
  });
}

export function jsonResponse(status: number, payload: JsonValue): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function readJson(res: Response): Promise<JsonValue> {
  return await res.json();
}
