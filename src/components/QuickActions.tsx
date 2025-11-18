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
        
        {/* Coach IA Chat Zone */}
        <div className="mt-6 p-6 bg-gradient-hero rounded-lg border-2 border-primary/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Brain className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-primary-foreground">
                Coach IA KOREV
              </h4>
              <p className="text-sm text-primary-foreground/70">
                Votre assistant MMA intelligent
              </p>
            </div>
          </div>
          
          <div className="bg-background/10 backdrop-blur-sm rounded-lg p-4 mb-3 min-h-[100px] max-h-[200px] overflow-y-auto">
            <p className="text-sm text-primary-foreground/90 mb-2">
              💪 Bonjour ! Je suis votre coach IA personnel. Posez-moi vos questions sur :
            </p>
            <ul className="text-xs text-primary-foreground/80 space-y-1 ml-4">
              <li>• Techniques de combat MMA</li>
              <li>• Plans d'entraînement personnalisés</li>
              <li>• Nutrition et récupération</li>
              <li>• Analyse de vos performances</li>
            </ul>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Posez votre question..."
              className="flex-1 bg-background/20 border border-primary-foreground/20 rounded-lg px-4 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:border-primary-foreground/40"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  toast.info("Coach IA", { description: "Fonctionnalité en cours de développement" });
                }
              }}
            />
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              onClick={() => toast.info("Coach IA", { description: "Fonctionnalité en cours de développement" })}
            >
              Envoyer
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