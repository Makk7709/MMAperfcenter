import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    queryFn: async (): Promise<AdminStats> => {
      // Fetch profiles count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('plan, status');

      const activeUsers = subscriptions?.filter(s => s.status === 'active').length || 0;
      const suspendedUsers = subscriptions?.filter(s => s.status === 'suspended').length || 0;
      const trialUsers = subscriptions?.filter(s => s.status === 'trialing').length || 0;

      const subscriptionsByPlan: Record<string, number> = {};
      subscriptions?.forEach(s => {
        subscriptionsByPlan[s.plan] = (subscriptionsByPlan[s.plan] || 0) + 1;
      });

      // Fetch videos stats
      const { data: videos } = await supabase
        .from('training_videos')
        .select('views_count');

      const totalVideos = videos?.length || 0;
      const totalVideoViews = videos?.reduce((sum, v) => sum + (v.views_count || 0), 0) || 0;

      // Recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentSignups } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Recent workouts (last 7 days)
      const { count: recentWorkouts } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      return {
        totalUsers: totalUsers || 0,
        activeUsers,
        suspendedUsers,
        trialUsers,
        subscriptionsByPlan,
        totalVideos,
        totalVideoViews,
        recentSignups: recentSignups || 0,
        recentWorkouts: recentWorkouts || 0,
      };
    },
  });

  return {
    stats,
    isLoading,
  };
};
