import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/training/session";
import { bell, unlockAudio } from "@/lib/training/sound";

interface RestTimerBarProps {
  active: boolean;
  remaining: number;
  total: number;
  onAdd: (seconds: number) => void;
  onSkip: () => void;
}

export function RestTimerBar({ active, remaining, total, onAdd, onSkip }: RestTimerBarProps) {
  useEffect(() => {
    if (active && remaining <= 0) {
      bell();
      onSkip();
    }
  }, [active, remaining, onSkip]);

  if (!active) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/30 bg-korev-deep/95 backdrop-blur-md">
      <p role="status" className="sr-only">Repos de {formatClock(total)} lancé</p>
      <div className="h-0.5 bg-muted">
        <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${Math.min(100, (1 - remaining / Math.max(1, total)) * 100)}%` }} />
      </div>
      <div className="container flex max-w-3xl items-center gap-4 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          <p className="korev-eyebrow text-korev-gold">Repos</p>
          <p className="korev-metric text-3xl leading-none" aria-label={`Repos restant : ${formatClock(remaining)}`}>{formatClock(remaining)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { unlockAudio(); onAdd(15); }}>+15 s</Button>
        <Button size="sm" onClick={onSkip}>Passer</Button>
      </div>
    </div>
  );
}
