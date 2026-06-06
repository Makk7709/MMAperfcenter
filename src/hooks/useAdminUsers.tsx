import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Enums } from "@/integrations/supabase/types";

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  fitness_level: string | null;
  created_at: string;
  subscription?: {
    plan: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean | null;
  };
  roles: string[];
  is_suspended?: boolean;
}

export const useAdminUsers = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*');

      if (subsError) throw subsError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Map data together
      const usersWithDetails: AdminUser[] = profiles.map(profile => {
        const userSub = subscriptions?.find(s => s.user_id === profile.id);
        const userRoles = roles?.filter(r => r.user_id === profile.id).map(r => r.role) || [];
        
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          fitness_level: profile.fitness_level,
          created_at: profile.created_at,
          subscription: userSub ? {
            plan: userSub.plan,
            status: userSub.status,
            current_period_end: userSub.current_period_end,
            cancel_at_period_end: userSub.cancel_at_period_end,
          } : undefined,
          roles: userRoles,
          is_suspended: userSub?.status === 'suspended',
        };
      });

      return usersWithDetails;
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<{ full_name: string; email: string; fitness_level: string }> }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Utilisateur mis à jour");
    },
    onError: (error) => {
      console.error('Update user error:', error);
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: suspend ? 'suspended' : 'active' })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { suspend }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(suspend ? "Compte suspendu" : "Compte réactivé");
    },
    onError: (error) => {
      console.error('Suspend user error:', error);
      toast.error("Erreur lors de l'opération");
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ plan: plan as Enums<"subscription_plan"> })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Abonnement mis à jour");
    },
    onError: (error) => {
      console.error('Update subscription error:', error);
      toast.error("Erreur lors de la mise à jour de l'abonnement");
    },
  });

  return {
    users,
    isLoading,
    updateUser: updateUserMutation.mutate,
    suspendUser: suspendUserMutation.mutate,
    updateSubscription: updateSubscriptionMutation.mutate,
    isUpdating: updateUserMutation.isPending,
    isSuspending: suspendUserMutation.isPending,
  };
};
