export const INTRO_SEEN_KEY = "korev.intro.seen";

/** Pages reached from an email or Stripe link: the visitor expects their content at once. */
const SKIPPED_PATHS = ["/payment-success", "/reset-password", "/legal"];

interface IntroContext {
  pathname: string;
  seen: boolean;
  reducedMotion: boolean;
}

/** The intro plays once per browser session, on app entry pages only. */
export function shouldPlayIntro({ pathname, seen, reducedMotion }: IntroContext): boolean {
  if (seen || reducedMotion) return false;
  return !SKIPPED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function readIntroContext(): IntroContext {
  let seen = false;
  try {
    seen = sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    // Storage blocked (private mode): play it, the flag just won't persist.
  }
  return {
    pathname: window.location.pathname,
    seen,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  };
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Same as above.
  }
}
