/**
 * WolfRankDisplay Component
 * Displays the user's current wolf rank with progress visualization
 */

import { cn } from '@/lib/utils';
import { calculateRank, getNextRank, getRankProgress, WOLF_RANKS } from '@/utils/gamification/wolfPack';

interface WolfRankDisplayProps {
  currentXP: number;
  variant?: 'compact' | 'full';
  showAnimation?: boolean;
  className?: string;
}

export function WolfRankDisplay({
  currentXP,
  variant = 'full',
  showAnimation = false,
  className
}: WolfRankDisplayProps) {
  const currentRank = calculateRank(currentXP);
  const nextRank = getNextRank(currentRank);
  const progress = Math.min(100, getRankProgress(currentXP));

  return (
    <div
      data-testid="wolf-rank-display"
      className={cn(
        'liquid-glass-solid flex flex-col gap-3 p-4',
        variant === 'compact' && 'compact gap-2 p-3',
        variant === 'full' && 'full',
        showAnimation && 'animate animate-pulse',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          aria-label={`Niveau ${currentRank.level} sur ${WOLF_RANKS.length}`}
          className="korev-chamfer korev-metric flex h-12 w-12 shrink-0 items-center justify-center bg-gradient-primary text-xl text-primary-foreground [--chamfer:8px]"
        >
          {String(currentRank.level).padStart(2, '0')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="korev-eyebrow text-[10px]">Rang de la meute</p>
          <p className="font-display text-lg font-semibold uppercase leading-tight text-korev-gold">{currentRank.name}</p>
        </div>
        <span className="korev-metric text-sm text-muted-foreground">
          <span className="text-foreground">{currentXP.toLocaleString('fr-FR')}</span> XP
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-label="Progression vers le rang suivant"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 overflow-hidden bg-muted"
        >
          <div
            className={cn('h-full bg-gradient-primary transition-all duration-500', showAnimation && 'animate-pulse')}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between gap-2 text-xs text-muted-foreground">
          {nextRank ? (
            <>
              <span>Prochain : {nextRank.name}</span>
              <span className="tabular-nums">{(nextRank.xpRequired - currentXP).toLocaleString('fr-FR')} XP</span>
            </>
          ) : (
            <span className="text-korev-gold">Rang ultime atteint : légende de la meute</span>
          )}
        </div>
      </div>

      {variant === 'full' && (
        <p className="text-sm text-muted-foreground">{currentRank.description}</p>
      )}
    </div>
  );
}
