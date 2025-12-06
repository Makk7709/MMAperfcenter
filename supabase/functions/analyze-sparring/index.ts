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
  model: 'google/gemini-2.5-flash',
  maxTokens: 5000,
  temperature: 0.2, // Low temperature for consistent JSON output
  maxFrames: 16,
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

async function fetchWithRetry(
  url: string,
  init: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;
  let delay = RETRY_CONFIG.initialDelayMs;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`🔄 AI call attempt ${attempt}/${RETRY_CONFIG.maxRetries}`);
      const startTime = Date.now();
      
      const response = await fetch(url, init);
      const elapsed = Date.now() - startTime;
      console.log(`   Response: ${response.status} in ${elapsed}ms`);

      if (response.ok || !RETRY_CONFIG.retryableStatuses.includes(response.status)) {
        return response;
      }

      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      (lastError as any).status = response.status;

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
// PROMPT GENERATION
// ============================================

function createSystemPrompt(frameCount: number, totalDuration: number): string {
  const minutes = Math.floor(totalDuration / 60);
  const seconds = Math.round(totalDuration % 60);
  const durationStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const intervalSeconds = Math.round(totalDuration / frameCount);
  
  return `Tu es un ANALYSTE DE COMBAT PROFESSIONNEL avec 20 ans d'expérience dans l'analyse vidéo pour l'UFC.

CONTEXTE:
- ${frameCount} images extraites d'un sparring
- Durée: ${durationStr} (${Math.round(totalDuration)}s)
- Intervalle: ~${intervalSeconds}s entre chaque image

RÈGLES:
1. Retourne UNIQUEMENT du JSON valide
2. JAMAIS de markdown (\`\`\`) ou texte autour
3. Scores entre 0-100, statistiques >= 0
4. Sois RÉALISTE basé sur ce que tu VOIS`;
}

function createUserPrompt(frameCount: number, totalDuration: number): string {
  const minutes = Math.floor(totalDuration / 60);
  const seconds = Math.round(totalDuration % 60);
  const durationEstimate = `${minutes}:${String(seconds).padStart(2, '0')}`;
  
  return `Analyse ces ${frameCount} images et retourne CE JSON EXACT:

{
  "summary": "Description 2-3 phrases",
  "duration_estimate": "${durationEstimate}",
  "duration_seconds": ${Math.round(totalDuration)},
  "fighters": [
    {"identifier": "Description combattant 1", "style": "Son style", "strengths": ["Force 1", "Force 2"], "weaknesses": ["Faiblesse"], "corner": "red"},
    {"identifier": "Description combattant 2", "style": "Son style", "strengths": ["Force 1", "Force 2"], "weaknesses": ["Faiblesse"], "corner": "blue"}
  ],
  "statistics": {
    "fighter_1": {"punches_thrown": 0, "punches_landed": 0, "kicks_thrown": 0, "kicks_landed": 0, "takedowns_attempted": 0, "takedowns_successful": 0, "significant_strikes": 0, "head_strikes": 0, "body_strikes": 0, "leg_strikes": 0, "defense_rate": 50},
    "fighter_2": {"punches_thrown": 0, "punches_landed": 0, "kicks_thrown": 0, "kicks_landed": 0, "takedowns_attempted": 0, "takedowns_successful": 0, "significant_strikes": 0, "head_strikes": 0, "body_strikes": 0, "leg_strikes": 0, "defense_rate": 50}
  },
  "key_moments": [{"timestamp": "0:00", "timestamp_seconds": 0, "type": "strike", "description": "Action", "fighter": "Combattant", "significance": "medium"}],
  "rounds": [{"number": 1, "winner_suggestion": "Combattant ou Draw", "key_events": ["Event"]}],
  "techniques_observed": [{"technique": "Nom", "fighter": "Combattant", "execution": "Bien/À améliorer/Excellent"}],
  "recommendations": {"fighter_1": ["Conseil 1", "Conseil 2"], "fighter_2": ["Conseil 1", "Conseil 2"]},
  "overall_analysis": "Analyse tactique complète",
  "performance_scores": {
    "fighter_1": {"overall": 50, "striking": 50, "grappling": 50, "defense": 50, "cardio": 50, "technique": 50},
    "fighter_2": {"overall": 50, "striking": 50, "grappling": 50, "defense": 50, "cardio": 50, "technique": 50}
  }
}

Remplace les valeurs par ton analyse. JSON UNIQUEMENT.`;
}

// ============================================
// JSON PARSING & VALIDATION
// ============================================

function parseAIResponse(text: string): unknown {
  let jsonStr = text.trim();
  
  // Remove markdown code blocks
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();
  
  // Try to find JSON object if there's extra text
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  
  return JSON.parse(jsonStr);
}

function clampScore(value: unknown, defaultValue = 50): number {
  if (typeof value !== 'number' || isNaN(value)) return defaultValue;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampStat(value: unknown, defaultValue = 0): number {
  if (typeof value !== 'number' || isNaN(value)) return defaultValue;
  return Math.max(0, Math.round(value));
}

function validateStatistics(stats: any) {
  return {
    punches_thrown: clampStat(stats?.punches_thrown),
    punches_landed: clampStat(stats?.punches_landed),
    kicks_thrown: clampStat(stats?.kicks_thrown),
    kicks_landed: clampStat(stats?.kicks_landed),
    takedowns_attempted: clampStat(stats?.takedowns_attempted),
    takedowns_successful: clampStat(stats?.takedowns_successful),
    significant_strikes: clampStat(stats?.significant_strikes),
    head_strikes: clampStat(stats?.head_strikes),
    body_strikes: clampStat(stats?.body_strikes),
    leg_strikes: clampStat(stats?.leg_strikes),
    defense_rate: clampScore(stats?.defense_rate, 50),
  };
}

function validateScores(scores: any) {
  return {
    overall: clampScore(scores?.overall),
    striking: clampScore(scores?.striking),
    grappling: clampScore(scores?.grappling),
    defense: clampScore(scores?.defense),
    cardio: clampScore(scores?.cardio),
    technique: clampScore(scores?.technique),
  };
}

function validateAnalysis(data: any, totalDuration: number) {
  const minutes = Math.floor(totalDuration / 60);
  const seconds = Math.round(totalDuration % 60);
  const durationEstimate = `${minutes}:${String(seconds).padStart(2, '0')}`;
  
  // Ensure fighters array has exactly 2 items
  const fighters = Array.isArray(data?.fighters) ? data.fighters.slice(0, 2) : [];
  while (fighters.length < 2) {
    fighters.push({
      identifier: `Combattant ${fighters.length + 1}`,
      style: 'Non déterminé',
      strengths: [],
      weaknesses: [],
      corner: fighters.length === 0 ? 'red' : 'blue'
    });
  }
  
  return {
    summary: typeof data?.summary === 'string' ? data.summary : 'Analyse non disponible',
    duration_estimate: typeof data?.duration_estimate === 'string' ? data.duration_estimate : durationEstimate,
    duration_seconds: Math.round(totalDuration),
    fighters: fighters.map((f: any, i: number) => ({
      identifier: typeof f?.identifier === 'string' ? f.identifier : `Combattant ${i + 1}`,
      style: typeof f?.style === 'string' ? f.style : 'Non déterminé',
      strengths: Array.isArray(f?.strengths) ? f.strengths.filter((s: any) => typeof s === 'string') : [],
      weaknesses: Array.isArray(f?.weaknesses) ? f.weaknesses.filter((s: any) => typeof s === 'string') : [],
      corner: f?.corner === 'blue' ? 'blue' : (i === 0 ? 'red' : 'blue'),
    })),
    statistics: {
      fighter_1: validateStatistics(data?.statistics?.fighter_1),
      fighter_2: validateStatistics(data?.statistics?.fighter_2),
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
  };
}

function createFallbackAnalysis(totalDuration: number, errorText?: string) {
  const minutes = Math.floor(totalDuration / 60);
  const seconds = Math.round(totalDuration % 60);
  
  return {
    summary: errorText?.substring(0, 300) || "L'analyse n'a pas pu être générée. Réessayez avec une vidéo plus claire.",
    duration_estimate: `${minutes}:${String(seconds).padStart(2, '0')}`,
    duration_seconds: Math.round(totalDuration),
    fighters: [
      { identifier: 'Combattant 1', style: 'Non déterminé', strengths: [], weaknesses: [], corner: 'red' },
      { identifier: 'Combattant 2', style: 'Non déterminé', strengths: [], weaknesses: [], corner: 'blue' },
    ],
    statistics: {
      fighter_1: validateStatistics(null),
      fighter_2: validateStatistics(null),
    },
    key_moments: [],
    rounds: [{ number: 1, winner_suggestion: 'Indéterminé', key_events: [] }],
    techniques_observed: [],
    recommendations: {
      fighter_1: ['Réessayez avec une vidéo de meilleure qualité'],
      fighter_2: ['Réessayez avec une vidéo de meilleure qualité'],
    },
    overall_analysis: "L'analyse automatique n'a pas pu être complétée.",
    performance_scores: {
      fighter_1: validateScores(null),
      fighter_2: validateScores(null),
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
    const { frames, analysisId: aid, videoName, totalDuration } = await req.json();
    analysisId = aid;
    
    // Input validation
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      throw new Error('Video frames required');
    }
    if (frames.length < 3) {
      throw new Error('Minimum 3 frames requis');
    }

    const LEGACY_AI_GATEWAY_KEY = Deno.env.get('LEGACY_AI_GATEWAY_KEY');
    if (!LEGACY_AI_GATEWAY_KEY) {
      throw new Error('API key not configured');
    }

    // Setup Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status
    if (analysisId) {
      await supabase.from('sparring_analyses').update({ status: 'processing' }).eq('id', analysisId);
    }

    console.log(`📹 Analyzing: ${videoName || 'video'} (${frames.length} frames, ${Math.round(totalDuration)}s)`);

    // Limit frames
    const selectedFrames = frames.length > AI_CONFIG.maxFrames
      ? frames.filter((_: any, i: number) => i % Math.ceil(frames.length / AI_CONFIG.maxFrames) === 0).slice(0, AI_CONFIG.maxFrames)
      : frames;

    // Build image contents
    const imageContents = selectedFrames.map((frame: { base64: string }) => ({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${frame.base64}` }
    }));

    console.log(`   Sending ${imageContents.length} frames to AI...`);

    // Call AI API
    const response = await fetchWithRetry(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEGACY_AI_GATEWAY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: createSystemPrompt(selectedFrames.length, totalDuration) },
          {
            role: 'user',
            content: [
              { type: 'text', text: createUserPrompt(selectedFrames.length, totalDuration) },
              ...imageContents
            ]
          }
        ],
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
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('Aucune analyse générée');
    }

    console.log('✅ Response received, parsing...');

    // Parse and validate
    let analysis;
    try {
      const parsed = parseAIResponse(analysisText);
      analysis = validateAnalysis(parsed, totalDuration);
      console.log('✅ Analysis validated');
    } catch (parseError) {
      console.error('❌ Parse error:', parseError);
      analysis = createFallbackAnalysis(totalDuration, analysisText);
    }

    // Save to database
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
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);
    }
    
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
