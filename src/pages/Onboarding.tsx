import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  User, Scale, Ruler, Target, Dumbbell, ArrowRight, ArrowLeft,
  Sparkles, Brain, Calendar, Trophy, Heart, Moon, Activity, MapPin, SkipForward
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

const MORPHOTYPES = [
  { value: "ectomorphe", label: "Ectomorphe", desc: "Mince, sec" },
  { value: "mesomorphe", label: "Mésomorphe", desc: "Athlétique" },
  { value: "endomorphe", label: "Endomorphe", desc: "Massif, large" },
];

const EQUIPMENT_OPTIONS = [
  "Sac de frappe", "Pao / focus mitts", "Gants", "Corde à sauter",
  "Haltères", "Barre & poids", "Élastiques", "Kettlebell",
  "Cage / ring", "Tatami", "Aucun"
];

const DIETARY_OPTIONS = [
  "Aucune", "Végétarien", "Vegan", "Sans gluten",
  "Sans lactose", "Halal", "Casher", "Cétogène"
];

const COMMON_INJURIES = [
  "Genou", "Épaule", "Dos lombaire", "Cervicales",
  "Poignet", "Cheville", "Coude", "Hanche"
];

const SECONDARY_DISC_OPTIONS = DISCIPLINES.filter(d => d.value !== "autre");

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    // step 1
    full_name: "",
    gender: "",
    age: "",
    // step 2
    weight: "",
    height: "",
    // step 3
    fitness_level: "",
    martial_arts_discipline: "",
    // step 4
    goals: [] as string[],
    primary_goal: "",
    goal_deadline: "",
    target_event: "",
    // step 5 expérience martiale
    years_practice: "",
    belt_rank: "",
    secondary_disciplines: [] as string[],
    competition_level: "",
    competitions_count: "",
    // step 6 physique avancé
    body_fat_percent: "",
    waist_cm: "",
    morphotype: "",
    handedness: "",
    injuries: [] as string[],
    // step 7 lifestyle
    sleep_hours: "7",
    stress_level: 5,
    weekly_availability: "",
    preferred_session_duration: "",
    training_location: "",
    equipment: [] as string[],
    dietary_restrictions: [] as string[],
  });

  const totalSteps = 7;
  const progress = (step / totalSteps) * 100;

  const set = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const toggleArr = (field: keyof typeof formData, val: string) => {
    setFormData(prev => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val],
      };
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!formData.full_name && !!formData.gender && !!formData.age;
      case 2: return !!formData.weight && !!formData.height;
      case 3: return !!formData.fitness_level && !!formData.martial_arts_discipline;
      case 4: return formData.goals.length > 0;
      // 5,6,7 = optionnels
      default: return true;
    }
  };

  const isOptionalStep = step >= 5;

  const handleSubmit = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const num = (v: string) => v ? Number.parseFloat(v) : null;
      const int = (v: string) => v ? Number.parseInt(v, 10) : null;
      const payload: any = {
        full_name: formData.full_name,
        gender: formData.gender,
        age: int(formData.age),
        weight: num(formData.weight),
        height: int(formData.height),
        fitness_level: formData.fitness_level,
        martial_arts_discipline: formData.martial_arts_discipline,
        goals: formData.goals,
        primary_goal: formData.primary_goal || null,
        goal_deadline: formData.goal_deadline || null,
        target_event: formData.target_event || null,
        years_practice: int(formData.years_practice),
        belt_rank: formData.belt_rank || null,
        secondary_disciplines: formData.secondary_disciplines,
        competition_level: formData.competition_level || null,
        competitions_count: int(formData.competitions_count),
        body_fat_percent: num(formData.body_fat_percent),
        waist_cm: int(formData.waist_cm),
        morphotype: formData.morphotype || null,
        handedness: formData.handedness || null,
        injuries: formData.injuries,
        sleep_hours: num(formData.sleep_hours),
        stress_level: formData.stress_level,
        weekly_availability: int(formData.weekly_availability),
        preferred_session_duration: int(formData.preferred_session_duration),
        training_location: formData.training_location || null,
        equipment: formData.equipment,
        dietary_restrictions: formData.dietary_restrictions,
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
      sessionStorage.setItem("onboarding_completed", "true");
      toast.success("Profil complété ! Bienvenue chez KOREV AI 🥊");
      setTimeout(() => navigate("/"), 500);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la sauvegarde");
      setIsLoading(false);
    }
  };

  const stepMeta = [
    { icon: User, title: "Qui es-tu ?", desc: "Les bases pour personnaliser ton coach" },
    { icon: Scale, title: "Tes mensurations", desc: "Pour calculer tes besoins" },
    { icon: Dumbbell, title: "Ton niveau", desc: "Pour adapter l'intensité" },
    { icon: Target, title: "Tes objectifs", desc: "Que veux-tu accomplir ?" },
    { icon: Trophy, title: "Expérience martiale", desc: "Optionnel — affine les conseils techniques" },
    { icon: Heart, title: "Profil physique avancé", desc: "Optionnel — pour des programmes ultra-précis" },
    { icon: Moon, title: "Lifestyle & récupération", desc: "Optionnel — clé pour la performance" },
  ];

  const Meta = stepMeta[step - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Brain className="h-5 w-5" />
            <span className="font-semibold">Coach IA KOREV</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Configuration de ton profil</h1>
          <p className="text-muted-foreground">
            Plus tu en dis, plus ton coach IA devient précis 🎯
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Étape {step}/{totalSteps} {isOptionalStep && "· optionnel"}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="border-primary/20 bg-card/95 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Meta.icon className="h-5 w-5 text-primary" /> {Meta.title}
            </CardTitle>
            <CardDescription>{Meta.desc}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Prénom / Nom de combattant *</Label>
                  <Input id="full_name" value={formData.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    placeholder="Ex: Mike Tyson" className="h-12" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Genre *</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {[{ v: "male", l: "Homme" }, { v: "female", l: "Femme" }, { v: "other", l: "Autre" }].map(o => (
                        <Button key={o.v} type="button"
                          variant={formData.gender === o.v ? "default" : "outline"}
                          className="h-10" onClick={() => set("gender", o.v)}>{o.l}</Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Âge *
                    </Label>
                    <Input id="age" type="number" min="10" max="100"
                      value={formData.age} onChange={(e) => set("age", e.target.value)}
                      placeholder="25" className="h-12 text-center text-lg" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="flex items-center gap-2">
                      <Scale className="h-4 w-4" /> Poids (kg) *
                    </Label>
                    <Input id="weight" type="number" step="0.1" value={formData.weight}
                      onChange={(e) => set("weight", e.target.value)}
                      placeholder="75" className="h-12 text-center text-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height" className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" /> Taille (cm) *
                    </Label>
                    <Input id="height" type="number" value={formData.height}
                      onChange={(e) => set("height", e.target.value)}
                      placeholder="180" className="h-12 text-center text-lg" />
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Le coach IA calcule tes besoins caloriques et propose ta catégorie de poids.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Niveau global *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { v: "beginner", l: "Débutant", d: "< 1 an" },
                      { v: "intermediate", l: "Intermédiaire", d: "1-3 ans" },
                      { v: "advanced", l: "Avancé", d: "3-5 ans" },
                      { v: "expert", l: "Expert", d: "5+ ans" },
                    ].map(lvl => (
                      <Button key={lvl.v} type="button"
                        variant={formData.fitness_level === lvl.v ? "default" : "outline"}
                        className="h-auto py-3 flex flex-col items-center"
                        onClick={() => set("fitness_level", lvl.v)}>
                        <span className="font-semibold">{lvl.l}</span>
                        <span className="text-xs opacity-70">{lvl.d}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discipline">Discipline principale *</Label>
                  <Select value={formData.martial_arts_discipline}
                    onValueChange={(v) => set("martial_arts_discipline", v)}>
                    <SelectTrigger id="discipline" className="h-12">
                      <SelectValue placeholder="Choisis ta discipline" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCIPLINES.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tous tes objectifs * (multi)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {GOALS.map(g => (
                      <Button key={g.value} type="button"
                        variant={formData.goals.includes(g.value) ? "default" : "outline"}
                        className="h-auto py-3 flex flex-col items-center gap-1"
                        onClick={() => toggleArr("goals", g.value)}>
                        <span className="text-2xl">{g.icon}</span>
                        <span className="text-xs text-center leading-tight">{g.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                {formData.goals.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Objectif n°1 (le plus important)</Label>
                      <Select value={formData.primary_goal}
                        onValueChange={(v) => set("primary_goal", v)}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Choisis ta priorité" />
                        </SelectTrigger>
                        <SelectContent>
                          {GOALS.filter(g => formData.goals.includes(g.value)).map(g => (
                            <SelectItem key={g.value} value={g.value}>{g.icon} {g.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="deadline">Échéance (optionnel)</Label>
                        <Input id="deadline" type="date" value={formData.goal_deadline}
                          onChange={(e) => set("goal_deadline", e.target.value)} className="h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="event">Événement cible (optionnel)</Label>
                        <Input id="event" value={formData.target_event}
                          onChange={(e) => set("target_event", e.target.value)}
                          placeholder="Combat amateur, ceinture..." className="h-12" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 5 — Expérience martiale */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="years">Années de pratique</Label>
                    <Input id="years" type="number" min="0" max="60"
                      value={formData.years_practice}
                      onChange={(e) => set("years_practice", e.target.value)}
                      placeholder="3" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="belt">Grade / Ceinture</Label>
                    <Input id="belt" value={formData.belt_rank}
                      onChange={(e) => set("belt_rank", e.target.value)}
                      placeholder="Bleue, gants jaunes..." className="h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Disciplines secondaires</Label>
                  <div className="flex flex-wrap gap-2">
                    {SECONDARY_DISC_OPTIONS.map(d => (
                      <Button key={d.value} type="button" size="sm"
                        variant={formData.secondary_disciplines.includes(d.value) ? "default" : "outline"}
                        onClick={() => toggleArr("secondary_disciplines", d.value)}>
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Niveau compétition</Label>
                    <Select value={formData.competition_level}
                      onValueChange={(v) => set("competition_level", v)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Aucun" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        <SelectItem value="local">Local / club</SelectItem>
                        <SelectItem value="regional">Régional</SelectItem>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="international">International / pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="combats">Nombre de combats</Label>
                    <Input id="combats" type="number" min="0"
                      value={formData.competitions_count}
                      onChange={(e) => set("competitions_count", e.target.value)}
                      placeholder="0" className="h-12" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6 — Physique avancé */}
            {step === 6 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bf">% Masse grasse</Label>
                    <Input id="bf" type="number" step="0.1" min="3" max="60"
                      value={formData.body_fat_percent}
                      onChange={(e) => set("body_fat_percent", e.target.value)}
                      placeholder="15" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waist">Tour de taille (cm)</Label>
                    <Input id="waist" type="number"
                      value={formData.waist_cm}
                      onChange={(e) => set("waist_cm", e.target.value)}
                      placeholder="80" className="h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Morphotype</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {MORPHOTYPES.map(m => (
                      <Button key={m.value} type="button"
                        variant={formData.morphotype === m.value ? "default" : "outline"}
                        className="h-auto py-3 flex flex-col"
                        onClick={() => set("morphotype", m.value)}>
                        <span className="font-semibold text-sm">{m.label}</span>
                        <span className="text-xs opacity-70">{m.desc}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Latéralité</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ v: "orthodox", l: "Droitier" }, { v: "southpaw", l: "Gaucher" }, { v: "switch", l: "Switch" }].map(o => (
                      <Button key={o.v} type="button"
                        variant={formData.handedness === o.v ? "default" : "outline"}
                        onClick={() => set("handedness", o.v)}>{o.l}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Blessures / limitations</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_INJURIES.map(i => (
                      <Button key={i} type="button" size="sm"
                        variant={formData.injuries.includes(i) ? "destructive" : "outline"}
                        onClick={() => toggleArr("injuries", i)}>{i}</Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7 — Lifestyle */}
            {step === 7 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sleep" className="flex items-center gap-2">
                      <Moon className="h-4 w-4" /> Sommeil (h / nuit)
                    </Label>
                    <Input id="sleep" type="number" step="0.5" min="3" max="12"
                      value={formData.sleep_hours}
                      onChange={(e) => set("sleep_hours", e.target.value)} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Stress quotidien : {formData.stress_level}/10
                    </Label>
                    <Slider min={1} max={10} step={1}
                      value={[formData.stress_level]}
                      onValueChange={(v) => set("stress_level", v[0])}
                      className="py-3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weekly">Dispo / semaine (séances)</Label>
                    <Input id="weekly" type="number" min="1" max="14"
                      value={formData.weekly_availability}
                      onChange={(e) => set("weekly_availability", e.target.value)}
                      placeholder="4" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dur">Durée d'une séance (min)</Label>
                    <Input id="dur" type="number" min="15" max="240"
                      value={formData.preferred_session_duration}
                      onChange={(e) => set("preferred_session_duration", e.target.value)}
                      placeholder="60" className="h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Lieu principal
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ v: "gym", l: "Salle / club" }, { v: "home", l: "Maison" }, { v: "outdoor", l: "Extérieur" }].map(o => (
                      <Button key={o.v} type="button"
                        variant={formData.training_location === o.v ? "default" : "outline"}
                        onClick={() => set("training_location", o.v)}>{o.l}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Équipement disponible</Label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map(eq => (
                      <Button key={eq} type="button" size="sm"
                        variant={formData.equipment.includes(eq) ? "default" : "outline"}
                        onClick={() => toggleArr("equipment", eq)}>{eq}</Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Restrictions alimentaires</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map(d => (
                      <Button key={d} type="button" size="sm"
                        variant={formData.dietary_restrictions.includes(d) ? "default" : "outline"}
                        onClick={() => toggleArr("dietary_restrictions", d)}>{d}</Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 gap-2">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
              ) : <div />}

              <div className="flex gap-2">
                {isOptionalStep && step < totalSteps && (
                  <Button variant="ghost" onClick={() => setStep(step + 1)} className="gap-2 text-muted-foreground">
                    <SkipForward className="h-4 w-4" /> Passer
                  </Button>
                )}
                {step < totalSteps ? (
                  <Button onClick={() => setStep(step + 1)}
                    disabled={!canProceed()} className="gap-2">
                    Suivant <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit}
                    disabled={isLoading} variant="hero" className="gap-2">
                    {isLoading ? "Enregistrement..." : (<><Sparkles className="h-4 w-4" /> Terminer</>)}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {step >= 4 && (
          <div className="text-center mt-4">
            <Button variant="link" onClick={handleSubmit} disabled={isLoading}
              className="text-muted-foreground hover:text-foreground">
              Enregistrer et passer le reste plus tard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
