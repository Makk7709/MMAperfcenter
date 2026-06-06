import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Flame, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subDays } from "date-fns";

export const QuickStatsCards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    workoutsThisWeek: 0,
    totalVolume: 0,
    caloriesConsumed: 0,
    avgWorkoutTime: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      const weekAgo = subDays(new Date(), 7).toISOString();

      // Load workout stats
      const { data: workouts } = await supabase
        .from('workouts')
        .select('duration_minutes, total_volume_kg')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', weekAgo);

      // Load nutrition stats
      const { data: nutrition } = await supabase
        .from('nutrition_logs')
        .select('calories')
        .eq('user_id', user.id)
        .gte('date', subDays(new Date(), 7).toISOString().split('T')[0]);

      const workoutCount = workouts?.length || 0;
      const totalVolume = workouts?.reduce((sum, w) => sum + (w.total_volume_kg || 0), 0) || 0;
      const totalTime = workouts?.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) || 0;
      const avgTime = workoutCount > 0 ? Math.round(totalTime / workoutCount) : 0;
      const totalCalories = nutrition?.reduce((sum, n) => sum + (n.calories || 0), 0) || 0;

      setStats({
        workoutsThisWeek: workoutCount,
        totalVolume: Math.round(totalVolume),
        caloriesConsumed: totalCalories,
        avgWorkoutTime: avgTime
      });
      setLoading(false);
    };

    loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Vue d'ensemble</h2>
          <Button variant="outline" size="sm" onClick={() => navigate("/statistics")}>
            Voir Détails
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="liquid-glass-solid border-0 animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statsData = [
    {
      title: "Cette Semaine",
      value: stats.workoutsThisWeek.toString(),
      unit: "workouts",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-gradient-primary",
      trend: "7 derniers jours"
    },
    {
      title: "Volume Total",
      value: stats.totalVolume.toString(),
      unit: "kg",
      icon: Target,
      color: "text-secondary",
      bgColor: "bg-gradient-secondary",
      trend: "Cette semaine"
    },
    {
      title: "Calories",
      value: stats.caloriesConsumed.toString(),
      unit: "kcal",
      icon: Flame,
      color: "text-accent",
      bgColor: "bg-accent/10",
      trend: "7 derniers jours"
    },
    {
      title: "Durée Moy.",
      value: stats.avgWorkoutTime.toString(),
      unit: "min",
      icon: Clock,
      color: "text-foreground",
      bgColor: "bg-muted",
      trend: "Par session"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Vue d'ensemble</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/statistics")}
        >
          Voir Détails
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="liquid-glass-solid border-0 hover:shadow-card-hover transition-all duration-300 cursor-pointer group"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 ${stat.bgColor} rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{stat.value}</span>
                    <span className="text-xs text-muted-foreground">{stat.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.trend}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};