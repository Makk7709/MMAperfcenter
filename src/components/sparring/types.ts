// Shape of the analysis stored in sparring_analyses.analysis and returned by
// the analyze-sparring Edge Function. Older records may miss the optional
// fields or use legacy enum values: every reader must tolerate that.

export type FighterKey = "fighter_1" | "fighter_2";

export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
export const MAX_VIDEO_SIZE_MB = 500;

export interface FighterStats {
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
  ground_time_percent?: number;
}

export interface Fighter {
  identifier: string;
  style: string;
  strengths: string[];
  weaknesses: string[];
  corner: "red" | "blue";
}

export interface KeyMoment {
  timestamp: string;
  timestamp_seconds: number;
  type: string;
  description: string;
  /** "fighter_1" / "fighter_2"; free text on legacy records. */
  fighter: string;
  significance: "low" | "medium" | "high";
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
  quality?: "good" | "average" | "poor";
  timestamp_seconds?: number | null;
}

export interface PerformanceScores {
  overall: number;
  striking: number;
  grappling: number;
  defense: number;
  cardio: number;
  technique?: number;
}

export interface SparringAnalysisData {
  summary: string;
  duration_estimate: string;
  duration_seconds: number;
  fighters: Fighter[];
  statistics: { fighter_1: FighterStats; fighter_2: FighterStats };
  key_moments: KeyMoment[];
  rounds?: Round[];
  techniques_observed: TechniqueObserved[];
  recommendations: { fighter_1: string[]; fighter_2: string[] };
  overall_analysis: string;
  performance_scores: { fighter_1: PerformanceScores; fighter_2: PerformanceScores };
  analysis_quality?: {
    confidence: number;
    stats_confidence: number;
    video_quality: "poor" | "fair" | "good" | "excellent";
    warnings: string[];
  };
  discipline?: string;
  applicable_metrics?: string[];
  athlete_description?: string | null;
  athlete_identified?: boolean;
  sampling?: {
    layout: "sheet" | "single";
    frames: number;
    burst_spacing: number | null;
    coverage_percent: number | null;
  };
}

export interface AnalysisRecord {
  id: string;
  video_name: string;
  video_url: string;
  status: string;
  analysis: SparringAnalysisData | null;
  created_at: string;
}

export const MOMENT_LABELS: Record<string, string> = {
  strike: "Frappe",
  takedown: "Amenée au sol",
  submission: "Soumission",
  submission_attempt: "Soumission",
  defense: "Défense",
  escape: "Sortie",
  knockdown: "Knockdown",
  position: "Position",
  dominant_position: "Position",
};

export const QUALITY_LABELS: Record<NonNullable<TechniqueObserved["quality"]>, string> = {
  good: "Maîtrisée",
  average: "Correcte",
  poor: "À corriger",
};

export const formatClock = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
};

/** Display name of a fighter; "Vous" when the athlete was recognised. */
export const fighterLabel = (analysis: SparringAnalysisData, key: FighterKey): string => {
  if (key === "fighter_1" && analysis.athlete_identified) return "Vous";
  const index = key === "fighter_1" ? 0 : 1;
  return analysis.fighters?.[index]?.identifier || (index === 0 ? "Combattant rouge" : "Combattant bleu");
};

/** Maps a moment/technique fighter field to a corner, including legacy free text. */
export const fighterKeyOf = (analysis: SparringAnalysisData, value: string): FighterKey | null => {
  if (value === "fighter_1" || value === "fighter_2") return value;
  if (value && value === analysis.fighters?.[0]?.identifier) return "fighter_1";
  if (value && value === analysis.fighters?.[1]?.identifier) return "fighter_2";
  return null;
};

export const percent = (part: number, total: number): number => (total > 0 ? Math.round((part / total) * 100) : 0);
