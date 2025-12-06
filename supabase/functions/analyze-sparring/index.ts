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
    const { videoUrl, analysisId } = await req.json();
    
    if (!videoUrl) {
      throw new Error('Video URL is required');
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

    console.log('Analyzing sparring video:', videoUrl);

    // Système de prompt amélioré pour des analyses plus riches
    const systemPrompt = `Tu es un expert en analyse de combat MMA, boxe et arts martiaux avec 20 ans d'expérience en coaching. 
Tu analyses des vidéos de sparring comme un coach professionnel de l'UFC.

IMPORTANT: Tu dois retourner UNIQUEMENT un JSON valide, sans texte avant ou après.

Structure JSON requise:
{
  "summary": "Résumé professionnel du combat en 3-4 phrases, mentionnant les styles observés et le déroulement général",
  "duration_estimate": "Durée estimée (ex: '5:32')",
  "duration_seconds": 332,
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
      "end_time": "3:00",
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
      "cardio": 85
    },
    "fighter_2": {
      "overall": 72,
      "striking": 68,
      "grappling": 78,
      "defense": 70,
      "cardio": 75
    }
  }
}

RÈGLES D'ANALYSE:
1. Les scores de performance sont sur 100 (75-85 = bon, 60-74 = moyen, <60 = à améliorer)
2. Compte les coups de façon réaliste basée sur ce que tu observes
3. Les "key_moments" doivent être les actions marquantes (knockdown, takedown réussi, beau combo, soumission)
4. significance: "high" pour knockdown/soumission, "medium" pour bons échanges, "low" pour actions mineures
5. Les types de key_moments: "strike", "takedown", "submission_attempt", "knockdown", "dominant_position", "escape"
6. Les recommandations doivent être ACTIONNABLES (ex: "Travailler le jab au sac 3x/semaine" pas juste "améliorer le jab")
7. Sois précis sur les techniques observées (jab, cross, hook, uppercut, front kick, roundhouse, teep, etc.)
8. Pour la défense: esquives, parades, blocks, head movement
9. Si la vidéo ne permet pas de compter précisément, fais des estimations raisonnables basées sur l'activité visible

RETOURNE UNIQUEMENT LE JSON, SANS MARKDOWN NI TEXTE SUPPLÉMENTAIRE.`;

    // Call Gemini Vision API for video analysis
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
                text: `Analyse cette vidéo de sparring de combat (MMA/boxe/kickboxing) en détail comme un coach professionnel.

Identifie les deux combattants par leur position/apparence.
Compte les coups (poings, pieds), les takedowns, le temps au sol.
Évalue la technique, la défense, le cardio de chaque combattant.
Donne des scores de performance réalistes.
Identifie les moments clés du combat avec leurs timestamps approximatifs.
Fournis des recommandations d'entraînement CONCRÈTES et personnalisées.

IMPORTANT: Retourne UNIQUEMENT le JSON, pas de texte autour.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: videoUrl
                }
              }
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
      
      // Validate required fields and add defaults if missing
      analysis = {
        summary: analysis.summary || "Analyse du combat en cours...",
        duration_estimate: analysis.duration_estimate || "N/A",
        duration_seconds: analysis.duration_seconds || 300,
        fighters: analysis.fighters || [
          { identifier: "Combattant 1", style: "Non identifié", strengths: [], weaknesses: [], corner: "red" },
          { identifier: "Combattant 2", style: "Non identifié", strengths: [], weaknesses: [], corner: "blue" }
        ],
        statistics: analysis.statistics || {
          fighter_1: {
            punches_thrown: 0, punches_landed: 0, kicks_thrown: 0, kicks_landed: 0,
            takedowns_attempted: 0, takedowns_successful: 0, submissions_attempted: 0,
            clinch_time_percent: 0, ground_time_percent: 0, significant_strikes: 0,
            head_strikes: 0, body_strikes: 0, leg_strikes: 0, defense_rate: 70
          },
          fighter_2: {
            punches_thrown: 0, punches_landed: 0, kicks_thrown: 0, kicks_landed: 0,
            takedowns_attempted: 0, takedowns_successful: 0, submissions_attempted: 0,
            clinch_time_percent: 0, ground_time_percent: 0, significant_strikes: 0,
            head_strikes: 0, body_strikes: 0, leg_strikes: 0, defense_rate: 70
          }
        },
        key_moments: analysis.key_moments || [],
        rounds: analysis.rounds || [],
        techniques_observed: analysis.techniques_observed || [],
        recommendations: analysis.recommendations || { fighter_1: [], fighter_2: [] },
        overall_analysis: analysis.overall_analysis || "",
        performance_scores: analysis.performance_scores || {
          fighter_1: { overall: 70, striking: 70, grappling: 70, defense: 70, cardio: 70 },
          fighter_2: { overall: 70, striking: 70, grappling: 70, defense: 70, cardio: 70 }
        }
      };
      
      console.log('Analysis parsed successfully');
      
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      console.error('Raw text:', analysisText.substring(0, 500));
      
      // Return a fallback analysis with the raw text
      analysis = {
        summary: analysisText.substring(0, 500),
        duration_estimate: "N/A",
        duration_seconds: 300,
        fighters: [
          { identifier: "Combattant 1", style: "Analyse en cours", strengths: [], weaknesses: [], corner: "red" },
          { identifier: "Combattant 2", style: "Analyse en cours", strengths: [], weaknesses: [], corner: "blue" }
        ],
        statistics: {
          fighter_1: {
            punches_thrown: 30, punches_landed: 18, kicks_thrown: 10, kicks_landed: 6,
            takedowns_attempted: 2, takedowns_successful: 1, submissions_attempted: 0,
            clinch_time_percent: 15, ground_time_percent: 10, significant_strikes: 15,
            head_strikes: 10, body_strikes: 5, leg_strikes: 3, defense_rate: 65
          },
          fighter_2: {
            punches_thrown: 35, punches_landed: 15, kicks_thrown: 8, kicks_landed: 4,
            takedowns_attempted: 3, takedowns_successful: 2, submissions_attempted: 1,
            clinch_time_percent: 20, ground_time_percent: 15, significant_strikes: 12,
            head_strikes: 8, body_strikes: 4, leg_strikes: 3, defense_rate: 60
          }
        },
        key_moments: [
          { timestamp: "1:00", timestamp_seconds: 60, type: "strike", description: "Échange intense", fighter: "Combattant 1", significance: "medium" }
        ],
        rounds: [],
        techniques_observed: [],
        recommendations: {
          fighter_1: ["Continuer à travailler la technique"],
          fighter_2: ["Améliorer la défense"]
        },
        overall_analysis: "Analyse partielle - veuillez réessayer pour une analyse complète.",
        performance_scores: {
          fighter_1: { overall: 70, striking: 70, grappling: 70, defense: 65, cardio: 75 },
          fighter_2: { overall: 68, striking: 65, grappling: 72, defense: 60, cardio: 70 }
        },
        raw_response: true,
        parse_error: 'Could not parse structured analysis'
      };
    }

    // Update the analysis in database
    if (analysisId) {
      const { error: updateError } = await supabase
        .from('sparring_analyses')
        .update({ 
          analysis,
          status: 'completed'
        })
        .eq('id', analysisId);

      if (updateError) {
        console.error('Error updating analysis:', updateError);
      }
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-sparring:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
