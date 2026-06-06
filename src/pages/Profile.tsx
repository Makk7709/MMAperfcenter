import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, Profile as ProfileType } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, User, Save, Heart, Moon, Target, Dumbbell } from "lucide-react";

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

const DISCIPLINES = ["mma", "boxe", "muay-thai", "kickboxing", "jiu-jitsu", "judo", "karate", "taekwondo", "lutte", "krav-maga"];
const EQUIPMENT_OPTIONS = ["Sac de frappe", "Pao / focus mitts", "Gants", "Corde à sauter", "Haltères", "Barre & poids", "Élastiques", "Kettlebell", "Cage / ring", "Tatami", "Aucun"];
const DIETARY_OPTIONS = ["Aucune", "Végétarien", "Vegan", "Sans gluten", "Sans lactose", "Halal", "Casher", "Cétogène"];
const COMMON_INJURIES = ["Genou", "Épaule", "Dos lombaire", "Cervicales", "Poignet", "Cheville", "Coude", "Hanche"];

type FD = {
  full_name: string; weight: string; height: string; gender: string; age: string;
  fitness_level: string; martial_arts_discipline: string; goals: string[];
  body_fat_percent: string; waist_cm: string; morphotype: string; handedness: string; injuries: string[];
  years_practice: string; belt_rank: string; secondary_disciplines: string[]; competition_level: string; competitions_count: string;
  primary_goal: string; goal_deadline: string; target_event: string;
  sleep_hours: string; stress_level: number; weekly_availability: string; preferred_session_duration: string;
  training_location: string; equipment: string[]; dietary_restrictions: string[];
};

const empty: FD = {
  full_name: "", weight: "", height: "", gender: "", age: "",
  fitness_level: "beginner", martial_arts_discipline: "", goals: [],
  body_fat_percent: "", waist_cm: "", morphotype: "", handedness: "", injuries: [],
  years_practice: "", belt_rank: "", secondary_disciplines: [], competition_level: "", competitions_count: "",
  primary_goal: "", goal_deadline: "", target_event: "",
  sleep_hours: "", stress_level: 5, weekly_availability: "", preferred_session_duration: "",
  training_location: "", equipment: [], dietary_restrictions: [],
};

const Profile = () => {
  const navigate = useNavigate();
  const { profile, loading, updateProfile } = useProfile();
  const [formData, setFormData] = useState<FD>(empty);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        weight: profile.weight?.toString() || "",
        height: profile.height?.toString() || "",
        gender: profile.gender || "",
        age: profile.age?.toString() || "",
        fitness_level: profile.fitness_level || "beginner",
        martial_arts_discipline: profile.martial_arts_discipline || "",
        goals: profile.goals || [],
        body_fat_percent: profile.body_fat_percent?.toString() || "",
        waist_cm: profile.waist_cm?.toString() || "",
        morphotype: profile.morphotype || "",
        handedness: profile.handedness || "",
        injuries: profile.injuries || [],
        years_practice: profile.years_practice?.toString() || "",
        belt_rank: profile.belt_rank || "",
        secondary_disciplines: profile.secondary_disciplines || [],
        competition_level: profile.competition_level || "",
        competitions_count: profile.competitions_count?.toString() || "",
        primary_goal: profile.primary_goal || "",
        goal_deadline: profile.goal_deadline || "",
        target_event: profile.target_event || "",
        sleep_hours: profile.sleep_hours?.toString() || "",
        stress_level: profile.stress_level ?? 5,
        weekly_availability: profile.weekly_availability?.toString() || "",
        preferred_session_duration: profile.preferred_session_duration?.toString() || "",
        training_location: profile.training_location || "",
        equipment: profile.equipment || [],
        dietary_restrictions: profile.dietary_restrictions || [],
      });
    }
  }, [profile]);

  const set = (f: keyof FD, v: any) => setFormData(p => ({ ...p, [f]: v }));
  const toggleArr = (f: keyof FD, val: string) => {
    setFormData(p => {
      const arr = p[f] as string[];
      return { ...p, [f]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = (v: string) => v ? Number.parseFloat(v) : null;
    const int = (v: string) => v ? Number.parseInt(v, 10) : null;
    const updates: Partial<ProfileType> = {
      full_name: formData.full_name || null,
      weight: num(formData.weight),
      height: int(formData.height),
      gender: formData.gender || null,
      age: int(formData.age),
      fitness_level: formData.fitness_level || "beginner",
      martial_arts_discipline: formData.martial_arts_discipline || null,
      goals: formData.goals,
      body_fat_percent: num(formData.body_fat_percent),
      waist_cm: int(formData.waist_cm),
      morphotype: formData.morphotype || null,
      handedness: formData.handedness || null,
      injuries: formData.injuries,
      years_practice: int(formData.years_practice),
      belt_rank: formData.belt_rank || null,
      secondary_disciplines: formData.secondary_disciplines,
      competition_level: formData.competition_level || null,
      competitions_count: int(formData.competitions_count),
      primary_goal: formData.primary_goal || null,
      goal_deadline: formData.goal_deadline || null,
      target_event: formData.target_event || null,
      sleep_hours: num(formData.sleep_hours),
      stress_level: formData.stress_level,
      weekly_availability: int(formData.weekly_availability),
      preferred_session_duration: int(formData.preferred_session_duration),
      training_location: formData.training_location || null,
      equipment: formData.equipment,
      dietary_restrictions: formData.dietary_restrictions,
    };
    await updateProfile(updates);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-primary">Chargement...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="liquid-glass-solid border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-primary/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Mon Profil</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-sm text-muted-foreground mb-6">
          Plus tu remplis, plus ton Coach IA personnalise ses recommandations 🎯
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identité */}
          <Card className="liquid-glass-solid border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Identité</CardTitle>
              <CardDescription>Tes informations de base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom de combattant</Label>
                  <Input id="full_name" value={formData.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Votre nom" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={profile?.email || ""} disabled className="bg-muted" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Âge</Label>
                  <Input id="age" type="number" value={formData.age} onChange={(e) => set("age", e.target.value)} placeholder="25" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexe</Label>
                  <Select value={formData.gender} onValueChange={(v) => set("gender", v)}>
                    <SelectTrigger id="gender"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Homme</SelectItem>
                      <SelectItem value="female">Femme</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handedness">Latéralité</Label>
                  <Select value={formData.handedness} onValueChange={(v) => set("handedness", v)}>
                    <SelectTrigger id="handedness"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orthodox">Droitier (orthodox)</SelectItem>
                      <SelectItem value="southpaw">Gaucher (southpaw)</SelectItem>
                      <SelectItem value="switch">Switch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Physique */}
          <Card className="liquid-glass-solid border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Physique</CardTitle>
              <CardDescription>Pour calculer tes besoins et adapter les programmes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Poids (kg)</Label>
                  <Input id="weight" type="number" step="0.1" value={formData.weight} onChange={(e) => set("weight", e.target.value)} placeholder="70" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Taille (cm)</Label>
                  <Input id="height" type="number" value={formData.height} onChange={(e) => set("height", e.target.value)} placeholder="175" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bf">% Masse grasse</Label>
                  <Input id="bf" type="number" step="0.1" value={formData.body_fat_percent} onChange={(e) => set("body_fat_percent", e.target.value)} placeholder="15" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waist">Tour de taille (cm)</Label>
                  <Input id="waist" type="number" value={formData.waist_cm} onChange={(e) => set("waist_cm", e.target.value)} placeholder="80" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="morphotype">Morphotype</Label>
                  <Select value={formData.morphotype} onValueChange={(v) => set("morphotype", v)}>
                    <SelectTrigger id="morphotype"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ectomorphe">Ectomorphe (mince)</SelectItem>
                      <SelectItem value="mesomorphe">Mésomorphe (athlétique)</SelectItem>
                      <SelectItem value="endomorphe">Endomorphe (massif)</SelectItem>
                    </SelectContent>
                  </Select>
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
            </CardContent>
          </Card>

          {/* Pratique martiale */}
          <Card className="liquid-glass-solid border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-primary" /> Pratique martiale</CardTitle>
              <CardDescription>Ton niveau et ton expérience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fitness_level">Niveau global</Label>
                  <Select value={formData.fitness_level} onValueChange={(v) => set("fitness_level", v)}>
                    <SelectTrigger id="fitness_level"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Débutant</SelectItem>
                      <SelectItem value="intermediate">Intermédiaire</SelectItem>
                      <SelectItem value="advanced">Avancé</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discipline">Discipline principale</Label>
                  <Input id="discipline" value={formData.martial_arts_discipline}
                    onChange={(e) => set("martial_arts_discipline", e.target.value)}
                    placeholder="MMA, Boxe, Muay Thai..." />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="years">Années de pratique</Label>
                  <Input id="years" type="number" value={formData.years_practice}
                    onChange={(e) => set("years_practice", e.target.value)} placeholder="3" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="belt">Grade / Ceinture</Label>
                  <Input id="belt" value={formData.belt_rank}
                    onChange={(e) => set("belt_rank", e.target.value)} placeholder="Bleue..." />
                </div>
                <div className="space-y-2">
                  <Label>Niveau compétition</Label>
                  <Select value={formData.competition_level} onValueChange={(v) => set("competition_level", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="regional">Régional</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                      <SelectItem value="international">International / pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="combats">Nombre de combats</Label>
                  <Input id="combats" type="number" value={formData.competitions_count}
                    onChange={(e) => set("competitions_count", e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Disciplines secondaires</Label>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINES.map(d => (
                    <Button key={d} type="button" size="sm"
                      variant={formData.secondary_disciplines.includes(d) ? "default" : "outline"}
                      onClick={() => toggleArr("secondary_disciplines", d)}>{d}</Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Objectifs */}
          <Card className="liquid-glass-solid border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Objectifs</CardTitle>
              <CardDescription>Ce que tu veux accomplir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {GOALS.map(g => (
                  <Button key={g.value} type="button"
                    variant={formData.goals.includes(g.value) ? "default" : "outline"}
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => toggleArr("goals", g.value)}>
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-xs text-center leading-tight">{g.label}</span>
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Priorité n°1</Label>
                  <Select value={formData.primary_goal} onValueChange={(v) => set("primary_goal", v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {GOALS.filter(g => formData.goals.includes(g.value)).map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.icon} {g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Échéance</Label>
                  <Input id="deadline" type="date" value={formData.goal_deadline}
                    onChange={(e) => set("goal_deadline", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event">Événement cible</Label>
                  <Input id="event" value={formData.target_event}
                    onChange={(e) => set("target_event", e.target.value)} placeholder="Combat, ceinture..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lifestyle */}
          <Card className="liquid-glass-solid border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Moon className="h-5 w-5 text-primary" /> Lifestyle & récupération</CardTitle>
              <CardDescription>La clé d'une vraie performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sleep">Sommeil (h/nuit)</Label>
                  <Input id="sleep" type="number" step="0.5" value={formData.sleep_hours}
                    onChange={(e) => set("sleep_hours", e.target.value)} placeholder="7.5" />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label>Stress : {formData.stress_level}/10</Label>
                  <Slider min={1} max={10} step={1}
                    value={[formData.stress_level]}
                    onValueChange={(v) => set("stress_level", v[0])} className="py-3" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekly">Séances / semaine</Label>
                  <Input id="weekly" type="number" value={formData.weekly_availability}
                    onChange={(e) => set("weekly_availability", e.target.value)} placeholder="4" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dur">Durée séance (min)</Label>
                  <Input id="dur" type="number" value={formData.preferred_session_duration}
                    onChange={(e) => set("preferred_session_duration", e.target.value)} placeholder="60" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lieu principal</Label>
                <div className="grid grid-cols-3 gap-2 max-w-md">
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
            </CardContent>
          </Card>

          <div className="flex justify-end sticky bottom-4">
            <Button type="submit" size="lg" className="gap-2 shadow-xl">
              <Save className="h-4 w-4" /> Enregistrer les modifications
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
