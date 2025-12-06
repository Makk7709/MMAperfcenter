import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StartWorkoutDialogV2, type WorkoutConfig } from "@/components/workout/StartWorkoutDialogV2";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { useState } from "react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useNutrition } from "@/hooks/useNutrition";
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

export const QuickActions = ({ onSwitchTab }: QuickActionsProps) => {
  const [startWorkoutOpen, setStartWorkoutOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { startWorkout } = useWorkouts();
  const { addNutritionLog } = useNutrition();
  const navigate = useNavigate();
  
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
      onClick: () => {
        setStartWorkoutOpen(true);
      }
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
  ];

  return (
    <Card className="bg-gradient-card border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Actions Rapides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant={action.variant}
                className="h-24 flex-col gap-1.5 p-3 group justify-center"
                onClick={action.onClick}
              >
                <Icon className="h-6 w-6 group-hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                <div className="text-center space-y-0.5">
                  <p className="text-xs font-bold leading-tight">{action.title}</p>
                  <p className="text-[10px] opacity-80 font-medium leading-tight">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
      
      <StartWorkoutDialogV2 
        open={startWorkoutOpen} 
        onOpenChange={setStartWorkoutOpen}
        onStartWorkout={(config: WorkoutConfig) => {
          startWorkout(config.name);
          toast.success(`🏋️ ${config.name}`, {
            description: `${config.duration}min • ${config.intensity}`
          });
          onSwitchTab?.("workout");
        }}
      />

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