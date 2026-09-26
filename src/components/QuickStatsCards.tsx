import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Flame, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNutrition } from "@/hooks/useNutrition";
import { useTrainingProgress } from "@/hooks/useTraining";
import { startOfDayDaysAgo, toDateKey } from "@/lib/dateKey";

// Built on the shared queries so the cards refresh as soon as a food is logged
// or a session is finished, without reloading the page.
export const QuickStatsCards = () => {
  const navigate = useNavigate();
  const { data: progress, isLoading: progressLoading } = useTrainingProgress();
  const { week, isLoading: nutritionLoading } = useNutrition(toDateKey());

  const stats = useMemo(() => {
    const since = new Date(startOfDayDaysAgo(6)).getTime();
    const recent = (progress?.sessions ?? []).filter((s) => new Date(s.completed_at).getTime() >= since);
    const totalVolume = recent.reduce((sum, s) => sum + (Number(s.total_volume_kg) || 0), 0);
    const totalTime = recent.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0);
    return {
      workoutsThisWeek: recent.length,
      totalVolume: Math.round(totalVolume),
      caloriesConsumed: Math.round(week.reduce((sum, d) => sum + d.calories, 0)),
      avgWorkoutTime: recent.length > 0 ? Math.round(totalTime / recent.length) : 0,
    };
  }, [progress, week]);

  const header = (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">Vue d'ensemble</h2>
      <Button variant="outline" size="sm" onClick={() => navigate("/statistics")}>
        Voir les détails
      </Button>
    </div>
  );

  if (progressLoading || nutritionLoading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-busy="true">
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
      title: "Cette semaine",
      value: stats.workoutsThisWeek.toString(),
      unit: stats.workoutsThisWeek > 1 ? "séances" : "séance",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-gradient-primary",
      trend: "7 derniers jours"
    },
    {
      title: "Volume total",
      value: stats.totalVolume.toLocaleString("fr-FR"),
      unit: "kg",
      icon: Target,
      color: "text-secondary",
      bgColor: "bg-gradient-secondary",
      trend: "7 derniers jours"
    },
    {
      title: "Calories",
      value: stats.caloriesConsumed.toLocaleString("fr-FR"),
      unit: "kcal",
      icon: Flame,
      color: "text-accent",
      bgColor: "bg-accent/10",
      trend: "7 derniers jours"
    },
    {
      title: "Durée moy.",
      value: stats.avgWorkoutTime.toString(),
      unit: "min",
      icon: Clock,
      color: "text-foreground",
      bgColor: "bg-muted",
      trend: "Par séance"
    }
  ];

  return (
    <div className="space-y-4">
      {header}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="liquid-glass-solid border-0 hover:shadow-card-hover transition-all duration-300 group"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 ${stat.bgColor} rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} aria-hidden />
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
