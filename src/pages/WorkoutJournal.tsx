import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Flame,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

const MOODS = [
  { value: "excellent", emoji: "🔥", label: "Excellent" },
  { value: "good", emoji: "💪", label: "Bien" },
  { value: "neutral", emoji: "😐", label: "Neutre" },
  { value: "tired", emoji: "😓", label: "Fatigué" },
  { value: "bad", emoji: "😞", label: "Difficile" },
];

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

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Fighter";

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement du carnet");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.title.trim()) { toast.error("Le titre est requis"); return; }
      const payload = {
        user_id: user?.id,
        date: formData.date,
        title: formData.title,
        notes: formData.notes,
        mood: formData.mood,
        energy_level: formData.energy_level,
        weight_kg: formData.weight_kg,
      };
      if (editingEntry) {
        const { error } = await supabase.from("workout_journal").update(payload).eq("id", editingEntry.id);
        if (error) throw error;
        toast.success("Entrée mise à jour");
      } else {
        const { error } = await supabase.from("workout_journal").insert([payload]);
        if (error) throw error;
        toast.success("Entrée ajoutée");
      }
      setDialogOpen(false);
      setEditingEntry(null);
      resetForm();
      loadEntries();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("workout_journal").delete().eq("id", id);
      if (error) throw error;
      toast.success("Entrée supprimée");
      loadEntries();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => setFormData({
    date: new Date().toISOString().split("T")[0],
    title: "", notes: "", mood: "neutral", energy_level: 5, weight_kg: undefined,
  });

  const openEditDialog = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date, title: entry.title, notes: entry.notes,
      mood: entry.mood, energy_level: entry.energy_level, weight_kg: entry.weight_kg,
    });
    setDialogOpen(true);
  };

  const monthCount = entries.filter((e) => new Date(e.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
  const avgEnergy = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.energy_level, 0) / entries.length) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName={userName} isPremium={true} onSignOut={() => signOut()} />

      <div className="container px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Hero header */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    Carnet d'entraînement
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Suis tes progrès, écoute tes sensations
                  </p>
                </div>
              </div>
              <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingEntry(null); resetForm(); } }}>
                <DialogTrigger asChild>
                  <Button size="lg" className="h-12 font-semibold shadow-lg shadow-primary/20">
                    <Plus className="h-5 w-5 mr-2" />
                    Nouvelle entrée
                  </Button>
                </DialogTrigger>
                <JournalDialog
                  editingEntry={editingEntry}
                  formData={formData}
                  setFormData={setFormData}
                  onSave={handleSave}
                />
              </Dialog>
            </div>

            {/* Inline stats */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <StatPill icon={Calendar} value={entries.length} label="Total" tone="primary" />
              <StatPill icon={TrendingUp} value={monthCount} label="Ce mois" tone="accent" />
              <StatPill icon={Zap} value={`${avgEnergy}/10`} label="Énergie moy." tone="warm" />
            </div>
          </div>

          {/* Entries */}
          {entries.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Ton carnet est vide</h3>
                <p className="text-muted-foreground mb-6 text-sm">
                  Commence à noter tes séances pour suivre ta progression
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Première entrée
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => {
                const mood = MOODS.find((m) => m.value === entry.mood) || MOODS[2];
                const date = new Date(entry.date);
                const dateLabel = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
                return (
                  <Card key={entry.id} className="group overflow-hidden hover:border-primary/40 transition-all">
                    <CardContent className="p-0">
                      <div className="flex">
                        {/* Date strip */}
                        <div className="w-20 flex-shrink-0 bg-muted/40 border-r border-border flex flex-col items-center justify-center py-4">
                          <span className="text-3xl font-bold text-primary leading-none">{date.getDate()}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                            {date.toLocaleDateString("fr-FR", { month: "short" })}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-foreground truncate">{entry.title}</h3>
                              <p className="text-[11px] text-muted-foreground capitalize">{dateLabel}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-2xl" title={mood.label}>{mood.emoji}</span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(entry)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(entry.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Metrics row */}
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-1.5">
                              <Flame className="h-3.5 w-3.5 text-orange-400" />
                              <span className="text-xs text-muted-foreground">Énergie</span>
                              <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-orange-400 to-primary"
                                  style={{ width: `${entry.energy_level * 10}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold tabular-nums">{entry.energy_level}/10</span>
                            </div>
                            {entry.weight_kg && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Dumbbell className="h-3.5 w-3.5" />
                                <span className="font-semibold text-foreground">{entry.weight_kg} kg</span>
                              </div>
                            )}
                          </div>

                          {entry.notes && (
                            <p className="text-sm text-foreground/75 whitespace-pre-line line-clamp-3">
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Sub-components
// ============================================

function StatPill({
  icon: Icon, value, label, tone,
}: { icon: React.ElementType; value: React.ReactNode; label: string; tone: "primary" | "accent" | "warm" }) {
  const tones = {
    primary: "text-primary bg-primary/10",
    accent: "text-emerald-400 bg-emerald-500/10",
    warm: "text-orange-400 bg-orange-500/10",
  };
  return (
    <div className="rounded-xl bg-background/40 border border-border p-3 flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-foreground leading-none tabular-nums">{value}</div>
        <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

function JournalDialog({
  editingEntry, formData, setFormData, onSave,
}: {
  editingEntry: JournalEntry | null;
  formData: any;
  setFormData: (v: any) => void;
  onSave: () => void;
}) {
  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          {editingEntry ? "Modifier l'entrée" : "Nouvelle entrée"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-5 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Date</Label>
            <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Poids (kg)</Label>
            <Input
              type="number" step="0.1" placeholder="Optionnel"
              value={formData.weight_kg ?? ""}
              onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value ? Number.parseFloat(e.target.value) : undefined })}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Titre</Label>
          <Input
            placeholder="Ex : Boxe technique + cardio"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1.5 h-11 text-base"
          />
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Humeur</Label>
          <div className="grid grid-cols-5 gap-2 mt-1.5">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setFormData({ ...formData, mood: m.value })}
                className={cn(
                  "rounded-lg border py-3 flex flex-col items-center gap-1 transition-all",
                  formData.mood === m.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/30 hover:border-primary/40"
                )}
              >
                <span className="text-2xl leading-none">{m.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Niveau d'énergie</Label>
            <span className="text-xl font-bold text-primary tabular-nums">{formData.energy_level}<span className="text-sm text-muted-foreground">/10</span></span>
          </div>
          <Slider
            value={[formData.energy_level]}
            onValueChange={([v]) => setFormData({ ...formData, energy_level: v })}
            min={1} max={10} step={1}
          />
        </div>

        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Notes</Label>
          <Textarea
            placeholder="Ressentis, exercices, points à retenir…"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1.5 min-h-[110px]"
          />
        </div>

        <Button onClick={onSave} className="w-full h-11 text-base font-semibold">
          {editingEntry ? "Mettre à jour" : "Enregistrer l'entrée"}
        </Button>
      </div>
    </DialogContent>
  );
}

export default WorkoutJournal;
