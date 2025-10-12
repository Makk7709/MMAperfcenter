import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Save } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { profile, loading, updateProfile } = useProfile();
  
  const [formData, setFormData] = useState({
    full_name: '',
    weight: '',
    height: '',
    gender: '',
    fitness_level: 'beginner',
    martial_arts_discipline: '',
    goals: '',
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        weight: profile.weight?.toString() || '',
        height: profile.height?.toString() || '',
        gender: profile.gender || '',
        fitness_level: profile.fitness_level || 'beginner',
        martial_arts_discipline: profile.martial_arts_discipline || '',
        goals: profile.goals?.join(', ') || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates = {
      full_name: formData.full_name || null,
      weight: formData.weight ? parseFloat(formData.weight as string) : null,
      height: formData.height ? parseInt(formData.height as string) : null,
      gender: formData.gender || null,
      fitness_level: formData.fitness_level || 'beginner',
      martial_arts_discipline: formData.martial_arts_discipline || null,
      goals: formData.goals ? formData.goals.split(',').map(g => g.trim()).filter(Boolean) : [],
    };

    await updateProfile(updates);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Mon Profil</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations personnelles */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>Vos informations de base</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Poids (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    placeholder="70.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Taille (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    placeholder="175"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Sexe</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Homme</SelectItem>
                      <SelectItem value="female">Femme</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fitness et Arts Martiaux */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle>Fitness & Arts Martiaux</CardTitle>
              <CardDescription>Votre niveau et discipline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fitness_level">Niveau de fitness</Label>
                  <Select value={formData.fitness_level} onValueChange={(value) => handleChange('fitness_level', value)}>
                    <SelectTrigger id="fitness_level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Débutant</SelectItem>
                      <SelectItem value="intermediate">Intermédiaire</SelectItem>
                      <SelectItem value="advanced">Avancé</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="martial_arts">Discipline d'arts martiaux</Label>
                  <Input
                    id="martial_arts"
                    value={formData.martial_arts_discipline}
                    onChange={(e) => handleChange('martial_arts_discipline', e.target.value)}
                    placeholder="MMA, Boxe, Muay Thai..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Objectifs</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => handleChange('goals', e.target.value)}
                  placeholder="Perdre du poids, gagner en force, améliorer technique (séparés par des virgules)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Séparez vos objectifs par des virgules
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" size="lg" className="gap-2">
              <Save className="h-4 w-4" />
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
