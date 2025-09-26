import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { Exercise } from "@/hooks/useWorkouts";

interface AddExerciseDialogProps {
  exercises: Exercise[];
  onAddExercise: (exerciseId: string, restSeconds: number) => void;
  loading?: boolean;
}

export const AddExerciseDialog = ({ exercises, onAddExercise, loading }: AddExerciseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [restSeconds, setRestSeconds] = useState(60);

  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(search.toLowerCase()) ||
    exercise.muscle_groups.some(muscle => 
      muscle.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleAddExercise = () => {
    if (selectedExercise) {
      onAddExercise(selectedExercise.id, restSeconds);
      setSelectedExercise(null);
      setSearch("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter Exercice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Ajouter un Exercice</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un exercice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Exercise List */}
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {filteredExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  onClick={() => setSelectedExercise(exercise)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedExercise?.id === exercise.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">{exercise.name}</h4>
                      <div className="flex flex-wrap gap-1">
                        {exercise.muscle_groups.map((muscle) => (
                          <Badge key={muscle} variant="outline" className="text-xs">
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                      {exercise.instructions && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {exercise.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredExercises.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun exercice trouvé
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Rest Time */}
          {selectedExercise && (
            <div className="space-y-2 p-4 bg-secondary/10 rounded-lg">
              <Label htmlFor="rest-time">Temps de repos (secondes)</Label>
              <Input
                id="rest-time"
                type="number"
                min="0"
                max="600"
                value={restSeconds}
                onChange={(e) => setRestSeconds(Number(e.target.value))}
                className="w-32"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddExercise}
              disabled={!selectedExercise || loading}
              className="flex-1"
            >
              {loading ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};