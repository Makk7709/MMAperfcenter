import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppErrorFallbackProps {
  resetError: () => void;
}

// Rendered outside the router and providers: only plain navigation is safe here.
export function AppErrorFallback({ resetError }: AppErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-6">
        <AlertTriangle className="h-12 w-12 text-primary mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
          <p className="text-muted-foreground">
            Vous pouvez réessayer ou revenir à l'accueil.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" className="gap-2" onClick={resetError}>
            <RotateCcw className="h-4 w-4" /> Réessayer
          </Button>
          <Button className="gap-2" onClick={() => window.location.assign("/")}>
            <Home className="h-4 w-4" /> Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
