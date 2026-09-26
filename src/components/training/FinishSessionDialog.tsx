import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { MoodPicker } from "./MoodPicker";
import type { FinishInput } from "@/hooks/useTraining";
import type { SetsSummary } from "@/lib/training/session";

interface FinishSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minutes: number;
  rounds: number;
  sets: SetsSummary;
  pending: boolean;
  onConfirm: (input: FinishInput) => void;
}

export function FinishSessionDialog({ open, onOpenChange, minutes, rounds, sets, pending, onConfirm }: FinishSessionDialogProps) {
  const [mood, setMood] = useState("good");
  const [energy, setEnergy] = useState(6);
  const [note, setNote] = useState("");
  const empty = sets.setsCompleted === 0 && rounds === 0 && minutes < 5;

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
            Aucune série validée ni round terminé : cette séance sera enregistrée mais ne rapportera pas d'XP.
          </p>
        )}

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
          <Button onClick={() => onConfirm({ mood, energy, note })} disabled={pending} className="sm:flex-[1.4]">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer la séance
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
