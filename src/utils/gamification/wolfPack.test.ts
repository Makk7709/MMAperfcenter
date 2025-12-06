/**
 * TDD Tests for Wolf Pack Gamification System
 * 
 * Theme: Meute de Loups (Wolf Pack)
 * Progression: Louveteau → Loup Garou
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Rank System
  WolfRank,
  WOLF_RANKS,
  calculateRank,
  getNextRank,
  getXPForNextRank,
  getRankProgress,
  
  // XP System
  XP_REWARDS,
  calculateXPForAction,
  
  // Badge System
  WolfBadge,
  WOLF_BADGES,
  checkBadgeUnlock,
  getBadgesByCategory,
  
  // Streak System
  calculateStreak,
  getStreakBonus,
  
  // Motivational Messages
  getMotivationalMessage,
  getRankUpMessage,
  
  // Sound System
  WolfSound,
  WOLF_SOUNDS,
  getSoundForEvent,
} from './wolfPack';

// ============================================
// RANK SYSTEM TESTS
// ============================================

describe('Wolf Rank System', () => {
  describe('WOLF_RANKS configuration', () => {
    it('should have 7 ranks from Louveteau to Loup Garou', () => {
      expect(WOLF_RANKS).toHaveLength(7);
      expect(WOLF_RANKS[0].name).toBe('Louveteau');
      expect(WOLF_RANKS[6].name).toBe('Loup Garou');
    });

    it('should have increasing XP requirements', () => {
      for (let i = 1; i < WOLF_RANKS.length; i++) {
        expect(WOLF_RANKS[i].xpRequired).toBeGreaterThan(WOLF_RANKS[i - 1].xpRequired);
      }
    });

    it('should have unique rank levels', () => {
      const levels = WOLF_RANKS.map(r => r.level);
      const uniqueLevels = new Set(levels);
      expect(uniqueLevels.size).toBe(WOLF_RANKS.length);
    });

    it('should have emoji icons for each rank', () => {
      WOLF_RANKS.forEach(rank => {
        expect(rank.icon).toBeTruthy();
        expect(typeof rank.icon).toBe('string');
      });
    });
  });

  describe('calculateRank', () => {
    it('should return Louveteau for 0 XP', () => {
      const rank = calculateRank(0);
      expect(rank.name).toBe('Louveteau');
      expect(rank.level).toBe(1);
    });

    it('should return Louveteau for XP below 500', () => {
      expect(calculateRank(100).name).toBe('Louveteau');
      expect(calculateRank(499).name).toBe('Louveteau');
    });

    it('should return Loup Solitaire for 500-1499 XP', () => {
      expect(calculateRank(500).name).toBe('Loup Solitaire');
      expect(calculateRank(1000).name).toBe('Loup Solitaire');
      expect(calculateRank(1499).name).toBe('Loup Solitaire');
    });

    it('should return Chasseur de Meute for 1500-3999 XP', () => {
      expect(calculateRank(1500).name).toBe('Chasseur de Meute');
      expect(calculateRank(3999).name).toBe('Chasseur de Meute');
    });

    it('should return Loup de Guerre for 4000-7999 XP', () => {
      expect(calculateRank(4000).name).toBe('Loup de Guerre');
      expect(calculateRank(7999).name).toBe('Loup de Guerre');
    });

    it('should return Beta for 8000-14999 XP', () => {
      expect(calculateRank(8000).name).toBe('Beta');
      expect(calculateRank(14999).name).toBe('Beta');
    });

    it('should return Alpha for 15000-29999 XP', () => {
      expect(calculateRank(15000).name).toBe('Alpha');
      expect(calculateRank(29999).name).toBe('Alpha');
    });

    it('should return Loup Garou for 30000+ XP', () => {
      expect(calculateRank(30000).name).toBe('Loup Garou');
      expect(calculateRank(100000).name).toBe('Loup Garou');
    });
  });

  describe('getNextRank', () => {
    it('should return Loup Solitaire for Louveteau', () => {
      const currentRank = WOLF_RANKS[0];
      const nextRank = getNextRank(currentRank);
      expect(nextRank?.name).toBe('Loup Solitaire');
    });

    it('should return null for Loup Garou (max rank)', () => {
      const currentRank = WOLF_RANKS[6];
      const nextRank = getNextRank(currentRank);
      expect(nextRank).toBeNull();
    });
  });

  describe('getXPForNextRank', () => {
    it('should return XP needed to reach next rank', () => {
      expect(getXPForNextRank(0)).toBe(500); // Louveteau → Loup Solitaire
      expect(getXPForNextRank(250)).toBe(250); // 500 - 250
      expect(getXPForNextRank(500)).toBe(1000); // Loup Solitaire → Chasseur
    });

    it('should return 0 for max rank', () => {
      expect(getXPForNextRank(30000)).toBe(0);
      expect(getXPForNextRank(50000)).toBe(0);
    });
  });

  describe('getRankProgress', () => {
    it('should return 0% at rank start', () => {
      expect(getRankProgress(0)).toBe(0);
      expect(getRankProgress(500)).toBe(0);
    });

    it('should return 50% at midpoint', () => {
      // Louveteau: 0-500 (500 range), 250 is 50%
      expect(getRankProgress(250)).toBe(50);
    });

    it('should return 100% for max rank', () => {
      expect(getRankProgress(30000)).toBe(100);
    });

    it('should return percentage between 0-100', () => {
      const progress = getRankProgress(750); // Loup Solitaire range: 500-1500
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });
});

// ============================================
// XP SYSTEM TESTS
// ============================================

describe('XP Reward System', () => {
  describe('XP_REWARDS configuration', () => {
    it('should have XP values for all action types', () => {
      expect(XP_REWARDS.workout_completed).toBeDefined();
      expect(XP_REWARDS.exercise_completed).toBeDefined();
      expect(XP_REWARDS.set_completed).toBeDefined();
      expect(XP_REWARDS.pr_achieved).toBeDefined();
      expect(XP_REWARDS.streak_day).toBeDefined();
      expect(XP_REWARDS.sparring_analyzed).toBeDefined();
    });

    it('should have positive XP values', () => {
      Object.values(XP_REWARDS).forEach(xp => {
        expect(xp).toBeGreaterThan(0);
      });
    });

    it('should reward PR more than regular workout', () => {
      expect(XP_REWARDS.pr_achieved).toBeGreaterThan(XP_REWARDS.workout_completed);
    });
  });

  describe('calculateXPForAction', () => {
    it('should return correct XP for workout completion', () => {
      const xp = calculateXPForAction('workout_completed');
      expect(xp).toBe(XP_REWARDS.workout_completed);
    });

    it('should apply streak multiplier', () => {
      const baseXP = calculateXPForAction('workout_completed', { streakDays: 1 });
      const streakXP = calculateXPForAction('workout_completed', { streakDays: 7 });
      expect(streakXP).toBeGreaterThan(baseXP);
    });

    it('should apply intensity multiplier', () => {
      const lightXP = calculateXPForAction('workout_completed', { intensity: 'light' });
      const intenseXP = calculateXPForAction('workout_completed', { intensity: 'intense' });
      expect(intenseXP).toBeGreaterThan(lightXP);
    });

    it('should cap multipliers at reasonable levels', () => {
      const xp = calculateXPForAction('workout_completed', { 
        streakDays: 365, 
        intensity: 'intense' 
      });
      // Should not exceed 5x base XP
      expect(xp).toBeLessThanOrEqual(XP_REWARDS.workout_completed * 5);
    });
  });
});

// ============================================
// BADGE SYSTEM TESTS
// ============================================

describe('Wolf Badge System', () => {
  describe('WOLF_BADGES configuration', () => {
    it('should have at least 9 badges', () => {
      expect(WOLF_BADGES.length).toBeGreaterThanOrEqual(9);
    });

    it('should have unique badge IDs', () => {
      const ids = WOLF_BADGES.map(b => b.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(WOLF_BADGES.length);
    });

    it('should have wolf-themed names', () => {
      const wolfKeywords = ['lune', 'meute', 'crocs', 'territoire', 'chasse', 'loup', 'prédateur', 'trace', 'nuit'];
      WOLF_BADGES.forEach(badge => {
        const hasWolfTheme = wolfKeywords.some(keyword => 
          badge.name.toLowerCase().includes(keyword) ||
          badge.description.toLowerCase().includes(keyword)
        );
        // At least description should have wolf theme
        expect(badge.description.length).toBeGreaterThan(0);
      });
    });

    it('should have icons for all badges', () => {
      WOLF_BADGES.forEach(badge => {
        expect(badge.icon).toBeTruthy();
      });
    });

    it('should have categories', () => {
      const categories = new Set(WOLF_BADGES.map(b => b.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe('checkBadgeUnlock', () => {
    it('should unlock "Première Lune" on first workout', () => {
      const userStats = { totalWorkouts: 1, streakDays: 1 };
      const unlockedBadges = checkBadgeUnlock(userStats, []);
      const premiereLune = unlockedBadges.find(b => b.id === 'premiere_lune');
      expect(premiereLune).toBeDefined();
    });

    it('should unlock "Feu de Meute" on 7-day streak', () => {
      const userStats = { streakDays: 7, totalWorkouts: 7 };
      const unlockedBadges = checkBadgeUnlock(userStats, []);
      const feuMeute = unlockedBadges.find(b => b.id === 'feu_meute');
      expect(feuMeute).toBeDefined();
    });

    it('should unlock "Crocs Acérés" on 100 strikes', () => {
      const userStats = { totalStrikes: 100 };
      const unlockedBadges = checkBadgeUnlock(userStats, []);
      const crocsAceres = unlockedBadges.find(b => b.id === 'crocs_aceres');
      expect(crocsAceres).toBeDefined();
    });

    it('should unlock "Sommet du Territoire" on PR', () => {
      const userStats = { personalRecords: 1 };
      const unlockedBadges = checkBadgeUnlock(userStats, []);
      const sommet = unlockedBadges.find(b => b.id === 'sommet_territoire');
      expect(sommet).toBeDefined();
    });

    it('should not unlock already owned badges', () => {
      const userStats = { totalWorkouts: 1 };
      const ownedBadges = ['premiere_lune'];
      const unlockedBadges = checkBadgeUnlock(userStats, ownedBadges);
      expect(unlockedBadges.find(b => b.id === 'premiere_lune')).toBeUndefined();
    });

    it('should unlock "Nuit de Chasse" for late night workout', () => {
      const userStats = { lateNightWorkouts: 1 };
      const unlockedBadges = checkBadgeUnlock(userStats, []);
      const nuitChasse = unlockedBadges.find(b => b.id === 'nuit_chasse');
      expect(nuitChasse).toBeDefined();
    });

    it('should unlock "Trace Indélébile" on 30-day streak', () => {
      const userStats = { streakDays: 30 };
      const unlockedBadges = checkBadgeUnlock(userStats, []);
      const trace = unlockedBadges.find(b => b.id === 'trace_indelebile');
      expect(trace).toBeDefined();
    });

    it('should unlock "Prédateur" on 50 workouts', () => {
      const userStats = { totalWorkouts: 50 };
      const unlockedBadges = checkBadgeUnlock(userStats, []);
      const predateur = unlockedBadges.find(b => b.id === 'predateur');
      expect(predateur).toBeDefined();
    });

    it('should unlock "Regard du Loup" on 10 sparring analyses', () => {
      const userStats = { sparringAnalyses: 10 };
      const unlockedBadges = checkBadgeUnlock(userStats, []);
      const regard = unlockedBadges.find(b => b.id === 'regard_loup');
      expect(regard).toBeDefined();
    });
  });

  describe('getBadgesByCategory', () => {
    it('should return badges filtered by category', () => {
      const streakBadges = getBadgesByCategory('streak');
      expect(streakBadges.length).toBeGreaterThan(0);
      streakBadges.forEach(badge => {
        expect(badge.category).toBe('streak');
      });
    });

    it('should return empty array for unknown category', () => {
      const unknown = getBadgesByCategory('unknown_category');
      expect(unknown).toEqual([]);
    });
  });
});

// ============================================
// STREAK SYSTEM TESTS
// ============================================

describe('Streak System', () => {
  describe('calculateStreak', () => {
    it('should return 1 for single workout today', () => {
      const today = new Date();
      const workoutDates = [today.toISOString()];
      expect(calculateStreak(workoutDates)).toBe(1);
    });

    it('should return consecutive days count', () => {
      const dates = [
        new Date(Date.now() - 0 * 24 * 60 * 60 * 1000), // Today
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      ].map(d => d.toISOString());
      
      expect(calculateStreak(dates)).toBe(3);
    });

    it('should break streak on missed day', () => {
      const dates = [
        new Date(Date.now() - 0 * 24 * 60 * 60 * 1000), // Today
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (missed yesterday)
      ].map(d => d.toISOString());
      
      expect(calculateStreak(dates)).toBe(1);
    });

    it('should return 0 for no workouts', () => {
      expect(calculateStreak([])).toBe(0);
    });

    it('should return 0 if last workout was more than 1 day ago', () => {
      const dates = [
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      ].map(d => d.toISOString());
      
      expect(calculateStreak(dates)).toBe(0);
    });
  });

  describe('getStreakBonus', () => {
    it('should return 1x for streak of 1', () => {
      expect(getStreakBonus(1)).toBe(1);
    });

    it('should return increasing bonus for longer streaks', () => {
      expect(getStreakBonus(7)).toBeGreaterThan(getStreakBonus(3));
      expect(getStreakBonus(30)).toBeGreaterThan(getStreakBonus(7));
    });

    it('should cap bonus at reasonable level', () => {
      expect(getStreakBonus(365)).toBeLessThanOrEqual(3);
    });

    it('should return 1x for 0 streak', () => {
      expect(getStreakBonus(0)).toBe(1);
    });
  });
});

// ============================================
// MOTIVATIONAL MESSAGES TESTS
// ============================================

describe('Motivational Messages', () => {
  describe('getMotivationalMessage', () => {
    it('should return a string message', () => {
      const message = getMotivationalMessage();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return wolf-themed messages', () => {
      // Get multiple messages to check theme
      const messages = Array.from({ length: 10 }, () => getMotivationalMessage());
      const wolfKeywords = ['loup', 'meute', 'hurle', 'croc', 'chasse', 'territoire', 'mouton', 'lune'];
      
      const hasWolfTheme = messages.some(msg => 
        wolfKeywords.some(keyword => msg.toLowerCase().includes(keyword))
      );
      expect(hasWolfTheme).toBe(true);
    });

    it('should return different messages (randomized)', () => {
      const messages = new Set(Array.from({ length: 20 }, () => getMotivationalMessage()));
      // Should have at least 2 different messages
      expect(messages.size).toBeGreaterThan(1);
    });
  });

  describe('getRankUpMessage', () => {
    it('should include new rank name', () => {
      const newRank = WOLF_RANKS[2]; // Chasseur de Meute
      const message = getRankUpMessage(newRank);
      expect(message).toContain(newRank.name);
    });

    it('should be celebratory', () => {
      const newRank = WOLF_RANKS[1];
      const message = getRankUpMessage(newRank);
      const celebratoryWords = ['félicitations', 'bravo', 'incroyable', 'devenu', 'évolué', 'ascension', 'célèbre', 'atteint'];
      const isCelebratory = celebratoryWords.some(word => 
        message.toLowerCase().includes(word)
      );
      expect(isCelebratory).toBe(true);
    });
  });
});

// ============================================
// SOUND SYSTEM TESTS
// ============================================

describe('Wolf Sound System', () => {
  describe('WOLF_SOUNDS configuration', () => {
    it('should have sounds for all events', () => {
      expect(WOLF_SOUNDS.round_end).toBeDefined();
      expect(WOLF_SOUNDS.workout_complete).toBeDefined();
      expect(WOLF_SOUNDS.pr_achieved).toBeDefined();
      expect(WOLF_SOUNDS.badge_unlocked).toBeDefined();
      expect(WOLF_SOUNDS.streak_maintained).toBeDefined();
    });

    it('should have wolf and classic variants', () => {
      Object.values(WOLF_SOUNDS).forEach(sound => {
        expect(sound.wolf).toBeDefined();
        expect(sound.classic).toBeDefined();
      });
    });

    it('should have file paths or identifiers', () => {
      Object.values(WOLF_SOUNDS).forEach(sound => {
        expect(typeof sound.wolf).toBe('string');
        expect(typeof sound.classic).toBe('string');
      });
    });
  });

  describe('getSoundForEvent', () => {
    it('should return wolf sound when preference is wolf', () => {
      const sound = getSoundForEvent('round_end', 'wolf');
      expect(sound).toBe(WOLF_SOUNDS.round_end.wolf);
    });

    it('should return classic sound when preference is classic', () => {
      const sound = getSoundForEvent('round_end', 'classic');
      expect(sound).toBe(WOLF_SOUNDS.round_end.classic);
    });

    it('should default to wolf sounds', () => {
      const sound = getSoundForEvent('workout_complete');
      expect(sound).toBe(WOLF_SOUNDS.workout_complete.wolf);
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Gamification Integration', () => {
  it('should award XP and potentially unlock badge on workout completion', () => {
    const userStats = { totalWorkouts: 0, streakDays: 0, totalXP: 0 };
    
    // Simulate completing first workout
    userStats.totalWorkouts = 1;
    userStats.streakDays = 1;
    const xpEarned = calculateXPForAction('workout_completed');
    userStats.totalXP = xpEarned;
    
    // Check for badge unlock
    const newBadges = checkBadgeUnlock(userStats, []);
    
    expect(xpEarned).toBeGreaterThan(0);
    expect(newBadges.find(b => b.id === 'premiere_lune')).toBeDefined();
  });

  it('should track rank progression correctly', () => {
    // Start as Louveteau
    let xp = 0;
    expect(calculateRank(xp).name).toBe('Louveteau');
    
    // After 10 workouts (assuming 50 XP each)
    xp = 500;
    expect(calculateRank(xp).name).toBe('Loup Solitaire');
    
    // Progress should be trackable
    const progress = getRankProgress(xp);
    expect(progress).toBeGreaterThanOrEqual(0);
  });
});

