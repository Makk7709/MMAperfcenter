import { useEffect, useRef } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStopwatch } from "@/hooks/useTimers";
import { formatClock, roundClock, type RoundPlan } from "@/lib/training/session";
import { beep, bell, unlockAudio } from "@/lib/training/sound";

const PHASE_LABEL = { work: "Combat", rest: "Repos", done: "Terminé" } as const;

interface RoundTimerPanelProps {
  workoutId: string;
  plan: RoundPlan;
  /** Rounds already saved on the session, including earlier timer runs. */
  savedRounds: number;
  onRoundsCompleted: (rounds: number) => void;
}

const MAX_ROUNDS = 30;

export function RoundTimerPanel({ workoutId, plan, savedRounds, onRoundsCompleted }: RoundTimerPanelProps) {
  const sw = useStopwatch(`korev.session.rounds.${workoutId}`);
  const state = roundClock(sw.elapsed, plan);
  const phaseLength = state.phase === "rest" ? plan.restSeconds : plan.workSeconds;
  const phaseProgress = state.phase === "done" ? 1 : 1 - state.remaining / Math.max(1, phaseLength);

  // Rounds from previous runs of the timer ("Recommencer") keep counting.
  const banked = useRef(Math.max(0, savedRounds - state.roundsCompleted));

  const lastPhase = useRef(`${state.phase}-${state.round}`);
  const lastSecond = useRef(Math.ceil(state.remaining));

  useEffect(() => {
    const phaseKey = `${state.phase}-${state.round}`;
    const second = Math.ceil(state.remaining);
    if (sw.running) {
      if (phaseKey !== lastPhase.current) bell();
      else if (second !== lastSecond.current && second > 0 && second <= 3) beep(660, 120);
    }
    lastPhase.current = phaseKey;
    lastSecond.current = second;
  }, [state.phase, state.round, state.remaining, sw.running]);

  useEffect(() => {
    onRoundsCompleted(Math.min(MAX_ROUNDS, banked.current + state.roundsCompleted));
  }, [state.roundsCompleted, onRoundsCompleted]);

  const { running, pause } = sw;
  useEffect(() => {
    if (state.phase === "done" && running) pause();
  }, [state.phase, running, pause]);

  const restart = () => {
    banked.current += state.roundsCompleted;
    sw.reset();
  };

  const toggle = () => {
    unlockAudio();
    if (sw.running) sw.pause();
    else sw.start();
  };

  const isRest = state.phase === "rest";
  const isDone = state.phase === "done";

  return (
    <section
      aria-label="Minuteur de rounds"
      className={cn(
        "korev-frame korev-chamfer relative overflow-hidden p-5 [--chamfer:18px] sm:p-7",
        isRest && "shadow-[inset_0_0_80px_hsl(var(--corner-blue)/0.12)]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="korev-eyebrow">
          Round <span className="text-foreground">{state.round}</span> / {plan.rounds}
        </p>
        <p className={cn("korev-eyebrow", isRest ? "text-corner-blue" : isDone ? "text-foreground" : "text-korev-gold")}>
          {PHASE_LABEL[state.phase]}
        </p>
      </div>

      <p
        role="timer"
        aria-live="off"
        className={cn(
          "korev-metric mt-4 text-center text-[5.5rem] leading-none sm:text-[7rem]",
          isRest ? "text-corner-blue" : isDone ? "text-muted-foreground" : "text-foreground",
          !isDone && state.remaining <= 10 && sw.running && "text-primary",
        )}
      >
        {formatClock(isDone ? 0 : state.remaining)}
      </p>

      <div className="mt-5 h-1 bg-muted" aria-hidden>
        <div
          className={cn("h-full transition-[width] duration-200", isRest ? "bg-corner-blue" : "bg-primary")}
          style={{ width: `${Math.min(100, phaseProgress * 100)}%` }}
        />
      </div>

      <ol className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Rounds">
        {Array.from({ length: plan.rounds }, (_, i) => (
          <li
            key={i}
            aria-label={`Round ${i + 1}${i < state.roundsCompleted ? " terminé" : ""}`}
            className={cn(
              "h-1.5 w-6",
              i < state.roundsCompleted ? "bg-primary" : i === state.round - 1 && !isDone ? "bg-primary/40" : "bg-muted",
            )}
          />
        ))}
      </ol>

      <div className="mt-6 flex justify-center gap-2">
        {!isDone && (
          <Button size="lg" onClick={toggle} className="min-w-[11rem]">
            {sw.running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            {sw.running ? "Pause" : sw.elapsed > 0 ? "Reprendre" : "Lancer les rounds"}
          </Button>
        )}
        {sw.elapsed > 0 && (
          <Button size="lg" variant="outline" onClick={restart} aria-label="Relancer une série de rounds">
            <RotateCcw className="h-5 w-5" />
            {isDone && "Recommencer"}
          </Button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {formatClock(plan.workSeconds)} de combat · {formatClock(plan.restSeconds)} de repos · signal sonore à chaque changement
      </p>
      {banked.current > 0 && (
        <p className="mt-1 text-center text-xs text-korev-gold">
          {Math.min(MAX_ROUNDS, banked.current + state.roundsCompleted)} rounds comptés dans cette séance
        </p>
      )}
    </section>
  );
}
