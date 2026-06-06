import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { WorkoutManager } from "@/components/workout/WorkoutManager";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { useState } from "react";
import { useNutrition } from "@/hooks/useNutrition";
import type { SessionSummary } from "@/utils/gamification/wolfTracking";
import { 
  Camera, 
  ScanLine, 
  Dumbbell, 
  Users, 
  Calendar,
  Zap,
  BookOpen
} from "lucide-react";

interface QuickActionsProps {
  onSwitchTab?: (tab: string) => void;
}

// Bouton "Workout" couplé à WorkoutManager. Défini au niveau module pour ne pas
// redéclarer un composant à chaque rendu du parent.
const WorkoutButton = ({ onWorkoutComplete }: { onWorkoutComplete: (summary: SessionSummary) => void }) => (
  <WorkoutManager
    onWorkoutComplete={onWorkoutComplete}
    trigger={
      <Button
        variant="default"
        className="liquid-glass-btn group relative overflow-hidden h-24 flex-col gap-1.5 p-3 justify-center w-full cursor-pointer text-primary-foreground"
      >
        <span className="liquid-glass-shine" aria-hidden="true" />
        <Dumbbell className="h-6 w-6 relative z-10 group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
        <div className="text-center space-y-0.5 relative z-10">
          <p className="text-xs font-bold leading-tight">Workout</p>
          <p className="text-[10px] opacity-80 font-medium leading-tight">Démarrer</p>
        </div>
      </Button>
    }
  />
);

export const QuickActions = ({ onSwitchTab }: QuickActionsProps) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const { addNutritionLog } = useNutrition();
  const navigate = useNavigate();

  const handleWorkoutComplete = (summary: SessionSummary) => {
    toast.success(`🐺 Chasse Terminée !`, {
      description: `+${summary.xpEarned} XP • ${Math.round(summary.duration / 60)}min`
    });
    onSwitchTab?.("workout");
  };
  
  const actions = [
    {
      title: "Scanner",
      description: "Nutrition",
      icon: ScanLine,
      variant: "default" as const,
      onClick: () => {
        setScannerOpen(true);
      }
    },
    {
      title: "Vidéos",
      description: "Entraînements",
      icon: Camera,
      variant: "fitness" as const,
      onClick: () => navigate("/training-videos")
    },
    {
      title: "Workout",
      description: "Démarrer",
      icon: Dumbbell,
      variant: "default" as const,
      isWorkout: true,
    },
    {
      title: "Combat",
      description: "Techniques",
      icon: Users,
      variant: "secondary" as const,
      onClick: () => {
        onSwitchTab?.("combat");
        toast.success("Technique MMA", { description: "Section combat activée" });
      }
    },
    {
      title: "Carnet",
      description: "Notes",
      icon: BookOpen,
      variant: "outline" as const,
      onClick: () => navigate("/journal")
    },
    {
      title: "Historique",
      description: "Séances",
      icon: Calendar,
      variant: "ghost" as const,
      onClick: () => navigate("/history")
    }
  ] as const;

  const yellowVariants = new Set(["default", "fitness"]);

  return (
    <Card className="liquid-glass-solid border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Actions Rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action) => {
            // Special handling for workout button
            if ('isWorkout' in action && action.isWorkout) {
              return <WorkoutButton key={action.title} onWorkoutComplete={handleWorkoutComplete} />;
            }

            const Icon = action.icon;
            const isYellow = yellowVariants.has(action.variant);
            const glassClass = isYellow
              ? "liquid-glass-btn text-primary-foreground"
              : "liquid-glass-btn-dark";
            return (
              <Button
                key={action.title}
                variant={action.variant}
                className={`${glassClass} group relative overflow-hidden h-24 flex-col gap-1.5 p-3 justify-center`}
                onClick={'onClick' in action ? action.onClick : undefined}
              >
                {isYellow && <span className="liquid-glass-shine" aria-hidden="true" />}
                <Icon className="h-6 w-6 relative z-10 group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                <div className="text-center space-y-0.5 relative z-10">
                  <p className="text-xs font-bold leading-tight">{action.title}</p>
                  <p className="text-[10px] opacity-80 font-medium leading-tight">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onFoodScanned={(food) => {
          addNutritionLog(food);
          onSwitchTab?.("nutrition");
        }}
      />
    </Card>
  );
};