import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Settings, Timer as TimerIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useStopwatch } from "@/hooks/useTimers";
import { formatClock, roundClock } from "@/lib/training/session";
import { beep, bell, unlockAudio } from "@/lib/training/sound";

interface TimerConfig {
  rounds: number;
  work: number;
  rest: number;
}

type TimerDraft = Record<keyof TimerConfig, string>;

const FIELDS: { key: keyof TimerConfig; label: string; min: number; max: number }[] = [
  { key: "rounds", label: "Nombre de rounds", min: 1, max: 12 },
  { key: "work", label: "Durée du round (secondes)", min: 30, max: 600 },
  { key: "rest", label: "Durée du repos (secondes)", min: 15, max: 300 },
];

const clampText = (text: string, min: number, max: number, fallback: number) => {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const toDraft = (c: TimerConfig): TimerDraft => ({ rounds: String(c.rounds), work: String(c.work), rest: String(c.rest) });

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} s`;
  return s === 0 ? `${m} min` : `${m} min ${String(s).padStart(2, "0")}`;
};

export const RoundTimer = () => {
  const [config, setConfig] = useState<TimerConfig>({ rounds: 3, work: 180, rest: 60 });
  const [draft, setDraft] = useState<TimerDraft>(() => toDraft(config));
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sw = useStopwatch(null);
  const state = roundClock(sw.elapsed, { rounds: config.rounds, workSeconds: config.work, restSeconds: config.rest });
  const isRest = state.phase === "rest";
  const isDone = state.phase === "done";

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

  const { running, pause } = sw;
  useEffect(() => {
    if (isDone && running) pause();
  }, [isDone, running, pause]);

  const handleStart = () => {
    unlockAudio();
    if (isDone) sw.reset();
    sw.start();
  };

  const handleReset = () => {
    sw.reset();
  };

  const handleSettingsOpenChange = (open: boolean) => {
    if (open) setDraft(toDraft(config));
    setSettingsOpen(open);
  };

  const clampField = (key: keyof TimerConfig) => {
    const field = FIELDS.find((f) => f.key === key)!;
    setDraft((d) => ({ ...d, [key]: String(clampText(d[key], field.min, field.max, config[key])) }));
  };

  const applySettings = () => {
    const next = { ...config };
    for (const { key, min, max } of FIELDS) next[key] = clampText(draft[key], min, max, config[key]);
    setConfig(next);
    sw.reset();
    setSettingsOpen(false);
  };

  const getDotClass = (index: number) => {
    if (index < state.roundsCompleted) return "bg-primary";
    if (index === state.round - 1 && !isDone) return isRest ? "bg-accent" : "bg-primary animate-pulse";
    return "bg-muted";
  };

  const getTimerColorClass = () => {
    if (isRest) return "text-accent";
    if (!isDone && state.remaining <= 10 && sw.running) return "text-destructive animate-pulse";
    return "text-primary";
  };

  const startLabel = () => {
    if (isDone) return "Recommencer";
    return sw.elapsed > 0 ? "Reprendre" : "Démarrer";
  };

  const roundDots = Array.from({ length: config.rounds }, (_, index) => ({ id: `round-${index}`, index }));

  return (
    <Card className="liquid-glass-solid border-0 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TimerIcon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Timer Combat</h3>
        </div>
        <Dialog open={settingsOpen} onOpenChange={handleSettingsOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Configurer le timer">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary">Configuration Timer</DialogTitle>
              <DialogDescription className="sr-only">Nombre de rounds, durée des rounds et du repos.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {FIELDS.map(({ key, label, min, max }) => (
                <div key={key}>
                  <Label htmlFor={`timer-${key}`}>{label}</Label>
                  <Input
                    id={`timer-${key}`}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    value={draft[key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    onBlur={() => clampField(key)}
                    className="bg-input border-border"
                  />
                </div>
              ))}
              <Button onClick={applySettings} className="w-full">
                Appliquer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-center space-y-6">
        {/* Round indicator */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Round {state.round} / {config.rounds}
          </p>
          <div className="flex gap-2 justify-center">
            {roundDots.map((dot) => (
              <div
                key={dot.id}
                className={`h-2 w-12 rounded-full transition-colors ${getDotClass(dot.index)}`}
              />
            ))}
          </div>
        </div>

        {/* Timer display */}
        <div className="relative">
          <div role="timer" aria-live="off" className={`text-7xl font-bold transition-all ${getTimerColorClass()}`}>
            {formatClock(isDone ? 0 : state.remaining)}
          </div>
          {isRest && (
            <p className="text-accent font-semibold text-lg mt-2 animate-pulse">
              REPOS
            </p>
          )}
          {isDone && (
            <p className="text-muted-foreground font-semibold text-lg mt-2">
              TERMINÉ
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {sw.running ? (
            <Button
              onClick={() => sw.pause()}
              size="lg"
              variant="secondary"
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-primary hover:bg-primary/80"
            >
              <Play className="h-5 w-5 mr-2" />
              {startLabel()}
            </Button>
          )}
          <Button onClick={handleReset} size="lg" variant="outline">
            <RotateCcw className="h-5 w-5 mr-2" />
            Réinitialiser
          </Button>
        </div>

        {/* Info */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Round : {formatDuration(config.work)}</p>
          <p>Repos : {formatDuration(config.rest)}</p>
        </div>
      </div>
    </Card>
  );
};
