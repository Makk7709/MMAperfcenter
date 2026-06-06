import { useState, useEffect } from "react";
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
  member_count?: number;
}

interface MeuteMember {
  id: string;
  meute_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  invited_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface MeuteActivity {
  id: string;
  meute_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface MeuteInvitation {
  id: string;
  meute_id: string;
  status: string;
  meute_name?: string;
}

export const useMeutes = () => {
  const { user } = useAuth();
  const [meutes, setMeutes] = useState<Meute[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<MeuteInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeute, setSelectedMeute] = useState<Meute | null>(null);
  const [meuteMembers, setMeuteMembers] = useState<MeuteMember[]>([]);
  const [meuteActivities, setMeuteActivities] = useState<MeuteActivity[]>([]);

  const loadMeutes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("meutes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeutes(data || []);
    } catch (error) {
      console.error("Error loading meutes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvitations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("meute_members")
        .select(`
          id,
          meute_id,
          status,
          meutes (name)
        `)
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;
      
      const invitations = (data || []).map(inv => ({
        id: inv.id,
        meute_id: inv.meute_id,
        status: inv.status,
        meute_name: (inv.meutes as { name: string } | null)?.name
      }));
      
      setPendingInvitations(invitations);
    } catch (error) {
      console.error("Error loading invitations:", error);
    }
  };

  const loadMeuteMembers = async (meuteId: string) => {
    try {
      const { data, error } = await supabase
        .from("meute_members")
        .select(`
          *,
          profiles:user_id (full_name, email, avatar_url)
        `)
        .eq("meute_id", meuteId)
        .eq("status", "accepted");

      if (error) throw error;
      
      const members = (data || []).map(m => ({
        ...m,
        profile: m.profiles as unknown as MeuteMember["profile"]
      }));
      
      setMeuteMembers(members);
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const loadMeuteActivities = async (meuteId: string) => {
    try {
      const { data, error } = await supabase
        .from("meute_activities")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("meute_id", meuteId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const activities = (data || []).map(a => ({
        ...a,
        profile: a.profiles as unknown as MeuteActivity["profile"]
      }));
      
      setMeuteActivities(activities);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  };

  const createMeute = async (name: string, description?: string) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from("meutes")
        .insert({
          name,
          description,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Meute créée!", { description: `"${name}" est prête` });
      await loadMeutes();
      return data;
    } catch (error) {
      console.error("Error creating meute:", error);
      toast.error("Erreur lors de la création de la meute");
      return null;
    }
  };

  const inviteMember = async (meuteId: string, userEmail: string) => {
    if (!user) return false;
    
    try {
      // Find user by email in profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", userEmail.toLowerCase())
        .single();

      if (profileError || !profileData) {
        toast.error("Utilisateur non trouvé", { description: "Vérifiez l'email" });
        return false;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("meute_members")
        .select("id, status")
        .eq("meute_id", meuteId)
        .eq("user_id", profileData.id)
        .single();

      if (existingMember) {
        if (existingMember.status === "accepted") {
          toast.error("Déjà membre", { description: "Cet utilisateur est déjà dans la meute" });
        } else {
          toast.error("Invitation en attente", { description: "Une invitation a déjà été envoyée" });
        }
        return false;
      }

      const { error } = await supabase
        .from("meute_members")
        .insert({
          meute_id: meuteId,
          user_id: profileData.id,
          invited_by: user.id,
          role: "member",
          status: "pending"
        });

      if (error) throw error;
      
      toast.success("Invitation envoyée!", { description: `${profileData.full_name || userEmail} a été invité` });
      await loadMeuteMembers(meuteId);
      return true;
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Erreur lors de l'invitation");
      return false;
    }
  };

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from("meute_members")
        .update({
          status: accept ? "accepted" : "declined",
          joined_at: accept ? new Date().toISOString() : null
        })
        .eq("id", invitationId);

      if (error) throw error;
      
      toast.success(accept ? "Bienvenue dans la meute!" : "Invitation déclinée");
      await loadPendingInvitations();
      await loadMeutes();
    } catch (error) {
      console.error("Error responding to invitation:", error);
      toast.error("Erreur");
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
      
      toast.success("Vous avez quitté la meute");
      await loadMeutes();
    } catch (error) {
      console.error("Error leaving meute:", error);
      toast.error("Erreur");
    }
  };

  const deleteMeute = async (meuteId: string) => {
    try {
      const { error } = await supabase
        .from("meutes")
        .delete()
        .eq("id", meuteId);

      if (error) throw error;
      
      toast.success("Meute supprimée");
      setSelectedMeute(null);
      await loadMeutes();
    } catch (error) {
      console.error("Error deleting meute:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  useEffect(() => {
    if (user) {
      loadMeutes();
      loadPendingInvitations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedMeute) {
      loadMeuteMembers(selectedMeute.id);
      loadMeuteActivities(selectedMeute.id);
    }
  }, [selectedMeute]);

  return {
    meutes,
    pendingInvitations,
    loading,
    selectedMeute,
    setSelectedMeute,
    meuteMembers,
    meuteActivities,
    createMeute,
    inviteMember,
    respondToInvitation,
    leaveMeute,
    deleteMeute,
    refreshMeutes: loadMeutes
  };
};
