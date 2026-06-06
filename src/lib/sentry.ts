import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = (import.meta.env.MODE || "development") as string;

export function initSentry() {
  if (!DSN) {
    if (import.meta.env.DEV) {
      console.info("[Sentry] disabled (no VITE_SENTRY_DSN configured)");
    }
    return;
  }
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    tracesSampleRate: ENV === "production" ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: ENV === "production" ? 1 : 0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    beforeSend(event) {
      // Filtrer les erreurs réseau triviales
      const msg = event.message || event.exception?.values?.[0]?.value || "";
      if (/NetworkError|Failed to fetch|Load failed/i.test(msg)) return null;
      return event;
    },
  });
}

export * as Sentry from "@sentry/react";
