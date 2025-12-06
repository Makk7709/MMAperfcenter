/**
 * TDD Tests for Wolf Timer System
 * 
 * Combat timer with wolf-themed sounds and terminology
 * "Temps de Chasse" instead of "Round"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // Timer State
  TimerState,
  TimerConfig,
  createTimerConfig,
  
  // Timer Logic
  calculateTimeRemaining,
  formatTime,
  getCurrentPhase,
  getPhaseLabel,
  
  // Round Management
  getRoundProgress,
  isLastRound,
  getTotalWorkoutTime,
  getElapsedTime,
  
  // Sound Triggers
  shouldPlayWarningSound,
  shouldPlayEndSound,
  getTimerSound,
  
  // Presets
  TIMER_PRESETS,
  getPresetByName,
} from './wolfTimer';

// ============================================
// TIMER CONFIG TESTS
// ============================================

describe('Wolf Timer Configuration', () => {
  describe('createTimerConfig', () => {
    it('should create config with default values', () => {
      const config = createTimerConfig({});
      
      expect(config.roundDuration).toBeDefined();
      expect(config.restDuration).toBeDefined();
      expect(config.totalRounds).toBeDefined();
      expect(config.warningTime).toBeDefined();
    });

    it('should accept custom round duration', () => {
      const config = createTimerConfig({ roundDuration: 180 });
      expect(config.roundDuration).toBe(180);
    });

    it('should accept custom rest duration', () => {
      const config = createTimerConfig({ restDuration: 60 });
      expect(config.restDuration).toBe(60);
    });

    it('should accept custom total rounds', () => {
      const config = createTimerConfig({ totalRounds: 12 });
      expect(config.totalRounds).toBe(12);
    });

    it('should accept custom warning time', () => {
      const config = createTimerConfig({ warningTime: 30 });
      expect(config.warningTime).toBe(30);
    });

    it('should have sound preference option', () => {
      const wolfConfig = createTimerConfig({ soundPreference: 'wolf' });
      const classicConfig = createTimerConfig({ soundPreference: 'classic' });
      
      expect(wolfConfig.soundPreference).toBe('wolf');
      expect(classicConfig.soundPreference).toBe('classic');
    });

    it('should default to wolf sounds', () => {
      const config = createTimerConfig({});
      expect(config.soundPreference).toBe('wolf');
    });
  });

  describe('TIMER_PRESETS', () => {
    it('should have boxing preset (3min rounds)', () => {
      const boxing = getPresetByName('boxing');
      expect(boxing).toBeDefined();
      expect(boxing?.roundDuration).toBe(180); // 3 minutes
    });

    it('should have MMA preset (5min rounds)', () => {
      const mma = getPresetByName('mma');
      expect(mma).toBeDefined();
      expect(mma?.roundDuration).toBe(300); // 5 minutes
    });

    it('should have Muay Thai preset (3min rounds)', () => {
      const muayThai = getPresetByName('muay_thai');
      expect(muayThai).toBeDefined();
      expect(muayThai?.roundDuration).toBe(180);
    });

    it('should have HIIT preset (short intervals)', () => {
      const hiit = getPresetByName('hiit');
      expect(hiit).toBeDefined();
      expect(hiit!.roundDuration).toBeLessThan(60);
    });

    it('should have Tabata preset (20s work / 10s rest)', () => {
      const tabata = getPresetByName('tabata');
      expect(tabata).toBeDefined();
      expect(tabata?.roundDuration).toBe(20);
      expect(tabata?.restDuration).toBe(10);
    });

    it('should have wolf-themed names', () => {
      TIMER_PRESETS.forEach(preset => {
        expect(preset.wolfName).toBeDefined();
        expect(typeof preset.wolfName).toBe('string');
      });
    });
  });
});

// ============================================
// TIME CALCULATION TESTS
// ============================================

describe('Time Calculations', () => {
  describe('calculateTimeRemaining', () => {
    it('should return full round time at start', () => {
      const config = createTimerConfig({ roundDuration: 180 });
      const state: TimerState = {
        currentRound: 1,
        phase: 'work',
        elapsedInPhase: 0,
        isRunning: true,
        isPaused: false,
      };
      
      expect(calculateTimeRemaining(state, config)).toBe(180);
    });

    it('should decrease as time elapses', () => {
      const config = createTimerConfig({ roundDuration: 180 });
      const state: TimerState = {
        currentRound: 1,
        phase: 'work',
        elapsedInPhase: 60,
        isRunning: true,
        isPaused: false,
      };
      
      expect(calculateTimeRemaining(state, config)).toBe(120);
    });

    it('should return rest time during rest phase', () => {
      const config = createTimerConfig({ roundDuration: 180, restDuration: 60 });
      const state: TimerState = {
        currentRound: 1,
        phase: 'rest',
        elapsedInPhase: 0,
        isRunning: true,
        isPaused: false,
      };
      
      expect(calculateTimeRemaining(state, config)).toBe(60);
    });

    it('should return 0 when time is up', () => {
      const config = createTimerConfig({ roundDuration: 180 });
      const state: TimerState = {
        currentRound: 1,
        phase: 'work',
        elapsedInPhase: 180,
        isRunning: true,
        isPaused: false,
      };
      
      expect(calculateTimeRemaining(state, config)).toBe(0);
    });
  });

  describe('formatTime', () => {
    it('should format seconds as MM:SS', () => {
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(0)).toBe('0:00');
    });

    it('should pad single digit seconds', () => {
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(5)).toBe('0:05');
    });

    it('should handle hours for long timers', () => {
      expect(formatTime(3661)).toBe('61:01');
    });

    it('should handle negative values gracefully', () => {
      expect(formatTime(-5)).toBe('0:00');
    });
  });

  describe('getCurrentPhase', () => {
    it('should return work phase label during work', () => {
      const state: TimerState = {
        currentRound: 1,
        phase: 'work',
        elapsedInPhase: 0,
        isRunning: true,
        isPaused: false,
      };
      
      expect(getCurrentPhase(state)).toBe('work');
    });

    it('should return rest phase label during rest', () => {
      const state: TimerState = {
        currentRound: 1,
        phase: 'rest',
        elapsedInPhase: 0,
        isRunning: true,
        isPaused: false,
      };
      
      expect(getCurrentPhase(state)).toBe('rest');
    });
  });

  describe('getPhaseLabel', () => {
    it('should return wolf-themed work label', () => {
      const label = getPhaseLabel('work', 'wolf');
      expect(label.toLowerCase()).toMatch(/chasse|attaque|combat|temps/);
    });

    it('should return wolf-themed rest label', () => {
      const label = getPhaseLabel('rest', 'wolf');
      expect(label.toLowerCase()).toMatch(/tanière|repos|récupération/);
    });

    it('should return classic labels when preference is classic', () => {
      const workLabel = getPhaseLabel('work', 'classic');
      const restLabel = getPhaseLabel('rest', 'classic');
      
      expect(workLabel.toLowerCase()).toMatch(/round|travail|work/);
      expect(restLabel.toLowerCase()).toMatch(/repos|rest/);
    });
  });
});

// ============================================
// ROUND MANAGEMENT TESTS
// ============================================

describe('Round Management', () => {
  describe('getRoundProgress', () => {
    it('should return 0% at start of first round', () => {
      const config = createTimerConfig({ totalRounds: 10 });
      const state: TimerState = {
        currentRound: 1,
        phase: 'work',
        elapsedInPhase: 0,
        isRunning: true,
        isPaused: false,
      };
      
      expect(getRoundProgress(state, config)).toBe(0);
    });

    it('should return progress percentage', () => {
      const config = createTimerConfig({ totalRounds: 10 });
      const state: TimerState = {
        currentRound: 5,
        phase: 'work',
        elapsedInPhase: 0,
        isRunning: true,
        isPaused: false,
      };
      
      // 4 complete rounds out of 10 = 40%
      expect(getRoundProgress(state, config)).toBe(40);
    });

    it('should return 100% after last round', () => {
      const config = createTimerConfig({ totalRounds: 10 });
      const state: TimerState = {
        currentRound: 10,
        phase: 'complete',
        elapsedInPhase: 0,
        isRunning: false,
        isPaused: false,
      };
      
      expect(getRoundProgress(state, config)).toBe(100);
    });
  });

  describe('isLastRound', () => {
    it('should return false for rounds before last', () => {
      const config = createTimerConfig({ totalRounds: 5 });
      expect(isLastRound(1, config)).toBe(false);
      expect(isLastRound(4, config)).toBe(false);
    });

    it('should return true for last round', () => {
      const config = createTimerConfig({ totalRounds: 5 });
      expect(isLastRound(5, config)).toBe(true);
    });
  });

  describe('getTotalWorkoutTime', () => {
    it('should calculate total workout time', () => {
      const config = createTimerConfig({
        roundDuration: 180,
        restDuration: 60,
        totalRounds: 5,
      });
      
      // 5 rounds * 180s + 4 rest periods * 60s = 900 + 240 = 1140s
      expect(getTotalWorkoutTime(config)).toBe(1140);
    });

    it('should not include rest after last round', () => {
      const config = createTimerConfig({
        roundDuration: 60,
        restDuration: 30,
        totalRounds: 1,
      });
      
      // 1 round * 60s = 60s (no rest after single round)
      expect(getTotalWorkoutTime(config)).toBe(60);
    });
  });

  describe('getElapsedTime', () => {
    it('should return 0 at start', () => {
      const config = createTimerConfig({ roundDuration: 180, restDuration: 60 });
      const state: TimerState = {
        currentRound: 1,
        phase: 'work',
        elapsedInPhase: 0,
        isRunning: true,
        isPaused: false,
      };
      
      expect(getElapsedTime(state, config)).toBe(0);
    });

    it('should return elapsed time during first round', () => {
      const config = createTimerConfig({ roundDuration: 180, restDuration: 60 });
      const state: TimerState = {
        currentRound: 1,
        phase: 'work',
        elapsedInPhase: 45,
        isRunning: true,
        isPaused: false,
      };
      
      expect(getElapsedTime(state, config)).toBe(45);
    });

    it('should include previous rounds in elapsed time', () => {
      const config = createTimerConfig({ roundDuration: 180, restDuration: 60 });
      const state: TimerState = {
        currentRound: 2,
        phase: 'work',
        elapsedInPhase: 30,
        isRunning: true,
        isPaused: false,
      };
      
      // 1 complete round (180s) + 1 rest (60s) + 30s in current = 270s
      expect(getElapsedTime(state, config)).toBe(270);
    });
  });
});

// ============================================
// SOUND TRIGGER TESTS
// ============================================

describe('Sound Triggers', () => {
  describe('shouldPlayWarningSound', () => {
    it('should return true when time equals warning time', () => {
      const config = createTimerConfig({ roundDuration: 180, warningTime: 10 });
      expect(shouldPlayWarningSound(10, config)).toBe(true);
    });

    it('should return false when time is above warning', () => {
      const config = createTimerConfig({ roundDuration: 180, warningTime: 10 });
      expect(shouldPlayWarningSound(60, config)).toBe(false);
    });

    it('should return false when time is below warning', () => {
      const config = createTimerConfig({ roundDuration: 180, warningTime: 10 });
      expect(shouldPlayWarningSound(5, config)).toBe(false);
    });
  });

  describe('shouldPlayEndSound', () => {
    it('should return true when time reaches 0', () => {
      expect(shouldPlayEndSound(0)).toBe(true);
    });

    it('should return false when time is above 0', () => {
      expect(shouldPlayEndSound(1)).toBe(false);
      expect(shouldPlayEndSound(60)).toBe(false);
    });
  });

  describe('getTimerSound', () => {
    it('should return wolf howl for round end with wolf preference', () => {
      const sound = getTimerSound('round_end', 'wolf');
      expect(sound).toContain('howl');
    });

    it('should return bell for round end with classic preference', () => {
      const sound = getTimerSound('round_end', 'classic');
      expect(sound).toContain('bell');
    });

    it('should return warning sound', () => {
      const wolfWarning = getTimerSound('warning', 'wolf');
      const classicWarning = getTimerSound('warning', 'classic');
      
      expect(wolfWarning).toBeTruthy();
      expect(classicWarning).toBeTruthy();
    });

    it('should return workout complete sound', () => {
      const sound = getTimerSound('workout_complete', 'wolf');
      expect(sound).toBeTruthy();
    });
  });
});

// ============================================
// TIMER STATE TESTS
// ============================================

describe('Timer State', () => {
  it('should have required state properties', () => {
    const state: TimerState = {
      currentRound: 1,
      phase: 'work',
      elapsedInPhase: 0,
      isRunning: false,
      isPaused: false,
    };
    
    expect(state).toHaveProperty('currentRound');
    expect(state).toHaveProperty('phase');
    expect(state).toHaveProperty('elapsedInPhase');
    expect(state).toHaveProperty('isRunning');
    expect(state).toHaveProperty('isPaused');
  });

  it('should support ready phase', () => {
    const state: TimerState = {
      currentRound: 0,
      phase: 'ready',
      elapsedInPhase: 0,
      isRunning: false,
      isPaused: false,
    };
    
    expect(state.phase).toBe('ready');
  });

  it('should support complete phase', () => {
    const state: TimerState = {
      currentRound: 5,
      phase: 'complete',
      elapsedInPhase: 0,
      isRunning: false,
      isPaused: false,
    };
    
    expect(state.phase).toBe('complete');
  });
});

