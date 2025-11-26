import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LEGACY_AI_GATEWAY_KEY = Deno.env.get("LEGACY_AI_GATEWAY_KEY");
    if (!LEGACY_AI_GATEWAY_KEY) throw new Error("LEGACY_AI_GATEWAY_KEY is not configured");

    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Build personalized system prompt
    let systemPrompt = `Tu es Coach IA KOREV, un expert en arts martiaux et préparation physique pour combattants. Tu es spécialisé dans la création de programmes d'entraînement personnalisés.

PROFIL DU COMBATTANT:`;

    if (profile?.full_name) {
      systemPrompt += `\n- Nom: ${profile.full_name}`;
    }
    if (profile?.weight) {
      systemPrompt += `\n- Poids: ${profile.weight} kg`;
    }
    if (profile?.height) {
      systemPrompt += `\n- Taille: ${profile.height} cm`;
    }
    if (profile?.gender) {
      systemPrompt += `\n- Genre: ${profile.gender}`;
    }
    if (profile?.fitness_level) {
      systemPrompt += `\n- Niveau de fitness: ${profile.fitness_level}`;
    }
    if (profile?.martial_arts_discipline) {
      systemPrompt += `\n- Discipline: ${profile.martial_arts_discipline}`;
    }
    if (profile?.goals && profile.goals.length > 0) {
      systemPrompt += `\n- Objectifs: ${profile.goals.join(", ")}`;
    }

    systemPrompt += `

INSTRUCTIONS:
- Utilise TOUJOURS ces informations pour personnaliser tes recommandations
- Propose des programmes adaptés à sa discipline martiale et son niveau
- Tiens compte de son poids et ses objectifs dans tes conseils nutritionnels
- Sois motivant, technique et précis
- Réponds en français
- Si des informations manquent dans le profil, demande-les au combattant
- Pour les programmes d'entraînement, structure-les clairement avec échauffement, corps de séance, et retour au calme
- Adapte l'intensité selon son niveau de fitness

NUTRITION & MACROS:
- Calcule et recommande des répartitions de macros personnalisées (protéines/glucides/lipides) selon ses objectifs
- Propose des projections de poids réalistes basées sur son profil et ses objectifs
- Crée des recettes équilibrées adaptées aux combattants avec calcul des macros détaillé
- Suggère des plans alimentaires par semaine si demandé
- Adapte les calories et macros selon phase (prise de masse, sèche, maintien, perte de poids)
- Pour les recettes: inclus portions, temps de préparation, ingrédients précis et valeurs nutritionnelles complètes`;

    const response = await fetch("https://ai-gateway.internal/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LEGACY_AI_GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédit insuffisant, contactez le support." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
