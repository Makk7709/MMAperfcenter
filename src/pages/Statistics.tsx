import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AIStatsAnalysis } from "@/components/AIStatsAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Flame } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface WorkoutDayStat {
  date: string;
  duration: number;
  volume: number;
  calories: number;
  count: number;
}

interface NutritionDayStat {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function Statistics() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workoutStats, setWorkoutStats] = useState<WorkoutDayStat[]>([]);
  const [nutritionStats, setNutritionStats] = useState<NutritionDayStat[]>([]);
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Fighter';

  const handleSignOut = async () => {
    await signOut();
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadStatistics();
  }, [user, navigate]);

  const loadStatistics = async () => {
    if (!user) return;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return date.toISOString().split('T')[0];
    });

    // Load workout stats
    const { data: workouts } = await supabase
      .from('workouts')
      .select('completed_at, duration_minutes, total_volume_kg, calories_burned')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', subDays(new Date(), 6).toISOString())
      .order('completed_at', { ascending: true });

    // Group by day
    const workoutByDay = last7Days.map(date => {
      const dayWorkouts = workouts?.filter(w => 
        w.completed_at?.startsWith(date)
      ) || [];
      
      return {
        date: format(new Date(date), 'EEE', { locale: fr }),
        duration: dayWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0),
        volume: dayWorkouts.reduce((sum, w) => sum + (w.total_volume_kg || 0), 0),
        calories: dayWorkouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0),
        count: dayWorkouts.length
      };
    });

    setWorkoutStats(workoutByDay);

    // Load nutrition stats
    const { data: nutrition } = await supabase
      .from('nutrition_logs')
      .select('date, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .gte('date', subDays(new Date(), 6).toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Group by day
    const nutritionByDay = last7Days.map(date => {
      const dayNutrition = nutrition?.filter(n => n.date === date) || [];
      
      return {
        date: format(new Date(date), 'EEE', { locale: fr }),
        calories: dayNutrition.reduce((sum, n) => sum + (n.calories || 0), 0),
        protein: dayNutrition.reduce((sum, n) => sum + Number(n.protein_g || 0), 0),
        carbs: dayNutrition.reduce((sum, n) => sum + Number(n.carbs_g || 0), 0),
        fat: dayNutrition.reduce((sum, n) => sum + Number(n.fat_g || 0), 0),
      };
    });

    setNutritionStats(nutritionByDay);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader userName={userName} isPremium={true} onSignOut={handleSignOut} />
        <div className="max-w-4xl mx-auto p-4">
          <p className="text-center text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Calculate weekly totals
  const weeklyWorkoutTotal = workoutStats.reduce((sum, day) => sum + day.duration, 0);
  const weeklyVolumeTotal = workoutStats.reduce((sum, day) => sum + day.volume, 0);
  const weeklyCaloriesTotal = workoutStats.reduce((sum, day) => sum + day.calories, 0);
  const totalWorkouts = workoutStats.reduce((sum, day) => sum + day.count, 0);

  const avgCalories = Math.round(
    nutritionStats.reduce((sum, day) => sum + day.calories, 0) / 7
  );
  const avgProtein = Math.round(
    nutritionStats.reduce((sum, day) => sum + day.protein, 0) / 7
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName={userName} isPremium={true} onSignOut={handleSignOut} />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold">Statistiques & Progression</h1>
          <p className="text-muted-foreground mt-2">Analyse de vos performances sur 7 jours</p>
        </div>

        {/* AI Analysis Section */}
        <AIStatsAnalysis />

        {/* Weekly Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="liquid-glass-solid border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Entraînements</p>
              <p className="text-2xl font-bold text-primary">{totalWorkouts}</p>
            </CardContent>
          </Card>
          
          <Card className="liquid-glass-solid border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Temps Total</p>
              <p className="text-2xl font-bold text-secondary">{weeklyWorkoutTotal} min</p>
            </CardContent>
          </Card>
          
          <Card className="liquid-glass-solid border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Volume</p>
              <p className="text-2xl font-bold text-accent">{weeklyVolumeTotal.toFixed(0)} kg</p>
            </CardContent>
          </Card>
          
          <Card className="liquid-glass-solid border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Calories</p>
              <p className="text-2xl font-bold text-foreground">{weeklyCaloriesTotal}</p>
            </CardContent>
          </Card>
        </div>

        {/* Workout Charts */}
        <Card className="liquid-glass-solid border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Progression Entraînements (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workoutStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="duration" fill="hsl(var(--primary))" name="Durée (min)" />
                <Bar dataKey="volume" fill="hsl(var(--secondary))" name="Volume (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Nutrition Charts */}
        <Card className="liquid-glass-solid border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              Nutrition (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Calories moy./jour</p>
                <p className="text-2xl font-bold text-primary">{avgCalories}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Protéines moy./jour</p>
                <p className="text-2xl font-bold text-secondary">{avgProtein}g</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={nutritionStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Calories"
                />
                <Line 
                  type="monotone" 
                  dataKey="protein" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Protéines (g)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
