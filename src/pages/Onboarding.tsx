import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  User, 
  Scale, 
  Ruler, 
  Target, 
  Dumbbell, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Brain
} from "lucide-react";

const DISCIPLINES = [
  { value: "mma", label: "MMA" },
  { value: "boxe", label: "Boxe Anglaise" },
  { value: "muay-thai", label: "Muay Thai" },
  { value: "kickboxing", label: "Kickboxing" },
  { value: "jiu-jitsu", label: "Jiu-Jitsu Brésilien" },
  { value: "judo", label: "Judo" },
  { value: "karate", label: "Karaté" },
  { value: "taekwondo", label: "Taekwondo" },
  { value: "lutte", label: "Lutte" },
  { value: "krav-maga", label: "Krav Maga" },
  { value: "autre", label: "Autre discipline" },
];

const GOALS = [
  { value: "perte-poids", label: "Perdre du poids", icon: "⚖️" },
  { value: "prise-masse", label: "Prendre de la masse", icon: "💪" },
  { value: "ameliorer-technique", label: "Améliorer ma technique", icon: "🥊" },
  { value: "endurance", label: "Améliorer mon endurance", icon: "🏃" },
  { value: "force", label: "Gagner en force", icon: "🏋️" },
  { value: "competition", label: "Préparer une compétition", icon: "🏆" },
  { value: "flexibilite", label: "Améliorer ma flexibilité", icon: "🧘" },
  { value: "sante", label: "Améliorer ma santé générale", icon: "❤️" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    weight: "",
    height: "",
    gender: "",
    age: "",
    fitness_level: "",
    martial_arts_discipline: "",
    goals: [] as string[],
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.full_name && formData.gender;
      case 2:
        return formData.weight && formData.height;
      case 3:
        return formData.fitness_level && formData.martial_arts_discipline;
      case 4:
        return formData.goals.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          weight: parseFloat(formData.weight),
          height: parseInt(formData.height),
          gender: formData.gender,
          fitness_level: formData.fitness_level,
          martial_arts_discipline: formData.martial_arts_discipline,
          goals: formData.goals,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profil complété ! Bienvenue chez KOREV AI 🥊");
      navigate("/");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Brain className="h-5 w-5" />
            <span className="font-semibold">Coach IA KOREV</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Configuration de ton profil</h1>
          <p className="text-muted-foreground">
            Ces informations permettent à ton Coach IA de te donner des conseils personnalisés
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Étape {step} sur {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Card */}
        <Card className="border-primary/20 bg-card/95 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <><User className="h-5 w-5 text-primary" /> Qui es-tu ?</>}
              {step === 2 && <><Scale className="h-5 w-5 text-primary" /> Tes mensurations</>}
              {step === 3 && <><Dumbbell className="h-5 w-5 text-primary" /> Ton niveau</>}
              {step === 4 && <><Target className="h-5 w-5 text-primary" /> Tes objectifs</>}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Comment doit-on t'appeler ?"}
              {step === 2 && "Pour adapter tes programmes d'entraînement et nutrition"}
              {step === 3 && "Pour personnaliser l'intensité de tes entraînements"}
              {step === 4 && "Que veux-tu accomplir ? (sélectionne un ou plusieurs)"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Identity */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Prénom / Nom de combattant</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder="Ex: Mike Tyson"
                    className="h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "male", label: "Homme" },
                      { value: "female", label: "Femme" },
                      { value: "other", label: "Autre" },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={formData.gender === option.value ? "default" : "outline"}
                        className="h-12"
                        onClick={() => handleChange("gender", option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Physical */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="flex items-center gap-2">
                      <Scale className="h-4 w-4" /> Poids (kg)
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => handleChange("weight", e.target.value)}
                      placeholder="75"
                      className="h-12 text-center text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="height" className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" /> Taille (cm)
                    </Label>
                    <Input
                      id="height"
                      type="number"
                      value={formData.height}
                      onChange={(e) => handleChange("height", e.target.value)}
                      placeholder="180"
                      className="h-12 text-center text-lg"
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Ces données permettent au Coach IA de calculer tes besoins caloriques et recommander des catégories de poids adaptées.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Level */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Niveau de fitness</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "beginner", label: "Débutant", desc: "< 1 an" },
                      { value: "intermediate", label: "Intermédiaire", desc: "1-3 ans" },
                      { value: "advanced", label: "Avancé", desc: "3+ ans" },
                    ].map((level) => (
                      <Button
                        key={level.value}
                        type="button"
                        variant={formData.fitness_level === level.value ? "default" : "outline"}
                        className="h-auto py-3 flex flex-col items-center"
                        onClick={() => handleChange("fitness_level", level.value)}
                      >
                        <span className="font-semibold">{level.label}</span>
                        <span className="text-xs opacity-70">{level.desc}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="discipline">Discipline principale</Label>
                  <Select 
                    value={formData.martial_arts_discipline} 
                    onValueChange={(value) => handleChange("martial_arts_discipline", value)}
                  >
                    <SelectTrigger id="discipline" className="h-12">
                      <SelectValue placeholder="Choisis ta discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCIPLINES.map((discipline) => (
                        <SelectItem key={discipline.value} value={discipline.value}>
                          {discipline.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 4: Goals */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map((goal) => (
                    <Button
                      key={goal.value}
                      type="button"
                      variant={formData.goals.includes(goal.value) ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col items-center gap-1"
                      onClick={() => toggleGoal(goal.value)}
                    >
                      <span className="text-2xl">{goal.icon}</span>
                      <span className="text-xs text-center leading-tight">{goal.label}</span>
                    </Button>
                  ))}
                </div>
                
                {formData.goals.length > 0 && (
                  <div className="bg-primary/10 rounded-lg p-4 text-sm">
                    <p className="flex items-center gap-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                      {formData.goals.length} objectif{formData.goals.length > 1 ? "s" : ""} sélectionné{formData.goals.length > 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button variant="outline" onClick={handlePrev} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              ) : (
                <div />
              )}
              
              {step < totalSteps ? (
                <Button 
                  onClick={handleNext} 
                  disabled={!canProceed()}
                  className="gap-2"
                >
                  Suivant
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={!canProceed() || isLoading}
                  variant="hero"
                  className="gap-2"
                >
                  {isLoading ? "Enregistrement..." : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Commencer avec Coach IA
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skip option */}
        <div className="text-center mt-6">
          <Button 
            variant="link" 
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            Passer et compléter plus tard
          </Button>
        </div>
      </div>
    </div>
  );
}
