import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { KorevLogo } from "@/components/brand/KorevLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-korev-deep">
      <div aria-hidden className="korev-grid absolute inset-0" />
      <main className="relative flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <KorevLogo className="h-10" />
        <p className="korev-eyebrow mt-10 text-korev-gold">Erreur 404</p>
        <h1 className="korev-display mt-3 text-4xl sm:text-5xl">Page introuvable</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </main>
    </div>
  );
};

export default NotFound;
