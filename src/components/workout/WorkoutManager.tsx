/**
 * WorkoutManager Component
 * 
 * Orchestrates the complete workout flow:
 * 1. StartWorkoutDialogV2 - Configuration
 * 2. ActiveWorkoutPage - Timer & tracking
 * 3. Session summary & gamification
 */

import { useState, useCallback } from 'react';
import { StartWorkoutDialogV2, type WorkoutConfig } from './StartWorkoutDialogV2';
import { ActiveWorkoutPage } from './ActiveWorkoutPage';
import type { SessionSummary } from '@/utils/gamification/wolfTracking';

// ============================================
// TYPES
// ============================================

interface WorkoutManagerProps {
  trigger: React.ReactNode;
  currentXP?: number;
  onWorkoutComplete?: (summary: SessionSummary) => void;
}

type WorkoutState = 'idle' | 'configuring' | 'active';

// ============================================
// COMPONENT
// ============================================

export function WorkoutManager({
  trigger,
  currentXP = 0,
  onWorkoutComplete,
}: WorkoutManagerProps) {
  const [state, setState] = useState<WorkoutState>('idle');
  const [workoutConfig, setWorkoutConfig] = useState<WorkoutConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Handle opening the configuration dialog
  const handleTriggerClick = useCallback(() => {
    setDialogOpen(true);
    setState('configuring');
  }, []);

  // Handle starting the workout
  const handleStartWorkout = useCallback((config: WorkoutConfig) => {
    setWorkoutConfig(config);
    setDialogOpen(false);
    setState('active');
  }, []);

  // Handle workout completion
  const handleWorkoutComplete = useCallback((summary: SessionSummary) => {
    setState('idle');
    setWorkoutConfig(null);
    onWorkoutComplete?.(summary);
  }, [onWorkoutComplete]);

  // Handle canceling the workout
  const handleCancelWorkout = useCallback(() => {
    setState('idle');
    setWorkoutConfig(null);
    setDialogOpen(false);
  }, []);

  // Render active workout view
  if (state === 'active' && workoutConfig) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <ActiveWorkoutPage
          config={workoutConfig}
          currentXP={currentXP}
          onComplete={handleWorkoutComplete}
          onCancel={handleCancelWorkout}
        />
      </div>
    );
  }

  // Render trigger and dialog
  return (
    <>
      <div onClick={handleTriggerClick}>
        {trigger}
      </div>
      
      <StartWorkoutDialogV2
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setState('idle');
        }}
        onStartWorkout={handleStartWorkout}
      />
    </>
  );
}

export default WorkoutManager;

