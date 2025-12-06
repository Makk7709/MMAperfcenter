/**
 * Wolf Tracking System
 * 
 * Workout tracking with wolf-themed terminology:
 * - "Territoire Conquis" = Total Volume
 * - "Proies" = Exercises
 * - "Sommets du Territoire" = Personal Records
 */

import { calculateXPForAction, XP_REWARDS } from './wolfPack';

// ============================================
// TYPES
// ============================================

export interface WorkoutSet {
  setNumber: number;
  reps: number;
  weight: number;
  timestamp: number;
  completed?: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  category: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  type: string;
  startTime: number;
  endTime?: number;
  exercises: WorkoutExercise[];
  status: 'active' | 'completed' | 'cancelled';
  xpEarned?: number;
  totalVolume?: number;
}

export interface TerritoryStats {
  totalTerritoryConquered: number;
  expansionRate: number;
  huntingGrounds: number;
  dominantTerritory: string;
}

export interface HuntingStats {
  preyConquered: number;
  longestHuntingStreak: number;
  favoriteHuntingGround: string;
  totalHunts: number;
}

export interface PRRecord {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

export interface PRCheckResult {
  isNewPR: boolean;
  prType?: 'weight' | 'reps';
  message?: string;
  previousBest?: { weight: number; reps: number };
}

export interface SessionSummary {
  totalVolume: number;
  totalReps: number;
  totalSets: number;
  duration: number;
  xpEarned: number;
  wolfTitle: string;
  newPRs: number;
}

export interface SessionComparison {
  volumeChange: number;
  volumeChangePercent: number;
  isImproved: boolean;
}

// ============================================
// WORKOUT SESSION MANAGEMENT
// ============================================

export function createWorkoutSession(name: string, type: string): WorkoutSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    type,
    startTime: Date.now(),
    exercises: [],
    status: 'active',
  };
}

export function addExerciseToSession(
  session: WorkoutSession,
  exercise: { name: string; category: string }
): WorkoutSession {
  const newExercise: WorkoutExercise = {
    id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: exercise.name,
    category: exercise.category,
    sets: [],
  };

  return {
    ...session,
    exercises: [...session.exercises, newExercise],
  };
}

export function addSetToExercise(
  session: WorkoutSession,
  exerciseId: string,
  set: { reps: number; weight: number }
): WorkoutSession {
  const exercises = session.exercises.map(ex => {
    if (ex.id !== exerciseId) return ex;

    const newSet: WorkoutSet = {
      setNumber: ex.sets.length + 1,
      reps: set.reps,
      weight: set.weight,
      timestamp: Date.now(),
      completed: true,
    };

    return {
      ...ex,
      sets: [...ex.sets, newSet],
    };
  });

  return {
    ...session,
    exercises,
  };
}

export function completeWorkoutSession(session: WorkoutSession): WorkoutSession {
  const totalVolume = calculateTotalVolume(session);
  const totalSets = calculateTotalSets(session);
  const totalExercises = session.exercises.length;

  // Calculate XP
  let xpEarned = XP_REWARDS.workout_completed;
  xpEarned += totalSets * XP_REWARDS.set_completed;
  xpEarned += totalExercises * XP_REWARDS.exercise_completed;

  return {
    ...session,
    endTime: Date.now(),
    status: 'completed',
    xpEarned,
    totalVolume,
  };
}

// ============================================
// STATS CALCULATION
// ============================================

export function calculateTotalVolume(session: WorkoutSession): number {
  return session.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, set) => {
      return setTotal + (set.reps * set.weight);
    }, 0);
  }, 0);
}

export function calculateTotalReps(session: WorkoutSession): number {
  return session.exercises.reduce((total, ex) => {
    return total + ex.sets.reduce((setTotal, set) => {
      return setTotal + set.reps;
    }, 0);
  }, 0);
}

export function calculateTotalSets(session: WorkoutSession): number {
  return session.exercises.reduce((total, ex) => total + ex.sets.length, 0);
}

export function getSessionDuration(session: WorkoutSession): number {
  if (!session.endTime) return 0;
  return Math.round((session.endTime - session.startTime) / 60000);
}

// ============================================
// PR TRACKING
// ============================================

export function checkForPR(
  exerciseName: string,
  currentSet: { reps: number; weight: number },
  prHistory: Array<{ weight: number; reps: number }>
): PRCheckResult {
  if (prHistory.length === 0) {
    return {
      isNewPR: true,
      prType: 'weight',
      message: `🏔️ Nouveau sommet du territoire conquis ! ${exerciseName} - ${currentSet.weight}kg x ${currentSet.reps}`,
    };
  }

  const bestWeight = Math.max(...prHistory.map(pr => pr.weight));
  const bestRepsAtWeight = prHistory
    .filter(pr => pr.weight === currentSet.weight)
    .reduce((max, pr) => Math.max(max, pr.reps), 0);

  if (currentSet.weight > bestWeight) {
    return {
      isNewPR: true,
      prType: 'weight',
      message: `🐺 Le loup a conquis un nouveau territoire ! PR: ${currentSet.weight}kg`,
      previousBest: { weight: bestWeight, reps: prHistory[0]?.reps || 0 },
    };
  }

  if (currentSet.weight === bestWeight && currentSet.reps > bestRepsAtWeight) {
    return {
      isNewPR: true,
      prType: 'reps',
      message: `⚡ Conquête étendue ! ${currentSet.reps} reps à ${currentSet.weight}kg`,
      previousBest: { weight: bestWeight, reps: bestRepsAtWeight },
    };
  }

  return { isNewPR: false };
}

export function getPRHistory(
  exerciseName: string,
  allPRs: PRRecord[]
): PRRecord[] {
  return allPRs.filter(pr => pr.exercise === exerciseName);
}

export function getPRByExercise(
  exerciseName: string,
  allPRs: PRRecord[]
): PRRecord | undefined {
  const exercisePRs = getPRHistory(exerciseName, allPRs);
  if (exercisePRs.length === 0) return undefined;

  return exercisePRs.reduce((best, current) => {
    if (current.weight > best.weight) return current;
    if (current.weight === best.weight && current.reps > best.reps) return current;
    return best;
  });
}

// ============================================
// TERRITORY STATS (Wolf Theme)
// ============================================

export function calculateTerritoryStats(sessions: WorkoutSession[]): TerritoryStats {
  const totalVolume = sessions.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
  
  // Calculate expansion rate (compare last session to previous)
  let expansionRate = 0;
  if (sessions.length >= 2) {
    // Assume sessions are in order, last is most recent
    const lastSession = sessions[sessions.length - 1];
    const previousSession = sessions[sessions.length - 2];
    const lastVolume = lastSession.totalVolume || 0;
    const previousVolume = previousSession.totalVolume || 0;
    
    if (previousVolume > 0) {
      expansionRate = ((lastVolume - previousVolume) / previousVolume) * 100;
    } else if (lastVolume > 0) {
      expansionRate = 100; // First real session after empty
    }
  }

  // Count unique exercises (hunting grounds)
  const allExercises = new Set<string>();
  sessions.forEach(s => {
    s.exercises?.forEach(ex => allExercises.add(ex.name));
  });

  return {
    totalTerritoryConquered: totalVolume,
    expansionRate,
    huntingGrounds: allExercises.size,
    dominantTerritory: 'Salle de Combat',
  };
}

const TERRITORY_NAMES = [
  'Petite Tanière',
  'Forêt des Débutants',
  'Vallée du Chasseur',
  'Montagne des Guerriers',
  'Territoire du Beta',
  'Domaine de l\'Alpha',
  'Royaume du Loup Garou',
  'Empire de la Meute',
  'Légende des Crocs',
  'Sommet Éternel',
];

export function getTerritoryLevel(totalVolume: number): number {
  // Territory levels based on cumulative volume
  // Level 1: 0-50,000 kg
  // Level 10: 5,000,000+ kg
  const thresholds = [0, 50000, 100000, 250000, 500000, 750000, 1000000, 2000000, 3500000, 5000000];
  
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalVolume >= thresholds[i]) {
      return Math.min(i + 1, 10);
    }
  }
  return 1;
}

export function getTerritoryName(level: number): string {
  const index = Math.min(Math.max(level - 1, 0), TERRITORY_NAMES.length - 1);
  return TERRITORY_NAMES[index];
}

// ============================================
// HUNTING STATS
// ============================================

export function calculateHuntingStats(sessions: WorkoutSession[]): HuntingStats {
  let preyConquered = 0;
  const exerciseCounts: Record<string, number> = {};

  sessions.forEach(s => {
    s.exercises?.forEach(ex => {
      if (ex.sets && ex.sets.length > 0) {
        preyConquered++;
        exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;
      }
    });
  });

  // Calculate streak (simplified - consecutive days)
  const longestHuntingStreak = Math.min(sessions.length, 30);

  // Find favorite exercise
  const favoriteHuntingGround = Object.entries(exerciseCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Aucun';

  return {
    preyConquered,
    longestHuntingStreak,
    favoriteHuntingGround,
    totalHunts: sessions.length,
  };
}

export function getPreyConquered(sessions: WorkoutSession[]): Array<{ name: string; count: number }> {
  const counts: Record<string, number> = {};

  sessions.forEach(s => {
    s.exercises?.forEach(ex => {
      if (ex.sets && ex.sets.length > 0) {
        counts[ex.name] = (counts[ex.name] || 0) + 1;
      }
    });
  });

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getHuntingEfficiency(session: WorkoutSession): number {
  let totalSets = 0;
  let completedSets = 0;

  session.exercises?.forEach(ex => {
    ex.sets?.forEach(set => {
      totalSets++;
      if (set.completed !== false) {
        completedSets++;
      }
    });
  });

  if (totalSets === 0) return 100;
  return Math.round((completedSets / totalSets) * 100 * 100) / 100;
}

// ============================================
// SESSION SUMMARY
// ============================================

const WOLF_SESSION_TITLES: Record<string, string[]> = {
  boxing: ['Chasse aux Poings', 'Combat des Crocs', 'Attaque du Loup Boxeur'],
  mma: ['Guerre de Meute', 'Combat Total de Meute', 'Combat du Prédateur'],
  strength: ['Conquête de Force', 'Territoire de Puissance', 'Forge des Crocs'],
  cardio: ['Sprint du Chasseur', 'Endurance du Loup', 'Course de la Meute'],
  default: ['Chasse du Jour', 'Entraînement de Meute', 'Session du Loup'],
};

export function getWolfSessionTitle(workoutType: string): string {
  const titles = WOLF_SESSION_TITLES[workoutType] || WOLF_SESSION_TITLES.default;
  return titles[Math.floor(Math.random() * titles.length)];
}

export function generateSessionSummary(session: WorkoutSession): SessionSummary {
  return {
    totalVolume: calculateTotalVolume(session),
    totalReps: calculateTotalReps(session),
    totalSets: calculateTotalSets(session),
    duration: getSessionDuration(session),
    xpEarned: session.xpEarned || 0,
    wolfTitle: getWolfSessionTitle(session.type),
    newPRs: 0, // Would be calculated from PR tracking
  };
}

// ============================================
// COMPARISON
// ============================================

export function compareToLastSession(
  current: WorkoutSession,
  previous: WorkoutSession
): SessionComparison {
  const currentVolume = current.totalVolume || calculateTotalVolume(current);
  const previousVolume = previous.totalVolume || calculateTotalVolume(previous);

  const volumeChange = currentVolume - previousVolume;
  const volumeChangePercent = previousVolume > 0 
    ? Math.round((volumeChange / previousVolume) * 100)
    : 0;

  return {
    volumeChange,
    volumeChangePercent,
    isImproved: volumeChange > 0,
  };
}

const IMPROVEMENT_MESSAGES = [
  { threshold: 0, message: 'Le territoire se maintient. Continue la chasse !' },
  { threshold: 5, message: 'Légère expansion du territoire. Le loup progresse.' },
  { threshold: 10, message: 'Belle conquête ! Ton territoire s\'agrandit.' },
  { threshold: 20, message: 'Expansion majeure ! Le loup domine son territoire.' },
  { threshold: 30, message: 'Conquête légendaire ! Tu es un vrai Alpha !' },
];

export function calculateImprovement(percentChange: number): string {
  for (let i = IMPROVEMENT_MESSAGES.length - 1; i >= 0; i--) {
    if (percentChange >= IMPROVEMENT_MESSAGES[i].threshold) {
      return IMPROVEMENT_MESSAGES[i].message;
    }
  }
  return IMPROVEMENT_MESSAGES[0].message;
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Session
  createWorkoutSession,
  addExerciseToSession,
  addSetToExercise,
  completeWorkoutSession,

  // Stats
  calculateTotalVolume,
  calculateTotalReps,
  calculateTotalSets,
  getSessionDuration,

  // PR
  checkForPR,
  getPRHistory,
  getPRByExercise,

  // Territory
  calculateTerritoryStats,
  getTerritoryLevel,
  getTerritoryName,

  // Hunting
  calculateHuntingStats,
  getPreyConquered,
  getHuntingEfficiency,

  // Summary
  generateSessionSummary,
  getWolfSessionTitle,

  // Comparison
  compareToLastSession,
  calculateImprovement,
};

