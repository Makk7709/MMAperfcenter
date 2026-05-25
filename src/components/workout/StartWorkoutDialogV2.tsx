/**
 * StartWorkoutDialogV2 — Refonte moderne KOREV
 * Hiérarchie claire, labels FR uniquement, design dense mais lisible.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Sparkles,
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
  accent: string; // tailwind text color class
}

// ============================================
// DATA
// ============================================

const TEMPLATES: Record<Exclude<WorkoutType, "custom">, WorkoutTemplate[]> = {
  boxing: [
    { name: "Shadow Boxing", type: "boxing", duration: 15, intensity: "moderate", rounds: 5, roundDuration: 180, restDuration: 60, icon: Target, accent: "text-red-400" },
    { name: "Sac de frappe", type: "boxing", duration: 20, intensity: "intense", rounds: 6, roundDuration: 180, restDuration: 60, icon: Flame, accent: "text-orange-400" },
    { name: "Pattes d'ours", type: "boxing", duration: 25, intensity: "intense", rounds: 8, roundDuration: 180, restDuration: 60, icon: Zap, accent: "text-yellow-400" },
  ],
  mma: [
    { name: "Grappling Drills", type: "mma", duration: 30, intensity: "moderate", icon: Dumbbell, accent: "text-blue-400" },
    { name: "Sparring", type: "mma", duration: 25, intensity: "intense", rounds: 5, roundDuration: 300, restDuration: 60, icon: Target, accent: "text-purple-400" },
    { name: "Technique MMA", type: "mma", duration: 45, intensity: "moderate", icon: Target, accent: "text-indigo-400" },
  ],
  strength: [
    { name: "Haut du corps", type: "strength", duration: 45, intensity: "intense", icon: Dumbbell, accent: "text-emerald-400" },
    { name: "Bas du corps", type: "strength", duration: 45, intensity: "intense", icon: Dumbbell, accent: "text-teal-400" },
    { name: "Full Body", type: "strength", duration: 60, intensity: "moderate", icon: Dumbbell, accent: "text-cyan-400" },
  ],
  cardio: [
    { name: "HIIT", type: "cardio", duration: 20, intensity: "intense", icon: Flame, accent: "text-red-400" },
    { name: "Endurance", type: "cardio", duration: 40, intensity: "moderate", icon: Timer, accent: "text-pink-400" },
    { name: "Circuit", type: "cardio", duration: 30, intensity: "intense", icon: Zap, accent: "text-amber-400" },
  ],
};

const QUICK_START = [
  { name: "Express", duration: 5, intensity: "intense" as IntensityLevel, icon: Zap },
  { name: "Rapide", duration: 10, intensity: "moderate" as IntensityLevel, icon: Timer },
  { name: "Standard", duration: 15, intensity: "moderate" as IntensityLevel, icon: Flame },
];

const INTENSITIES: { value: IntensityLevel; label: string; color: string }[] = [
  { value: "light", label: "Léger", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "moderate", label: "Modéré", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "intense", label: "Intense", color: "bg-red-500/20 text-red-400 border-red-500/30" },
];

const TYPE_TABS: { value: Exclude<WorkoutType, "custom">; icon: string; label: string }[] = [
  { value: "boxing", icon: "🥊", label: "Boxe" },
  { value: "mma", icon: "🥋", label: "MMA" },
  { value: "strength", icon: "💪", label: "Force" },
  { value: "cardio", icon: "🔥", label: "Cardio" },
];

// ============================================
// COMPONENT
// ============================================

export const StartWorkoutDialogV2 = ({
  open,
  onOpenChange,
  onStartWorkout,
  loading = false,
  recentWorkouts = [],
}: StartWorkoutDialogV2Props) => {
  const [workoutName, setWorkoutName] = useState("");
  const [selectedType, setSelectedType] = useState<WorkoutType>("boxing");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<IntensityLevel>("moderate");
  const [rounds, setRounds] = useState(5);
  const [showRoundConfig, setShowRoundConfig] = useState(false);
  const [restDuration, setRestDuration] = useState(60);
  const [activeTab, setActiveTab] = useState<Exclude<WorkoutType, "custom">>("boxing");

  useEffect(() => {
    if (!open) {
      setWorkoutName("");
      setSelectedType("boxing");
      setDuration(30);
      setIntensity("moderate");
      setRounds(5);
      setShowRoundConfig(false);
      setRestDuration(60);
      setActiveTab("boxing");
    }
  }, [open]);

  const handleTemplateSelect = (t: WorkoutTemplate) => {
    setWorkoutName(t.name);
    setSelectedType(t.type);
    setDuration(t.duration);
    setIntensity(t.intensity);
    if (t.rounds) {
      setRounds(t.rounds);
      setShowRoundConfig(true);
      if (t.restDuration) setRestDuration(t.restDuration);
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
        roundDuration: 180,
        restDuration,
      }),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Hero header */}
        <div className="relative px-6 pt-6 pb-5 border-b border-border bg-gradient-to-br from-primary/10 via-transparent to-transparent">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl">
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              Nouvelle séance
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-1.5 ml-12">
            Choisis un template ou personnalise ton entraînement
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-6">
            <div className="py-5 space-y-6">
              {/* Quick Start cards */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Démarrage express
                  </Label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_START.map((q) => {
                    const Icon = q.icon;
                    return (
                      <button
                        key={q.name}
                        type="button"
                        onClick={() => handleQuickStart(q)}
                        disabled={loading}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border border-border bg-card/50",
                          "p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5",
                          "disabled:opacity-50"
                        )}
                      >
                        <Icon className="h-4 w-4 text-primary mb-2" />
                        <div className="text-sm font-semibold text-foreground">{q.name}</div>
                        <div className="text-[11px] text-muted-foreground">{q.duration} min</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Custom name */}
              <section>
                <Label htmlFor="workout-name" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">
                  Nom de la séance
                </Label>
                <Input
                  id="workout-name"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="Ex : Boxe technique"
                  disabled={loading}
                  className="h-11 text-base"
                />
              </section>

              {/* Templates */}
              <section>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3 block">
                  Templates
                </Label>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="grid grid-cols-4 h-auto p-1 bg-muted/50">
                    {TYPE_TABS.map((t) => (
                      <TabsTrigger
                        key={t.value}
                        value={t.value}
                        className="flex-col gap-0.5 py-2 data-[state=active]:bg-background"
                      >
                        <span className="text-lg leading-none">{t.icon}</span>
                        <span className="text-[11px] font-medium">{t.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {TYPE_TABS.map((t) => (
                    <TabsContent key={t.value} value={t.value} className="mt-3 space-y-2">
                      {TEMPLATES[t.value].map((tpl) => {
                        const Icon = tpl.icon;
                        const isSelected = workoutName === tpl.name;
                        const intensityMeta = INTENSITIES.find((i) => i.value === tpl.intensity)!;
                        return (
                          <button
                            key={tpl.name}
                            type="button"
                            onClick={() => handleTemplateSelect(tpl)}
                            className={cn(
                              "w-full rounded-xl border p-3 flex items-center gap-3 transition-all text-left",
                              isSelected
                                ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                                : "border-border bg-card/30 hover:border-primary/40 hover:bg-card/60"
                            )}
                          >
                            <div className={cn("h-10 w-10 rounded-lg bg-background/80 flex items-center justify-center flex-shrink-0", tpl.accent)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-foreground truncate">{tpl.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{tpl.duration} min</span>
                                {tpl.rounds && <span>• {tpl.rounds} rounds</span>}
                              </div>
                            </div>
                            <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide", intensityMeta.color)}>
                              {intensityMeta.label}
                            </span>
                          </button>
                        );
                      })}
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              {/* Config */}
              <section className="space-y-5 rounded-xl border border-border bg-card/30 p-4">
                {/* Duration slider */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Durée</Label>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {duration}<span className="text-sm text-muted-foreground font-normal ml-1">min</span>
                    </span>
                  </div>
                  <Slider
                    value={[duration]}
                    onValueChange={([v]) => setDuration(v)}
                    min={5}
                    max={120}
                    step={5}
                    disabled={loading}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>5min</span><span>60min</span><span>120min</span>
                  </div>
                </div>

                {/* Intensity */}
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">
                    Intensité
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {INTENSITIES.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setIntensity(opt.value)}
                        disabled={loading}
                        className={cn(
                          "rounded-lg border py-2 text-xs font-semibold transition-all",
                          intensity === opt.value
                            ? `${opt.color} ring-1 ring-current`
                            : "border-border bg-background/40 text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rounds toggle + config */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRoundConfig(!showRoundConfig)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer">
                      Mode rounds
                    </Label>
                    <span className={cn(
                      "h-5 w-9 rounded-full border transition-colors relative",
                      showRoundConfig ? "bg-primary border-primary" : "bg-muted border-border"
                    )}>
                      <span className={cn(
                        "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-transform",
                        showRoundConfig ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </span>
                  </button>
                  {showRoundConfig && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">Rounds</span>
                          <span className="text-lg font-bold text-foreground tabular-nums">{rounds}</span>
                        </div>
                        <Slider value={[rounds]} onValueChange={([v]) => setRounds(v)} min={1} max={15} step={1} disabled={loading} />
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">Repos</span>
                          <span className="text-lg font-bold text-foreground tabular-nums">{restDuration}s</span>
                        </div>
                        <Slider value={[restDuration]} onValueChange={([v]) => setRestDuration(v)} min={15} max={180} step={15} disabled={loading} />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Recent */}
              {recentWorkouts.length > 0 && (
                <section>
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                    <History className="h-3 w-3" /> Récents
                  </Label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {recentWorkouts.slice(0, 5).map((w) => (
                      <Badge
                        key={w.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80 whitespace-nowrap py-1.5 px-3"
                        onClick={() => { setWorkoutName(w.name); setSelectedType(w.type as WorkoutType); }}
                      >
                        {w.name}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-border bg-background flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!workoutName.trim() || loading}
              className="flex-1 h-11 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Démarrage…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2 fill-current" />
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
