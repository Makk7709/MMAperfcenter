import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  RETENTION_YEARS,
  acceptMovementInvite,
  declineMovementInvite,
  getMovementInvite,
  type MovementInvite as Invite,
} from "@/lib/movement/contribution";
import { clearPendingInvite, rememberPendingInvite } from "@/lib/movement/pendingInvite";

type Outcome = "accepted" | "declined" | null;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

export default function MovementInvite() {
  const { token = "" } = useParams();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [adult, setAdult] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Survives sign-up and e-mail confirmation, which may land in another tab.
      rememberPendingInvite(token);
      return;
    }
    let cancelled = false;
    getMovementInvite(token)
      .then((result) => {
        if (cancelled) return;
        setInvite(result);
        if (result.status !== "pending") clearPendingInvite();
      })
      .catch(() => !cancelled && setInvite({ status: "unavailable", contributor_name: null, discipline: null, created_at: null, expires_at: null }));
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token]);

  const answer = async (accept: boolean) => {
    setBusy(true);
    try {
      await (accept ? acceptMovementInvite(token) : declineMovementInvite(token));
      clearPendingInvite();
      setOutcome(accept ? "accepted" : "declined");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Réponse impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  let body: JSX.Element;
  if (authLoading || (user && !invite)) {
    body = <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />;
  } else if (!user) {
    body = (
      <div className="space-y-4 text-sm">
        <p>
          Un partenaire de sparring t'invite à partager le squelette de ton mouvement pour faire progresser l'analyse
          PRISM. Connecte-toi ou crée un compte pour lire la demande et y répondre.
        </p>
        <Button className="w-full" onClick={() => navigate("/auth", { state: { from: location } })}>
          Se connecter ou créer un compte
        </Button>
      </div>
    );
  } else if (outcome === "accepted") {
    body = (
      <div className="space-y-4 text-sm">
        <p>Merci, ton accord est enregistré. Tu peux le retirer à tout moment depuis ton profil, rubrique « Mes contributions ».</p>
        <Button asChild className="w-full"><Link to="/">Continuer</Link></Button>
      </div>
    );
  } else if (outcome === "declined") {
    body = (
      <div className="space-y-4 text-sm">
        <p>C'est noté : ton mouvement a été effacé.</p>
        <Button asChild className="w-full"><Link to="/">Continuer</Link></Button>
      </div>
    );
  } else if (invite?.status === "own") {
    body = <p className="text-sm">C'est ton propre lien : envoie-le à ton partenaire pour qu'il donne son accord.</p>;
  } else if (invite?.status !== "pending") {
    body = <p className="text-sm">Cette invitation a expiré ou a déjà reçu une réponse.</p>;
  } else {
    body = (
      <div className="space-y-4 text-sm">
        <p>
          <strong>{invite.contributor_name ?? "Un membre KOREV"}</strong> a analysé avec PRISM un sparring où tu apparais
          {invite.discipline ? ` (${invite.discipline})` : ""}, le {formatDate(invite.created_at)}, et propose de partager ton
          mouvement pour faire progresser l'analyse.
        </p>
        <ul className="space-y-1.5 text-muted-foreground">
          <li>• Seul ton squelette est concerné : 23 points (épaules, coudes, poignets, hanches, genoux, chevilles, un seul point pour la tête). Aucune image, aucun son, aucun trait du visage.</li>
          <li>• Il sert uniquement à entraîner et évaluer nos modèles d'analyse du mouvement, sans identification des personnes, pendant {RETENTION_YEARS} ans au plus.</li>
          <li>• Si tu refuses, ou sans réponse avant le {formatDate(invite.expires_at)}, ton mouvement est effacé.</li>
        </ul>
        <div className="flex items-start gap-2">
          <Checkbox id="invite-adult" checked={adult} onCheckedChange={(v) => setAdult(v === true)} />
          <Label htmlFor="invite-adult" className="text-sm font-normal leading-snug">Je suis majeur(e).</Label>
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="invite-consent" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
          <Label htmlFor="invite-consent" className="text-sm font-normal leading-snug">
            J'accepte que KOREV AI conserve le squelette de mes mouvements sur ce sparring pour entraîner et évaluer ses
            modèles d'analyse du mouvement, pendant {RETENTION_YEARS} ans au plus. Je peux retirer mon accord à tout moment.
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Détails dans la <Link to="/legal#donnees-personnelles" className="underline">politique de confidentialité</Link>.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void answer(false)}>Refuser</Button>
          <Button disabled={busy || !adult || !agreed} onClick={() => void answer(true)}>Accepter</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Partager ton mouvement</CardTitle>
          <CardDescription>Analyse du mouvement PRISM · facultatif</CardDescription>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    </div>
  );
}
