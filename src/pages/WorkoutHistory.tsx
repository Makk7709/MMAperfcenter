import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SparringPDFExport } from "@/components/sparring/SparringPDFExport";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, Dumbbell, Swords, Trophy, FileText } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface HistoricalWorkout {
  id: string;
  name: string;
  started_at: string;
  completed_at: string;
  duration_minutes: number;
  total_volume_kg: number;
  calories_burned: number;
  workout_exercises: {
    exercise: {
      name: string;
    };
    sets: {
      weight_kg: number;
      reps: number;
      completed: boolean;
    }[];
  }[];
}

interface SparringAnalysisRow {
  id: string;
  video_name: string;
  video_url: string;
  created_at: string;
  status: string;
  analysis: any;
}

export default function WorkoutHistory() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<HistoricalWorkout[]>([]);
  const [sparrings, setSparrings] = useState<SparringAnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSparring, setSelectedSparring] = useState<SparringAnalysisRow | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Fighter';

  const handleSignOut = async () => {
    await signOut();
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadWorkoutHistory = async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select(`
          *,
          workout_exercises (
            exercise:exercises (name),
            sets (weight_kg, reps, completed)
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading workout history:", error);
        return;
      }

      setWorkouts(data as HistoricalWorkout[]);
      setLoading(false);
    };

    loadWorkoutHistory();
  }, [user, navigate]);

  const calculateStats = () => {
    const totalWorkouts = workouts.length;
    const totalVolume = workouts.reduce((sum, w) => sum + (w.total_volume_kg || 0), 0);
    const totalTime = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
    const avgDuration = totalWorkouts > 0 ? Math.round(totalTime / totalWorkouts) : 0;

    return { totalWorkouts, totalVolume, totalTime, avgDuration };
  };

  const stats = calculateStats();

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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName={userName} isPremium={true} onSignOut={handleSignOut} />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold">Historique des Entraînements</h1>
          <p className="text-muted-foreground mt-2">Suivez vos progrès et performances</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="liquid-glass-solid border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Entraînements</p>
              <p className="text-2xl font-bold text-primary">{stats.totalWorkouts}</p>
            </CardContent>
          </Card>
          
          <Card className="liquid-glass-solid border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Volume Total</p>
              <p className="text-2xl font-bold text-secondary">{stats.totalVolume.toFixed(0)} kg</p>
            </CardContent>
          </Card>
          
          <Card className="liquid-glass-solid border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Temps Total</p>
              <p className="text-2xl font-bold text-accent">{stats.totalTime} min</p>
            </CardContent>
          </Card>
          
          <Card className="liquid-glass-solid border-0">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Durée Moy.</p>
              <p className="text-2xl font-bold text-foreground">{stats.avgDuration} min</p>
            </CardContent>
          </Card>
        </div>

        {/* Workout List */}
        {workouts.length === 0 ? (
          <Card className="liquid-glass-solid border-0">
            <CardContent className="p-8 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun entraînement terminé pour le moment.</p>
              <Button className="mt-4" onClick={() => navigate("/")}>
                Commencer un entraînement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => {
              const totalSets = workout.workout_exercises.reduce(
                (sum, we) => sum + we.sets.filter(s => s.completed).length,
                0
              );

              return (
                <Card key={workout.id} className="liquid-glass-solid border-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg mb-2">{workout.name}</CardTitle>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(workout.completed_at), "dd MMM yyyy", { locale: fr })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {workout.duration_minutes} min
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-accent/10">
                        {totalSets} séries
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="font-bold text-secondary">
                          {workout.total_volume_kg.toFixed(0)} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Calories</p>
                        <p className="font-bold text-accent">
                          {workout.calories_burned} kcal
                        </p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium mb-2">Exercices :</p>
                      <div className="flex flex-wrap gap-2">
                        {workout.workout_exercises.map((we, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {we.exercise.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
