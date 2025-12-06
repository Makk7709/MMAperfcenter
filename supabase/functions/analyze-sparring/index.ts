import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================

interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: Partial<RetryOptions> = {}
): Promise<Response> {
  const config = { ...defaultRetryOptions, ...options };
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`🔄 AI API call attempt ${attempt}/${config.maxRetries}`);
      const startTime = Date.now();
      
      const response = await fetch(url, init);
      const elapsed = Date.now() - startTime;
      console.log(`   Response: ${response.status} in ${elapsed}ms`);

      // Success or non-retryable error
      if (response.ok || !config.retryableStatuses.includes(response.status)) {
        return response;
      }

      // Retryable status - get error details
      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      (lastError as any).status = response.status;

      // Check for Retry-After header
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        delay = Math.min(parseInt(retryAfter, 10) * 1000 || delay, config.maxDelayMs);
      }

      console.log(`   ⚠️ Retryable error ${response.status}, waiting ${delay}ms before retry...`);

    } catch (error) {
      // Network error
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`   ❌ Network error: ${lastError.message}`);
    }

    // Don't wait after the last attempt
    if (attempt < config.maxRetries) {
      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

// ============================================
// UPDATE STATUS HELPER
// ============================================

async function updateAnalysisStatus(
  supabase: ReturnType<typeof createClient>,
  analysisId: string,
  status: 'pending' | 'processing' | 'completed' | 'error',
  retryInfo?: { attempt: number; maxRetries: number; nextRetryIn?: number }
) {
  const updateData: Record<string, any> = { 
    status,
    updated_at: new Date().toISOString()
  };
  
  if (retryInfo) {
    updateData.retry_info = retryInfo;
  }
  
  await supabase
    .from('sparring_analyses')
    .update(updateData)
    .eq('id', analysisId);
}

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
      throw new Error('Video frames are required');
    }

    if (frames.length < 3) {
      throw new Error('Au moins 3 frames sont nécessaires pour une analyse fiable');
    }

    const LEGACY_AI_GATEWAY_KEY = Deno.env.get('LEGACY_AI_GATEWAY_KEY');
    if (!LEGACY_AI_GATEWAY_KEY) {
      throw new Error('LEGACY_AI_GATEWAY_KEY is not configured');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to processing
    if (analysisId) {
      await updateAnalysisStatus(supabase, analysisId, 'processing');
    }

    console.log(`📹 Analyzing sparring video: ${videoName || 'unknown'}`);
    console.log(`   Frames: ${frames.length}, Duration: ${Math.round(totalDuration)}s`);

    // Limit frames to prevent payload too large
    const maxFrames = 16; // Optimal for API limits
    const selectedFrames = frames.length > maxFrames 
      ? frames.filter((_: any, i: number) => i % Math.ceil(frames.length / maxFrames) === 0).slice(0, maxFrames)
      : frames;

    // Build image content array
    const imageContents = selectedFrames.map((frame: { timestamp: number; base64: string }) => ({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${frame.base64}`
      }
    }));

    console.log(`   Sending ${imageContents.length} frames to AI...`);

    // Calculate payload size estimate
    const estimatedPayloadMB = imageContents.reduce((sum, img) => 
      sum + (img.image_url.url.length * 0.75) / 1024 / 1024, 0);
    console.log(`   Estimated payload: ${estimatedPayloadMB.toFixed(2)}MB`);

    // System prompt optimisé
    const systemPrompt = `Tu es un expert en analyse de combat MMA, boxe et arts martiaux avec 20 ans d'expérience en coaching. 
Tu analyses des séquences d'images extraites d'un sparring comme un coach professionnel de l'UFC.

CONTEXTE: Tu reçois ${selectedFrames.length} images extraites d'une vidéo de sparring d'environ ${Math.round(totalDuration)} secondes.

IMPORTANT: Tu dois retourner UNIQUEMENT un JSON valide, sans texte avant ou après.

Structure JSON requise:
{
  "summary": "Résumé professionnel du combat en 3-4 phrases",
  "duration_estimate": "${Math.floor(totalDuration / 60)}:${String(Math.round(totalDuration % 60)).padStart(2, '0')}",
  "duration_seconds": ${Math.round(totalDuration)},
  "fighters": [
    {
      "identifier": "Combattant ROUGE (description)",
      "style": "Style de combat dominant",
      "strengths": ["Force 1", "Force 2", "Force 3"],
      "weaknesses": ["Faiblesse 1", "Faiblesse 2"],
      "corner": "red"
    },
    {
      "identifier": "Combattant BLEU (description)",
      "style": "Style de combat dominant",
      "strengths": ["Force 1", "Force 2", "Force 3"],
      "weaknesses": ["Faiblesse 1", "Faiblesse 2"],
      "corner": "blue"
    }
  ],
  "statistics": {
    "fighter_1": {
      "punches_thrown": 0, "punches_landed": 0,
      "kicks_thrown": 0, "kicks_landed": 0,
      "takedowns_attempted": 0, "takedowns_successful": 0,
      "significant_strikes": 0,
      "head_strikes": 0, "body_strikes": 0, "leg_strikes": 0,
      "defense_rate": 0
    },
    "fighter_2": {
      "punches_thrown": 0, "punches_landed": 0,
      "kicks_thrown": 0, "kicks_landed": 0,
      "takedowns_attempted": 0, "takedowns_successful": 0,
      "significant_strikes": 0,
      "head_strikes": 0, "body_strikes": 0, "leg_strikes": 0,
      "defense_rate": 0
    }
  },
  "key_moments": [
    {
      "timestamp": "0:45",
      "timestamp_seconds": 45,
      "type": "strike|takedown|submission|defense",
      "description": "Description de l'action",
      "fighter": "Combattant ROUGE",
      "significance": "high|medium|low"
    }
  ],
  "rounds": [
    {
      "number": 1,
      "winner_suggestion": "Combattant ROUGE/BLEU/Draw",
      "key_events": ["Événement 1", "Événement 2"]
    }
  ],
  "techniques_observed": [
    {
      "technique": "Nom technique",
      "fighter": "Combattant ROUGE",
      "execution": "Bien exécuté/À améliorer/Excellent"
    }
  ],
  "recommendations": {
    "fighter_1": ["Conseil 1", "Conseil 2", "Conseil 3"],
    "fighter_2": ["Conseil 1", "Conseil 2", "Conseil 3"]
  },
  "overall_analysis": "Analyse tactique globale",
  "performance_scores": {
    "fighter_1": {
      "overall": 75, "striking": 80, "grappling": 70,
      "defense": 65, "cardio": 85, "technique": 78
    },
    "fighter_2": {
      "overall": 72, "striking": 75, "grappling": 68,
      "defense": 70, "cardio": 80, "technique": 74
    }
  }
}

INSTRUCTIONS:
1. Analyse ATTENTIVEMENT chaque image
2. Identifie les combattants par apparence (couleur gants/shorts)
3. Estime les statistiques basées sur les positions visibles
4. Les scores doivent être entre 0-100, réalistes
5. RETOURNE UNIQUEMENT LE JSON, SANS MARKDOWN`;

    // Call AI API with retry
    const response = await fetchWithRetry(
      'https://ai-gateway.internal/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LEGACY_AI_GATEWAY_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyse ces ${selectedFrames.length} images extraites d'un sparring.
Durée totale: ${Math.round(totalDuration)} secondes.
Retourne UNIQUEMENT le JSON.`
                },
                ...imageContents
              ]
            }
          ],
          max_tokens: 5000,
          temperature: 0.3, // Lower temperature for more consistent output
        }),
      },
      {
        maxRetries: 3,
        initialDelayMs: 2000,
        backoffMultiplier: 2,
        maxDelayMs: 15000,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway final error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requêtes atteinte. Réessayez dans 1 minute.');
      }
      if (response.status === 402) {
        throw new Error('Crédits IA insuffisants.');
      }
      if (response.status === 413) {
        throw new Error('Vidéo trop volumineuse. Essayez avec une vidéo plus courte.');
      }
      throw new Error(`Erreur d'analyse: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('Aucune analyse générée par l\'IA');
    }

    console.log('✅ Analysis received, length:', analysisText.length);

    // Parse JSON response
    let analysis;
    try {
      let jsonStr = analysisText.trim();
      
      // Remove markdown code blocks
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();
      
      analysis = JSON.parse(jsonStr);
      console.log('✅ JSON parsed successfully');
    } catch (parseError) {
      console.error('❌ JSON parse failed:', parseError);
      console.log('Raw text (first 300 chars):', analysisText.substring(0, 300));
      
      // Fallback analysis
      analysis = createFallbackAnalysis(totalDuration, analysisText);
    }

    // Save to database
    if (analysisId && supabase) {
      const { error: updateError } = await supabase
        .from('sparring_analyses')
        .update({ 
          analysis,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      if (updateError) {
        console.error('DB update error:', updateError);
      } else {
        console.log('✅ Analysis saved to database');
      }
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in analyze-sparring:', error);
    
    // Update status to error in database
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
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// ============================================
// FALLBACK ANALYSIS
// ============================================

function createFallbackAnalysis(totalDuration: number, rawText: string) {
  return {
    summary: rawText.substring(0, 500) || "Analyse non disponible - réessayez avec une vidéo plus claire",
    duration_estimate: `${Math.floor(totalDuration / 60)}:${String(Math.round(totalDuration % 60)).padStart(2, '0')}`,
    duration_seconds: Math.round(totalDuration),
    fighters: [
      { identifier: "Combattant 1", style: "À déterminer", strengths: ["À analyser"], weaknesses: ["À analyser"], corner: "red" },
      { identifier: "Combattant 2", style: "À déterminer", strengths: ["À analyser"], weaknesses: ["À analyser"], corner: "blue" }
    ],
    statistics: {
      fighter_1: { punches_thrown: 0, punches_landed: 0, kicks_thrown: 0, kicks_landed: 0, significant_strikes: 0, head_strikes: 0, body_strikes: 0, leg_strikes: 0, defense_rate: 50 },
      fighter_2: { punches_thrown: 0, punches_landed: 0, kicks_thrown: 0, kicks_landed: 0, significant_strikes: 0, head_strikes: 0, body_strikes: 0, leg_strikes: 0, defense_rate: 50 }
    },
    key_moments: [],
    rounds: [{ number: 1, winner_suggestion: "Indéterminé", key_events: [] }],
    techniques_observed: [],
    recommendations: {
      fighter_1: ["Réessayez l'analyse avec une meilleure qualité vidéo"],
      fighter_2: ["Réessayez l'analyse avec une meilleure qualité vidéo"]
    },
    overall_analysis: "L'analyse n'a pas pu être générée correctement. Veuillez réessayer.",
    performance_scores: {
      fighter_1: { overall: 50, striking: 50, grappling: 50, defense: 50, cardio: 50, technique: 50 },
      fighter_2: { overall: 50, striking: 50, grappling: 50, defense: 50, cardio: 50, technique: 50 }
    }
  };
}
