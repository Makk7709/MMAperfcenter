import { Link } from "react-router-dom";
import { Shield, Mail, ExternalLink } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tighter text-primary">KOREV</span>
              <span className="text-sm text-muted-foreground">AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Performance Center — Votre coach IA pour l'excellence en MMA
            </p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Liens utiles</h3>
            <nav className="flex flex-col gap-2">
              <Link 
                to="/pricing" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Tarifs & Abonnements
              </Link>
              <Link 
                to="/training-videos" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Vidéos d'entraînement
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Légal</h3>
            <nav className="flex flex-col gap-2">
              <Link 
                to="/legal" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" />
                Mentions légales – CGU & CGV
              </Link>
              <a 
                href="mailto:contact@korev-ai.com" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                contact@korev-ai.com
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} KOREV AI — SASU. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">
            20 Route d'Uriage, 38320 Herbeys, France
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
