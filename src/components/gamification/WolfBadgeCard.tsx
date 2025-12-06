/**
 * WolfBadgeCard Component
 * Displays a badge with wolf theme styling
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import type { WolfBadge } from '@/utils/gamification/wolfPack';

interface WolfBadgeCardProps {
  badge: WolfBadge;
  unlocked: boolean;
  onClick?: (badge: WolfBadge) => void;
  clickDisabledWhenLocked?: boolean;
  showUnlockAnimation?: boolean;
  size?: 'sm' | 'md' | 'lg';
  progress?: { current: number; total: number };
  className?: string;
}

export function WolfBadgeCard({
  badge,
  unlocked,
  onClick,
  clickDisabledWhenLocked = false,
  showUnlockAnimation = false,
  size = 'md',
  progress,
  className
}: WolfBadgeCardProps) {
  const isLegendary = badge.xpReward >= 500;
  const isClickable = onClick && !(clickDisabledWhenLocked && !unlocked);

  const handleClick = () => {
    if (isClickable) {
      onClick(badge);
    }
  };

  const sizeClasses = {
    sm: 'p-2 text-sm size-sm',
    md: 'p-4 text-base size-md',
    lg: 'p-6 text-lg size-lg'
  };

  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  return (
    <article
      data-testid="wolf-badge-card"
      role="article"
      aria-label={`Badge: ${badge.name} - ${unlocked ? 'Débloqué' : 'Verrouillé'}`}
      onClick={handleClick}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl transition-all duration-300',
        'border-2 hover-effect',
        sizeClasses[size],
        unlocked
          ? 'unlocked bg-gradient-to-br from-slate-900 to-slate-800 border-amber-500/50'
          : 'locked bg-slate-900/50 border-slate-600/30 opacity-60',
        isLegendary && 'legendary border-purple-500/50 shadow-purple-500/20',
        !isLegendary && 'common',
        showUnlockAnimation && 'unlock-animation animate-bounce',
        isClickable && 'cursor-pointer hover:scale-105 hover:border-amber-400',
        className
      )}
    >
      {/* Lock Icon for locked badges */}
      {!unlocked && (
        <div
          data-testid="lock-icon"
          className="absolute top-2 right-2 text-slate-500"
        >
          <Lock className="w-4 h-4" />
        </div>
      )}

      {/* Badge Icon */}
      <div className={cn(
        'relative',
        iconSizes[size],
        !unlocked && 'grayscale'
      )}>
        {badge.icon}
        {isLegendary && unlocked && (
          <span className="absolute -top-1 -right-1 text-xs">✨</span>
        )}
      </div>

      {/* Badge Name */}
      <h3 className={cn(
        'font-bold text-center',
        unlocked ? 'text-amber-400' : 'text-slate-500'
      )}>
        {badge.name}
      </h3>

      {/* Badge Description */}
      <p className={cn(
        'text-xs text-center',
        unlocked ? 'text-slate-300' : 'text-slate-500'
      )}>
        {badge.description}
      </p>

      {/* Category Tag */}
      <span className={cn(
        'px-2 py-0.5 rounded-full text-xs capitalize',
        unlocked
          ? 'bg-amber-500/20 text-amber-400'
          : 'bg-slate-600/20 text-slate-500'
      )}>
        {badge.category}
      </span>

      {/* XP Reward/Requirement */}
      <div className={cn(
        'text-xs font-bold',
        unlocked ? 'text-green-400' : 'text-slate-400'
      )}>
        {unlocked ? (
          <span>+{badge.xpReward} XP</span>
        ) : (
          <span>{badge.xpReward} XP à débloquer</span>
        )}
      </div>

      {/* Progress Bar (for locked badges with progress) */}
      {!unlocked && progress && (
        <div className="w-full">
          <div
            role="progressbar"
            className="h-1.5 bg-slate-700 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-amber-500/50"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 mt-1">
            {progress.current}/{progress.total}
          </span>
        </div>
      )}
    </article>
  );
}

