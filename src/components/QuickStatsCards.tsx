import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  CalendarDays, 
  Flame, 
  Target, 
  TrendingUp, 
  Zap, 
  Trophy 
} from "lucide-react";

export const QuickStatsCards = () => {
  const stats = [
    {
      title: "Calories Brûlées",
      value: "847",
      unit: "kcal",
      target: 1200,
      progress: 70,
      icon: Flame,
      trend: "+12%",
      color: "text-accent"
    },
    {
      title: "Objectif Journalier",
      value: "75",
      unit: "%",
      target: 100,
      progress: 75,
      icon: Target,
      trend: "+5%",
      color: "text-secondary"
    },
    {
      title: "Séances Semaine",
      value: "4",
      unit: "/6",
      target: 6,
      progress: 67,
      icon: CalendarDays,
      trend: "+1",
      color: "text-primary"
    },
    {
      title: "Streak Actuel",
      value: "12",
      unit: "jours",
      target: 30,
      progress: 40,
      icon: Trophy,
      trend: "+1",
      color: "text-accent"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={index}
            className="bg-gradient-card hover:shadow-card transition-all duration-300 hover:scale-105 border-0"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-primary/10 ${stat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {stat.value}
                </span>
                <span className="text-sm text-muted-foreground">
                  {stat.unit}
                </span>
                <div className="ml-auto flex items-center gap-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-accent" />
                  <span className="text-accent font-medium">{stat.trend}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Progress 
                  value={stat.progress} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {stat.progress}% de l'objectif
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};