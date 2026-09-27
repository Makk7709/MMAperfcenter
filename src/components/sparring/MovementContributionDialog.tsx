import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, HelpCircle, Loader2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MAX_MOVEMENT_SECONDS, TRACK_COLORS, TRACK_NAMES, captureMovement, type MovementCapture } from "@/lib/movement/captureMovement";
import {
  INVITE_DAYS,
  RETENTION_YEARS,
  contributeMovement,
  inviteUrl,
  type LabelKind,
  type LabelVerdict,
  type Verdict,
} from "@/lib/movement/contribution";
import { MOMENT_LABELS, QUALITY_LABELS, fighterLabel, formatClock, type SparringAnalysisData } from "./types";

type Step = "consent" | "capture" | "identify" | "labels" | "sending" | "done";

interface MovementContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File;
  analysisId: string;
  analysis: SparringAnalysisData;
}

const VERDICTS: Array<{ value: Verdict; label: string; icon: typeof Check }> = [
  { value: "correct", label: "Juste", icon: Check },
  { value: "incorrect", label: "Faux", icon: X },
  { value: "unsure", label: "Je ne sais pas", icon: HelpCircle },
];

const percentOf = (share: number) => `${Math.round(share * 100)} %`;

export const MovementContributionDialog = ({ open, onOpenChange, file, analysisId, analysis }: MovementContributionDialogProps) => {
  const [step, setStep] = useState<Step>("consent");
  const [invitePartner, setInvitePartner] = useState(true);
  const [adult, setAdult] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [capture, setCapture] = useState<MovementCapture | null>(null);
  const [myTrack, setMyTrack] = useState<"0" | "1" | "">("");
  const [myFighter, setMyFighter] = useState<"1" | "2">("1");
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const moments = analysis.key_moments ?? [];
  const techniques = analysis.techniques_observed ?? [];

  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    setStep("consent");
    setAdult(false);
    setAgreed(false);
    setCapture(null);
    setMyTrack("");
    setVerdicts({});
    setInviteToken(null);
  }, [open]);

  const startCapture = async () => {
    setStep("capture");
    setProgress({ done: 0, total: 0 });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await captureMovement(file, {
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      if (!result.preview) throw new Error("Impossible de distinguer deux combattants sur cette vidéo.");
      setCapture(result);
      setStep("identify");
    } catch (error) {
      if (controller.signal.aborted) return;
      toast.error(error instanceof Error ? error.message : "Extraction du mouvement impossible.");
      setStep("consent");
    }
  };

  const cancelCapture = () => {
    abortRef.current?.abort();
    setStep("consent");
  };

  const setVerdict = (kind: LabelKind, index: number, verdict: Verdict) =>
    setVerdicts((current) => {
      const key = `${kind}:${index}`;
      const next = { ...current };
      if (next[key] === verdict) delete next[key];
      else next[key] = verdict;
      return next;
    });

  const send = async () => {
    if (!capture || myTrack === "") return;
    setStep("sending");
    const mine = Number(myTrack) as 0 | 1;
    const list: LabelVerdict[] = Object.entries(verdicts).map(([key, verdict]) => {
      const [kind, index] = key.split(":");
      return { kind: kind as LabelKind, index: Number(index), verdict };
    });
    try {
      const { inviteToken: token } = await contributeMovement({
        analysisId,
        contributorFighter: myFighter === "1" ? 1 : 2,
        fps: capture.fps,
        contributorTrack: capture.tracks[mine],
        partnerTrack: invitePartner ? capture.tracks[mine === 0 ? 1 : 0] : null,
        verdicts: list,
      });
      setInviteToken(token);
      setStep("done");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
      setStep("labels");
    }
  };

  const link = inviteToken ? inviteUrl(inviteToken) : "";
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Lien copié.");
    } catch {
      toast.error("Copie impossible : sélectionne le lien pour le copier.");
    }
  };
  const shareLink = async () => {
    try {
      await navigator.share({ title: "KOREV PRISM", text: "Donne ton accord pour partager ton mouvement de notre sparring :", url: link });
    } catch {
      // Share sheet dismissed.
    }
  };

  const labelRow = (kind: LabelKind, index: number, time: number | null | undefined, title: string, detail: string) => (
    <li key={`${kind}-${index}`} className="flex flex-wrap items-center gap-2 border border-border/60 bg-korev-panel/40 p-2">
      <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">{typeof time === "number" ? formatClock(time) : "—"}</span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{title}</span>
        {detail && <span className="text-muted-foreground"> · {detail}</span>}
      </span>
      <span className="flex gap-1">
        {VERDICTS.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            size="icon"
            variant={verdicts[`${kind}:${index}`] === value ? "default" : "outline"}
            className="h-7 w-7"
            aria-label={`${title} : ${label}`}
            aria-pressed={verdicts[`${kind}:${index}`] === value}
            onClick={() => setVerdict(kind, index, value)}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </span>
    </li>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => step !== "sending" && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Faire progresser l'analyse du mouvement</DialogTitle>
          <DialogDescription>
            Facultatif et sans effet sur ton abonnement. Tu peux retirer ta contribution à tout moment depuis ton profil.
          </DialogDescription>
        </DialogHeader>

        {step === "consent" && (
          <div className="space-y-4 text-sm">
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Ton téléphone calcule le squelette des combattants : 23 points (épaules, coudes, poignets, hanches, genoux, chevilles, et un seul point pour la tête), 10 fois par seconde, sur les {MAX_MOVEMENT_SECONDS / 60} premières minutes au plus.</li>
              <li>• Seuls ces points sont envoyés, avec les moments et techniques repérés par PRISM. Aucune image, aucun son, aucun trait du visage.</li>
              <li>• Ils servent uniquement à entraîner et évaluer nos modèles d'analyse du mouvement. Aucune identification des personnes.</li>
              <li>• Conservation : {RETENTION_YEARS} ans au plus.</li>
            </ul>

            <div className="flex items-start justify-between gap-3 border border-border/60 p-3">
              <div className="space-y-1">
                <Label htmlFor="invite-partner">Inviter mon partenaire à partager son mouvement</Label>
                <p className="text-xs text-muted-foreground">
                  {invitePartner
                    ? `Il recevra un lien pour donner son propre accord depuis son compte. Sans réponse sous ${INVITE_DAYS} jours, son mouvement est effacé.`
                    : "Seul ton mouvement est envoyé ; celui de ton partenaire n'est pas conservé."}
                </p>
              </div>
              <Switch id="invite-partner" checked={invitePartner} onCheckedChange={setInvitePartner} />
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox id="movement-adult" checked={adult} onCheckedChange={(v) => setAdult(v === true)} />
                <Label htmlFor="movement-adult" className="text-sm font-normal leading-snug">
                  Je suis majeur(e), et toutes les personnes filmées le sont aussi.
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="movement-consent" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
                <Label htmlFor="movement-consent" className="text-sm font-normal leading-snug">
                  J'accepte que KOREV AI conserve le squelette de mes mouvements et les étiquettes de cette analyse pour
                  entraîner et évaluer ses modèles d'analyse du mouvement, pendant {RETENTION_YEARS} ans au plus. Je peux
                  retirer ma contribution à tout moment.
                </Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Détails dans la <Link to="/legal#donnees-personnelles" className="underline">politique de confidentialité</Link>.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Non merci</Button>
              <Button disabled={!adult || !agreed} onClick={() => void startCapture()}>Extraire le mouvement</Button>
            </DialogFooter>
          </div>
        )}

        {step === "capture" && (
          <div className="space-y-4 text-sm">
            <p>Extraction du mouvement sur ton appareil… Rien n'est envoyé pendant cette étape.</p>
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} aria-label="Progression de l'extraction" />
            <p className="font-mono text-xs text-muted-foreground">
              {progress.total ? `${progress.done} / ${progress.total} images` : "Chargement du modèle…"}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={cancelCapture}>Annuler</Button>
            </DialogFooter>
          </div>
        )}

        {step === "identify" && capture && (
          <div className="space-y-4 text-sm">
            <img src={capture.preview ?? ""} alt="Image de la vidéo avec les deux squelettes détectés" className="w-full border border-border/60" />
            <p className="text-xs text-muted-foreground">Cette image reste sur ton appareil.</p>
            <div className="space-y-2">
              <p className="font-medium">Quel squelette est le tien ?</p>
              <RadioGroup value={myTrack} onValueChange={(v) => setMyTrack(v as "0" | "1")} className="grid grid-cols-2 gap-2">
                {([0, 1] as const).map((slot) => (
                  <Label key={slot} htmlFor={`track-${slot}`} className="flex cursor-pointer items-center gap-2 border border-border/60 p-3 font-normal">
                    <RadioGroupItem id={`track-${slot}`} value={String(slot)} />
                    <span className="font-semibold" style={{ color: TRACK_COLORS[slot] }}>{TRACK_NAMES[slot]}</span>
                    <span className="text-xs text-muted-foreground">vu sur {percentOf(capture.coverage[slot])} des images</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Dans l'analyse PRISM, tu es :</p>
              <RadioGroup value={myFighter} onValueChange={(v) => setMyFighter(v as "1" | "2")} className="grid grid-cols-2 gap-2">
                {(["1", "2"] as const).map((n) => (
                  <Label key={n} htmlFor={`fighter-${n}`} className="flex cursor-pointer items-center gap-2 border border-border/60 p-3 font-normal">
                    <RadioGroupItem id={`fighter-${n}`} value={n} />
                    <span className={n === "1" ? "text-corner-red" : "text-corner-blue"}>{n === "1" ? "Coin rouge" : "Coin bleu"}</span>
                    <span className="truncate text-xs text-muted-foreground">{fighterLabel(analysis, n === "1" ? "fighter_1" : "fighter_2")}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            {capture.truncated && (
              <p className="text-xs text-muted-foreground">Seules les {MAX_MOVEMENT_SECONDS / 60} premières minutes sont prises en compte.</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Abandonner</Button>
              <Button disabled={myTrack === ""} onClick={() => setStep("labels")}>Continuer</Button>
            </DialogFooter>
          </div>
        )}

        {(step === "labels" || step === "sending") && (
          <div className="space-y-4 text-sm">
            <p>
              Facultatif : indique si PRISM a vu juste. Tes réponses aident le modèle autant que le mouvement lui-même.
            </p>
            {moments.length + techniques.length === 0 ? (
              <p className="text-muted-foreground">PRISM n'a relevé aucun moment ni technique sur cette vidéo.</p>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto">
                {moments.map((m, i) => labelRow("moment", i, m.timestamp_seconds, MOMENT_LABELS[m.type] ?? m.type, m.description))}
                {techniques.map((t, i) =>
                  labelRow("technique", i, t.timestamp_seconds, t.technique, t.quality ? QUALITY_LABELS[t.quality] : ""),
                )}
              </ul>
            )}
            <DialogFooter>
              <Button variant="outline" disabled={step === "sending"} onClick={() => setStep("identify")}>Retour</Button>
              <Button disabled={step === "sending"} onClick={() => void send()} className="gap-2">
                {step === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
                Envoyer ma contribution
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-sm">
            <p className="font-medium">Merci, ta contribution est enregistrée.</p>
            {inviteToken ? (
              <>
                <p className="text-muted-foreground">
                  Envoie ce lien à ton partenaire : il devra se connecter ou créer un compte pour donner son accord.
                  Sans réponse sous {INVITE_DAYS} jours, son mouvement est effacé. Le lien n'est affiché qu'une fois.
                </p>
                <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Lien d'invitation" />
                <div className={cn("grid gap-2", typeof navigator.share === "function" ? "grid-cols-2" : "grid-cols-1")}>
                  <Button variant="outline" className="gap-2" onClick={() => void copyLink()}>
                    <Copy className="h-4 w-4" />
                    Copier le lien
                  </Button>
                  {typeof navigator.share === "function" && (
                    <Button variant="outline" className="gap-2" onClick={() => void shareLink()}>
                      <Share2 className="h-4 w-4" />
                      Partager
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Tu peux la retirer à tout moment depuis ton profil, rubrique « Mes contributions ».</p>
            )}
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Fermer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
