/**
 * WolfSessionSummary Component
 * Displays a wolf-themed workout session summary
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Share2, X, TrendingUp, Trophy, Dumbbell, Clock, Flame, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SessionSummary, PersonalRecord } from '@/utils/gamification/wolfTracking';
import { getWolfSessionTitle, getMotivationalMessage } from '@/utils/gamification/wolfTracking';

interface WolfSessionSummaryProps {
  summary: SessionSummary;
  previousSummary?: SessionSummary;
  showTerritoryStats?: boolean;
  showActions?: boolean;
  onShare?: () => void;
  onClose?: () => void;
  animate?: boolean;
  className?: string;
}

export function WolfSessionSummary({
  summary,
  previousSummary,
  showTerritoryStats = false,
  showActions = false,
  onShare,
  onClose,
  animate = false,
  className
}: WolfSessionSummaryProps) {
  const sessionTitle = getWolfSessionTitle('strength', summary.intensityScore);
  const motivationalMessage = getMotivationalMessage(summary.intensityScore);

  // Format duration to hours and minutes
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  // Calculate improvement percentage
  const calculateImprovement = () => {
    if (!previousSummary || previousSummary.totalWeight === 0) return null;
    const improvement = ((summary.totalWeight - previousSummary.totalWeight) / previousSummary.totalWeight) * 100;
    return improvement;
  };

  const improvement = calculateImprovement();

  const stats = [
    { icon: Dumbbell, label: `${summary.totalSets} sets`, value: summary.totalSets },
    { icon: TrendingUp, label: `${summary.totalReps} reps`, value: summary.totalReps },
    { icon: Star, label: `${summary.totalWeight.toLocaleString()} kg`, value: summary.totalWeight },
    { icon: Flame, label: `${summary.caloriesEstimate} kcal`, value: summary.caloriesEstimate },
    { icon: Clock, label: formatDuration(summary.duration), value: summary.duration },
  ];

  return (
    <article
      data-testid="wolf-session-summary"
      role="article"
      className={cn(
        'flex flex-col gap-4 p-6 rounded-xl',
        'bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900/20',
        'border border-amber-500/30',
        animate && 'animate-in fade-in slide-in-from-bottom-4 duration-500',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🐺</span>
          <div>
            <h2 role="heading" className="text-xl font-bold text-amber-400">
              {sessionTitle}
            </h2>
            <p className="text-sm text-slate-400">
              Chasse terminée • {summary.totalExercises} exercices
            </p>
          </div>
        </div>
        
        {/* XP Earned */}
        <div className="flex flex-col items-end">
          <span className="text-2xl font-bold text-green-400">+{summary.xpEarned}</span>
          <span className="text-sm text-slate-400">XP</span>
        </div>
      </div>

      {/* Motivational Message */}
      <div
        data-testid="motivational-message"
        className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20"
      >
        <p className="text-amber-200 italic text-sm">"{motivationalMessage}"</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            data-testid="stat-item"
            className={cn(
              'flex flex-col items-center p-3 rounded-lg bg-slate-800/50',
              animate && 'animate-in fade-in'
            )}
            style={animate ? { animationDelay: `${index * 100}ms` } : undefined}
          >
            <stat.icon className="w-5 h-5 text-amber-400 mb-1" />
            <span className="text-white font-semibold">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Intensity Score */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
        <span className="text-slate-400">Intensité</span>
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                summary.intensityScore >= 80 ? 'bg-red-500' :
                summary.intensityScore >= 50 ? 'bg-amber-500' : 'bg-green-500'
              )}
              style={{ width: `${summary.intensityScore}%` }}
            />
          </div>
          <span className="text-white font-bold">{summary.intensityScore}%</span>
        </div>
      </div>

      {/* Improvement Indicator */}
      {improvement !== null && (
        <div
          data-testid="improvement-indicator"
          className={cn(
            'flex items-center gap-2 p-3 rounded-lg',
            improvement >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
          )}
        >
          <TrendingUp className={cn(
            'w-5 h-5',
            improvement >= 0 ? 'text-green-400' : 'text-red-400 rotate-180'
          )} />
          <span className={improvement >= 0 ? 'text-green-400' : 'text-red-400'}>
            {improvement >= 0 ? '+' : ''}{improvement.toFixed(1)}% vs dernière session
          </span>
          <span className="text-slate-400 text-sm">amélioration</span>
        </div>
      )}

      {/* Personal Records */}
      {summary.personalRecords.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-yellow-400">
              Nouveaux Records Personnels!
            </h3>
          </div>
          <div className="space-y-2">
            {summary.personalRecords.map((pr: PersonalRecord) => (
              <div
                key={pr.exerciseId}
                className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20"
              >
                <span className="text-white">{pr.exerciseName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-bold">{pr.value} {pr.unit}</span>
                  {pr.previousBest && (
                    <span className="text-green-400 text-sm">
                      +{pr.value - pr.previousBest}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges Earned */}
      {summary.badges.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-purple-400">
            🏆 {summary.badges.length} Badge{summary.badges.length > 1 ? 's' : ''} Débloqué{summary.badges.length > 1 ? 's' : ''}!
          </h3>
          <div className="flex gap-2 flex-wrap">
            {summary.badges.map(badgeId => (
              <span
                key={badgeId}
                className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
              >
                {badgeId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Territory Stats */}
      {showTerritoryStats && (
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <h3 className="font-bold text-amber-400 mb-2">🗺️ Territoire</h3>
          <p className="text-slate-300 text-sm">
            Votre meute a conquis de nouveaux territoires avec cette chasse!
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onShare}
            variant="outline"
            className="flex-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
          >
            Continuer
          </Button>
        </div>
      )}
    </article>
  );
}

