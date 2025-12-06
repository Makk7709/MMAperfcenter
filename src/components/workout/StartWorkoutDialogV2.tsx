/**
 * StartWorkoutDialogV2 - Killer Feature Workout Starter
 * 
 * Features:
 * - MMA-specific workout templates
 * - Duration & intensity configuration
 * - Round-based workout setup
 * - Quick start options
 * - Recent workouts history
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Dumbbell,
  Timer,
  Flame,
  Zap,
  Target,
  Clock,
  History,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface WorkoutConfig {
  name: string;
  type: WorkoutType;
  duration: number; // minutes
  intensity: IntensityLevel;
  rounds?: number;
  roundDuration?: number; // seconds
  restDuration?: number; // seconds
}

export type WorkoutType = 'boxing' | 'mma' | 'strength' | 'cardio' | 'custom';
export type IntensityLevel = 'light' | 'moderate' | 'intense';

export interface RecentWorkout {
  id: string;
  name: string;
  type: string;
  date: string;
}

export interface StartWorkoutDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartWorkout: (config: WorkoutConfig) => void;
  loading?: boolean;
  recentWorkouts?: RecentWorkout[];
}

// ============================================
// WORKOUT TEMPLATES
// ============================================

interface WorkoutTemplate {
  name: string;
  type: WorkoutType;
  duration: number;
  intensity: IntensityLevel;
  rounds?: number;
  roundDuration?: number;
  restDuration?: number;
  icon: React.ElementType;
  color: string;
}

const BOXING_TEMPLATES: WorkoutTemplate[] = [
  { 
    name: "Shadow Boxing", 
    type: "boxing", 
    duration: 15, 
    intensity: "moderate",
    rounds: 5,
    roundDuration: 180,
    restDuration: 60,
    icon: Target,
    color: "text-red-500"
  },
  { 
    name: "Heavy Bag - Sac de Frappe", 
    type: "boxing", 
    duration: 20, 
    intensity: "intense",
    rounds: 6,
    roundDuration: 180,
    restDuration: 60,
    icon: Flame,
    color: "text-orange-500"
  },
  { 
    name: "Pads Work", 
    type: "boxing", 
    duration: 25, 
    intensity: "intense",
    rounds: 8,
    roundDuration: 180,
    restDuration: 60,
    icon: Zap,
    color: "text-yellow-500"
  },
];

const MMA_TEMPLATES: WorkoutTemplate[] = [
  { 
    name: "Grappling Drills - Lutte", 
    type: "mma", 
    duration: 30, 
    intensity: "moderate",
    icon: Dumbbell,
    color: "text-blue-500"
  },
  { 
    name: "Sparring Session", 
    type: "mma", 
    duration: 25, 
    intensity: "intense",
    rounds: 5,
    roundDuration: 300,
    restDuration: 60,
    icon: Target,
    color: "text-purple-500"
  },
  { 
    name: "MMA Technique", 
    type: "mma", 
    duration: 45, 
    intensity: "moderate",
    icon: Target,
    color: "text-indigo-500"
  },
];

const STRENGTH_TEMPLATES: WorkoutTemplate[] = [
  { 
    name: "Force - Upper Body", 
    type: "strength", 
    duration: 45, 
    intensity: "intense",
    icon: Dumbbell,
    color: "text-emerald-500"
  },
  { 
    name: "Force - Lower Body", 
    type: "strength", 
    duration: 45, 
    intensity: "intense",
    icon: Dumbbell,
    color: "text-teal-500"
  },
  { 
    name: "Full Body Strength", 
    type: "strength", 
    duration: 60, 
    intensity: "moderate",
    icon: Dumbbell,
    color: "text-cyan-500"
  },
];

const CARDIO_TEMPLATES: WorkoutTemplate[] = [
  { 
    name: "HIIT Conditioning", 
    type: "cardio", 
    duration: 20, 
    intensity: "intense",
    icon: Flame,
    color: "text-red-400"
  },
  { 
    name: "Cardio Endurance", 
    type: "cardio", 
    duration: 40, 
    intensity: "moderate",
    icon: Timer,
    color: "text-pink-500"
  },
  { 
    name: "Circuit Training", 
    type: "cardio", 
    duration: 30, 
    intensity: "intense",
    icon: Zap,
    color: "text-amber-500"
  },
];

const QUICK_START_OPTIONS = [
  { name: "Express 5min", duration: 5, type: "cardio" as WorkoutType, intensity: "intense" as IntensityLevel },
  { name: "Rapide 10min", duration: 10, type: "cardio" as WorkoutType, intensity: "moderate" as IntensityLevel },
  { name: "Quick 15min", duration: 15, type: "cardio" as WorkoutType, intensity: "moderate" as IntensityLevel },
];

const INTENSITY_OPTIONS: { value: IntensityLevel; label: string; description: string }[] = [
  { value: "light", label: "Léger - Light", description: "Récupération active" },
  { value: "moderate", label: "Modéré - Moderate", description: "Entraînement standard" },
  { value: "intense", label: "Intense - Hard", description: "Haute intensité" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

// ============================================
// COMPONENT
// ============================================

export const StartWorkoutDialogV2 = ({
  open,
  onOpenChange,
  onStartWorkout,
  loading = false,
  recentWorkouts = [],
}: StartWorkoutDialogV2Props) => {
  const [workoutName, setWorkoutName] = useState("");
  const [selectedType, setSelectedType] = useState<WorkoutType>("boxing");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<IntensityLevel>("moderate");
  const [rounds, setRounds] = useState(5);
  const [showRoundConfig, setShowRoundConfig] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setWorkoutName("");
      setSelectedType("boxing");
      setDuration(30);
      setIntensity("moderate");
      setRounds(5);
      setShowRoundConfig(false);
    }
  }, [open]);

  const handleTemplateSelect = (template: WorkoutTemplate) => {
    setWorkoutName(template.name);
    setSelectedType(template.type);
    setDuration(template.duration);
    setIntensity(template.intensity);
    if (template.rounds) {
      setRounds(template.rounds);
      setShowRoundConfig(true);
    }
  };

  const handleQuickStart = (option: typeof QUICK_START_OPTIONS[0]) => {
    const config: WorkoutConfig = {
      name: option.name,
      type: option.type,
      duration: option.duration,
      intensity: option.intensity,
    };
    onStartWorkout(config);
    onOpenChange(false);
  };

  const handleRecentSelect = (workout: RecentWorkout) => {
    setWorkoutName(workout.name);
    setSelectedType(workout.type as WorkoutType);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutName.trim()) return;

    const config: WorkoutConfig = {
      name: workoutName.trim(),
      type: selectedType,
      duration,
      intensity,
      ...(showRoundConfig && {
        rounds,
        roundDuration: 180,
        restDuration: 60,
      }),
    };

    onStartWorkout(config);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const renderTemplates = (templates: WorkoutTemplate[]) => (
    <div className="grid grid-cols-1 gap-2">
      {templates.map((template) => {
        const Icon = template.icon;
        return (
          <Button
            key={template.name}
            type="button"
            variant="outline"
            className={cn(
              "justify-start h-auto py-3 px-4 text-left",
              workoutName === template.name && "border-primary bg-primary/5"
            )}
            onClick={() => handleTemplateSelect(template)}
          >
            <Icon className={cn("h-5 w-5 mr-3 flex-shrink-0", template.color)} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{template.name}</p>
              <p className="text-xs text-muted-foreground">
                {template.duration}min • {template.intensity}
                {template.rounds && ` • ${template.rounds} rounds`}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </Button>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Nouveau Workout
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Quick Start */}
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Démarrage Rapide - Quick Start Express
            </Label>
            <div className="flex gap-2">
              {QUICK_START_OPTIONS.map((option) => (
                <Button
                  key={option.name}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleQuickStart(option)}
                  disabled={loading}
                >
                  <Play className="h-3 w-3 mr-1" />
                  {option.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Workout Name */}
          <div className="mb-4">
            <Label htmlFor="workout-name">Nom de l'entraînement</Label>
            <Input
              id="workout-name"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Nom de votre entraînement ou workout"
              className="mt-1"
              disabled={loading}
            />
          </div>

          {/* Templates Tabs */}
          <div className="flex-1 min-h-0 mb-4">
            <Tabs defaultValue="boxing" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-4 mb-2">
                <TabsTrigger value="boxing" className="text-xs">
                  🥊 Boxing Boxe
                </TabsTrigger>
                <TabsTrigger value="mma" className="text-xs">
                  🥋 MMA Combat
                </TabsTrigger>
                <TabsTrigger value="strength" className="text-xs">
                  💪 Force Strength
                </TabsTrigger>
                <TabsTrigger value="cardio" className="text-xs">
                  🔥 Conditioning Cardio
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 pr-2">
                <TabsContent value="boxing" className="mt-0">
                  {renderTemplates(BOXING_TEMPLATES)}
                </TabsContent>
                <TabsContent value="mma" className="mt-0">
                  {renderTemplates(MMA_TEMPLATES)}
                </TabsContent>
                <TabsContent value="strength" className="mt-0">
                  {renderTemplates(STRENGTH_TEMPLATES)}
                </TabsContent>
                <TabsContent value="cardio" className="mt-0">
                  {renderTemplates(CARDIO_TEMPLATES)}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Configuration */}
          <div className="space-y-3 mb-4">
            {/* Duration */}
            <div>
              <Label className="text-xs">Durée Duration Temps</Label>
              <div className="flex gap-1 mt-1">
                {DURATION_OPTIONS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={duration === d ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setDuration(d)}
                    disabled={loading}
                  >
                    {d}min
                  </Button>
                ))}
              </div>
            </div>

            {/* Intensity */}
            <div>
              <Label className="text-xs">Intensité - Intensity</Label>
              <div className="flex gap-1 mt-1">
                {INTENSITY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={intensity === opt.value ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setIntensity(opt.value)}
                    disabled={loading}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Rounds Config */}
            {showRoundConfig && (
              <div>
                <Label className="text-xs">Rounds</Label>
                <div className="flex gap-1 mt-1">
                  {[3, 5, 8, 10, 12].map((r) => (
                    <Button
                      key={r}
                      type="button"
                      variant={rounds === r ? "default" : "outline"}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setRounds(r)}
                      disabled={loading}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Rest Time */}
            <div>
              <Label className="text-xs">Temps de Repos - Rest</Label>
              <div className="flex gap-1 mt-1">
                {[30, 60, 90, 120].map((r) => (
                  <Button
                    key={r}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    disabled={loading}
                  >
                    {r}s
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Workouts */}
          {recentWorkouts.length > 0 && (
            <div className="mb-4">
              <Label className="text-xs flex items-center gap-1 mb-2">
                <History className="h-3 w-3" />
                Récent - Recent History
              </Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentWorkouts.slice(0, 3).map((workout) => (
                  <Badge
                    key={workout.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 whitespace-nowrap"
                    onClick={() => handleRecentSelect(workout)}
                  >
                    {workout.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!workoutName.trim() || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Chargement Démarrage Loading...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Démarrer Commencer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StartWorkoutDialogV2;

