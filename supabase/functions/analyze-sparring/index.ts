import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frames, analysisId, videoName, totalDuration } = await req.json();
    
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      throw new Error('Video frames are required');
    }

    const LEGACY_AI_GATEWAY_KEY = Deno.env.get('LEGACY_AI_GATEWAY_KEY');
    if (!LEGACY_AI_GATEWAY_KEY) {
      throw new Error('LEGACY_AI_GATEWAY_KEY is not configured');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status to processing
    if (analysisId) {
      await supabase
        .from('sparring_analyses')
        .update({ status: 'processing' })
        .eq('id', analysisId);
    }

    console.log(`Analyzing sparring video with ${frames.length} frames, duration: ${totalDuration}s`);

    // Build image content array from frames
    const imageContents = frames.slice(0, 20).map((frame: { timestamp: number; base64: string }, index: number) => ({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${frame.base64}`
      }
    }));

    console.log(`Sending ${imageContents.length} frames to AI for analysis...`);

    // Système de prompt amélioré pour des analyses plus riches
    const systemPrompt = `Tu es un expert en analyse de combat MMA, boxe et arts martiaux avec 20 ans d'expérience en coaching. 
Tu analyses des séquences d'images extraites d'un sparring comme un coach professionnel de l'UFC.

CONTEXTE: Tu reçois ${frames.length} images extraites d'une vidéo de sparring d'environ ${Math.round(totalDuration)} secondes.
Les images sont espacées d'environ ${Math.round(totalDuration / frames.length)} secondes.

IMPORTANT: Tu dois retourner UNIQUEMENT un JSON valide, sans texte avant ou après.

Structure JSON requise:
{
  "summary": "Résumé professionnel du combat en 3-4 phrases, mentionnant les styles observés et le déroulement général",
  "duration_estimate": "${Math.floor(totalDuration / 60)}:${String(Math.round(totalDuration % 60)).padStart(2, '0')}",
  "duration_seconds": ${Math.round(totalDuration)},
  "fighters": [
    {
      "identifier": "Combattant coin ROUGE (description physique: taille, short, etc.)",
      "style": "Style de combat dominant (ex: 'Boxeur counter-puncher avec bon jab')",
      "strengths": ["Force 1 précise", "Force 2 précise", "Force 3 précise"],
      "weaknesses": ["Faiblesse 1 à travailler", "Faiblesse 2 à travailler"],
      "corner": "red"
    },
    {
      "identifier": "Combattant coin BLEU (description physique)",
      "style": "Style de combat dominant",
      "strengths": ["Force 1", "Force 2", "Force 3"],
      "weaknesses": ["Faiblesse 1", "Faiblesse 2"],
      "corner": "blue"
    }
  ],
  "statistics": {
    "fighter_1": {
      "punches_thrown": 0,
      "punches_landed": 0,
      "kicks_thrown": 0,
      "kicks_landed": 0,
      "takedowns_attempted": 0,
      "takedowns_successful": 0,
      "submissions_attempted": 0,
      "clinch_time_percent": 0,
      "ground_time_percent": 0,
      "significant_strikes": 0,
      "head_strikes": 0,
      "body_strikes": 0,
      "leg_strikes": 0,
      "defense_rate": 0
    },
    "fighter_2": {
      "punches_thrown": 0,
      "punches_landed": 0,
      "kicks_thrown": 0,
      "kicks_landed": 0,
      "takedowns_attempted": 0,
      "takedowns_successful": 0,
      "submissions_attempted": 0,
      "clinch_time_percent": 0,
      "ground_time_percent": 0,
      "significant_strikes": 0,
      "head_strikes": 0,
      "body_strikes": 0,
      "leg_strikes": 0,
      "defense_rate": 0
    }
  },
  "key_moments": [
    {
      "timestamp": "0:45",
      "timestamp_seconds": 45,
      "type": "strike",
      "description": "Description précise de l'action",
      "fighter": "Combattant ROUGE",
      "significance": "high"
    }
  ],
  "rounds": [
    {
      "number": 1,
      "start_time": "0:00",
      "end_time": "${Math.floor(totalDuration / 60)}:${String(Math.round(totalDuration % 60)).padStart(2, '0')}",
      "winner_suggestion": "Combattant ROUGE",
      "key_events": ["Événement clé 1", "Événement clé 2"]
    }
  ],
  "techniques_observed": [
    {
      "technique": "Nom de la technique (ex: Jab, Cross, Low kick, Double leg takedown)",
      "fighter": "Combattant ROUGE ou BLEU",
      "execution": "Bien exécuté / À améliorer / Excellente technique",
      "timestamp_approx": "1:30"
    }
  ],
  "recommendations": {
    "fighter_1": [
      "Conseil d'entraînement spécifique et actionnable 1",
      "Conseil d'entraînement spécifique et actionnable 2",
      "Conseil d'entraînement spécifique et actionnable 3",
      "Exercice recommandé pour corriger la faiblesse identifiée"
    ],
    "fighter_2": [
      "Conseil d'entraînement spécifique et actionnable 1",
      "Conseil d'entraînement spécifique et actionnable 2",
      "Conseil d'entraînement spécifique et actionnable 3",
      "Exercice recommandé pour corriger la faiblesse identifiée"
    ]
  },
  "overall_analysis": "Analyse tactique globale du sparring: qui a dominé, pourquoi, et ce que chaque combattant doit travailler pour progresser. Sois spécifique et technique.",
  "performance_scores": {
    "fighter_1": {
      "overall": 75,
      "striking": 80,
      "grappling": 70,
      "defense": 65,
      "cardio": 85,
      "technique": 78,
      "ring_control": 70,
      "aggression": 75
    },
    "fighter_2": {
      "overall": 72,
      "striking": 75,
      "grappling": 68,
      "defense": 70,
      "cardio": 80,
      "technique": 74,
      "ring_control": 65,
      "aggression": 72
    }
  },
  "body_strike_distribution": {
    "fighter_1": {
      "head": 45,
      "body": 30,
      "legs": 25
    },
    "fighter_2": {
      "head": 50,
      "body": 25,
      "legs": 25
    }
  }
}

INSTRUCTIONS CRITIQUES:
1. Analyse ATTENTIVEMENT chaque image de la séquence
2. Identifie clairement les deux combattants par leur apparence (couleur des gants, shorts, etc.)
3. Estime les statistiques basées sur les positions et mouvements visibles
4. Évalue les techniques utilisées: jabs, crosses, hooks, uppercuts, kicks, knees, elbows, takedowns
5. Note la position défensive, la garde, et le mouvement des combattants
6. Identifie les moments clés (belle combinaison, takedown, position dominante)
7. Les scores de performance doivent être entre 0-100, réalistes basés sur ce que tu observes
8. Extrapole raisonnablement les statistiques basées sur l'activité visible dans les images

RETOURNE UNIQUEMENT LE JSON, SANS MARKDOWN NI TEXTE SUPPLÉMENTAIRE.`;

    // Call Gemini Vision API for multi-frame analysis
    console.log('Calling AI Gateway with frame images...');
    
    const response = await fetch('https://ai-gateway.internal/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LEGACY_AI_GATEWAY_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyse ces ${frames.length} images extraites d'une vidéo de sparring de combat (MMA/boxe/kickboxing).

Les images sont prises toutes les ${Math.round(totalDuration / frames.length)} secondes environ.
Durée totale estimée: ${Math.round(totalDuration)} secondes.

Identifie les deux combattants par leur position/apparence.
Estime les statistiques (coups, takedowns, temps au sol) basées sur les positions visibles.
Évalue la technique, la défense, le cardio de chaque combattant.
Donne des scores de performance réalistes.
Identifie les moments clés du combat avec leurs timestamps approximatifs.
Fournis des recommandations d'entraînement CONCRÈTES et personnalisées.

IMPORTANT: Retourne UNIQUEMENT le JSON, pas de texte autour.`
              },
              ...imageContents
            ]
          }
        ],
        max_tokens: 6000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requêtes atteinte. Réessayez dans quelques minutes.');
      }
      if (response.status === 402) {
        throw new Error('Crédits IA insuffisants. Veuillez recharger votre compte.');
      }
      if (response.status === 413) {
        throw new Error('Données trop volumineuses. Essayez avec moins de frames.');
      }
      throw new Error(`Erreur d'analyse: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('Aucune analyse générée');
    }

    console.log('Raw analysis received, length:', analysisText.length);

    // Try to parse as JSON
    let analysis;
    try {
      // Clean the response - remove markdown code blocks if present
      let jsonStr = analysisText.trim();
      
      // Remove markdown code blocks
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();
      
      analysis = JSON.parse(jsonStr);
      console.log('Analysis parsed successfully');
    } catch (parseError) {
      console.error('Failed to parse analysis as JSON:', parseError);
      console.log('Raw text (first 500 chars):', analysisText.substring(0, 500));
      
      // Create a fallback analysis
      analysis = {
        summary: analysisText.substring(0, 500),
        duration_estimate: `${Math.floor(totalDuration / 60)}:${String(Math.round(totalDuration % 60)).padStart(2, '0')}`,
        duration_seconds: Math.round(totalDuration),
        fighters: [
          {
            identifier: "Combattant 1",
            style: "Non déterminé",
            strengths: ["À analyser"],
            weaknesses: ["À analyser"],
            corner: "red"
          },
          {
            identifier: "Combattant 2", 
            style: "Non déterminé",
            strengths: ["À analyser"],
            weaknesses: ["À analyser"],
            corner: "blue"
          }
        ],
        statistics: {
          fighter_1: {
            punches_thrown: 0,
            punches_landed: 0,
            kicks_thrown: 0,
            kicks_landed: 0,
            takedowns_attempted: 0,
            takedowns_successful: 0,
            submissions_attempted: 0,
            clinch_time_percent: 0,
            ground_time_percent: 0,
            significant_strikes: 0,
            head_strikes: 0,
            body_strikes: 0,
            leg_strikes: 0,
            defense_rate: 0
          },
          fighter_2: {
            punches_thrown: 0,
            punches_landed: 0,
            kicks_thrown: 0,
            kicks_landed: 0,
            takedowns_attempted: 0,
            takedowns_successful: 0,
            submissions_attempted: 0,
            clinch_time_percent: 0,
            ground_time_percent: 0,
            significant_strikes: 0,
            head_strikes: 0,
            body_strikes: 0,
            leg_strikes: 0,
            defense_rate: 0
          }
        },
        key_moments: [],
        rounds: [],
        techniques_observed: [],
        recommendations: {
          fighter_1: ["Analyse manuelle recommandée"],
          fighter_2: ["Analyse manuelle recommandée"]
        },
        overall_analysis: "L'analyse n'a pas pu être générée correctement. Veuillez réessayer avec une vidéo plus claire.",
        performance_scores: {
          fighter_1: {
            overall: 50,
            striking: 50,
            grappling: 50,
            defense: 50,
            cardio: 50,
            technique: 50,
            ring_control: 50,
            aggression: 50
          },
          fighter_2: {
            overall: 50,
            striking: 50,
            grappling: 50,
            defense: 50,
            cardio: 50,
            technique: 50,
            ring_control: 50,
            aggression: 50
          }
        },
        body_strike_distribution: {
          fighter_1: { head: 33, body: 33, legs: 34 },
          fighter_2: { head: 33, body: 33, legs: 34 }
        }
      };
    }

    // Update the database with the analysis
    if (analysisId) {
      const { error: updateError } = await supabase
        .from('sparring_analyses')
        .update({ 
          analysis: analysis,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      if (updateError) {
        console.error('Error updating analysis:', updateError);
      } else {
        console.log('Analysis saved to database');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-sparring:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
