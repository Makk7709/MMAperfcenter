import { INVITE_DAYS, INVITE_PATH } from "./contribution";

// An invitation opened while signed out is remembered on the device, so the
// invitee is brought back to it once signed in, even after an e-mail
// confirmation that opens a new tab.

const KEY = "korev.movementInvite";
const TOKEN = /^[0-9a-f]{64}$/;

export function rememberPendingInvite(token: string): void {
  if (!TOKEN.test(token)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() }));
  } catch {
    // Storage blocked: the invitee opens the link again after signing in.
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}

/** Path of the remembered invitation, if still within its validity. */
export function pendingInvitePath(): string | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { token?: unknown; at?: unknown } | null;
    if (typeof saved?.token !== "string" || !TOKEN.test(saved.token) || typeof saved.at !== "number") return null;
    if (Date.now() - saved.at > INVITE_DAYS * 24 * 60 * 60 * 1000) {
      clearPendingInvite();
      return null;
    }
    return `${INVITE_PATH}/${saved.token}`;
  } catch {
    return null;
  }
}
