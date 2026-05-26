/**
 * @deprecated Legacy workout logger. The active product UI uses
 * `WorkoutManager` + `ActiveWorkoutPage` + `StartWorkoutDialogV2`
 * (see `src/components/workout/`). This component is kept as a
 * fallback path on the dashboard while the V2 flow is being
 * stabilised. Do not extend; new features must target the V2 stack.
 * Scheduled for removal once the dashboard is fully migrated.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dumbbell, 
  Plus, 
  Timer, 
  Target,
  TrendingUp,
  Play,
  Pause,
  RotateCcw
} from "lucide-react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { StartWorkoutDialog } from "./StartWorkoutDialog";
import { AddExerciseDialog } from "./AddExerciseDialog";

export const WorkoutLogger = () => {
  const { 
    currentWorkout, 
    exercises, 
    loading, 
    startWorkout, 
    addExerciseToWorkout, 
    addSet, 
    completeSet, 
    updateSet, 
    completeWorkout 
  } = useWorkouts();
  
  const [activeTimer, setActiveTimer] = useState(false);
  const [restTime, setRestTime] = useState(60);

  // Calculate workout stats
  const workoutStats = currentWorkout ? {
    duration: currentWorkout.started_at 
      ? Math.round((new Date().getTime() - new Date(currentWorkout.started_at).getTime()) / (1000 * 60)) + " min"
      : "0 min",
    setsCompleted: currentWorkout.workout_exercises.reduce((total, we) => 
      total + we.sets.filter(set => set.completed).length, 0
    ),
    totalSets: currentWorkout.workout_exercises.reduce((total, we) => total + we.sets.length, 0),
    volume: currentWorkout.workout_exercises.reduce((total, we) => 
      total + we.sets.reduce((setTotal, set) => 
        set.completed ? setTotal + (set.weight_kg * set.reps) : setTotal, 0
      ), 0
    ).toFixed(0) + " kg",
    avgRestTime: Math.round(
      currentWorkout.workout_exercises.reduce((total, we) => total + we.rest_seconds, 0) / 
      Math.max(currentWorkout.workout_exercises.length, 1)
    ) + "s"
  } : null;

  // If no current workout, show start workout button
  if (!currentWorkout) {
    return (
      <div className="space-y-4">
        <Card className="liquid-glass-solid border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Aucun entraînement actif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Commencez un nouvel entraînement pour suivre vos performances.
            </p>
            <StartWorkoutDialog onStartWorkout={startWorkout} loading={loading} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête workout actuel */}
      <Card className="liquid-glass-solid border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              {currentWorkout.name}
            </div>
            <Badge className="bg-accent text-accent-foreground">
              En cours
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stats rapides */}
          {workoutStats && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Temps</p>
                <p className="font-bold text-primary">{workoutStats.duration}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Séries</p>
                <p className="font-bold text-secondary">
                  {workoutStats.setsCompleted}/{workoutStats.totalSets}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="font-bold text-accent">{workoutStats.volume}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Repos moy</p>
                <p className="font-bold text-foreground">{workoutStats.avgRestTime}</p>
              </div>
            </div>
          )}

          {/* Timer de repos */}
          <div className="bg-secondary/10 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Temps de repos</p>
                <p className="text-2xl font-bold text-secondary">{restTime}s</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setActiveTimer(!activeTimer)}
                >
                  {activeTimer ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setRestTime(60)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercices */}
      {currentWorkout.workout_exercises.map((workoutExercise) => (
        <Card key={workoutExercise.id} className="liquid-glass-solid border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              {workoutExercise.exercise.name}
              <Badge variant="outline">
                {workoutExercise.sets.filter(s => s.completed).length}/{workoutExercise.sets.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Séries */}
            {workoutExercise.sets.map((set) => (
              <div 
                key={set.id}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                  set.completed 
                    ? 'bg-accent/10 border-accent border-dashed' 
                    : 'bg-background border-border hover:border-primary'
                }`}
              >
                <div className="text-sm font-medium w-8">
                  {set.set_number}
                </div>
                
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={set.weight_kg}
                      onChange={(e) => updateSet(set.id, Number(e.target.value), set.reps)}
                      className="w-16 h-8 text-sm"
                      disabled={set.completed || loading}
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                  
                  <span className="text-muted-foreground">×</span>
                  
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(set.id, set.weight_kg, Number(e.target.value))}
                      className="w-16 h-8 text-sm"
                      disabled={set.completed || loading}
                    />
                    <span className="text-xs text-muted-foreground">reps</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={set.completed ? "fitness" : "default"}
                  className="w-16"
                  onClick={() => !set.completed && completeSet(set.id)}
                  disabled={loading}
                >
                  {set.completed ? "✓" : "Log"}
                </Button>
              </div>
            ))}

            {/* Ajouter série */}
            <Button 
              variant="outline" 
              className="w-full border-dashed"
              onClick={() => addSet(workoutExercise.id, 0, 1)}
              disabled={loading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une série
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <div className="flex gap-3">
        <AddExerciseDialog 
          exercises={exercises}
          onAddExercise={addExerciseToWorkout}
          loading={loading}
        />
        <Button 
          className="flex-1" 
          variant="secondary"
          onClick={completeWorkout}
          disabled={loading}
        >
          <Target className="h-4 w-4 mr-2" />
          Terminer
        </Button>
      </div>
    </div>
  );
};