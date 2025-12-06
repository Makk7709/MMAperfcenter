/**
 * ActiveWorkoutPage Component
 * 
 * Full-screen workout view with:
 * - Wolf-themed timer
 * - Round tracking
 * - Session summary on completion
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WolfTimerDisplay } from '@/components/gamification/WolfTimerDisplay';
import { WolfSessionSummary } from '@/components/gamification/WolfSessionSummary';
import { WolfRankDisplay } from '@/components/gamification/WolfRankDisplay';
import type { WorkoutConfig } from './StartWorkoutDialogV2';
import type { SessionSummary } from '@/utils/gamification/wolfTracking';
import { 
  ArrowLeft, 
  Trophy,
  Flame,
  Target,
  Dumbbell 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface ActiveWorkoutPageProps {
  config: WorkoutConfig;
  onComplete: (summary: SessionSummary) => void;
  onCancel: () => void;
  currentXP?: number;
}

type WorkoutPhase = 'warmup' | 'active' | 'cooldown' | 'completed';

// ============================================
// COMPONENT
// ============================================

export function ActiveWorkoutPage({
  config,
  onComplete,
  onCancel,
  currentXP = 0,
}: ActiveWorkoutPageProps) {
  const [phase, setPhase] = useState<WorkoutPhase>('warmup');
  const [completedRounds, setCompletedRounds] = useState(0);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [startTime] = useState(Date.now());

  // Determine if this is a round-based workout
  const hasRounds = Boolean(config.rounds && config.roundDuration);

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    if (phase === 'warmup') {
      setPhase('active');
    } else if (phase === 'active') {
      setPhase('cooldown');
    } else if (phase === 'cooldown') {
      // Generate session summary
      const duration = Math.round((Date.now() - startTime) / 1000);
      const summary: SessionSummary = {
        totalExercises: hasRounds ? completedRounds : 1,
        totalSets: completedRounds * 3 || 5,
        totalReps: completedRounds * 30 || 50,
        totalWeight: 0,
        totalVolume: 0,
        duration,
        personalRecords: [],
        caloriesEstimate: Math.round(duration / 60 * 8), // ~8 kcal/min
        intensityScore: config.intensity === 'intense' ? 85 : config.intensity === 'moderate' ? 65 : 45,
        muscleGroups: ['full-body'],
        badges: [],
        xpEarned: 50 + (completedRounds * 10),
      };
      setSessionSummary(summary);
      setPhase('completed');
    }
  }, [phase, startTime, hasRounds, completedRounds, config.intensity]);

  // Handle round changes
  const handleRoundChange = useCallback((round: number) => {
    setCompletedRounds(round - 1);
  }, []);

  // Handle session complete
  const handleSessionClose = useCallback(() => {
    if (sessionSummary) {
      onComplete(sessionSummary);
    }
  }, [sessionSummary, onComplete]);

  // Get phase configuration
  const getPhaseConfig = () => {
    switch (phase) {
      case 'warmup':
        return {
          title: '🔥 Échauffement',
          subtitle: 'Prépare ton corps pour la chasse',
          duration: 60, // 1 minute warmup
          color: 'from-orange-500 to-yellow-500',
        };
      case 'active':
        return {
          title: `🐺 ${config.name}`,
          subtitle: hasRounds ? `Round ${completedRounds + 1}/${config.rounds}` : 'En pleine chasse !',
          duration: hasRounds 
            ? (config.roundDuration || 180)
            : config.duration * 60,
          color: 'from-amber-500 to-red-500',
        };
      case 'cooldown':
        return {
          title: '❄️ Récupération',
          subtitle: 'La meute se repose...',
          duration: 60,
          color: 'from-blue-500 to-cyan-500',
        };
      default:
        return {
          title: '',
          subtitle: '',
          duration: 0,
          color: '',
        };
    }
  };

  const phaseConfig = getPhaseConfig();

  // Show session summary when completed
  if (phase === 'completed' && sessionSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <WolfSessionSummary
            summary={sessionSummary}
            showActions
            animate
            onClose={handleSessionClose}
            onShare={() => {
              // TODO: Implement share functionality
              console.log('Share workout');
            }}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    )}>
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-amber-500/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quitter
        </Button>

        <div className="flex items-center gap-2">
          <Badge type={config.type} />
          <span className="text-sm font-medium text-amber-400">
            {config.intensity.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        {/* Phase Title */}
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {phaseConfig.title}
          </h1>
          <p className="text-lg text-amber-400">
            {phaseConfig.subtitle}
          </p>
        </motion.div>

        {/* Wolf Timer */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md"
          >
            <WolfTimerDisplay
              initialTime={phaseConfig.duration}
              mode={hasRounds && phase === 'active' ? 'rounds' : 'simple'}
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

        {/* Stats Bar */}
        <div className="flex gap-4 text-center">
          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-400" />}
            label="Temps"
            value={`${config.duration}min`}
          />
          {hasRounds && (
            <StatCard
              icon={<Target className="w-5 h-5 text-red-400" />}
              label="Rounds"
              value={`${completedRounds}/${config.rounds}`}
            />
          )}
          <StatCard
            icon={<Trophy className="w-5 h-5 text-amber-400" />}
            label="XP"
            value={`+${50 + completedRounds * 10}`}
          />
        </div>
      </main>

      {/* Footer with Rank */}
      <footer className="p-4 border-t border-amber-500/20">
        <WolfRankDisplay currentXP={currentXP} variant="compact" />
      </footer>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function Badge({ type }: { type: string }) {
  const getTypeIcon = () => {
    switch (type) {
      case 'boxing': return '🥊';
      case 'mma': return '🥋';
      case 'strength': return '💪';
      case 'cardio': return '🔥';
      default: return '🏋️';
    }
  };

  return (
    <span className="px-2 py-1 bg-slate-700/50 rounded-full text-sm">
      {getTypeIcon()} {type.toUpperCase()}
    </span>
  );
}

function StatCard({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
}) {
  return (
    <Card className="px-4 py-2 bg-slate-800/50 border-slate-700">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="font-bold text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default ActiveWorkoutPage;

