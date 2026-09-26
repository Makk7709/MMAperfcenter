/**
 * StartWorkoutDialogV2 — configuration d'une séance (modèle, durée, intensité, rounds).
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Dumbbell,
  Timer,
  Flame,
  Zap,
  Target,
  Clock,
  History,
  Swords,
  HeartPulse,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface WorkoutConfig {
  name: string;
  type: WorkoutType;
  duration: number;
  intensity: IntensityLevel;
  rounds?: number;
  roundDuration?: number;
  restDuration?: number;
}

export type WorkoutType = "boxing" | "mma" | "strength" | "cardio" | "custom";
export type IntensityLevel = "light" | "moderate" | "intense";
type TemplateType = Exclude<WorkoutType, "custom">;

export interface RecentWorkout {
  id: string;
  name: string;
  type: string;
  date: string;
}

export interface StartWorkoutDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartWorkout: (config: WorkoutConfig) => void;
  loading?: boolean;
  recentWorkouts?: RecentWorkout[];
  defaultType?: TemplateType;
}

interface WorkoutTemplate {
  name: string;
  type: WorkoutType;
  duration: number;
  intensity: IntensityLevel;
  rounds?: number;
  roundDuration?: number;
  restDuration?: number;
  icon: React.ElementType;
}

// ============================================
// DATA
// ============================================

const TEMPLATES: Record<TemplateType, WorkoutTemplate[]> = {
  boxing: [
    { name: "Shadow Boxing", type: "boxing", duration: 15, intensity: "moderate", rounds: 5, roundDuration: 180, restDuration: 60, icon: Target },
    { name: "Sac de frappe", type: "boxing", duration: 20, intensity: "intense", rounds: 6, roundDuration: 180, restDuration: 60, icon: Flame },
    { name: "Pattes d'ours", type: "boxing", duration: 25, intensity: "intense", rounds: 8, roundDuration: 180, restDuration: 60, icon: Zap },
  ],
  mma: [
    { name: "Grappling Drills", type: "mma", duration: 30, intensity: "moderate", icon: Shield },
    { name: "Sparring", type: "mma", duration: 25, intensity: "intense", rounds: 5, roundDuration: 300, restDuration: 60, icon: Swords },
    { name: "Technique MMA", type: "mma", duration: 45, intensity: "moderate", icon: Target },
  ],
  strength: [
    { name: "Haut du corps", type: "strength", duration: 45, intensity: "intense", icon: Dumbbell },
    { name: "Bas du corps", type: "strength", duration: 45, intensity: "intense", icon: Dumbbell },
    { name: "Full Body", type: "strength", duration: 60, intensity: "moderate", icon: Dumbbell },
  ],
  cardio: [
    { name: "HIIT", type: "cardio", duration: 20, intensity: "intense", rounds: 8, roundDuration: 40, restDuration: 20, icon: Flame },
    { name: "Endurance", type: "cardio", duration: 40, intensity: "moderate", icon: Timer },
    { name: "Circuit", type: "cardio", duration: 30, intensity: "intense", icon: Zap },
  ],
};

const QUICK_START = [
  { name: "Express", duration: 5, intensity: "intense" as IntensityLevel, icon: Zap },
  { name: "Rapide", duration: 10, intensity: "moderate" as IntensityLevel, icon: Timer },
  { name: "Standard", duration: 15, intensity: "moderate" as IntensityLevel, icon: Flame },
];

const INTENSITIES: { value: IntensityLevel; label: string }[] = [
  { value: "light", label: "Léger" },
  { value: "moderate", label: "Modéré" },
  { value: "intense", label: "Intense" },
];

const TYPE_TABS: { value: TemplateType; icon: React.ElementType; label: string }[] = [
  { value: "boxing", icon: Target, label: "Boxe" },
  { value: "mma", icon: Swords, label: "MMA" },
  { value: "strength", icon: Dumbbell, label: "Force" },
  { value: "cardio", icon: HeartPulse, label: "Cardio" },
];

const sectionLabel = "korev-eyebrow text-[11px] font-normal";

const formatSeconds = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`);

// ============================================
// COMPONENT
// ============================================

export const StartWorkoutDialogV2 = ({
  open,
  onOpenChange,
  onStartWorkout,
  loading = false,
  recentWorkouts = [],
  defaultType = "boxing",
}: StartWorkoutDialogV2Props) => {
  const [workoutName, setWorkoutName] = useState("");
  const [selectedType, setSelectedType] = useState<WorkoutType>(defaultType);
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<IntensityLevel>("moderate");
  const [rounds, setRounds] = useState(5);
  const [roundDuration, setRoundDuration] = useState(180);
  const [showRoundConfig, setShowRoundConfig] = useState(false);
  const [restDuration, setRestDuration] = useState(60);
  const [activeTab, setActiveTab] = useState<TemplateType>(defaultType);

  useEffect(() => {
    if (!open) {
      setWorkoutName("");
      setSelectedType(defaultType);
      setDuration(30);
      setIntensity("moderate");
      setRounds(5);
      setRoundDuration(180);
      setShowRoundConfig(false);
      setRestDuration(60);
      setActiveTab(defaultType);
    }
  }, [open, defaultType]);

  const handleTemplateSelect = (t: WorkoutTemplate) => {
    setWorkoutName(t.name);
    setSelectedType(t.type);
    setDuration(t.duration);
    setIntensity(t.intensity);
    if (t.rounds) {
      setRounds(t.rounds);
      setRoundDuration(t.roundDuration ?? 180);
      setShowRoundConfig(true);
      if (t.restDuration !== undefined) setRestDuration(t.restDuration);
    } else {
      setShowRoundConfig(false);
    }
  };

  const handleQuickStart = (q: typeof QUICK_START[0]) => {
    onStartWorkout({
      name: q.name,
      type: "cardio",
      duration: q.duration,
      intensity: q.intensity,
    });
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutName.trim()) return;
    onStartWorkout({
      name: workoutName.trim(),
      type: selectedType,
      duration,
      intensity,
      ...(showRoundConfig && {
        rounds,
        roundDuration,
        restDuration,
      }),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="border-b border-border px-6 pb-5 pt-6">
          <DialogHeader>
            <p className="korev-eyebrow">Préparation / Séance</p>
            <DialogTitle className="font-display text-2xl uppercase">Nouvelle séance</DialogTitle>
            <DialogDescription>Choisissez un modèle ou composez votre séance.</DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-5">
              <section>
                <Label className={cn(sectionLabel, "mb-3 block")}>Démarrage express</Label>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_START.map((q) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={q.name}
                        type="button"
                        onClick={() => handleQuickStart(q)}
                        disabled={loading}
                        className="group border border-border bg-korev-deep/40 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                      >
                        <Icon className="mb-2 h-4 w-4 text-korev-gold" />
                        <div className="text-sm font-semibold text-foreground">{q.name}</div>
                        <div className="text-[11px] text-muted-foreground">{q.duration} min</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <Label htmlFor="workout-name" className={cn(sectionLabel, "mb-2 block")}>
                  Nom de la séance
                </Label>
                <Input
                  id="workout-name"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="Ex : Boxe technique"
                  maxLength={80}
                  disabled={loading}
                  className="h-11 text-base"
                />
              </section>

              <section>
                <Label className={cn(sectionLabel, "mb-3 block")}>Modèles</Label>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateType)}>
                  <TabsList className="grid h-auto grid-cols-4 p-1">
                    {TYPE_TABS.map((t) => {
                      const Icon = t.icon;
                      return (
                        <TabsTrigger key={t.value} value={t.value} className="flex-col gap-1 py-2">
                          <Icon className="h-4 w-4" />
                          <span className="text-[11px] font-medium">{t.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {TYPE_TABS.map((t) => (
                    <TabsContent key={t.value} value={t.value} className="mt-3 space-y-2">
                      {TEMPLATES[t.value].map((tpl) => {
                        const Icon = tpl.icon;
                        const isSelected = workoutName === tpl.name;
                        const intensityLabel = INTENSITIES.find((i) => i.value === tpl.intensity)!.label;
                        return (
                          <button
                            key={tpl.name}
                            type="button"
                            onClick={() => handleTemplateSelect(tpl)}
                            className={cn(
                              "flex w-full items-center gap-3 border p-3 text-left transition-colors",
                              isSelected ? "border-primary bg-primary/10" : "border-border bg-korev-deep/30 hover:border-primary/40",
                            )}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-korev-gold/30 bg-korev-deep text-korev-gold">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-foreground">{tpl.name}</div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{tpl.duration} min</span>
                                {tpl.rounds && <span>· {tpl.rounds} rounds</span>}
                              </div>
                            </div>
                            <span className={cn("korev-eyebrow text-[10px]", tpl.intensity === "intense" && "text-korev-gold")}>
                              {intensityLabel}
                            </span>
                          </button>
                        );
                      })}
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              <section className="space-y-5 border border-border bg-korev-deep/30 p-4">
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <Label className={sectionLabel}>Durée visée</Label>
                    <span className="korev-metric text-2xl text-primary">
                      {duration}<span className="ml-1 text-sm font-normal text-muted-foreground">min</span>
                    </span>
                  </div>
                  <Slider value={[duration]} onValueChange={([v]) => setDuration(v)} min={5} max={120} step={5} disabled={loading} aria-label="Durée visée" />
                </div>

                <div>
                  <Label className={cn(sectionLabel, "mb-2 block")}>Intensité</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {INTENSITIES.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIntensity(opt.value)}
                        disabled={loading}
                        aria-pressed={intensity === opt.value}
                        className={cn(
                          "border py-2 text-xs font-semibold transition-colors",
                          intensity === opt.value
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border bg-korev-deep/40 text-muted-foreground hover:border-primary/30",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowRoundConfig(!showRoundConfig)}
                    aria-pressed={showRoundConfig}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className={cn(sectionLabel, "cursor-pointer")}>Mode rounds</span>
                    <span className={cn("relative h-5 w-9 border transition-colors", showRoundConfig ? "border-primary bg-primary" : "border-border bg-muted")}>
                      <span className={cn("absolute top-0.5 h-3.5 w-3.5 bg-background transition-transform", showRoundConfig ? "translate-x-4" : "translate-x-0.5")} />
                    </span>
                  </button>
                  {showRoundConfig && (
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <div className="mb-1 flex items-baseline justify-between">
                          <span className="text-[11px] text-muted-foreground">Rounds</span>
                          <span className="korev-metric text-lg">{rounds}</span>
                        </div>
                        <Slider value={[rounds]} onValueChange={([v]) => setRounds(v)} min={1} max={15} step={1} disabled={loading} aria-label="Nombre de rounds" />
                      </div>
                      <div>
                        <div className="mb-1 flex items-baseline justify-between">
                          <span className="text-[11px] text-muted-foreground">Round</span>
                          <span className="korev-metric text-lg">{formatSeconds(roundDuration)}</span>
                        </div>
                        <Slider value={[roundDuration]} onValueChange={([v]) => setRoundDuration(v)} min={20} max={600} step={10} disabled={loading} aria-label="Durée d'un round" />
                      </div>
                      <div>
                        <div className="mb-1 flex items-baseline justify-between">
                          <span className="text-[11px] text-muted-foreground">Repos</span>
                          <span className="korev-metric text-lg">{formatSeconds(restDuration)}</span>
                        </div>
                        <Slider value={[restDuration]} onValueChange={([v]) => setRestDuration(v)} min={0} max={180} step={10} disabled={loading} aria-label="Repos entre les rounds" />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {recentWorkouts.length > 0 && (
                <section>
                  <Label className={cn(sectionLabel, "mb-2 flex items-center gap-1.5")}>
                    <History className="h-3 w-3" /> Récents
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {recentWorkouts.slice(0, 5).map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        className="shrink-0 whitespace-nowrap border border-border px-3 py-1.5 text-xs hover:border-primary/40"
                        onClick={() => { setWorkoutName(w.name); setSelectedType(w.type as WorkoutType); }}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 border-t border-border bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={!workoutName.trim() || loading} className="h-11 flex-1 text-base">
              {loading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Démarrage…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Démarrer la séance
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StartWorkoutDialogV2;
