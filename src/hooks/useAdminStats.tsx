import { useQuery } from "@tanstack/react-query";
import { invokeAdmin } from "@/lib/adminApi";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  trialUsers: number;
  subscriptionsByPlan: Record<string, number>;
  totalVideos: number;
  totalVideoViews: number;
  recentSignups: number;
  recentWorkouts: number;
}

export const useAdminStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await invokeAdmin<{ stats: AdminStats }>('stats')).stats,
  });

  return {
    stats,
    isLoading,
  };
};
