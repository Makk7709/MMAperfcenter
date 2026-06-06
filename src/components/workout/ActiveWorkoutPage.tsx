/**
 * ActiveWorkoutPage — Refonte moderne KOREV
 * Plein écran, focus immersif, design system aligné.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { WolfTimerDisplay } from "@/components/gamification/WolfTimerDisplay";
import { WolfSessionSummary } from "@/components/gamification/WolfSessionSummary";
import { WolfRankDisplay } from "@/components/gamification/WolfRankDisplay";
import type { WorkoutConfig } from "./StartWorkoutDialogV2";
import type { SessionSummary } from "@/utils/gamification/wolfTracking";
import { ArrowLeft, Trophy, Flame, Target, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveWorkoutPageProps {
  config: WorkoutConfig;
  onComplete: (summary: SessionSummary) => void;
  onCancel: () => void;
  currentXP?: number;
}

type WorkoutPhase = "warmup" | "active" | "cooldown" | "completed";

const PHASES: WorkoutPhase[] = ["warmup", "active", "cooldown"];

const INTENSITY_SCORES: Record<string, number> = { intense: 85, moderate: 65 };
const DEFAULT_INTENSITY_SCORE = 45;

export function ActiveWorkoutPage({
  config,
  onComplete,
  onCancel,
  currentXP = 0,
}: ActiveWorkoutPageProps) {
  const [phase, setPhase] = useState<WorkoutPhase>("warmup");
  const [completedRounds, setCompletedRounds] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [startTime] = useState(Date.now());

  const hasRounds = Boolean(config.rounds && config.roundDuration);

  const handleTimerComplete = useCallback(() => {
    if (phase === "warmup") setPhase("active");
    else if (phase === "active") setPhase("cooldown");
    else if (phase === "cooldown") {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const summary: SessionSummary = {
        totalExercises: hasRounds ? completedRounds : 1,
        totalSets: completedRounds * 3 || 5,
        totalReps: completedRounds * 30 || 50,
        totalWeight: 0,
        totalVolume: 0,
        duration,
        personalRecords: [],
        caloriesEstimate: Math.round((duration / 60) * 8),
        intensityScore: INTENSITY_SCORES[config.intensity] ?? DEFAULT_INTENSITY_SCORE,
        muscleGroups: ["full-body"],
        badges: [],
        xpEarned: 50 + completedRounds * 10,
      };
      setSessionSummary(summary);
      setPhase("completed");
    }
  }, [phase, startTime, hasRounds, completedRounds, config.intensity]);

  const handleRoundChange = useCallback((round: number) => {
    setCompletedRounds(round - 1);
  }, []);

  const phaseConfig = (() => {
    switch (phase) {
      case "warmup":
        return { title: "Échauffement", subtitle: "Prépare ton corps", duration: 60, badge: "🔥 PHASE 1/3" };
      case "active":
        return {
          title: config.name,
          subtitle: hasRounds ? `Round ${completedRounds + 1} sur ${config.rounds}` : "En pleine séance",
          duration: hasRounds ? (config.roundDuration || 180) : config.duration * 60,
          badge: "⚡ PHASE 2/3",
        };
      case "cooldown":
        return { title: "Récupération", subtitle: "Respire, étire-toi", duration: 60, badge: "❄️ PHASE 3/3" };
      default:
        return { title: "", subtitle: "", duration: 0, badge: "" };
    }
  })();

  if (phase === "completed" && sessionSummary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <WolfSessionSummary
            summary={sessionSummary}
            showActions
            animate
            onClose={() => onComplete(sessionSummary)}
            onShare={() => console.log("Share workout")}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative flex items-center justify-between px-4 py-3 border-b border-border/50 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Quitter
        </Button>

        {/* Phase progress dots */}
        <div className="flex items-center gap-1.5">
          {PHASES.map((p, i) => {
            const currentIdx = PHASES.indexOf(phase);
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            let dotClass = "w-5 bg-muted";
            if (isActive) dotClass = "w-8 bg-primary";
            else if (isDone) dotClass = "w-5 bg-primary/50";
            return (
              <div
                key={p}
                className={cn("h-1.5 rounded-full transition-all duration-500", dotClass)}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <TypeBadge type={config.type} />
        </div>
      </header>

      {/* Main */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
        {/* Phase header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-2"
          >
            <div className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
              {phaseConfig.badge}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              {phaseConfig.title}
            </h1>
            <p className="text-base text-muted-foreground">{phaseConfig.subtitle}</p>
          </motion.div>
        </AnimatePresence>

        {/* Timer */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <WolfTimerDisplay
              initialTime={phaseConfig.duration}
              mode={hasRounds && phase === "active" ? "rounds" : "simple"}
              rounds={config.rounds}
              roundDuration={config.roundDuration}
              restDuration={config.restDuration || 60}
              showProgressCircle
              showSoundSelector
              onComplete={handleTimerComplete}
              onRoundChange={handleRoundChange}
            />
          </motion.div>
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-md">
          <StatCard icon={Clock} label="Durée" value={`${config.duration}min`} accent="text-orange-400" />
          {hasRounds ? (
            <StatCard icon={Target} label="Rounds" value={`${completedRounds}/${config.rounds}`} accent="text-red-400" />
          ) : (
            <StatCard icon={Flame} label="Intensité" value={config.intensity} accent="text-amber-400" capitalize />
          )}
          <StatCard icon={Trophy} label="XP" value={`+${50 + completedRounds * 10}`} accent="text-primary" />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative px-4 py-3 border-t border-border/50 backdrop-blur-sm">
        <WolfRankDisplay currentXP={currentXP} variant="compact" />
      </footer>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function TypeBadge({ type }: Readonly<{ type: string }>) {
  const icons: Record<string, string> = {
    boxing: "🥊", mma: "🥋", strength: "💪", cardio: "🔥",
  };
  const labels: Record<string, string> = {
    boxing: "Boxe", mma: "MMA", strength: "Force", cardio: "Cardio",
  };
  return (
    <span className="px-2.5 py-1 bg-muted/60 border border-border rounded-full text-[11px] font-semibold text-foreground">
      {icons[type] || "🏋️"} {labels[type] || type}
    </span>
  );
}

function StatCard({
  icon: Icon, label, value, accent, capitalize,
}: Readonly<{
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
  capitalize?: boolean;
}>) {
  return (
    <div className="rounded-xl border border-border bg-card/40 backdrop-blur-sm px-3 py-2.5 text-center">
      <Icon className={cn("h-4 w-4 mx-auto mb-1", accent)} />
      <div className={cn("text-base font-bold text-foreground tabular-nums", capitalize && "capitalize")}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}

export default ActiveWorkoutPage;
