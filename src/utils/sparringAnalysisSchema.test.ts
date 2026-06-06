/**
 * TDD Tests for Sparring Analysis Schema Validation
 */

import { describe, it, expect } from 'vitest';
import {
  clampScore,
  clampStatistic,
  validateFighterStatistics,
  validatePerformanceScores,
  validateFighterProfile,
  validateKeyMoment,
  validateRound,
  validateTechnique,
  validateSparringAnalysis,
  createDefaultAnalysis,
} from './sparringAnalysisSchema';

// ============================================
// SCORE/STAT CLAMPING TESTS
// ============================================

describe('clampScore', () => {
  it('should return value within range', () => {
    expect(clampScore(50)).toBe(50);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
  });

  it('should clamp values above 100', () => {
    expect(clampScore(150)).toBe(100);
    expect(clampScore(999)).toBe(100);
  });

  it('should clamp values below 0', () => {
    expect(clampScore(-10)).toBe(0);
    expect(clampScore(-999)).toBe(0);
  });

  it('should round decimal values', () => {
    expect(clampScore(75.4)).toBe(75);
    expect(clampScore(75.6)).toBe(76);
  });

  it('should return default for invalid types', () => {
    expect(clampScore(undefined)).toBe(50);
    expect(clampScore(null)).toBe(50);
    expect(clampScore('abc')).toBe(50);
    expect(clampScore(Number.NaN)).toBe(50);
  });

  it('should use custom default', () => {
    expect(clampScore(undefined, 75)).toBe(75);
    expect(clampScore(null, 0)).toBe(0);
  });
});

describe('clampStatistic', () => {
  it('should return value when valid', () => {
    expect(clampStatistic(10)).toBe(10);
    expect(clampStatistic(0)).toBe(0);
    expect(clampStatistic(999)).toBe(999);
  });

  it('should clamp negative values to 0', () => {
    expect(clampStatistic(-5)).toBe(0);
    expect(clampStatistic(-100)).toBe(0);
  });

  it('should round decimal values', () => {
    expect(clampStatistic(5.4)).toBe(5);
    expect(clampStatistic(5.6)).toBe(6);
  });

  it('should return default for invalid types', () => {
    expect(clampStatistic(undefined)).toBe(0);
    expect(clampStatistic(null)).toBe(0);
    expect(clampStatistic('abc')).toBe(0);
  });
});

// ============================================
// FIGHTER STATISTICS VALIDATION
// ============================================

describe('validateFighterStatistics', () => {
  it('should validate complete valid stats', () => {
    const input = {
      punches_thrown: 50,
      punches_landed: 30,
      kicks_thrown: 20,
      kicks_landed: 12,
      takedowns_attempted: 3,
      takedowns_successful: 2,
      significant_strikes: 25,
      head_strikes: 15,
      body_strikes: 8,
      leg_strikes: 7,
      defense_rate: 75,
    };
    
    const result = validateFighterStatistics(input);
    
    expect(result.punches_thrown).toBe(50);
    expect(result.punches_landed).toBe(30);
    expect(result.defense_rate).toBe(75);
  });

  it('should handle missing fields with defaults', () => {
    const result = validateFighterStatistics({});
    
    expect(result.punches_thrown).toBe(0);
    expect(result.defense_rate).toBe(50);
  });

  it('should handle null input', () => {
    const result = validateFighterStatistics(null);
    
    expect(result.punches_thrown).toBe(0);
    expect(result.defense_rate).toBe(50);
  });

  it('should clamp invalid values', () => {
    const result = validateFighterStatistics({
      punches_thrown: -10,
      defense_rate: 150,
    });
    
    expect(result.punches_thrown).toBe(0);
    expect(result.defense_rate).toBe(100);
  });
});

// ============================================
// PERFORMANCE SCORES VALIDATION
// ============================================

describe('validatePerformanceScores', () => {
  it('should validate complete scores', () => {
    const input = {
      overall: 80,
      striking: 85,
      grappling: 70,
      defense: 75,
      cardio: 90,
      technique: 82,
    };
    
    const result = validatePerformanceScores(input);
    
    expect(result.overall).toBe(80);
    expect(result.striking).toBe(85);
    expect(result.technique).toBe(82);
  });

  it('should use 50 as default for missing scores', () => {
    const result = validatePerformanceScores({});
    
    expect(result.overall).toBe(50);
    expect(result.striking).toBe(50);
  });

  it('should clamp out-of-range scores', () => {
    const result = validatePerformanceScores({
      overall: 120,
      striking: -20,
    });
    
    expect(result.overall).toBe(100);
    expect(result.striking).toBe(0);
  });
});

// ============================================
// FIGHTER PROFILE VALIDATION
// ============================================

describe('validateFighterProfile', () => {
  it('should validate complete profile', () => {
    const input = {
      identifier: 'Combattant Rouge',
      style: 'Striker agressif',
      strengths: ['Jab rapide', 'Bon footwork'],
      weaknesses: ['Défense au sol'],
      corner: 'red',
    };
    
    const result = validateFighterProfile(input, 0);
    
    expect(result.identifier).toBe('Combattant Rouge');
    expect(result.style).toBe('Striker agressif');
    expect(result.strengths).toHaveLength(2);
    expect(result.corner).toBe('red');
  });

  it('should use defaults for missing fields', () => {
    const result = validateFighterProfile({}, 0);
    
    expect(result.identifier).toBe('Combattant 1');
    expect(result.style).toBe('Non déterminé');
    expect(result.strengths).toEqual([]);
    expect(result.corner).toBe('red');
  });

  it('should assign correct corner based on index', () => {
    const result0 = validateFighterProfile({}, 0);
    const result1 = validateFighterProfile({}, 1);
    
    expect(result0.corner).toBe('red');
    expect(result1.corner).toBe('blue');
  });

  it('should filter non-string values from arrays', () => {
    const result = validateFighterProfile({
      strengths: ['Valid', 123, null, 'Also valid'],
      weaknesses: [undefined, 'Weakness'],
    }, 0);
    
    expect(result.strengths).toEqual(['Valid', 'Also valid']);
    expect(result.weaknesses).toEqual(['Weakness']);
  });
});

// ============================================
// KEY MOMENT VALIDATION
// ============================================

describe('validateKeyMoment', () => {
  it('should validate complete moment', () => {
    const input = {
      timestamp: '1:30',
      timestamp_seconds: 90,
      type: 'strike',
      description: 'Belle combinaison jab-cross',
      fighter: 'Combattant Rouge',
      significance: 'high',
    };
    
    const result = validateKeyMoment(input);
    
    expect(result).not.toBeNull();
    expect(result.timestamp).toBe('1:30');
    expect(result.type).toBe('strike');
    expect(result.significance).toBe('high');
  });

  it('should return null for missing description', () => {
    const result = validateKeyMoment({ timestamp: '1:00' });
    expect(result).toBeNull();
  });

  it('should return null for null input', () => {
    expect(validateKeyMoment(null)).toBeNull();
    expect(validateKeyMoment(undefined)).toBeNull();
  });

  it('should use defaults for invalid type/significance', () => {
    const result = validateKeyMoment({
      description: 'Test',
      type: 'invalid_type',
      significance: 'invalid',
    });
    
    expect(result.type).toBe('strike');
    expect(result.significance).toBe('medium');
  });
});

// ============================================
// ROUND VALIDATION
// ============================================

describe('validateRound', () => {
  it('should validate complete round', () => {
    const input = {
      number: 2,
      winner_suggestion: 'Combattant Rouge',
      key_events: ['Takedown réussi', 'Ground and pound'],
    };
    
    const result = validateRound(input);
    
    expect(result).not.toBeNull();
    expect(result.number).toBe(2);
    expect(result.winner_suggestion).toBe('Combattant Rouge');
    expect(result.key_events).toHaveLength(2);
  });

  it('should return null for invalid input', () => {
    expect(validateRound(null)).toBeNull();
    expect(validateRound(undefined)).toBeNull();
  });

  it('should use defaults for missing fields', () => {
    const result = validateRound({});
    
    expect(result.number).toBe(1);
    expect(result.winner_suggestion).toBe('Indéterminé');
    expect(result.key_events).toEqual([]);
  });
});

// ============================================
// TECHNIQUE VALIDATION
// ============================================

describe('validateTechnique', () => {
  it('should validate complete technique', () => {
    const input = {
      technique: 'Low kick',
      fighter: 'Combattant Bleu',
      execution: 'Excellente technique',
    };
    
    const result = validateTechnique(input);
    
    expect(result).not.toBeNull();
    expect(result.technique).toBe('Low kick');
    expect(result.fighter).toBe('Combattant Bleu');
  });

  it('should return null for missing technique name', () => {
    const result = validateTechnique({ fighter: 'Test' });
    expect(result).toBeNull();
  });

  it('should use defaults for missing optional fields', () => {
    const result = validateTechnique({ technique: 'Jab' });
    
    expect(result.fighter).toBe('Inconnu');
    expect(result.execution).toBe('Non évalué');
  });
});

// ============================================
// FULL ANALYSIS VALIDATION
// ============================================

describe('validateSparringAnalysis', () => {
  it('should validate complete analysis', () => {
    const input = {
      summary: 'Combat intense',
      duration_estimate: '3:00',
      duration_seconds: 180,
      fighters: [
        { identifier: 'Rouge', style: 'Striker', strengths: ['Jab'], weaknesses: [], corner: 'red' },
        { identifier: 'Bleu', style: 'Grappler', strengths: ['Takedown'], weaknesses: [], corner: 'blue' },
      ],
      statistics: {
        fighter_1: { punches_thrown: 40, punches_landed: 25 },
        fighter_2: { punches_thrown: 30, punches_landed: 20 },
      },
      key_moments: [{ timestamp: '1:00', timestamp_seconds: 60, type: 'strike', description: 'Test', fighter: 'Rouge', significance: 'high' }],
      rounds: [{ number: 1, winner_suggestion: 'Rouge', key_events: [] }],
      techniques_observed: [{ technique: 'Jab', fighter: 'Rouge', execution: 'Bon' }],
      recommendations: {
        fighter_1: ['Conseil 1'],
        fighter_2: ['Conseil 2'],
      },
      overall_analysis: 'Analyse complète',
      performance_scores: {
        fighter_1: { overall: 80, striking: 85, grappling: 70, defense: 75, cardio: 90, technique: 82 },
        fighter_2: { overall: 75, striking: 70, grappling: 80, defense: 72, cardio: 85, technique: 78 },
      },
    };
    
    const result = validateSparringAnalysis(input, 180);
    
    expect(result.summary).toBe('Combat intense');
    expect(result.fighters).toHaveLength(2);
    expect(result.statistics.fighter_1.punches_thrown).toBe(40);
    expect(result.key_moments).toHaveLength(1);
    expect(result.performance_scores.fighter_1.overall).toBe(80);
  });

  it('should handle empty input with defaults', () => {
    const result = validateSparringAnalysis({}, 120);
    
    expect(result.summary).toBe('Analyse en cours de traitement.');
    expect(result.duration_seconds).toBe(120);
    expect(result.duration_estimate).toBe('2:00');
    expect(result.fighters).toHaveLength(2);
    expect(result.fighters[0].corner).toBe('red');
    expect(result.fighters[1].corner).toBe('blue');
  });

  it('should handle null input', () => {
    const result = validateSparringAnalysis(null, 60);
    
    expect(result.duration_estimate).toBe('1:00');
    expect(result.fighters).toHaveLength(2);
  });

  it('should ensure exactly 2 fighters', () => {
    const resultEmpty = validateSparringAnalysis({ fighters: [] }, 60);
    const resultOne = validateSparringAnalysis({ fighters: [{ identifier: 'Solo' }] }, 60);
    const resultThree = validateSparringAnalysis({ 
      fighters: [{ identifier: 'A' }, { identifier: 'B' }, { identifier: 'C' }] 
    }, 60);
    
    expect(resultEmpty.fighters).toHaveLength(2);
    expect(resultOne.fighters).toHaveLength(2);
    expect(resultThree.fighters).toHaveLength(2); // Truncated to 2
  });

  it('should filter invalid key moments', () => {
    const result = validateSparringAnalysis({
      key_moments: [
        { description: 'Valid', timestamp: '1:00', timestamp_seconds: 60, type: 'strike', fighter: 'A', significance: 'high' },
        { timestamp: '2:00' }, // Missing description
        null,
        { description: 'Also valid', type: 'takedown', significance: 'medium', fighter: 'B', timestamp: '3:00', timestamp_seconds: 180 },
      ],
    }, 240);
    
    expect(result.key_moments).toHaveLength(2);
  });
});

// ============================================
// DEFAULT ANALYSIS
// ============================================

describe('createDefaultAnalysis', () => {
  it('should create valid default analysis', () => {
    const result = createDefaultAnalysis(180);
    
    expect(result.duration_seconds).toBe(180);
    expect(result.duration_estimate).toBe('3:00');
    expect(result.fighters).toHaveLength(2);
    expect(result.statistics.fighter_1.punches_thrown).toBe(0);
    expect(result.performance_scores.fighter_1.overall).toBe(50);
  });

  it('should format duration correctly', () => {
    expect(createDefaultAnalysis(65).duration_estimate).toBe('1:05');
    expect(createDefaultAnalysis(0).duration_estimate).toBe('0:00');
    expect(createDefaultAnalysis(3661).duration_estimate).toBe('61:01');
  });
});

