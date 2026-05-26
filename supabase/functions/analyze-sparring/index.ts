import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// CONFIGURATION
// ============================================

const AI_CONFIG = {
  // gemini-2.5-pro = bien meilleure vision multimodale que flash
  // qualityMode "fast" bascule sur flash pour économiser des crédits
  modelPro: 'google/gemini-2.5-pro',
  modelFast: 'google/gemini-2.5-flash',
  maxTokens: 8000,
  temperature: 0.15,
  maxFrames: 60, // 60 frames = ~2x plus de couverture temporelle (était 32)
  apiUrl: 'https://ai-gateway.internal/v1/chat/completions',
};

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 2000,
  backoffMultiplier: 2,
  maxDelayMs: 15000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

// ============================================
// RETRY LOGIC
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: Error | null = null;
  let delay = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`🔄 AI call attempt ${attempt}/${RETRY_CONFIG.maxRetries}`);
      const start = Date.now();
      const response = await fetch(url, init);
      console.log(`   Response: ${response.status} in ${Date.now() - start}ms`);

      if (response.ok || !RETRY_CONFIG.retryableStatuses.includes(response.status)) {
        return response;
      }

      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        delay = Math.min(parseInt(retryAfter, 10) * 1000 || delay, RETRY_CONFIG.maxDelayMs);
      }
      console.log(`   ⚠️ Retry in ${delay}ms...`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`   ❌ Network error: ${lastError.message}`);
    }

    if (attempt < RETRY_CONFIG.maxRetries) {
      await sleep(delay);
      delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs);
    }
  }
  throw lastError || new Error('All retry attempts failed');
}

// ============================================
// TOOL SCHEMA (structured output via tool calling)
// ============================================

const fighterStatsSchema = {
  type: 'object',
  properties: {
    punches_thrown: { type: 'number', description: 'Coups de poing lancés (estimation visible)' },
    punches_landed: { type: 'number' },
    kicks_thrown: { type: 'number' },
    kicks_landed: { type: 'number' },
    takedowns_attempted: { type: 'number' },
    takedowns_successful: { type: 'number' },
    significant_strikes: { type: 'number' },
    head_strikes: { type: 'number' },
    body_strikes: { type: 'number' },
    leg_strikes: { type: 'number' },
    defense_rate: { type: 'number', description: '0-100' },
  },
  required: ['punches_thrown', 'punches_landed', 'kicks_thrown', 'kicks_landed', 'defense_rate'],
};

const performanceScoresSchema = {
  type: 'object',
  properties: {
    overall: { type: 'number' },
    striking: { type: 'number' },
    grappling: { type: 'number' },
    defense: { type: 'number' },
    cardio: { type: 'number' },
    technique: { type: 'number' },
  },
  required: ['overall', 'striking', 'grappling', 'defense', 'cardio', 'technique'],
};

const submitAnalysisTool = {
  type: 'function',
  function: {
    name: 'submit_sparring_analysis',
    description: "Soumet l'analyse complète et structurée du sparring observé sur les frames vidéo.",
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Résumé 2-3 phrases de ce qui est observé' },
        fighters: {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: {
            type: 'object',
            properties: {
              identifier: { type: 'string', description: 'Description visuelle (tenue, couleur, etc.)' },
              style: { type: 'string' },
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
              corner: { type: 'string', enum: ['red', 'blue'] },
            },
            required: ['identifier', 'style', 'corner'],
          },
        },
        statistics: {
          type: 'object',
          properties: { fighter_1: fighterStatsSchema, fighter_2: fighterStatsSchema },
          required: ['fighter_1', 'fighter_2'],
        },
        key_moments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string' },
              timestamp_seconds: { type: 'number' },
              type: { type: 'string', enum: ['strike', 'takedown', 'submission', 'defense', 'knockdown', 'position'] },
              description: { type: 'string' },
              fighter: { type: 'string' },
              significance: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['description', 'fighter', 'significance'],
          },
        },
        rounds: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              number: { type: 'number' },
              winner_suggestion: { type: 'string' },
              key_events: { type: 'array', items: { type: 'string' } },
            },
            required: ['number', 'winner_suggestion'],
          },
        },
        techniques_observed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              technique: { type: 'string' },
              fighter: { type: 'string' },
              execution: { type: 'string' },
            },
            required: ['technique', 'fighter'],
          },
        },
        recommendations: {
          type: 'object',
          properties: {
            fighter_1: { type: 'array', items: { type: 'string' } },
            fighter_2: { type: 'array', items: { type: 'string' } },
          },
          required: ['fighter_1', 'fighter_2'],
        },
        overall_analysis: { type: 'string', description: 'Analyse tactique détaillée' },
        performance_scores: {
          type: 'object',
          properties: { fighter_1: performanceScoresSchema, fighter_2: performanceScoresSchema },
          required: ['fighter_1', 'fighter_2'],
        },
        analysis_quality: {
          type: 'object',
          description: 'Méta-évaluation honnête de la qualité de cette analyse',
          properties: {
            confidence: { type: 'number', description: 'Confiance globale 0-100 dans la fiabilité des stats' },
            stats_confidence: { type: 'number', description: '0-100 - fiabilité spécifique des chiffres de coups' },
            video_quality: { type: 'string', enum: ['poor', 'fair', 'good', 'excellent'] },
            warnings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Limites notables (angle de caméra, frames sautées, fighters peu visibles, etc.)',
            },
          },
          required: ['confidence', 'stats_confidence', 'video_quality'],
        },
        applicable_metrics: {
          type: 'array',
          description: 'Métriques de performance_scores pertinentes pour la discipline analysée (les autres seront masquées en UI).',
          items: { type: 'string', enum: ['striking', 'grappling', 'defense', 'cardio', 'technique'] },
        },
      },
      required: ['summary', 'fighters', 'statistics', 'key_moments', 'rounds', 'recommendations', 'overall_analysis', 'performance_scores', 'analysis_quality', 'applicable_metrics'],
    },
  },
};

// ============================================
// DISCIPLINE-SPECIFIC GUIDANCE
// ============================================

interface DisciplineProfile {
  label: string;
  focus: string;
  applicableMetrics: string[];
  rules: string[];
}

function getDisciplineProfile(discipline?: string): DisciplineProfile {
  const d = (discipline || '').toLowerCase().trim();

  if (['boxe', 'boxe anglaise', 'boxing', 'english boxing'].some(k => d.includes(k))) {
    return {
      label: 'Boxe anglaise',
      focus: 'Uniquement poings (jab, cross, hook, uppercut). PAS de coups de pied, PAS de grappling, PAS de takedown.',
      applicableMetrics: ['striking', 'defense', 'cardio', 'technique'],
      rules: [
        'kicks_thrown / kicks_landed / leg_strikes / takedowns_* DOIVENT être 0 (interdits en boxe).',
        'grappling = 0 et NON pertinent: ne pas évaluer cette dimension.',
        'Focus: travail des poings, jeu de jambes, esquives, garde, enchaînements.',
      ],
    };
  }

  if (['kickboxing', 'kick-boxing', 'k1', 'k-1'].some(k => d.includes(k))) {
    return {
      label: 'Kickboxing',
      focus: 'Poings + coups de pied. Pas de grappling, pas de clinch prolongé, pas de takedown.',
      applicableMetrics: ['striking', 'defense', 'cardio', 'technique'],
      rules: [
        'takedowns_* = 0. grappling = 0 et NON pertinent.',
        'Évaluer kicks et punches séparément dans les stats.',
      ],
    };
  }

  if (['muay', 'thai', 'boxe thai', 'thaï'].some(k => d.includes(k))) {
    return {
      label: 'Muay Thai',
      focus: 'Poings, coups de pied, genoux, coudes, clinch debout. Pas de combat au sol.',
      applicableMetrics: ['striking', 'grappling', 'defense', 'cardio', 'technique'],
      rules: [
        'grappling = compétences de CLINCH (contrôle, projections debout, genoux en clinch), pas de sol.',
        'takedowns_* peut refléter sweeps/dumps issus du clinch.',
      ],
    };
  }

  if (['mma', 'free fight', 'cage'].some(k => d.includes(k))) {
    return {
      label: 'MMA',
      focus: 'Combat complet: striking debout + clinch + lutte + sol + soumissions.',
      applicableMetrics: ['striking', 'grappling', 'defense', 'cardio', 'technique'],
      rules: ['Toutes les dimensions sont pertinentes.'],
    };
  }

  if (['bjj', 'jiu-jitsu', 'jjb', 'grappling', 'lutte', 'wrestling', 'judo', 'sambo'].some(k => d.includes(k))) {
    return {
      label: 'Grappling / BJJ',
      focus: 'Combat au sol et projections. Pas de frappe.',
      applicableMetrics: ['grappling', 'defense', 'cardio', 'technique'],
      rules: [
        'punches_*, kicks_*, *_strikes DOIVENT être 0 (pas de frappes).',
        'striking = 0 et NON pertinent.',
        'Focus: takedowns, contrôle, passages de garde, soumissions, échappées.',
      ],
    };
  }

  if (['karate', 'karaté', 'taekwondo', 'tkd'].some(k => d.includes(k))) {
    return {
      label: 'Karaté / Taekwondo',
      focus: 'Frappes pieds-poings au point (sport), distance et timing. Pas de grappling.',
      applicableMetrics: ['striking', 'defense', 'cardio', 'technique'],
      rules: [
        'takedowns_* = 0. grappling = 0 et NON pertinent.',
        'Valoriser la distance, le timing, les contres et les techniques tournées.',
      ],
    };
  }

  // Fallback: générique (laisse l'IA décider)
  return {
    label: discipline || 'Non spécifiée',
    focus: 'Discipline non spécifiée: déduis les métriques pertinentes des images observées.',
    applicableMetrics: ['striking', 'grappling', 'defense', 'cardio', 'technique'],
    rules: [
      'Si tu n\'observes AUCUN grappling/sol, mets grappling = 0 et exclus-le de applicable_metrics.',
      'Si tu n\'observes AUCUNE frappe, mets striking = 0 et exclus-le de applicable_metrics.',
    ],
  };
}

// ============================================
// PROMPTS
// ============================================

function createSystemPrompt(frameCount: number, totalDuration: number, profile: DisciplineProfile): string {
  const minutes = Math.floor(totalDuration / 60);
  const seconds = Math.round(totalDuration % 60);
  const durationStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const intervalSeconds = (totalDuration / frameCount).toFixed(1);

  return `Tu es un ANALYSTE DE COMBAT PROFESSIONNEL spécialisé en ${profile.label}.

DISCIPLINE ANALYSÉE: ${profile.label}
CADRE TECHNIQUE: ${profile.focus}
RÈGLES SPÉCIFIQUES À LA DISCIPLINE:
${profile.rules.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

MÉTRIQUES PERTINENTES (à inclure dans applicable_metrics): ${profile.applicableMetrics.join(', ')}
→ Toute métrique HORS de cette liste DOIT être mise à 0 dans performance_scores ET exclue de applicable_metrics.
→ N'invente JAMAIS de stats qui n'existent pas dans cette discipline (ex: pas de takedowns en boxe anglaise).

CONTEXTE TECHNIQUE:
- ${frameCount} images extraites d'un sparring (échantillonnage discret, pas une vidéo continue)
- Durée totale: ${durationStr} (${Math.round(totalDuration)}s)
- Intervalle moyen: ~${intervalSeconds}s entre chaque frame

RÈGLES D'ANALYSE GÉNÉRALES:
1. Tu DOIS appeler la fonction submit_sparring_analysis - aucune autre réponse acceptée.
2. Sois RÉALISTE: les stats sont des ESTIMATIONS basées sur l'activité observée entre frames.
3. Si tu ne peux PAS distinguer clairement les 2 combattants, mets video_quality="poor" et confidence < 40.
4. Préfère des chiffres BAS et HONNÊTES plutôt que gonflés.
5. Si une action est ambiguë (coup raté vs touché), ne la compte PAS comme "landed".
6. analysis_quality.warnings doit lister TOUTES les limites réelles.
7. Les scores 0-100 doivent refléter ce que tu OBSERVES, et respecter les contraintes de la discipline ci-dessus.`;
}

function createUserPrompt(frameCount: number): string {
  return `Analyse ces ${frameCount} images de sparring et appelle submit_sparring_analysis avec ton évaluation honnête. Sois précis sur ce que tu vois, prudent sur ce que tu ne vois pas.`;
}

// ============================================
// VALIDATION (defensive — le tool calling garantit déjà le format)
// ============================================

const clampScore = (v: unknown, d = 50): number => {
  if (typeof v !== 'number' || isNaN(v)) return d;
  return Math.max(0, Math.min(100, Math.round(v)));
};
const clampStat = (v: unknown, d = 0): number => {
  if (typeof v !== 'number' || isNaN(v)) return d;
  return Math.max(0, Math.round(v));
};

function validateAnalysis(data: any, totalDuration: number) {
  const minutes = Math.floor(totalDuration / 60);
  const seconds = Math.round(totalDuration % 60);
  const durationEstimate = `${minutes}:${String(seconds).padStart(2, '0')}`;

  const validateStats = (s: any) => ({
    punches_thrown: clampStat(s?.punches_thrown),
    punches_landed: clampStat(s?.punches_landed),
    kicks_thrown: clampStat(s?.kicks_thrown),
    kicks_landed: clampStat(s?.kicks_landed),
    takedowns_attempted: clampStat(s?.takedowns_attempted),
    takedowns_successful: clampStat(s?.takedowns_successful),
    significant_strikes: clampStat(s?.significant_strikes),
    head_strikes: clampStat(s?.head_strikes),
    body_strikes: clampStat(s?.body_strikes),
    leg_strikes: clampStat(s?.leg_strikes),
    defense_rate: clampScore(s?.defense_rate, 50),
  });

  const validateScores = (s: any) => ({
    overall: clampScore(s?.overall),
    striking: clampScore(s?.striking),
    grappling: clampScore(s?.grappling),
    defense: clampScore(s?.defense),
    cardio: clampScore(s?.cardio),
    technique: clampScore(s?.technique),
  });

  const fighters = Array.isArray(data?.fighters) ? data.fighters.slice(0, 2) : [];
  while (fighters.length < 2) {
    fighters.push({
      identifier: `Combattant ${fighters.length + 1}`,
      style: 'Non déterminé',
      strengths: [],
      weaknesses: [],
      corner: fighters.length === 0 ? 'red' : 'blue',
    });
  }

  const q = data?.analysis_quality ?? {};
  const validVideoQuality = ['poor', 'fair', 'good', 'excellent'];

  return {
    summary: typeof data?.summary === 'string' ? data.summary : 'Analyse non disponible',
    duration_estimate: durationEstimate,
    duration_seconds: Math.round(totalDuration),
    fighters: fighters.map((f: any, i: number) => ({
      identifier: typeof f?.identifier === 'string' ? f.identifier : `Combattant ${i + 1}`,
      style: typeof f?.style === 'string' ? f.style : 'Non déterminé',
      strengths: Array.isArray(f?.strengths) ? f.strengths.filter((s: any) => typeof s === 'string') : [],
      weaknesses: Array.isArray(f?.weaknesses) ? f.weaknesses.filter((s: any) => typeof s === 'string') : [],
      corner: f?.corner === 'blue' ? 'blue' : (i === 0 ? 'red' : 'blue'),
    })),
    statistics: {
      fighter_1: validateStats(data?.statistics?.fighter_1),
      fighter_2: validateStats(data?.statistics?.fighter_2),
    },
    key_moments: Array.isArray(data?.key_moments)
      ? data.key_moments.filter((m: any) => m?.description).map((m: any) => ({
          timestamp: typeof m.timestamp === 'string' ? m.timestamp : '0:00',
          timestamp_seconds: typeof m.timestamp_seconds === 'number' ? Math.max(0, m.timestamp_seconds) : 0,
          type: ['strike', 'takedown', 'submission', 'defense', 'knockdown', 'position'].includes(m.type) ? m.type : 'strike',
          description: m.description,
          fighter: typeof m.fighter === 'string' ? m.fighter : 'Inconnu',
          significance: ['low', 'medium', 'high'].includes(m.significance) ? m.significance : 'medium',
        }))
      : [],
    rounds: Array.isArray(data?.rounds) && data.rounds.length > 0
      ? data.rounds.map((r: any) => ({
          number: typeof r?.number === 'number' ? r.number : 1,
          winner_suggestion: typeof r?.winner_suggestion === 'string' ? r.winner_suggestion : 'Indéterminé',
          key_events: Array.isArray(r?.key_events) ? r.key_events.filter((e: any) => typeof e === 'string') : [],
        }))
      : [{ number: 1, winner_suggestion: 'Indéterminé', key_events: [] }],
    techniques_observed: Array.isArray(data?.techniques_observed)
      ? data.techniques_observed.filter((t: any) => t?.technique).map((t: any) => ({
          technique: t.technique,
          fighter: typeof t.fighter === 'string' ? t.fighter : 'Inconnu',
          execution: typeof t.execution === 'string' ? t.execution : 'Non évalué',
        }))
      : [],
    recommendations: {
      fighter_1: Array.isArray(data?.recommendations?.fighter_1)
        ? data.recommendations.fighter_1.filter((r: any) => typeof r === 'string')
        : ['Continuez à travailler vos fondamentaux'],
      fighter_2: Array.isArray(data?.recommendations?.fighter_2)
        ? data.recommendations.fighter_2.filter((r: any) => typeof r === 'string')
        : ['Continuez à travailler vos fondamentaux'],
    },
    overall_analysis: typeof data?.overall_analysis === 'string' ? data.overall_analysis : 'Analyse détaillée non disponible.',
    performance_scores: {
      fighter_1: validateScores(data?.performance_scores?.fighter_1),
      fighter_2: validateScores(data?.performance_scores?.fighter_2),
    },
    analysis_quality: {
      confidence: clampScore(q.confidence, 50),
      stats_confidence: clampScore(q.stats_confidence, 50),
      video_quality: validVideoQuality.includes(q.video_quality) ? q.video_quality : 'fair',
      warnings: Array.isArray(q.warnings) ? q.warnings.filter((w: any) => typeof w === 'string') : [],
    },
  };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let analysisId: string | undefined;
  let supabase: ReturnType<typeof createClient> | undefined;

  try {
    const { frames, analysisId: aid, videoName, totalDuration, qualityMode } = await req.json();
    analysisId = aid;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      throw new Error('Video frames required');
    }
    if (frames.length < 3) {
      throw new Error('Minimum 3 frames requis');
    }

    const LEGACY_AI_GATEWAY_KEY = Deno.env.get('LEGACY_AI_GATEWAY_KEY');
    if (!LEGACY_AI_GATEWAY_KEY) throw new Error('API key not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (analysisId) {
      await supabase.from('sparring_analyses').update({ status: 'processing' }).eq('id', analysisId);
    }

    const model = qualityMode === 'fast' ? AI_CONFIG.modelFast : AI_CONFIG.modelPro;
    console.log(`📹 Analyzing: ${videoName} (${frames.length} frames, ${Math.round(totalDuration)}s) — model=${model}`);

    // Limit frames
    const selectedFrames = frames.length > AI_CONFIG.maxFrames
      ? frames.filter((_: any, i: number) => i % Math.ceil(frames.length / AI_CONFIG.maxFrames) === 0).slice(0, AI_CONFIG.maxFrames)
      : frames;

    const imageContents = selectedFrames.map((frame: { base64: string }) => ({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${frame.base64}` },
    }));

    console.log(`   Sending ${imageContents.length} frames to AI (tool calling)...`);

    const response = await fetchWithRetry(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEGACY_AI_GATEWAY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: createSystemPrompt(selectedFrames.length, totalDuration) },
          {
            role: 'user',
            content: [
              { type: 'text', text: createUserPrompt(selectedFrames.length) },
              ...imageContents,
            ],
          },
        ],
        tools: [submitAnalysisTool],
        tool_choice: { type: 'function', function: { name: 'submit_sparring_analysis' } },
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI error:', response.status, errorText);
      if (response.status === 429) throw new Error('Limite de requêtes. Réessayez dans 1 minute.');
      if (response.status === 402) throw new Error('Crédits IA insuffisants.');
      if (response.status === 413) throw new Error('Vidéo trop volumineuse.');
      throw new Error(`Erreur d'analyse: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('No tool call returned, raw:', JSON.stringify(data).substring(0, 500));
      throw new Error("L'IA n'a pas retourné de structure d'analyse valide");
    }

    let parsedArgs: any;
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Tool args parse error:', e);
      throw new Error("Format de réponse IA invalide");
    }

    const analysis = validateAnalysis(parsedArgs, totalDuration);
    console.log(`✅ Analysis validated (confidence: ${analysis.analysis_quality.confidence}/100)`);

    if (analysisId && supabase) {
      await supabase
        .from('sparring_analyses')
        .update({ analysis, status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', analysisId);
      console.log('✅ Saved to DB');
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    if (analysisId && supabase) {
      await supabase
        .from('sparring_analyses')
        .update({
          status: 'error',
          analysis: { error: error instanceof Error ? error.message : 'Unknown error' },
          updated_at: new Date().toISOString(),
        })
        .eq('id', analysisId);
    }
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
