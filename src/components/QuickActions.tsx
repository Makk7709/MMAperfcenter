import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { StartWorkoutDialog } from "@/components/StartWorkoutDialog";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { useState } from "react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useNutrition } from "@/hooks/useNutrition";
import { 
  Camera, 
  ScanLine, 
  Dumbbell, 
  Brain, 
  Users, 
  Calendar,
  Plus,
  Play,
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
      title: "Vidéo IA",
      description: "Analyse",
      icon: Camera,
      variant: "secondary" as const,
      onClick: () => {
        toast.info("Analyse vidéo IA", { description: "Fonctionnalité à venir - analyse des techniques de combat" });
      }
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
      title: "Coach IA",
      description: "Assistant",
      icon: Brain,
      variant: "hero" as const,
      onClick: () => {
        toast.info("Coach IA MMA", { description: "Votre assistant intelligent arrive bientôt" });
      }
    },
    {
      title: "Combat",
      description: "Techniques",
      icon: Users,
      variant: "outline" as const,
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
                  <p className="text-xs font-semibold leading-tight">{action.title}</p>
                  <p className="text-[10px] opacity-70 leading-tight">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
        
        {/* Quick Start Workout */}
        <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-primary-foreground">
                Prêt pour votre séance ?
              </h4>
              <p className="text-sm text-primary-foreground/80">
                Workout du jour : Haut du corps
              </p>
            </div>
            <Button 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setStartWorkoutOpen(true)}
            >
              <Play className="h-4 w-4 mr-2" />
              Commencer
            </Button>
          </div>
        </div>
      </CardContent>
      
      <StartWorkoutDialog 
        open={startWorkoutOpen} 
        onOpenChange={setStartWorkoutOpen}
        onStartWorkout={(name) => {
          startWorkout(name);
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