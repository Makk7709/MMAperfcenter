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

export const WorkoutLogger = () => {
  const [activeTimer, setActiveTimer] = useState(false);
  const [restTime, setRestTime] = useState(60);

  const currentWorkout = {
    name: "Haut du corps - Force",
    exercises: [
      {
        name: "Développé couché",
        sets: [
          { weight: 80, reps: 8, completed: true },
          { weight: 85, reps: 6, completed: true },
          { weight: 90, reps: 4, completed: false }
        ],
        restTime: 120
      },
      {
        name: "Tractions",
        sets: [
          { weight: 0, reps: 10, completed: true },
          { weight: 5, reps: 8, completed: false },
          { weight: 5, reps: 8, completed: false }
        ],
        restTime: 90
      }
    ]
  };

  const workoutStats = {
    duration: "38 min",
    setsCompleted: 5,
    totalSets: 8,
    volume: "2,450 kg",
    avgRestTime: "105s"
  };

  return (
    <div className="space-y-4">
      {/* En-tête workout actuel */}
      <Card className="bg-gradient-card border-0 shadow-card">
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
      {currentWorkout.exercises.map((exercise, exerciseIndex) => (
        <Card key={exerciseIndex} className="bg-gradient-card border-0 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              {exercise.name}
              <Badge variant="outline">
                {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Séries */}
            {exercise.sets.map((set, setIndex) => (
              <div 
                key={setIndex}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                  set.completed 
                    ? 'bg-accent/10 border-accent border-dashed' 
                    : 'bg-background border-border hover:border-primary'
                }`}
              >
                <div className="text-sm font-medium w-8">
                  {setIndex + 1}
                </div>
                
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={set.weight}
                      className="w-16 h-8 text-sm"
                      disabled={set.completed}
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                  
                  <span className="text-muted-foreground">×</span>
                  
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={set.reps}
                      className="w-16 h-8 text-sm"
                      disabled={set.completed}
                    />
                    <span className="text-xs text-muted-foreground">reps</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={set.completed ? "fitness" : "default"}
                  className="w-16"
                >
                  {set.completed ? "✓" : "Log"}
                </Button>
              </div>
            ))}

            {/* Ajouter série */}
            <Button 
              variant="outline" 
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une série
            </Button>
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <div className="flex gap-3">
        <Button className="flex-1" variant="hero">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter Exercice
        </Button>
        <Button className="flex-1" variant="secondary">
          <Target className="h-4 w-4 mr-2" />
          Terminer
        </Button>
      </div>
    </div>
  );
};