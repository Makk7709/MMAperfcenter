// When the current session signed in (password, magic link, OAuth…), in ms.
// Read from the `amr` claim, which keeps the original sign-in time across
// token refreshes. Only call it after requireUser() has validated the token.
export function sessionSignInMs(req: Request): number | null {
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    const times = Array.isArray(claims?.amr)
      ? claims.amr.map((entry: { timestamp?: unknown }) => entry?.timestamp).filter(
        (t: unknown): t is number => typeof t === "number" && Number.isFinite(t),
      )
      : [];
    return times.length > 0 ? Math.max(...times) * 1000 : null;
  } catch {
    return null;
  }
}
