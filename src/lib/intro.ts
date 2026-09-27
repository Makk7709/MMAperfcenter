export const INTRO_SEEN_KEY = "korev.intro.seen";

/** Pages reached from an email or Stripe link: the visitor expects their content at once. */
const SKIPPED_PATHS = ["/payment-success", "/reset-password", "/legal"];

interface IntroContext {
  pathname: string;
  seen: boolean;
  reducedMotion: boolean;
  /** Data saver on, or a 2G/3G-class connection: 1.4 MB of video is not worth it. */
  constrainedNetwork?: boolean;
  /** Landing from an auth e-mail (sign-up confirmation, magic link) on any path. */
  fromAuthLink?: boolean;
}

/** The intro plays once per browser session, on app entry pages only. */
export function shouldPlayIntro({ pathname, seen, reducedMotion, constrainedNetwork, fromAuthLink }: IntroContext): boolean {
  if (seen || reducedMotion || constrainedNetwork || fromAuthLink) return false;
  return !SKIPPED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function readIntroContext(): IntroContext {
  let seen = false;
  try {
    seen = sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    // Storage blocked (private mode): play it, the flag just won't persist.
  }
  // Network Information API: Chromium only, absent elsewhere (then: play).
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  return {
    pathname: window.location.pathname,
    seen,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    constrainedNetwork:
      connection?.saveData === true || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? ""),
    // Supabase auth links come back with ?code=… (PKCE) or #access_token=….
    fromAuthLink:
      new URLSearchParams(window.location.search).has("code") || window.location.hash.includes("access_token="),
  };
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Same as above.
  }
}
