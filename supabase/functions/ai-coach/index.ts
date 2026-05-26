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
    
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Extract the JWT token from the Authorization header
    const token = authHeader.replace("Bearer ", "");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use service role key to verify the user token
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("User not authenticated:", authError?.message);
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("User authenticated:", user.id);

    // ===== Feature gating (server-side enforcement) =====
    // Admin/coach bypass
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: isCoach } = await supabase.rpc("has_role", { _user_id: user.id, _role: "coach" });
    const privileged = isAdmin === true || isCoach === true;

    if (!privileged) {
      const { data: allowed, error: gateErr } = await supabase.rpc("has_feature_access", {
        _user_id: user.id,
        _feature: "ai_coach",
      });
      if (gateErr) console.error("has_feature_access error:", gateErr);
      if (allowed !== true) {
        return new Response(
          JSON.stringify({ error: "Limite mensuelle atteinte pour Coach IA. Passe au plan Pro pour un accès illimité.", code: "FEATURE_LIMIT_REACHED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await supabase.rpc("increment_feature_usage", { _user_id: user.id, _feature_name: "ai_coach" });
    }



    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Build personalized system prompt
    let systemPrompt = `Tu es Coach IA KOREV, un expert en arts martiaux et préparation physique pour combattants. Tu es spécialisé dans la création de programmes d'entraînement personnalisés.

PROFIL DU COMBATTANT:`;

    const p: any = profile || {};
    const add = (label: string, value: any) => {
      if (value === null || value === undefined || value === "") return;
      if (Array.isArray(value) && value.length === 0) return;
      systemPrompt += `\n- ${label}: ${Array.isArray(value) ? value.join(", ") : value}`;
    };

    // Identité
    add("Nom", p.full_name);
    add("Âge", p.age ? `${p.age} ans` : null);
    add("Genre", p.gender);
    add("Latéralité", p.handedness);

    // Physique
    add("Poids", p.weight ? `${p.weight} kg` : null);
    add("Taille", p.height ? `${p.height} cm` : null);
    add("Masse grasse", p.body_fat_percent ? `${p.body_fat_percent}%` : null);
    add("Tour de taille", p.waist_cm ? `${p.waist_cm} cm` : null);
    add("Morphotype", p.morphotype);
    add("Blessures / limitations", p.injuries);

    // Expérience martiale
    add("Discipline principale", p.martial_arts_discipline);
    add("Disciplines secondaires", p.secondary_disciplines);
    add("Niveau global", p.fitness_level);
    add("Années de pratique", p.years_practice);
    add("Grade / ceinture", p.belt_rank);
    add("Niveau compétition", p.competition_level);
    add("Nombre de combats", p.competitions_count);

    // Objectifs
    add("Objectifs", p.goals);
    add("Objectif principal", p.primary_goal);
    add("Échéance objectif", p.goal_deadline);
    add("Événement cible", p.target_event);

    // Lifestyle
    add("Sommeil moyen", p.sleep_hours ? `${p.sleep_hours} h/nuit` : null);
    add("Niveau de stress", p.stress_level ? `${p.stress_level}/10` : null);
    add("Disponibilité", p.weekly_availability ? `${p.weekly_availability} séances/semaine` : null);
    add("Durée préférée d'une séance", p.preferred_session_duration ? `${p.preferred_session_duration} min` : null);
    add("Lieu d'entraînement", p.training_location);
    add("Équipement disponible", p.equipment);
    add("Restrictions alimentaires", p.dietary_restrictions);

    systemPrompt += `

INSTRUCTIONS:
- Utilise TOUJOURS ces informations pour personnaliser tes recommandations
- Propose des programmes adaptés à sa discipline martiale, son niveau ET son âge
- Tiens compte de son poids, âge et objectifs dans tes conseils nutritionnels
- Adapte l'intensité et le volume d'entraînement selon l'âge du combattant
- Sois motivant, technique et précis
- Réponds en français
- Si des informations manquent dans le profil, demande-les au combattant
- Pour les programmes d'entraînement, structure-les clairement avec échauffement, corps de séance, et retour au calme
- Adapte l'intensité selon son niveau de fitness et son âge

NUTRITION & MACROS:
- Calcule et recommande des répartitions de macros personnalisées (protéines/glucides/lipides) selon ses objectifs et son âge
- Utilise l'âge pour calculer le métabolisme basal et les besoins caloriques journaliers
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
