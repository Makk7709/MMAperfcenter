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
            content: `Tu es un expert en analyse de combat et arts martiaux mixtes (MMA). 
Tu vas analyser une vidéo de sparring et fournir une analyse détaillée.

Tu dois retourner un JSON valide avec cette structure exacte:
{
  "summary": "Résumé général du combat en 2-3 phrases",
  "duration_estimate": "Durée estimée du combat",
  "fighters": [
    {
      "identifier": "Combattant 1 (description visuelle: couleur du short, position)",
      "style": "Style de combat observé",
      "strengths": ["Point fort 1", "Point fort 2"],
      "weaknesses": ["Point faible 1", "Point faible 2"]
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
      "ground_time_percent": 0
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
      "ground_time_percent": 0
    }
  },
  "techniques_observed": [
    {
      "technique": "Nom de la technique",
      "fighter": "Combattant 1 ou 2",
      "execution": "Bien exécuté / À améliorer",
      "timestamp_approx": "Moment approximatif"
    }
  ],
  "recommendations": {
    "fighter_1": ["Conseil 1", "Conseil 2", "Conseil 3"],
    "fighter_2": ["Conseil 1", "Conseil 2", "Conseil 3"]
  },
  "overall_analysis": "Analyse globale du sparring avec observations tactiques"
}

Sois précis dans tes estimations et base-toi uniquement sur ce que tu observes dans la vidéo.
Si tu ne peux pas déterminer certaines statistiques avec certitude, indique des estimations raisonnables.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyse cette vidéo de sparring en détail. Identifie les combattants, compte les coups, évalue les techniques et donne des recommandations personnalisées.'
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
        max_tokens: 4000,
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

    console.log('Raw analysis:', analysisText);

    // Try to parse as JSON
    let analysis;
    try {
      // Extract JSON from the response (might be wrapped in markdown code blocks)
      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || 
                        analysisText.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, analysisText];
      const jsonStr = jsonMatch[1] || analysisText;
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse JSON, using raw text:', parseError);
      analysis = {
        summary: analysisText,
        raw_response: true,
        error: 'Could not parse structured analysis'
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
