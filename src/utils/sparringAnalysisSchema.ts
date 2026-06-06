/**
 * Sparring Analysis Schema & Validation
 * 
 * Defines the expected structure for AI analysis results
 * with validation and type-safe defaults.
 */

// ============================================
// TYPES
// ============================================

export interface FighterProfile {
  identifier: string;
  style: string;
  strengths: string[];
  weaknesses: string[];
  corner: 'red' | 'blue';
}

export interface FighterStatistics {
  punches_thrown: number;
  punches_landed: number;
  kicks_thrown: number;
  kicks_landed: number;
  takedowns_attempted: number;
  takedowns_successful: number;
  significant_strikes: number;
  head_strikes: number;
  body_strikes: number;
  leg_strikes: number;
  defense_rate: number;
}

export interface KeyMoment {
  timestamp: string;
  timestamp_seconds: number;
  type: 'strike' | 'takedown' | 'submission' | 'defense' | 'knockdown' | 'position';
  description: string;
  fighter: string;
  significance: 'low' | 'medium' | 'high';
}

export interface Round {
  number: number;
  winner_suggestion: string;
  key_events: string[];
}

export interface TechniqueObserved {
  technique: string;
  fighter: string;
  execution: string;
}

export interface PerformanceScores {
  overall: number;
  striking: number;
  grappling: number;
  defense: number;
  cardio: number;
  technique: number;
}

export interface SparringAnalysis {
  summary: string;
  duration_estimate: string;
  duration_seconds: number;
  fighters: FighterProfile[];
  statistics: {
    fighter_1: FighterStatistics;
    fighter_2: FighterStatistics;
  };
  key_moments: KeyMoment[];
  rounds: Round[];
  techniques_observed: TechniqueObserved[];
  recommendations: {
    fighter_1: string[];
    fighter_2: string[];
  };
  overall_analysis: string;
  performance_scores: {
    fighter_1: PerformanceScores;
    fighter_2: PerformanceScores;
  };
}

// ============================================
// VALIDATION
// ============================================

export function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

export function isValidStatistic(value: unknown): value is number {
  return typeof value === 'number' && value >= 0;
}

export function clampScore(value: unknown, defaultValue = 50): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return defaultValue;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampStatistic(value: unknown, defaultValue = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return defaultValue;
  return Math.max(0, Math.round(value));
}

export function validateFighterStatistics(stats: unknown): FighterStatistics {
  const s = (stats && typeof stats === 'object') ? stats as Record<string, unknown> : {};
  
  return {
    punches_thrown: clampStatistic(s.punches_thrown),
    punches_landed: clampStatistic(s.punches_landed),
    kicks_thrown: clampStatistic(s.kicks_thrown),
    kicks_landed: clampStatistic(s.kicks_landed),
    takedowns_attempted: clampStatistic(s.takedowns_attempted),
    takedowns_successful: clampStatistic(s.takedowns_successful),
    significant_strikes: clampStatistic(s.significant_strikes),
    head_strikes: clampStatistic(s.head_strikes),
    body_strikes: clampStatistic(s.body_strikes),
    leg_strikes: clampStatistic(s.leg_strikes),
    defense_rate: clampScore(s.defense_rate, 50),
  };
}

export function validatePerformanceScores(scores: unknown): PerformanceScores {
  const s = (scores && typeof scores === 'object') ? scores as Record<string, unknown> : {};
  
  return {
    overall: clampScore(s.overall),
    striking: clampScore(s.striking),
    grappling: clampScore(s.grappling),
    defense: clampScore(s.defense),
    cardio: clampScore(s.cardio),
    technique: clampScore(s.technique),
  };
}

export function validateFighterProfile(fighter: unknown, index: number): FighterProfile {
  const f = (fighter && typeof fighter === 'object') ? fighter as Record<string, unknown> : {};

  let corner: 'red' | 'blue';
  if (f.corner === 'red' || f.corner === 'blue') {
    corner = f.corner;
  } else {
    corner = index === 0 ? 'red' : 'blue';
  }

  return {
    identifier: typeof f.identifier === 'string' ? f.identifier : `Combattant ${index + 1}`,
    style: typeof f.style === 'string' ? f.style : 'Non déterminé',
    strengths: Array.isArray(f.strengths) ? f.strengths.filter((s): s is string => typeof s === 'string') : [],
    weaknesses: Array.isArray(f.weaknesses) ? f.weaknesses.filter((s): s is string => typeof s === 'string') : [],
    corner,
  };
}

export function validateKeyMoment(moment: unknown): KeyMoment | null {
  if (!moment || typeof moment !== 'object') return null;
  const m = moment as Record<string, unknown>;
  
  const validTypes = ['strike', 'takedown', 'submission', 'defense', 'knockdown', 'position'];
  const validSignificance = ['low', 'medium', 'high'];
  
  if (typeof m.description !== 'string' || !m.description) return null;
  
  return {
    timestamp: typeof m.timestamp === 'string' ? m.timestamp : '0:00',
    timestamp_seconds: typeof m.timestamp_seconds === 'number' ? Math.max(0, m.timestamp_seconds) : 0,
    type: validTypes.includes(m.type as string) ? m.type as KeyMoment['type'] : 'strike',
    description: m.description,
    fighter: typeof m.fighter === 'string' ? m.fighter : 'Inconnu',
    significance: validSignificance.includes(m.significance as string) ? m.significance as KeyMoment['significance'] : 'medium',
  };
}

export function validateRound(round: unknown): Round | null {
  if (!round || typeof round !== 'object') return null;
  const r = round as Record<string, unknown>;
  
  return {
    number: typeof r.number === 'number' ? r.number : 1,
    winner_suggestion: typeof r.winner_suggestion === 'string' ? r.winner_suggestion : 'Indéterminé',
    key_events: Array.isArray(r.key_events) ? r.key_events.filter((e): e is string => typeof e === 'string') : [],
  };
}

export function validateTechnique(tech: unknown): TechniqueObserved | null {
  if (!tech || typeof tech !== 'object') return null;
  const t = tech as Record<string, unknown>;
  
  if (typeof t.technique !== 'string' || !t.technique) return null;
  
  return {
    technique: t.technique,
    fighter: typeof t.fighter === 'string' ? t.fighter : 'Inconnu',
    execution: typeof t.execution === 'string' ? t.execution : 'Non évalué',
  };
}

/**
 * Validates and normalizes AI analysis response
 */
export function validateSparringAnalysis(data: unknown, durationSeconds: number): SparringAnalysis {
  const d = (data && typeof data === 'object') ? data as Record<string, unknown> : {};
  
  // Format duration
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60);
  const durationEstimate = `${minutes}:${String(seconds).padStart(2, '0')}`;
  
  // Validate fighters
  const fighters = Array.isArray(d.fighters) 
    ? d.fighters.slice(0, 2).map((f, i) => validateFighterProfile(f, i))
    : [validateFighterProfile(null, 0), validateFighterProfile(null, 1)];
  
  // Ensure we have exactly 2 fighters
  while (fighters.length < 2) {
    fighters.push(validateFighterProfile(null, fighters.length));
  }
  
  // Validate statistics
  const stats = d.statistics && typeof d.statistics === 'object' 
    ? d.statistics as Record<string, unknown>
    : {};
  
  // Validate key moments
  const keyMoments = Array.isArray(d.key_moments)
    ? d.key_moments.map(validateKeyMoment).filter((m): m is KeyMoment => m !== null)
    : [];
  
  // Validate rounds
  const rounds = Array.isArray(d.rounds)
    ? d.rounds.map(validateRound).filter((r): r is Round => r !== null)
    : [{ number: 1, winner_suggestion: 'Indéterminé', key_events: [] }];
  
  // Validate techniques
  const techniques = Array.isArray(d.techniques_observed)
    ? d.techniques_observed.map(validateTechnique).filter((t): t is TechniqueObserved => t !== null)
    : [];
  
  // Validate recommendations
  const recs = d.recommendations && typeof d.recommendations === 'object'
    ? d.recommendations as Record<string, unknown>
    : {};
  
  // Validate performance scores
  const perfScores = d.performance_scores && typeof d.performance_scores === 'object'
    ? d.performance_scores as Record<string, unknown>
    : {};
  
  return {
    summary: typeof d.summary === 'string' && d.summary ? d.summary : 'Analyse en cours de traitement.',
    duration_estimate: typeof d.duration_estimate === 'string' ? d.duration_estimate : durationEstimate,
    duration_seconds: typeof d.duration_seconds === 'number' ? d.duration_seconds : durationSeconds,
    fighters,
    statistics: {
      fighter_1: validateFighterStatistics(stats.fighter_1),
      fighter_2: validateFighterStatistics(stats.fighter_2),
    },
    key_moments: keyMoments,
    rounds,
    techniques_observed: techniques,
    recommendations: {
      fighter_1: Array.isArray(recs.fighter_1) 
        ? recs.fighter_1.filter((r): r is string => typeof r === 'string')
        : ['Continuez à travailler vos fondamentaux'],
      fighter_2: Array.isArray(recs.fighter_2)
        ? recs.fighter_2.filter((r): r is string => typeof r === 'string')
        : ['Continuez à travailler vos fondamentaux'],
    },
    overall_analysis: typeof d.overall_analysis === 'string' && d.overall_analysis 
      ? d.overall_analysis 
      : 'Analyse détaillée non disponible.',
    performance_scores: {
      fighter_1: validatePerformanceScores(perfScores.fighter_1),
      fighter_2: validatePerformanceScores(perfScores.fighter_2),
    },
  };
}

// ============================================
// DEFAULTS
// ============================================

export function createDefaultAnalysis(durationSeconds: number): SparringAnalysis {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60);
  
  return {
    summary: "L'analyse n'a pas pu être générée. Veuillez réessayer avec une vidéo de meilleure qualité.",
    duration_estimate: `${minutes}:${String(seconds).padStart(2, '0')}`,
    duration_seconds: durationSeconds,
    fighters: [
      { identifier: 'Combattant 1', style: 'Non déterminé', strengths: [], weaknesses: [], corner: 'red' },
      { identifier: 'Combattant 2', style: 'Non déterminé', strengths: [], weaknesses: [], corner: 'blue' },
    ],
    statistics: {
      fighter_1: validateFighterStatistics(null),
      fighter_2: validateFighterStatistics(null),
    },
    key_moments: [],
    rounds: [{ number: 1, winner_suggestion: 'Indéterminé', key_events: [] }],
    techniques_observed: [],
    recommendations: {
      fighter_1: ['Réessayez avec une vidéo plus claire'],
      fighter_2: ['Réessayez avec une vidéo plus claire'],
    },
    overall_analysis: "L'analyse automatique n'a pas pu être complétée.",
    performance_scores: {
      fighter_1: validatePerformanceScores(null),
      fighter_2: validatePerformanceScores(null),
    },
  };
}

