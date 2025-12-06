/**
 * TDD Tests for Wolf Tracking System
 * 
 * Theme: Territoire et Chasse
 * Stats become "Conquêtes", PRs become "Sommets du Territoire"
 */

import { describe, it, expect } from 'vitest';
import {
  // Workout Tracking
  WorkoutSession,
  createWorkoutSession,
  addExerciseToSession,
  addSetToExercise,
  completeWorkoutSession,
  
  // Stats Calculation
  calculateTotalVolume,
  calculateTotalReps,
  calculateTotalSets,
  getSessionDuration,
  
  // PR Tracking
  checkForPR,
  getPRHistory,
  getPRByExercise,
  
  // Territory Stats (Wolf Theme)
  TerritoryStats,
  calculateTerritoryStats,
  getTerritoryLevel,
  getTerritoryName,
  
  // Hunting Stats (Exercise tracking)
  HuntingStats,
  calculateHuntingStats,
  getPreyConquered,
  getHuntingEfficiency,
  
  // Session Summary
  generateSessionSummary,
  getWolfSessionTitle,
  
  // Comparison
  compareToLastSession,
  calculateImprovement,
} from './wolfTracking';

// ============================================
// WORKOUT SESSION TESTS
// ============================================

describe('Workout Session Management', () => {
  describe('createWorkoutSession', () => {
    it('should create a new session with ID', () => {
      const session = createWorkoutSession('Morning Hunt', 'boxing');
      
      expect(session.id).toBeDefined();
      expect(session.name).toBe('Morning Hunt');
      expect(session.type).toBe('boxing');
    });

    it('should set start time to now', () => {
      const before = Date.now();
      const session = createWorkoutSession('Test', 'mma');
      const after = Date.now();
      
      expect(session.startTime).toBeGreaterThanOrEqual(before);
      expect(session.startTime).toBeLessThanOrEqual(after);
    });

    it('should initialize empty exercises array', () => {
      const session = createWorkoutSession('Test', 'strength');
      expect(session.exercises).toEqual([]);
    });

    it('should set status to active', () => {
      const session = createWorkoutSession('Test', 'cardio');
      expect(session.status).toBe('active');
    });
  });

  describe('addExerciseToSession', () => {
    it('should add exercise to session', () => {
      const session = createWorkoutSession('Test', 'strength');
      const updated = addExerciseToSession(session, {
        name: 'Bench Press',
        category: 'chest',
      });
      
      expect(updated.exercises).toHaveLength(1);
      expect(updated.exercises[0].name).toBe('Bench Press');
    });

    it('should generate exercise ID', () => {
      const session = createWorkoutSession('Test', 'strength');
      const updated = addExerciseToSession(session, {
        name: 'Squats',
        category: 'legs',
      });
      
      expect(updated.exercises[0].id).toBeDefined();
    });

    it('should initialize empty sets array', () => {
      const session = createWorkoutSession('Test', 'strength');
      const updated = addExerciseToSession(session, {
        name: 'Deadlift',
        category: 'back',
      });
      
      expect(updated.exercises[0].sets).toEqual([]);
    });
  });

  describe('addSetToExercise', () => {
    it('should add set to specified exercise', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = addExerciseToSession(session, { name: 'Bench', category: 'chest' });
      
      const exerciseId = session.exercises[0].id;
      const updated = addSetToExercise(session, exerciseId, {
        reps: 10,
        weight: 100,
      });
      
      expect(updated.exercises[0].sets).toHaveLength(1);
      expect(updated.exercises[0].sets[0].reps).toBe(10);
      expect(updated.exercises[0].sets[0].weight).toBe(100);
    });

    it('should auto-number sets', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = addExerciseToSession(session, { name: 'Squats', category: 'legs' });
      
      const exerciseId = session.exercises[0].id;
      session = addSetToExercise(session, exerciseId, { reps: 10, weight: 100 });
      session = addSetToExercise(session, exerciseId, { reps: 8, weight: 110 });
      
      expect(session.exercises[0].sets[0].setNumber).toBe(1);
      expect(session.exercises[0].sets[1].setNumber).toBe(2);
    });

    it('should record set timestamp', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = addExerciseToSession(session, { name: 'Test', category: 'test' });
      
      const before = Date.now();
      const updated = addSetToExercise(session, session.exercises[0].id, {
        reps: 5,
        weight: 50,
      });
      
      expect(updated.exercises[0].sets[0].timestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe('completeWorkoutSession', () => {
    it('should set end time', () => {
      let session = createWorkoutSession('Test', 'strength');
      const completed = completeWorkoutSession(session);
      
      expect(completed.endTime).toBeDefined();
    });

    it('should set status to completed', () => {
      let session = createWorkoutSession('Test', 'strength');
      const completed = completeWorkoutSession(session);
      
      expect(completed.status).toBe('completed');
    });

    it('should calculate total XP earned', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = addExerciseToSession(session, { name: 'Test', category: 'test' });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 10, weight: 100 });
      
      const completed = completeWorkoutSession(session);
      expect(completed.xpEarned).toBeGreaterThan(0);
    });
  });
});

// ============================================
// STATS CALCULATION TESTS
// ============================================

describe('Stats Calculation', () => {
  describe('calculateTotalVolume', () => {
    it('should calculate total volume (weight * reps)', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = addExerciseToSession(session, { name: 'Bench', category: 'chest' });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 10, weight: 100 });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 8, weight: 100 });
      
      // 10*100 + 8*100 = 1800
      expect(calculateTotalVolume(session)).toBe(1800);
    });

    it('should return 0 for empty session', () => {
      const session = createWorkoutSession('Test', 'strength');
      expect(calculateTotalVolume(session)).toBe(0);
    });

    it('should handle bodyweight exercises (weight=0)', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = addExerciseToSession(session, { name: 'Pushups', category: 'chest' });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 20, weight: 0 });
      
      expect(calculateTotalVolume(session)).toBe(0);
    });
  });

  describe('calculateTotalReps', () => {
    it('should sum all reps', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = addExerciseToSession(session, { name: 'Test', category: 'test' });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 10, weight: 0 });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 12, weight: 0 });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 8, weight: 0 });
      
      expect(calculateTotalReps(session)).toBe(30);
    });
  });

  describe('calculateTotalSets', () => {
    it('should count all sets', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = addExerciseToSession(session, { name: 'Ex1', category: 'test' });
      session = addExerciseToSession(session, { name: 'Ex2', category: 'test' });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 10, weight: 0 });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 10, weight: 0 });
      session = addSetToExercise(session, session.exercises[1].id, { reps: 10, weight: 0 });
      
      expect(calculateTotalSets(session)).toBe(3);
    });
  });

  describe('getSessionDuration', () => {
    it('should calculate duration in minutes', () => {
      let session = createWorkoutSession('Test', 'strength');
      session.startTime = Date.now() - 30 * 60 * 1000; // 30 minutes ago
      session = completeWorkoutSession(session);
      
      const duration = getSessionDuration(session);
      expect(duration).toBeGreaterThanOrEqual(29);
      expect(duration).toBeLessThanOrEqual(31);
    });

    it('should return 0 for incomplete session', () => {
      const session = createWorkoutSession('Test', 'strength');
      expect(getSessionDuration(session)).toBe(0);
    });
  });
});

// ============================================
// PR TRACKING TESTS
// ============================================

describe('PR (Personal Record) Tracking', () => {
  describe('checkForPR', () => {
    it('should detect new PR for first lift', () => {
      const currentSet = { reps: 10, weight: 100 };
      const prHistory: Array<{ weight: number; reps: number }> = [];
      
      const result = checkForPR('Bench Press', currentSet, prHistory);
      expect(result.isNewPR).toBe(true);
    });

    it('should detect PR when weight exceeds previous', () => {
      const currentSet = { reps: 5, weight: 120 };
      const prHistory = [{ weight: 100, reps: 5 }];
      
      const result = checkForPR('Bench Press', currentSet, prHistory);
      expect(result.isNewPR).toBe(true);
    });

    it('should not detect PR when weight is lower', () => {
      const currentSet = { reps: 5, weight: 90 };
      const prHistory = [{ weight: 100, reps: 5 }];
      
      const result = checkForPR('Bench Press', currentSet, prHistory);
      expect(result.isNewPR).toBe(false);
    });

    it('should detect rep PR at same weight', () => {
      const currentSet = { reps: 12, weight: 100 };
      const prHistory = [{ weight: 100, reps: 10 }];
      
      const result = checkForPR('Bench Press', currentSet, prHistory);
      expect(result.isNewPR).toBe(true);
      expect(result.prType).toBe('reps');
    });

    it('should return wolf-themed PR message', () => {
      const currentSet = { reps: 10, weight: 150 };
      const prHistory: Array<{ weight: number; reps: number }> = [];
      
      const result = checkForPR('Deadlift', currentSet, prHistory);
      expect(result.message).toBeDefined();
      expect(result.message?.toLowerCase()).toMatch(/territoire|sommet|conquête|loup/);
    });
  });

  describe('getPRHistory', () => {
    it('should return empty array for new exercise', () => {
      const history = getPRHistory('New Exercise', []);
      expect(history).toEqual([]);
    });

    it('should filter PRs by exercise name', () => {
      const allPRs = [
        { exercise: 'Bench Press', weight: 100, reps: 10, date: '2024-01-01' },
        { exercise: 'Squats', weight: 150, reps: 5, date: '2024-01-02' },
        { exercise: 'Bench Press', weight: 110, reps: 8, date: '2024-01-03' },
      ];
      
      const benchPRs = getPRHistory('Bench Press', allPRs);
      expect(benchPRs).toHaveLength(2);
    });
  });

  describe('getPRByExercise', () => {
    it('should return best PR for exercise', () => {
      const allPRs = [
        { exercise: 'Bench', weight: 100, reps: 10, date: '2024-01-01' },
        { exercise: 'Bench', weight: 110, reps: 8, date: '2024-01-15' },
        { exercise: 'Bench', weight: 105, reps: 12, date: '2024-01-10' },
      ];
      
      const bestPR = getPRByExercise('Bench', allPRs);
      expect(bestPR?.weight).toBe(110);
    });
  });
});

// ============================================
// TERRITORY STATS TESTS (Wolf Theme)
// ============================================

describe('Territory Stats (Wolf Theme)', () => {
  describe('calculateTerritoryStats', () => {
    it('should calculate total territory conquered (total volume)', () => {
      const sessions = [
        { totalVolume: 5000 },
        { totalVolume: 6000 },
        { totalVolume: 4500 },
      ];
      
      const stats = calculateTerritoryStats(sessions as any);
      expect(stats.totalTerritoryConquered).toBe(15500);
    });

    it('should calculate territory expansion rate', () => {
      const sessions = [
        { totalVolume: 5000, date: '2024-01-01' },
        { totalVolume: 6000, date: '2024-01-08' },
      ];
      
      const stats = calculateTerritoryStats(sessions as any);
      expect(stats.expansionRate).toBeGreaterThan(0);
    });

    it('should count hunting grounds (unique exercises)', () => {
      const sessions = [
        { exercises: [{ name: 'Bench' }, { name: 'Squats' }] },
        { exercises: [{ name: 'Bench' }, { name: 'Deadlift' }] },
      ];
      
      const stats = calculateTerritoryStats(sessions as any);
      expect(stats.huntingGrounds).toBe(3); // Bench, Squats, Deadlift
    });
  });

  describe('getTerritoryLevel', () => {
    it('should return level 1 for small territory', () => {
      expect(getTerritoryLevel(10000)).toBe(1);
    });

    it('should increase with territory size', () => {
      expect(getTerritoryLevel(100000)).toBeGreaterThan(getTerritoryLevel(10000));
    });

    it('should cap at level 10', () => {
      expect(getTerritoryLevel(10000000)).toBeLessThanOrEqual(10);
    });
  });

  describe('getTerritoryName', () => {
    it('should return wolf-themed territory name', () => {
      const name = getTerritoryName(1);
      expect(name.toLowerCase()).toMatch(/tanière|territoire|forêt|montagne/);
    });

    it('should have different names for different levels', () => {
      const name1 = getTerritoryName(1);
      const name5 = getTerritoryName(5);
      const name10 = getTerritoryName(10);
      
      expect(name1).not.toBe(name5);
      expect(name5).not.toBe(name10);
    });
  });
});

// ============================================
// HUNTING STATS TESTS
// ============================================

describe('Hunting Stats', () => {
  describe('calculateHuntingStats', () => {
    it('should count total prey conquered (exercises completed)', () => {
      const sessions = [
        { exercises: [{ sets: [{}] }, { sets: [{}] }] },
        { exercises: [{ sets: [{}] }] },
      ];
      
      const stats = calculateHuntingStats(sessions as any);
      expect(stats.preyConquered).toBe(3);
    });

    it('should calculate hunting streaks', () => {
      const sessions = [
        { date: '2024-01-01' },
        { date: '2024-01-02' },
        { date: '2024-01-03' },
      ];
      
      const stats = calculateHuntingStats(sessions as any);
      expect(stats.longestHuntingStreak).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getPreyConquered', () => {
    it('should return list of completed exercises with counts', () => {
      const sessions = [
        { exercises: [{ name: 'Bench', sets: [{}] }, { name: 'Squats', sets: [{}] }] },
        { exercises: [{ name: 'Bench', sets: [{}] }] },
      ];
      
      const prey = getPreyConquered(sessions as any);
      expect(prey.find(p => p.name === 'Bench')?.count).toBe(2);
      expect(prey.find(p => p.name === 'Squats')?.count).toBe(1);
    });
  });

  describe('getHuntingEfficiency', () => {
    it('should calculate efficiency percentage', () => {
      // Efficiency = completed sets / planned sets
      const session = {
        exercises: [
          { sets: [{ completed: true }, { completed: true }, { completed: false }] },
        ],
      };
      
      const efficiency = getHuntingEfficiency(session as any);
      expect(efficiency).toBeCloseTo(66.67, 0);
    });

    it('should return 100% when all sets completed', () => {
      const session = {
        exercises: [
          { sets: [{ completed: true }, { completed: true }] },
        ],
      };
      
      expect(getHuntingEfficiency(session as any)).toBe(100);
    });
  });
});

// ============================================
// SESSION SUMMARY TESTS
// ============================================

describe('Session Summary', () => {
  describe('generateSessionSummary', () => {
    it('should include all key stats', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = addExerciseToSession(session, { name: 'Bench', category: 'chest' });
      session = addSetToExercise(session, session.exercises[0].id, { reps: 10, weight: 100 });
      session = completeWorkoutSession(session);
      
      const summary = generateSessionSummary(session);
      
      expect(summary.totalVolume).toBeDefined();
      expect(summary.totalReps).toBeDefined();
      expect(summary.totalSets).toBeDefined();
      expect(summary.duration).toBeDefined();
      expect(summary.xpEarned).toBeDefined();
    });

    it('should include wolf-themed title', () => {
      let session = createWorkoutSession('Morning Workout', 'strength');
      session = completeWorkoutSession(session);
      
      const summary = generateSessionSummary(session);
      expect(summary.wolfTitle).toBeDefined();
    });

    it('should include PR count', () => {
      let session = createWorkoutSession('Test', 'strength');
      session = completeWorkoutSession(session);
      
      const summary = generateSessionSummary(session);
      expect(summary.newPRs).toBeDefined();
    });
  });

  describe('getWolfSessionTitle', () => {
    it('should return wolf-themed title based on workout type', () => {
      const boxingTitle = getWolfSessionTitle('boxing');
      const mmaTitle = getWolfSessionTitle('mma');
      const strengthTitle = getWolfSessionTitle('strength');
      
      expect(boxingTitle.toLowerCase()).toMatch(/chasse|combat|attaque|crocs|poings/);
      expect(mmaTitle.toLowerCase()).toMatch(/meute|combat|guerre|prédateur/);
      expect(strengthTitle.toLowerCase()).toMatch(/force|territoire|conquête|crocs|puissance/);
    });
  });
});

// ============================================
// COMPARISON TESTS
// ============================================

describe('Session Comparison', () => {
  describe('compareToLastSession', () => {
    it('should compare volume between sessions', () => {
      const current = { totalVolume: 12000 };
      const previous = { totalVolume: 10000 };
      
      const comparison = compareToLastSession(current as any, previous as any);
      expect(comparison.volumeChange).toBe(2000);
      expect(comparison.volumeChangePercent).toBe(20);
    });

    it('should show improvement as positive', () => {
      const current = { totalVolume: 11000 };
      const previous = { totalVolume: 10000 };
      
      const comparison = compareToLastSession(current as any, previous as any);
      expect(comparison.isImproved).toBe(true);
    });

    it('should show regression as negative', () => {
      const current = { totalVolume: 9000 };
      const previous = { totalVolume: 10000 };
      
      const comparison = compareToLastSession(current as any, previous as any);
      expect(comparison.isImproved).toBe(false);
    });
  });

  describe('calculateImprovement', () => {
    it('should return wolf-themed improvement message', () => {
      const message = calculateImprovement(20);
      expect(message.toLowerCase()).toMatch(/territoire|expansion|conquête|loup/);
    });

    it('should have different messages for different improvement levels', () => {
      const small = calculateImprovement(5);
      const medium = calculateImprovement(15);
      const large = calculateImprovement(30);
      
      // At least 2 should be different
      const messages = new Set([small, medium, large]);
      expect(messages.size).toBeGreaterThanOrEqual(2);
    });
  });
});

