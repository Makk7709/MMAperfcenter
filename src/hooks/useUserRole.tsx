import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = 'admin' | 'coach' | 'user';

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return data?.map(r => r.role as AppRole) || [];
    },
    enabled: !!user,
  });

  const isAdmin = roles?.includes('admin') ?? false;
  const isCoach = roles?.includes('coach') ?? false;
  const hasAdminAccess = isAdmin || isCoach;

  return {
    roles: roles ?? [],
    isAdmin,
    isCoach,
    hasAdminAccess,
    isLoading,
  };
};
