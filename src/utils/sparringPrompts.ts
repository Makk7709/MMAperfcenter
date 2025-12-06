/**
 * Optimized AI Prompts for Sparring Analysis
 * 
 * Uses few-shot prompting with concrete examples
 * for more consistent and accurate AI outputs.
 */

// ============================================
// PROMPT CONFIGURATION
// ============================================

export interface PromptConfig {
  frameCount: number;
  totalDuration: number;
  videoName?: string;
}

// ============================================
// SYSTEM PROMPT - EXPERT PERSONA
// ============================================

export function createSystemPrompt(config: PromptConfig): string {
  const { frameCount, totalDuration } = config;
  const minutes = Math.floor(totalDuration / 60);
  const seconds = Math.round(totalDuration % 60);
  const durationStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const intervalSeconds = Math.round(totalDuration / frameCount);
  
  return `Tu es un ANALYSTE DE COMBAT PROFESSIONNEL avec 20 ans d'expérience dans l'analyse vidéo pour l'UFC, Bellator et ONE Championship.

CONTEXTE ACTUEL:
- Tu reçois ${frameCount} images extraites d'un sparring
- Durée totale estimée: ${durationStr} (${Math.round(totalDuration)} secondes)
- Intervalle entre frames: ~${intervalSeconds} secondes

TON RÔLE:
1. Identifier les 2 combattants par leur apparence (gants, shorts, position)
2. Analyser la technique, la défense et le cardio de chaque combattant
3. Compter/estimer les coups (poings, pieds) basés sur les positions visibles
4. Identifier les moments clés (belles actions, erreurs)
5. Donner des conseils d'entraînement CONCRETS et PERSONNALISÉS

RÈGLES ABSOLUES:
- Retourne UNIQUEMENT du JSON valide, JAMAIS de markdown ou texte
- Les scores sont entre 0 et 100
- Les statistiques sont des entiers positifs
- Sois RÉALISTE - n'invente pas des statistiques impossibles
- Si tu ne peux pas voir clairement, indique "Non observable" plutôt que d'inventer`;
}

// ============================================
// USER PROMPT WITH STRUCTURE
// ============================================

export function createUserPrompt(config: PromptConfig): string {
  const { frameCount, totalDuration } = config;
  const minutes = Math.floor(totalDuration / 60);
  const seconds = Math.round(totalDuration % 60);
  
  return `Analyse ces ${frameCount} images de sparring et retourne UN SEUL objet JSON avec cette structure EXACTE:

{
  "summary": "Description du combat en 2-3 phrases (style, intensité, dominance)",
  "duration_estimate": "${minutes}:${String(seconds).padStart(2, '0')}",
  "duration_seconds": ${Math.round(totalDuration)},
  "fighters": [
    {
      "identifier": "Description du combattant 1 (ex: 'Combattant gants rouges, short noir')",
      "style": "Son style de combat dominant",
      "strengths": ["Point fort 1", "Point fort 2"],
      "weaknesses": ["Point faible 1"],
      "corner": "red"
    },
    {
      "identifier": "Description du combattant 2",
      "style": "Son style de combat dominant",
      "strengths": ["Point fort 1", "Point fort 2"],
      "weaknesses": ["Point faible 1"],
      "corner": "blue"
    }
  ],
  "statistics": {
    "fighter_1": {
      "punches_thrown": <nombre estimé>,
      "punches_landed": <nombre estimé>,
      "kicks_thrown": <nombre estimé>,
      "kicks_landed": <nombre estimé>,
      "takedowns_attempted": <nombre>,
      "takedowns_successful": <nombre>,
      "significant_strikes": <nombre>,
      "head_strikes": <nombre>,
      "body_strikes": <nombre>,
      "leg_strikes": <nombre>,
      "defense_rate": <0-100>
    },
    "fighter_2": { ... même structure ... }
  },
  "key_moments": [
    {
      "timestamp": "M:SS",
      "timestamp_seconds": <secondes>,
      "type": "strike|takedown|submission|defense|knockdown|position",
      "description": "Description de l'action",
      "fighter": "Qui a fait l'action",
      "significance": "low|medium|high"
    }
  ],
  "rounds": [
    {
      "number": 1,
      "winner_suggestion": "Nom du combattant ou 'Draw'",
      "key_events": ["Événement important 1", "Événement important 2"]
    }
  ],
  "techniques_observed": [
    {
      "technique": "Nom technique (Jab, Cross, Low kick, Takedown...)",
      "fighter": "Qui l'a exécutée",
      "execution": "Bien exécuté|À améliorer|Excellent"
    }
  ],
  "recommendations": {
    "fighter_1": [
      "Conseil d'entraînement spécifique 1",
      "Conseil d'entraînement spécifique 2",
      "Exercice recommandé"
    ],
    "fighter_2": [ ... ]
  },
  "overall_analysis": "Analyse tactique: qui a dominé, pourquoi, axes d'amélioration pour chacun",
  "performance_scores": {
    "fighter_1": {
      "overall": <0-100>,
      "striking": <0-100>,
      "grappling": <0-100>,
      "defense": <0-100>,
      "cardio": <0-100>,
      "technique": <0-100>
    },
    "fighter_2": { ... même structure ... }
  }
}

IMPORTANT: Retourne UNIQUEMENT ce JSON, aucun texte avant ou après.`;
}

// ============================================
// FEW-SHOT EXAMPLE (for future use)
// ============================================

export const EXAMPLE_ANALYSIS = {
  summary: "Sparring technique entre un striker expérimenté et un grappler en développement. Le striker domine debout mais le grappler montre de bonnes initiatives au sol.",
  duration_estimate: "2:45",
  duration_seconds: 165,
  fighters: [
    {
      identifier: "Combattant gants rouges, short noir",
      style: "Striker technique, bon counter-puncher",
      strengths: ["Jab précis", "Bon timing", "Footwork fluide"],
      weaknesses: ["Défense au sol à améliorer"],
      corner: "red"
    },
    {
      identifier: "Combattant gants bleus, short gris",
      style: "Grappler offensif, cherche le takedown",
      strengths: ["Explosivité", "Double leg efficace"],
      weaknesses: ["Boxing basique", "Gestion de la distance"],
      corner: "blue"
    }
  ],
  statistics: {
    fighter_1: {
      punches_thrown: 35,
      punches_landed: 22,
      kicks_thrown: 12,
      kicks_landed: 8,
      takedowns_attempted: 0,
      takedowns_successful: 0,
      significant_strikes: 18,
      head_strikes: 14,
      body_strikes: 6,
      leg_strikes: 8,
      defense_rate: 72
    },
    fighter_2: {
      punches_thrown: 20,
      punches_landed: 10,
      kicks_thrown: 5,
      kicks_landed: 3,
      takedowns_attempted: 4,
      takedowns_successful: 2,
      significant_strikes: 8,
      head_strikes: 6,
      body_strikes: 3,
      leg_strikes: 4,
      defense_rate: 58
    }
  },
  key_moments: [
    {
      timestamp: "0:45",
      timestamp_seconds: 45,
      type: "strike",
      description: "Belle combinaison jab-cross du combattant rouge qui touche proprement",
      fighter: "Combattant gants rouges",
      significance: "high"
    },
    {
      timestamp: "1:30",
      timestamp_seconds: 90,
      type: "takedown",
      description: "Double leg réussi du combattant bleu après avoir absorbé un jab",
      fighter: "Combattant gants bleus",
      significance: "high"
    }
  ],
  rounds: [
    {
      number: 1,
      winner_suggestion: "Combattant gants rouges",
      key_events: ["Domination au striking", "2 takedowns concédés mais relevés rapidement"]
    }
  ],
  techniques_observed: [
    { technique: "Jab", fighter: "Combattant gants rouges", execution: "Excellent" },
    { technique: "Cross", fighter: "Combattant gants rouges", execution: "Bien exécuté" },
    { technique: "Double leg", fighter: "Combattant gants bleus", execution: "Bien exécuté" },
    { technique: "Low kick", fighter: "Combattant gants rouges", execution: "À améliorer" }
  ],
  recommendations: {
    fighter_1: [
      "Travailler les sprawls et la défense de takedown",
      "Ajouter plus de low kicks pour casser le rythme de l'adversaire",
      "Exercice: 3x5min de sprawl drills quotidiens"
    ],
    fighter_2: [
      "Améliorer la garde et le jab pour mieux rentrer sur les jambes",
      "Travailler les feintes avant le niveau change",
      "Exercice: shadow boxing 20min/jour pour le timing des entrées"
    ]
  },
  overall_analysis: "Le combattant rouge domine clairement le striking avec un jab efficace et un bon timing. Le combattant bleu montre du potentiel en grappling mais doit améliorer son setup debout pour mieux amener ses takedowns. Travail technique recommandé pour les deux.",
  performance_scores: {
    fighter_1: { overall: 78, striking: 85, grappling: 55, defense: 72, cardio: 80, technique: 82 },
    fighter_2: { overall: 68, striking: 55, grappling: 78, defense: 58, cardio: 75, technique: 65 }
  }
};

// ============================================
// PROMPT BUILDER
// ============================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export function buildAnalysisMessages(
  config: PromptConfig,
  imageContents: Array<{ type: string; image_url: { url: string } }>
): AIMessage[] {
  return [
    {
      role: 'system',
      content: createSystemPrompt(config)
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: createUserPrompt(config) },
        ...imageContents
      ]
    }
  ];
}

// ============================================
// AI REQUEST CONFIG
// ============================================

export const AI_CONFIG = {
  model: 'google/gemini-2.5-flash',
  max_tokens: 5000,
  temperature: 0.2, // Lower = more deterministic/consistent output
} as const;

