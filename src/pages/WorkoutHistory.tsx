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
import { Calendar, Clock, Dumbbell, Swords, Trophy, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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

  const handleResetWorkouts = async () => {
    if (!user) return;
    const { error } = await supabase.from("workouts").delete().eq("user_id", user.id);
    if (error) {
      toast.error("Erreur lors de la réinitialisation");
      return;
    }
    setWorkouts([]);
    toast.success("Historique des entraînements réinitialisé");
  };

  const handleDeleteSparring = async (id: string) => {
    const { error } = await supabase.from("sparring_analyses").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    setSparrings((prev) => prev.filter((s) => s.id !== id));
    if (selectedSparring?.id === id) setSelectedSparring(null);
    toast.success("Analyse supprimée");
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadHistory = async () => {
      const [workoutsRes, sparringRes] = await Promise.all([
        supabase
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
          .limit(20),
        supabase
          .from("sparring_analyses")
          .select("id, video_name, video_url, created_at, status, analysis")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (workoutsRes.error) console.error("Error loading workouts:", workoutsRes.error);
      else setWorkouts(workoutsRes.data as HistoricalWorkout[]);

      if (sparringRes.error) console.error("Error loading sparrings:", sparringRes.error);
      else setSparrings((sparringRes.data || []) as SparringAnalysisRow[]);

      setLoading(false);
    };

    loadHistory();
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
          <h1 className="text-3xl font-bold">Mon Historique</h1>
          <p className="text-muted-foreground mt-2">Entraînements et analyses de sparring</p>
        </div>

        <Tabs defaultValue="workouts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workouts" className="gap-2">
              <Dumbbell className="h-4 w-4" /> Entraînements
            </TabsTrigger>
            <TabsTrigger value="sparring" className="gap-2">
              <Swords className="h-4 w-4" /> Sparring ({sparrings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workouts" className="space-y-6">
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
                <div className="flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" /> Réinitialiser l'historique
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Réinitialiser tout l'historique ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprimera définitivement tous vos entraînements terminés. Elle est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleResetWorkouts}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Tout supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
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
                            <p className="font-bold text-secondary">{workout.total_volume_kg.toFixed(0)} kg</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Calories</p>
                            <p className="font-bold text-accent">{workout.calories_burned} kcal</p>
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
          </TabsContent>

          <TabsContent value="sparring" className="space-y-4">
            {sparrings.length === 0 ? (
              <Card className="liquid-glass-solid border-0">
                <CardContent className="p-8 text-center">
                  <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune analyse de sparring enregistrée.</p>
                  <Button className="mt-4" onClick={() => navigate("/")}>
                    Lancer une analyse PRISM
                  </Button>
                </CardContent>
              </Card>
            ) : (
              sparrings.map((s) => {
                const scores = s.analysis?.performance_scores?.fighter_1;
                const overall = scores?.overall;
                return (
                  <Card key={s.id} className="liquid-glass-solid border-0">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg mb-2 truncate">{s.video_name}</CardTitle>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(s.created_at), "dd MMM yyyy", { locale: fr })}
                            </div>
                            {s.analysis?.duration_estimate && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {s.analysis.duration_estimate}
                              </div>
                            )}
                          </div>
                        </div>
                        {typeof overall === "number" && (
                          <Badge variant="outline" className="bg-primary/10 text-primary gap-1">
                            <Trophy className="h-3 w-3" />
                            {overall}/100
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {s.analysis?.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {s.analysis.summary}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedSparring(s)}
                          className="gap-1"
                        >
                          <FileText className="h-4 w-4" /> Voir l'analyse
                        </Button>
                        {s.analysis && (
                          <SparringPDFExport
                            analysis={s.analysis}
                            videoName={s.video_name}
                            analysisDate={s.created_at}
                          />
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" /> Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette analyse ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Pensez à télécharger le PDF si vous souhaitez le conserver.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSparring(s.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedSparring} onOpenChange={(o) => !o && setSelectedSparring(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{selectedSparring?.video_name}</DialogTitle>
            <DialogDescription>
              {selectedSparring && format(new Date(selectedSparring.created_at), "dd MMMM yyyy", { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          {selectedSparring?.analysis && (
            <div className="space-y-5">
              {selectedSparring.analysis.summary && (
                <section>
                  <h3 className="text-sm font-semibold mb-1 text-primary">Résumé</h3>
                  <p className="text-sm text-muted-foreground">{selectedSparring.analysis.summary}</p>
                </section>
              )}
              {selectedSparring.analysis.performance_scores?.fighter_1 && (
                <section>
                  <h3 className="text-sm font-semibold mb-2 text-primary">Scores de performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(selectedSparring.analysis.performance_scores.fighter_1).map(([k, v]) => (
                      <div key={k} className="text-center p-2 rounded-lg bg-muted/40">
                        <p className="text-xs text-muted-foreground capitalize">{k}</p>
                        <p className="text-lg font-bold text-primary">{v as number}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {selectedSparring.analysis.overall_analysis && (
                <section>
                  <h3 className="text-sm font-semibold mb-1 text-primary">Analyse globale</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedSparring.analysis.overall_analysis}
                  </p>
                </section>
              )}
              {selectedSparring.analysis.recommendations?.fighter_1?.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold mb-1 text-primary">Recommandations</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {selectedSparring.analysis.recommendations.fighter_1.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </section>
              )}
              <div className="pt-2">
                <SparringPDFExport
                  analysis={selectedSparring.analysis}
                  videoName={selectedSparring.video_name}
                  analysisDate={selectedSparring.created_at}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
