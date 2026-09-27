import type { ReactNode } from "react";
import { Sentry } from "@/lib/sentry";
import { Button } from "@/components/ui/button";

interface WidgetBoundaryProps {
  children: ReactNode;
  /** Shown instead of the widget when it crashes; hidden entirely when false. */
  label?: string | false;
}

// A crash in one dashboard block (bad feed data, unexpected API shape) must
// not replace the whole app with the global error screen.
export function WidgetBoundary({ children, label = "Ce bloc" }: WidgetBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) =>
        label === false ? <></> : (
          <div className="liquid-glass-solid rounded-lg p-4 text-sm text-muted-foreground flex items-center justify-between gap-3">
            <span>{label} n'a pas pu s'afficher.</span>
            <Button variant="outline" size="sm" onClick={resetError}>Réessayer</Button>
          </div>
        )
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
