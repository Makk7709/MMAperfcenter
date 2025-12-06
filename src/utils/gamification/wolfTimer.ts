/**
 * Wolf Timer System
 * 
 * Combat timer with wolf-themed sounds and terminology
 * "Temps de Chasse" = Round, "Retour à la Tanière" = Rest
 */

import { getSoundForEvent, type SoundPreference } from './wolfPack';

// ============================================
// TYPES
// ============================================

export type TimerPhase = 'ready' | 'work' | 'rest' | 'complete';
export type SoundType = 'round_end' | 'warning' | 'workout_complete' | 'countdown';

export interface TimerState {
  currentRound: number;
  phase: TimerPhase;
  elapsedInPhase: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface TimerConfig {
  roundDuration: number; // seconds
  restDuration: number; // seconds
  totalRounds: number;
  warningTime: number; // seconds before end to play warning
  soundPreference: SoundPreference;
  prepareTime?: number; // countdown before start
}

export interface TimerPreset {
  name: string;
  wolfName: string;
  roundDuration: number;
  restDuration: number;
  totalRounds: number;
  description: string;
}

// ============================================
// TIMER PRESETS
// ============================================

export const TIMER_PRESETS: TimerPreset[] = [
  {
    name: 'boxing',
    wolfName: 'Chasse du Boxeur',
    roundDuration: 180, // 3 minutes
    restDuration: 60,
    totalRounds: 12,
    description: 'Rounds de boxe professionnelle',
  },
  {
    name: 'mma',
    wolfName: 'Combat de Meute',
    roundDuration: 300, // 5 minutes
    restDuration: 60,
    totalRounds: 5,
    description: 'Rounds MMA championship',
  },
  {
    name: 'muay_thai',
    wolfName: 'Crocs de Tigre',
    roundDuration: 180, // 3 minutes
    restDuration: 120,
    totalRounds: 5,
    description: 'Rounds Muay Thai traditionnels',
  },
  {
    name: 'hiit',
    wolfName: 'Sprint du Loup',
    roundDuration: 45,
    restDuration: 15,
    totalRounds: 8,
    description: 'HIIT haute intensité',
  },
  {
    name: 'tabata',
    wolfName: 'Attaque Éclair',
    roundDuration: 20,
    restDuration: 10,
    totalRounds: 8,
    description: 'Protocole Tabata classique',
  },
  {
    name: 'sparring',
    wolfName: 'Duel de Loups',
    roundDuration: 180,
    restDuration: 60,
    totalRounds: 5,
    description: 'Sparring technique',
  },
  {
    name: 'bag_work',
    wolfName: 'Frappe de Meute',
    roundDuration: 180,
    restDuration: 30,
    totalRounds: 6,
    description: 'Travail au sac',
  },
];

export function getPresetByName(name: string): TimerPreset | undefined {
  return TIMER_PRESETS.find(p => p.name === name);
}

// ============================================
// CONFIG CREATION
// ============================================

interface CreateTimerConfigOptions {
  roundDuration?: number;
  restDuration?: number;
  totalRounds?: number;
  warningTime?: number;
  soundPreference?: SoundPreference;
  prepareTime?: number;
}

export function createTimerConfig(options: CreateTimerConfigOptions): TimerConfig {
  return {
    roundDuration: options.roundDuration ?? 180,
    restDuration: options.restDuration ?? 60,
    totalRounds: options.totalRounds ?? 5,
    warningTime: options.warningTime ?? 10,
    soundPreference: options.soundPreference ?? 'wolf',
    prepareTime: options.prepareTime ?? 10,
  };
}

// ============================================
// TIME CALCULATIONS
// ============================================

export function calculateTimeRemaining(state: TimerState, config: TimerConfig): number {
  const phaseDuration = state.phase === 'work' 
    ? config.roundDuration 
    : config.restDuration;
  
  return Math.max(0, phaseDuration - state.elapsedInPhase);
}

export function formatTime(seconds: number): string {
  if (seconds < 0) {
    return '0:00';
  }
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getCurrentPhase(state: TimerState): TimerPhase {
  return state.phase;
}

export function getPhaseLabel(phase: TimerPhase, preference: SoundPreference): string {
  if (preference === 'wolf') {
    switch (phase) {
      case 'ready':
        return 'Préparation à la Chasse';
      case 'work':
        return 'Temps de Chasse';
      case 'rest':
        return 'Retour à la Tanière';
      case 'complete':
        return 'Chasse Terminée';
      default:
        return 'Inconnu';
    }
  } else {
    switch (phase) {
      case 'ready':
        return 'Préparation';
      case 'work':
        return 'Round - Travail';
      case 'rest':
        return 'Repos - Rest';
      case 'complete':
        return 'Terminé';
      default:
        return 'Unknown';
    }
  }
}

// ============================================
// ROUND MANAGEMENT
// ============================================

export function getRoundProgress(state: TimerState, config: TimerConfig): number {
  if (state.phase === 'complete') {
    return 100;
  }
  
  const completedRounds = state.currentRound - 1;
  return Math.round((completedRounds / config.totalRounds) * 100);
}

export function isLastRound(currentRound: number, config: TimerConfig): boolean {
  return currentRound >= config.totalRounds;
}

export function getTotalWorkoutTime(config: TimerConfig): number {
  const totalRoundTime = config.roundDuration * config.totalRounds;
  const totalRestTime = config.restDuration * (config.totalRounds - 1);
  return totalRoundTime + totalRestTime;
}

export function getElapsedTime(state: TimerState, config: TimerConfig): number {
  // Calculate completed rounds time
  const completedRounds = state.currentRound - 1;
  let elapsed = completedRounds * config.roundDuration;
  
  // Add rest periods (one less than completed rounds)
  if (completedRounds > 0) {
    elapsed += completedRounds * config.restDuration;
  }
  
  // Add current phase elapsed time
  elapsed += state.elapsedInPhase;
  
  return elapsed;
}

// ============================================
// SOUND TRIGGERS
// ============================================

export function shouldPlayWarningSound(timeRemaining: number, config: TimerConfig): boolean {
  return timeRemaining === config.warningTime;
}

export function shouldPlayEndSound(timeRemaining: number): boolean {
  return timeRemaining === 0;
}

const TIMER_SOUNDS: Record<SoundType, { wolf: string; classic: string }> = {
  round_end: {
    wolf: 'howl_short',
    classic: 'bell_ring',
  },
  warning: {
    wolf: 'growl_warning',
    classic: 'beep_warning',
  },
  workout_complete: {
    wolf: 'pack_howl_victory',
    classic: 'fanfare_complete',
  },
  countdown: {
    wolf: 'paw_tap',
    classic: 'tick',
  },
};

export function getTimerSound(soundType: SoundType, preference: SoundPreference): string {
  return TIMER_SOUNDS[soundType][preference];
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Config
  createTimerConfig,
  TIMER_PRESETS,
  getPresetByName,
  
  // Time
  calculateTimeRemaining,
  formatTime,
  getCurrentPhase,
  getPhaseLabel,
  
  // Rounds
  getRoundProgress,
  isLastRound,
  getTotalWorkoutTime,
  getElapsedTime,
  
  // Sounds
  shouldPlayWarningSound,
  shouldPlayEndSound,
  getTimerSound,
};

