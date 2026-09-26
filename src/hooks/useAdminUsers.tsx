import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invokeAdmin } from "@/lib/adminApi";

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
    stripe_managed: boolean;
  };
  roles: string[];
  is_suspended?: boolean;
}

export const useAdminUsers = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await invokeAdmin<{ users: AdminUser[] }>('list')).users,
  });

  const onMutationSuccess = (message: string) => () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    toast.success(message);
  };
  const onMutationError = (error: unknown) => {
    toast.error(error instanceof Error ? error.message : "Erreur lors de l'opération");
  };

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Partial<{ full_name: string; fitness_level: string }> }) =>
      invokeAdmin('update_profile', { userId, ...updates }),
    onSuccess: onMutationSuccess("Utilisateur mis à jour"),
    onError: onMutationError,
  });

  const suspendUserMutation = useMutation({
    mutationFn: ({ userId, suspend }: { userId: string; suspend: boolean }) =>
      invokeAdmin('suspend', { userId, suspend }),
    onSuccess: (_, { suspend }) =>
      onMutationSuccess(suspend ? "Compte suspendu" : "Compte réactivé")(),
    onError: onMutationError,
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ userId, plan }: { userId: string; plan: string }) =>
      invokeAdmin('set_plan', { userId, plan }),
    onSuccess: onMutationSuccess("Abonnement mis à jour"),
    onError: onMutationError,
  });

  return {
    users,
    isLoading,
    error,
    updateUser: updateUserMutation.mutate,
    suspendUser: suspendUserMutation.mutate,
    updateSubscription: updateSubscriptionMutation.mutate,
    isUpdating: updateUserMutation.isPending,
    isSuspending: suspendUserMutation.isPending,
  };
};
