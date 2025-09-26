import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play } from "lucide-react";

interface StartWorkoutDialogProps {
  onStartWorkout: (name: string) => void;
  loading?: boolean;
}

export const StartWorkoutDialog = ({ onStartWorkout, loading }: StartWorkoutDialogProps) => {
  const [open, setOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (workoutName.trim()) {
      onStartWorkout(workoutName.trim());
      setWorkoutName("");
      setOpen(false);
    }
  };

  const workoutTemplates = [
    "Haut du corps - Force",
    "Bas du corps - Force", 
    "Cardio HIIT",
    "Full Body",
    "Push (Poussé)",
    "Pull (Tiré)",
    "Legs (Jambes)"
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="w-full">
          <Play className="h-4 w-4 mr-2" />
          Démarrer Entraînement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau Entraînement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workout-name">Nom de l'entraînement</Label>
            <Input
              id="workout-name"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Ex: Haut du corps - Force"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Modèles populaires</Label>
            <div className="grid grid-cols-2 gap-2">
              {workoutTemplates.map((template) => (
                <Button
                  key={template}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWorkoutName(template)}
                  className="text-xs justify-start"
                >
                  {template}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!workoutName.trim() || loading}
              className="flex-1"
            >
              {loading ? "Démarrage..." : "Démarrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};