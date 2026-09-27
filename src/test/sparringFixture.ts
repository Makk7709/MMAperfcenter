import type { SparringAnalysisData } from "@/components/sparring/types";
const stats = {
  punches_thrown: 40,
  punches_landed: 20,
  kicks_thrown: 10,
  kicks_landed: 5,
  takedowns_attempted: 2,
  takedowns_successful: 1,
  significant_strikes: 25,
  head_strikes: 15,
  body_strikes: 8,
  leg_strikes: 2,
  defense_rate: 60,
  ground_time_percent: 20,
};
const scores = {
  overall: 72,
  striking: 80,
  grappling: 55,
  defense: 70,
  cardio: 75,
  technique: 77,
};
export const sparringFixture: SparringAnalysisData = {
  summary: "Un round technique et équilibré",
  duration_estimate: "2:00",
  duration_seconds: 120,
  fighters: [
    {
      identifier: "Gants rouges",
      style: "Boxeur",
      strengths: ["Jab précis"],
      weaknesses: ["Garde basse"],
      corner: "red",
    },
    {
      identifier: "Gants bleus",
      style: "Grappler",
      strengths: ["Contrôle"],
      weaknesses: ["Distance"],
      corner: "blue",
    },
  ],
  statistics: { fighter_1: stats, fighter_2: { ...stats, punches_landed: 10 } },
  key_moments: [
    {
      timestamp: "0:20",
      timestamp_seconds: 20,
      type: "strike",
      description: "Jab au visage",
      fighter: "fighter_1",
      significance: "high",
    },
  ],
  rounds: [
    { number: 1, winner_suggestion: "fighter_1", key_events: ["Jab décisif"] },
  ],
  techniques_observed: [
    {
      technique: "Jab",
      fighter: "fighter_1",
      execution: "Bras relâché",
      quality: "good",
      timestamp_seconds: 20,
    },
  ],
  recommendations: {
    fighter_1: ["Remonter la garde"],
    fighter_2: ["Travailler la distance"],
  },
  overall_analysis: "Bonne gestion de la distance",
  performance_scores: {
    fighter_1: scores,
    fighter_2: { ...scores, overall: 65 },
  },
  analysis_quality: {
    confidence: 75,
    stats_confidence: 65,
    video_quality: "good",
    warnings: ["Angle partiellement masqué"],
  },
  discipline: "MMA",
  applicable_metrics: [
    "striking",
    "grappling",
    "defense",
    "cardio",
    "technique",
  ],
  athlete_description: "gants rouges",
  athlete_identified: true,
  sampling: {
    layout: "sheet",
    frames: 12,
    burst_spacing: 0.25,
    coverage_percent: 60,
  },
};
