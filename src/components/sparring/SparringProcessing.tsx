import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type ProcessingStage = "extract" | "send" | "analyze";

const STAGES: { id: ProcessingStage; label: string }[] = [
  { id: "extract", label: "Préparation des planches" },
  { id: "send", label: "Envoi sécurisé" },
  { id: "analyze", label: "Analyse PRISM" },
];

// Typical analysis time; the bar approaches it asymptotically and never lies about completion.
const TYPICAL_ANALYSIS_S = 60;

interface SparringProcessingProps {
  stage: ProcessingStage;
  extractDone: number;
  extractTotal: number;
  previewUrl: string | null;
  analyzeStartedAt: number | null;
}

const useElapsedSeconds = (since: number | null) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!since) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [since]);
  return since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
};

export const SparringProcessing = ({ stage, extractDone, extractTotal, previewUrl, analyzeStartedAt }: SparringProcessingProps) => {
  const elapsed = useElapsedSeconds(stage === "analyze" ? analyzeStartedAt : null);
  const stageIndex = STAGES.findIndex((s) => s.id === stage);

  let value: number;
  if (stage === "extract") value = extractTotal > 0 ? (extractDone / extractTotal) * 100 : 0;
  else if (stage === "send") value = 100;
  else value = Math.min(95, (1 - Math.exp(-elapsed / (TYPICAL_ANALYSIS_S / 2))) * 100);

  let detail: string;
  if (stage === "extract") detail = extractTotal > 0 ? `${extractDone} / ${extractTotal} planches` : "Lecture de la vidéo…";
  else if (stage === "send") detail = "Transmission des planches";
  else detail = `${elapsed} s — environ 1 minute en moyenne`;

  return (
    <div className="grid gap-6 animate-korev-rise md:grid-cols-[1.2fr_1fr] md:items-center" aria-live="polite">
      <div className="relative aspect-video overflow-hidden border border-korev-gold/30 bg-black korev-chamfer [--chamfer:18px]">
        {previewUrl ? (
          <img src={previewUrl} alt="Planche de mouvement en cours d'analyse" className="h-full w-full object-contain opacity-80" />
        ) : (
          <div className="korev-grid h-full w-full" />
        )}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="h-1/3 w-full animate-korev-scan bg-gradient-to-b from-transparent via-korev-gold/25 to-transparent motion-reduce:animate-none" />
        </div>
        {/* Viewfinder corners */}
        {["left-3 top-3 border-l border-t", "right-3 top-3 border-r border-t", "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"].map((pos) => (
          <span key={pos} aria-hidden className={cn("absolute h-5 w-5 border-korev-gold", pos)} />
        ))}
        <span className="korev-eyebrow absolute bottom-3 left-10 text-korev-gold">PRISM / Vision</span>
      </div>

      <div className="space-y-5">
        <div>
          <p className="korev-eyebrow">Analyse en cours</p>
          <p className="korev-display mt-2 text-3xl">Lecture du combat</p>
          <p className="mt-2 text-sm text-muted-foreground">
            L'IA suit les deux combattants, date les actions et estime les statistiques.
          </p>
        </div>

        <ol className="space-y-3">
          {STAGES.map((s, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <li key={s.id} className={cn("flex items-center gap-3 text-sm", !done && !active && "text-muted-foreground/60")}>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center border",
                    done && "border-korev-gold bg-korev-gold text-primary-foreground",
                    active && "border-korev-gold text-korev-gold",
                    !done && !active && "border-border",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="font-mono text-[10px]">{i + 1}</span>}
                </span>
                <span className={cn(active && "text-foreground")}>{s.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="space-y-2">
          <Progress value={value} className="h-1.5" />
          <p className="font-mono text-xs text-muted-foreground">{detail}</p>
        </div>
        <p className="text-xs text-muted-foreground">Gardez cette fenêtre ouverte jusqu'à la fin.</p>
      </div>
    </div>
  );
};
