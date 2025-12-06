/**
 * WolfRankDisplay Component
 * Displays the user's current wolf rank with progress visualization
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { WOLF_RANKS, calculateRank, getNextRank } from '@/utils/gamification/wolfPack';

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
  
  // Calculate progress to next rank
  const calculateProgress = (): number => {
    if (!nextRank) return 100; // Max rank
    
    const xpInCurrentRank = currentXP - currentRank.xpRequired;
    const xpNeededForNextRank = nextRank.xpRequired - currentRank.xpRequired;
    
    return Math.min(100, Math.round((xpInCurrentRank / xpNeededForNextRank) * 100));
  };
  
  const progress = calculateProgress();

  return (
    <div
      data-testid="wolf-rank-display"
      className={cn(
        'flex flex-col gap-3 p-4 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/20',
        variant === 'compact' && 'compact p-2 gap-2',
        variant === 'full' && 'full',
        showAnimation && 'animate animate-pulse',
        className
      )}
    >
      {/* Rank Icon and Name */}
      <div className="flex items-center gap-3">
        <div className="text-4xl">{currentRank.icon}</div>
        <span className="text-2xl">🐺</span>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-amber-400">
            {currentRank.name}
          </span>
          <span className="text-sm text-slate-400">
            {currentXP} XP
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-col gap-1">
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-3 bg-slate-700 rounded-full overflow-hidden"
        >
          <div
            className={cn(
              'h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500',
              showAnimation && 'animate-pulse'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Next Rank Info */}
        <div className="flex justify-between text-xs text-slate-400">
          <span>{currentRank.name}</span>
          {nextRank ? (
            <span>Prochain: {nextRank.name}</span>
          ) : (
            <span className="text-amber-400">🏆 Rang Ultime Atteint - Légende de la Meute!</span>
          )}
        </div>
      </div>

      {/* Rank Description */}
      {variant === 'full' && (
        <p className="text-sm text-slate-300 italic">
          "{currentRank.description}"
        </p>
      )}
    </div>
  );
}

