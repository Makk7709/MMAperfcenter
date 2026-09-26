import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { MoodPicker } from "./MoodPicker";
import type { FinishInput } from "@/hooks/useTraining";
import type { Intensity, SetsSummary } from "@/lib/training/session";
import { EFFORT_BY_INTENSITY, effortLabel } from "@/lib/training/performance";

interface FinishSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minutes: number;
  rounds: number;
  sets: SetsSummary;
  intensity: Intensity;
  pending: boolean;
  onConfirm: (input: FinishInput) => void;
}

export function FinishSessionDialog({ open, onOpenChange, minutes, rounds, sets, intensity, pending, onConfirm }: FinishSessionDialogProps) {
  const [effort, setEffort] = useState(EFFORT_BY_INTENSITY[intensity]);
  const [mood, setMood] = useState("good");
  const [energy, setEnergy] = useState(6);
  const [note, setNote] = useState("");
  const empty = sets.setsCompleted === 0 && rounds === 0 && minutes < 5;

  useEffect(() => {
    if (open) setEffort(EFFORT_BY_INTENSITY[intensity]);
  }, [open, intensity]);

  const metrics = [
    { label: "Durée", value: `${minutes} min` },
    { label: "Séries", value: String(sets.setsCompleted) },
    { label: "Volume", value: `${sets.volumeKg.toLocaleString("fr-FR")} kg` },
    { label: "Rounds", value: String(rounds) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <p className="korev-eyebrow">Séance / Bilan</p>
          <DialogTitle className="font-display text-2xl uppercase">Terminer la séance</DialogTitle>
          <DialogDescription>Votre ressenti est ajouté au carnet d'entraînement, rattaché à cette séance.</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-4 gap-px border border-border bg-border">
          {metrics.map((m) => (
            <div key={m.label} className="bg-card px-2 py-3 text-center">
              <dt className="korev-eyebrow text-[10px]">{m.label}</dt>
              <dd className="korev-metric mt-1 text-lg">{m.value}</dd>
            </div>
          ))}
        </dl>
        {empty && (
          <p className="border-l-2 border-primary bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
            Aucune série validée ni round terminé, et moins de 5 minutes : vérifiez avant d'enregistrer.
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <Label className="korev-eyebrow text-[11px] font-normal">Effort perçu</Label>
            <span className="korev-metric text-xl text-primary">
              {effort}
              <span className="text-sm text-muted-foreground">/10</span>
              <span className="ml-2 font-sans text-sm font-normal text-foreground/80">{effortLabel(effort)}</span>
            </span>
          </div>
          <Slider value={[effort]} onValueChange={([v]) => setEffort(v)} min={1} max={10} step={1} aria-label="Effort perçu" />
          <p className="text-xs text-muted-foreground">
            La dureté de la séance dans son ensemble. Avec la durée, elle donne votre charge d'entraînement.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="korev-eyebrow text-[11px] font-normal">Ressenti</Label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <Label className="korev-eyebrow text-[11px] font-normal">Énergie</Label>
            <span className="korev-metric text-xl text-primary">
              {energy}
              <span className="text-sm text-muted-foreground">/10</span>
            </span>
          </div>
          <Slider value={[energy]} onValueChange={([v]) => setEnergy(v)} min={1} max={10} step={1} aria-label="Énergie" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="session-note" className="korev-eyebrow text-[11px] font-normal">Note (facultatif)</Label>
          <Textarea
            id="session-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder="Points techniques, douleurs, ce qui a marché…"
            className="min-h-[90px]"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending} className="sm:flex-1">
            Continuer la séance
          </Button>
          <Button onClick={() => onConfirm({ effort, mood, energy, note })} disabled={pending} className="sm:flex-[1.4]">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer la séance
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
