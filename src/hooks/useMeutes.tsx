import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Meute {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  avatar_url: string | null;
  created_at: string;
}

// Team data comes from server functions: profiles are private, so only a
// display name (never an e-mail) is shared with teammates.
export interface MeuteMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface MeuteActivity {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
  display_name: string | null;
}

interface MeuteInvitation {
  id: string;
  meute_id: string;
  meute_name: string;
  invited_by_name: string | null;
}

const INVITE_RESULTS: Record<string, { ok: boolean; title: string; description?: string }> = {
  sent: {
    ok: true,
    title: "Invitation envoyée",
    description: "Si un compte KOREV existe avec cette adresse, la personne la verra dans sa Team.",
  },
  already_member: { ok: false, title: "Déjà membre", description: "Cette personne fait déjà partie de la team." },
  too_many_pending: {
    ok: false,
    title: "Trop d'invitations en attente",
    description: "Attendez que certaines invitations soient acceptées ou refusées.",
  },
  rate_limited: {
    ok: false,
    title: "Limite d'invitations atteinte",
    description: "Vous pourrez inviter de nouveaux membres demain.",
  },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useMeutes = () => {
  const { user } = useAuth();
  const [meutes, setMeutes] = useState<Meute[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<MeuteInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedMeute, setSelectedMeute] = useState<Meute | null>(null);
  const [meuteMembers, setMeuteMembers] = useState<MeuteMember[]>([]);
  const [meuteActivities, setMeuteActivities] = useState<MeuteActivity[]>([]);

  const loadMeutes = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("meutes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMeutes(data || []);
      setLoadError(false);
    } catch (error) {
      console.error("Error loading teams:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadPendingInvitations = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("get_my_team_invitations");
    if (error) {
      console.error("Error loading invitations:", error);
      return;
    }
    setPendingInvitations(data || []);
  }, [user]);

  const loadMeuteDetails = useCallback(async (meuteId: string) => {
    const [members, activities] = await Promise.all([
      supabase.rpc("get_team_members", { _meute_id: meuteId }),
      supabase.rpc("get_team_activities", { _meute_id: meuteId, _limit: 20 }),
    ]);
    if (members.error) console.error("Error loading members:", members.error);
    else setMeuteMembers(members.data || []);
    if (activities.error) console.error("Error loading activities:", activities.error);
    else setMeuteActivities(activities.data || []);
  }, []);

  const createMeute = async (name: string, description?: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("meutes")
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          owner_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      toast.success("Team créée !", { description: `"${name.trim()}" est prête` });
      await loadMeutes();
      return data;
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error("Erreur lors de la création de la team");
      return null;
    }
  };

  const inviteMember = async (meuteId: string, userEmail: string) => {
    if (!user) return false;
    const email = userEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      toast.error("Adresse e-mail invalide");
      return false;
    }

    const { data, error } = await supabase.rpc("invite_team_member", { _meute_id: meuteId, _email: email });
    if (error) {
      console.error("Error inviting member:", error);
      toast.error("Erreur lors de l'invitation");
      return false;
    }
    const result = INVITE_RESULTS[data] ?? INVITE_RESULTS.sent;
    if (result.ok) toast.success(result.title, { description: result.description });
    else toast.error(result.title, { description: result.description });
    return result.ok;
  };

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from("meute_members")
        .update({
          status: accept ? "accepted" : "declined",
          joined_at: accept ? new Date().toISOString() : null,
        })
        .eq("id", invitationId);
      if (error) throw error;

      toast.success(accept ? "Bienvenue dans la team !" : "Invitation déclinée");
      await Promise.all([loadPendingInvitations(), loadMeutes()]);
    } catch (error) {
      console.error("Error responding to invitation:", error);
      toast.error("Impossible de répondre à l'invitation");
    }
  };

  const leaveMeute = async (meuteId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("meute_members")
        .delete()
        .eq("meute_id", meuteId)
        .eq("user_id", user.id);
      if (error) throw error;

      toast.success("Vous avez quitté la team");
      setSelectedMeute(null);
      await loadMeutes();
    } catch (error) {
      console.error("Error leaving team:", error);
      toast.error("Impossible de quitter la team");
    }
  };

  const deleteMeute = async (meuteId: string) => {
    try {
      const { error } = await supabase.from("meutes").delete().eq("id", meuteId);
      if (error) throw error;

      toast.success("Team supprimée");
      setSelectedMeute(null);
      await loadMeutes();
    } catch (error) {
      console.error("Error deleting team:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  useEffect(() => {
    if (user) {
      loadMeutes();
      loadPendingInvitations();
    }
  }, [user, loadMeutes, loadPendingInvitations]);

  useEffect(() => {
    setMeuteMembers([]);
    setMeuteActivities([]);
    if (selectedMeute) loadMeuteDetails(selectedMeute.id);
  }, [selectedMeute, loadMeuteDetails]);

  return {
    meutes,
    pendingInvitations,
    loading,
    loadError,
    selectedMeute,
    setSelectedMeute,
    meuteMembers,
    meuteActivities,
    createMeute,
    inviteMember,
    respondToInvitation,
    leaveMeute,
    deleteMeute,
    refreshMeutes: loadMeutes,
  };
};
