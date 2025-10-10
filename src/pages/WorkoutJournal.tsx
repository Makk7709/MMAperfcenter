import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Calendar,
  TrendingUp,
  Dumbbell,
  Edit,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  title: string;
  notes: string;
  mood: string;
  energy_level: number;
  weight_kg?: number;
  created_at: string;
}

const WorkoutJournal = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    title: "",
    notes: "",
    mood: "neutral",
    energy_level: 5,
    weight_kg: undefined as number | undefined,
  });

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Fighter";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadEntries();
  }, [user, navigate]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("workout_journal")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error("Error loading entries:", error);
      toast.error("Erreur lors du chargement du carnet");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.title.trim()) {
        toast.error("Le titre est requis");
        return;
      }

      const entryData = {
        user_id: user?.id,
        date: formData.date,
        title: formData.title,
        notes: formData.notes,
        mood: formData.mood,
        energy_level: formData.energy_level,
        weight_kg: formData.weight_kg,
      };

      if (editingEntry) {
        const { error } = await supabase
          .from("workout_journal")
          .update(entryData)
          .eq("id", editingEntry.id);

        if (error) throw error;
        toast.success("Entrée mise à jour");
      } else {
        const { error } = await supabase
          .from("workout_journal")
          .insert([entryData]);

        if (error) throw error;
        toast.success("Entrée ajoutée au carnet");
      }

      setDialogOpen(false);
      setEditingEntry(null);
      resetForm();
      loadEntries();
    } catch (error: any) {
      console.error("Error saving entry:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("workout_journal")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Entrée supprimée");
      loadEntries();
    } catch (error: any) {
      console.error("Error deleting entry:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      title: "",
      notes: "",
      mood: "neutral",
      energy_level: 5,
      weight_kg: undefined,
    });
  };

  const openEditDialog = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      title: entry.title,
      notes: entry.notes,
      mood: entry.mood,
      energy_level: entry.energy_level,
      weight_kg: entry.weight_kg,
    });
    setDialogOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        userName={userName}
        isPremium={true}
        onSignOut={handleSignOut}
      />

      <div className="container px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-primary">
                  Carnet de Musculation
                </h1>
                <p className="text-muted-foreground">
                  Suivez vos progrès et vos sensations
                </p>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingEntry(null);
                    resetForm();
                  }}
                  size="lg"
                  className="bg-primary hover:bg-primary/80"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nouvelle Entrée
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-primary">
                    {editingEntry ? "Modifier l'entrée" : "Nouvelle entrée"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Titre de la séance</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Entraînement jambes"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes et observations</Label>
                    <Textarea
                      id="notes"
                      placeholder="Comment s'est passée la séance? Exercices réalisés, ressentis..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="bg-input border-border min-h-[120px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="mood">Humeur</Label>
                      <select
                        id="mood"
                        value={formData.mood}
                        onChange={(e) =>
                          setFormData({ ...formData, mood: e.target.value })
                        }
                        className="w-full bg-input border-border rounded-md px-3 py-2"
                      >
                        <option value="excellent">Excellent 😄</option>
                        <option value="good">Bien 🙂</option>
                        <option value="neutral">Neutre 😐</option>
                        <option value="tired">Fatigué 😓</option>
                        <option value="bad">Difficile 😞</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="energy">
                        Niveau d'énergie ({formData.energy_level}/10)
                      </Label>
                      <Input
                        id="energy"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.energy_level}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            energy_level: parseInt(e.target.value) || 5,
                          })
                        }
                        className="bg-input border-border"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="weight">Poids (kg) - optionnel</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="Ex: 75.5"
                      value={formData.weight_kg || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          weight_kg: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="bg-input border-border"
                    />
                  </div>
                  <Button onClick={handleSave} className="w-full">
                    {editingEntry ? "Mettre à jour" : "Enregistrer"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-gradient-card border-0 shadow-card p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {entries.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Entrées totales</p>
                </div>
              </div>
            </Card>
            <Card className="bg-gradient-card border-0 shadow-card p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-accent">
                    {entries.filter((e) => new Date(e.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Ce mois-ci</p>
                </div>
              </div>
            </Card>
            <Card className="bg-gradient-card border-0 shadow-card p-4">
              <div className="flex items-center gap-3">
                <Dumbbell className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-2xl font-bold text-secondary">
                    {entries.length > 0
                      ? Math.round(
                          entries.reduce((sum, e) => sum + e.energy_level, 0) /
                            entries.length
                        )
                      : 0}
                    /10
                  </p>
                  <p className="text-sm text-muted-foreground">Énergie moy.</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Entries List */}
          {entries.length === 0 ? (
            <Card className="bg-gradient-card border-0 shadow-card p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Votre carnet est vide
              </h3>
              <p className="text-muted-foreground mb-6">
                Commencez à noter vos séances pour suivre vos progrès
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-primary hover:bg-primary/80"
              >
                <Plus className="h-5 w-5 mr-2" />
                Première Entrée
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <Card
                  key={entry.id}
                  className="bg-gradient-card border-0 shadow-card p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-primary">
                          {entry.title}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Énergie: {entry.energy_level}/10</span>
                        <span>
                          Humeur:{" "}
                          {
                            {
                              excellent: "😄",
                              good: "🙂",
                              neutral: "😐",
                              tired: "😓",
                              bad: "😞",
                            }[entry.mood]
                          }
                        </span>
                        {entry.weight_kg && (
                          <span>Poids: {entry.weight_kg} kg</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(entry)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {entry.notes && (
                    <p className="text-foreground/80 whitespace-pre-line">
                      {entry.notes}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutJournal;
