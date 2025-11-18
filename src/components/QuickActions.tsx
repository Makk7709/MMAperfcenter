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
        <div className="mt-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-xl overflow-hidden shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xl text-white flex items-center gap-2">
                  Coach IA KOREV
                  <span className="text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">Beta</span>
                </h4>
                <div className="flex items-center gap-1.5 text-white/90 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>En ligne</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="p-4 space-y-3 bg-background/40 min-h-[180px] max-h-[180px] overflow-y-auto">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 bg-card border border-border rounded-lg rounded-tl-none p-3 shadow-sm">
                <p className="text-sm text-foreground leading-relaxed">
                  Salut ! 👋 Je suis ton coach personnel. Je peux t'aider à :
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">🥊 Techniques MMA</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">💪 Programmes d'entraînement</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">🥗 Nutrition</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">📊 Analyse perfs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-card/50 backdrop-blur-sm border-t border-border/50">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Posez votre question au coach..."
                className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    toast.info("Coach IA", { description: "Fonctionnalité en cours de développement" });
                  }
                }}
              />
              <Button 
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 shadow-md hover:shadow-lg transition-all"
                onClick={() => toast.info("Coach IA", { description: "Fonctionnalité en cours de développement" })}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
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