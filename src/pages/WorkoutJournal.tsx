import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { BookOpen, Dumbbell, Loader2, Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { MoodBars, MoodPicker } from "@/components/training/MoodPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fromDateKey, shiftDateKey, toDateKey } from "@/lib/dateKey";
import { moodOf } from "@/lib/training/moods";
import { asSessionType, SESSION_TYPE_LABELS } from "@/lib/training/session";

interface LinkedWorkout {
  name: string;
  session_type: string | null;
  duration_minutes: number | null;
  total_volume_kg: number | null;
  rounds_completed: number;
}

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  notes: string | null;
  mood: string;
  energy_level: number;
  weight_kg: number | null;
  workout: LinkedWorkout | null;
}

interface JournalForm {
  date: string;
  title: string;
  notes: string;
  mood: string;
  energy_level: number;
  weight: string;
}

const TITLE_MAX = 120;
const NOTES_MAX = 2000;

const emptyForm = (): JournalForm => ({
  date: toDateKey(),
  title: "",
  notes: "",
  mood: "neutral",
  energy_level: 5,
  weight: "",
});

const journalKey = (userId?: string) => ["journal", userId] as const;

const WorkoutJournal = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JournalForm>(emptyForm);
  const [toDelete, setToDelete] = useState<JournalEntry | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Fighter";

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: journalKey(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<JournalEntry[]> => {
      const { data, error } = await supabase
        .from("workout_journal")
        .select(
          "id, date, title, notes, mood, energy_level, weight_kg, workout:workouts(name, session_type, duration_minutes, total_volume_kg, rounds_completed)",
        )
        .eq("user_id", user!.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        weight_kg: row.weight_kg === null ? null : Number(row.weight_kg),
        workout: row.workout
          ? {
              ...row.workout,
              total_volume_kg: row.workout.total_volume_kg === null ? null : Number(row.workout.total_volume_kg),
            }
          : null,
      }));
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: journalKey(user?.id) });

  const save = useMutation({
    mutationFn: async (values: JournalForm) => {
      const weight = values.weight.trim() ? Number(values.weight.replace(",", ".")) : null;
      const payload = {
        date: values.date,
        title: values.title.trim().slice(0, TITLE_MAX),
        notes: values.notes.trim().slice(0, NOTES_MAX) || null,
        mood: values.mood,
        energy_level: values.energy_level,
        weight_kg: weight !== null && Number.isFinite(weight) ? weight : null,
      };
      const { error } = editingId
        ? await supabase.from("workout_journal").update(payload).eq("id", editingId)
        : await supabase.from("workout_journal").insert({ ...payload, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingId ? "Entrée mise à jour" : "Entrée ajoutée au carnet");
      setDialogOpen(false);
      void refresh();
    },
    onError: () => toast.error("L'entrée n'a pas pu être enregistrée"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_journal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrée supprimée");
      void refresh();
    },
    onError: () => toast.error("L'entrée n'a pas pu être supprimée"),
    onSettled: () => setToDelete(null),
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setForm({
      date: entry.date,
      title: entry.title,
      notes: entry.notes ?? "",
      mood: entry.mood,
      energy_level: entry.energy_level,
      weight: entry.weight_kg === null ? "" : String(entry.weight_kg),
    });
    setDialogOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Donnez un titre à cette entrée");
      return;
    }
    save.mutate(form);
  };

  const since = shiftDateKey(toDateKey(), -29);
  const recent = entries.filter((e) => e.date >= since);
  const avgEnergy = recent.length ? Math.round((recent.reduce((s, e) => s + e.energy_level, 0) / recent.length) * 10) / 10 : null;

  const stats = [
    { label: "Entrées", value: entries.length },
    { label: "30 derniers jours", value: recent.length },
    { label: "Énergie moyenne", value: avgEnergy === null ? "–" : `${avgEnergy.toLocaleString("fr-FR")}/10` },
  ];

  return (
    <div className="min-h-screen bg-korev-deep">
      <DashboardHeader userName={userName} onSignOut={() => signOut()} />

      <main className="container max-w-4xl space-y-8 px-4 py-8 md:py-12">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow parts={["Carnet", "D'entraînement"]} bullet />
            <h1 className="korev-display mt-3 text-4xl md:text-5xl">Vos sensations, séance après séance.</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Chaque séance terminée peut y laisser une note. Ajoutez aussi vos ressentis de repos, de pesée ou de sparring.
            </p>
          </div>
          <Button size="lg" onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4" />
            Nouvelle entrée
          </Button>
        </header>

        <dl className="grid grid-cols-3 gap-px border border-border bg-border">
          {stats.map((s) => (
            <div key={s.label} className="bg-card px-3 py-4 sm:px-5">
              <dt className="korev-eyebrow text-[10px]">{s.label}</dt>
              <dd className="korev-metric mt-1.5 text-2xl leading-none sm:text-3xl">{isLoading ? "–" : s.value}</dd>
            </div>
          ))}
        </dl>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Chargement du carnet" />
          </div>
        )}

        {isError && <p className="text-center text-destructive">Le carnet n'a pas pu être chargé. Rechargez la page.</p>}

        {!isLoading && !isError && entries.length === 0 && (
          <div className="border border-dashed border-border px-6 py-14 text-center">
            <BookOpen className="mx-auto h-7 w-7 text-korev-gold" />
            <h2 className="mt-4 font-display text-xl font-semibold uppercase">Votre carnet est vide</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Terminez une séance avec une note, ou écrivez votre première entrée maintenant.
            </p>
            <Button className="mt-6" onClick={openNew}>
              <Plus className="h-4 w-4" />
              Première entrée
            </Button>
          </div>
        )}

        <ol className="space-y-3">
          {entries.map((entry, i) => (
            <li key={entry.id} className="animate-korev-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <EntryCard entry={entry} onEdit={() => openEdit(entry)} onDelete={() => setToDelete(entry)} />
            </li>
          ))}
        </ol>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <p className="korev-eyebrow">Carnet</p>
            <DialogTitle className="font-display text-2xl uppercase">{editingId ? "Modifier l'entrée" : "Nouvelle entrée"}</DialogTitle>
            <DialogDescription>Comment vous sentiez-vous ? Ces notes vous aident à repérer fatigue et progrès.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="journal-date" className="korev-eyebrow text-[11px] font-normal">Date</Label>
                <Input
                  id="journal-date"
                  type="date"
                  max={toDateKey()}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value || toDateKey() })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="journal-weight" className="korev-eyebrow text-[11px] font-normal">Poids (kg)</Label>
                <Input
                  id="journal-weight"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={20}
                  max={300}
                  placeholder="Facultatif"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="journal-title" className="korev-eyebrow text-[11px] font-normal">Titre</Label>
              <Input
                id="journal-title"
                placeholder="Boxe technique et cardio"
                maxLength={TITLE_MAX}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="korev-eyebrow text-[11px] font-normal">Ressenti</Label>
              <MoodPicker value={form.mood} onChange={(mood) => setForm({ ...form, mood })} />
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <Label className="korev-eyebrow text-[11px] font-normal">Énergie</Label>
                <span className="korev-metric text-xl">
                  {form.energy_level}
                  <span className="text-sm font-normal text-muted-foreground">/10</span>
                </span>
              </div>
              <Slider
                value={[form.energy_level]}
                onValueChange={([v]) => setForm({ ...form, energy_level: v })}
                min={1}
                max={10}
                step={1}
                aria-label="Niveau d'énergie"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="journal-notes" className="korev-eyebrow text-[11px] font-normal">Notes</Label>
              <Textarea
                id="journal-notes"
                placeholder="Ressentis, exercices, points à retenir…"
                maxLength={NOTES_MAX}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="min-h-[110px]"
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Enregistrer les modifications" : "Ajouter au carnet"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && !remove.isPending && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {toDelete?.title} » sera définitivement retirée du carnet.
              {toDelete?.workout && " La séance associée reste dans votre historique."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) remove.mutate(toDelete.id);
              }}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function EntryCard({ entry, onEdit, onDelete }: { entry: JournalEntry; onEdit: () => void; onDelete: () => void }) {
  const date = fromDateKey(entry.date);
  const mood = moodOf(entry.mood);
  const w = entry.workout;

  return (
    <article className="liquid-glass-solid flex overflow-hidden">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-border bg-korev-deep/50 py-4 sm:w-20">
        <span className="korev-metric text-3xl leading-none text-korev-gold">{format(date, "d")}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{format(date, "MMM", { locale: fr })}</span>
        <span className="text-[10px] uppercase text-muted-foreground">{format(date, "EEE", { locale: fr })}</span>
      </div>

      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold">{entry.title}</h2>
            <p className="text-xs text-muted-foreground first-letter:uppercase">{format(date, "EEEE d MMMM yyyy", { locale: fr })}</p>
          </div>
          <div className="flex shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={`Modifier « ${entry.title} »`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label={`Supprimer « ${entry.title} »`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="flex items-center gap-2">
            <MoodBars level={mood.level} />
            <span className="font-medium">{mood.label}</span>
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            Énergie
            <span className="h-1.5 w-14 overflow-hidden bg-muted" aria-hidden>
              <span className="block h-full bg-gradient-primary" style={{ width: `${entry.energy_level * 10}%` }} />
            </span>
            <span className="korev-metric text-foreground">{entry.energy_level}/10</span>
          </span>
          {entry.weight_kg !== null && (
            <span className="text-muted-foreground">
              Pesée <span className="korev-metric text-foreground">{entry.weight_kg.toLocaleString("fr-FR")} kg</span>
            </span>
          )}
        </div>

        {w && (
          <p className="mt-3 flex w-fit max-w-full items-start gap-2 border border-korev-gold/25 bg-korev-gold/5 px-2.5 py-1.5 text-xs">
            {w.rounds_completed > 0 ? <Timer className="h-3.5 w-3.5 shrink-0 text-korev-gold" /> : <Dumbbell className="h-3.5 w-3.5 shrink-0 text-korev-gold" />}
            <span>
              <span className="font-medium">{w.name}</span>
              <span className="text-muted-foreground">
                {" · "}
                {SESSION_TYPE_LABELS[asSessionType(w.session_type)]}
                {w.duration_minutes ? ` · ${w.duration_minutes} min` : ""}
                {w.rounds_completed > 0 ? ` · ${w.rounds_completed} rounds` : ""}
                {w.total_volume_kg ? ` · ${w.total_volume_kg.toLocaleString("fr-FR")} kg` : ""}
              </span>
            </span>
          </p>
        )}

        {entry.notes && <p className="mt-3 whitespace-pre-line text-sm text-foreground/80 line-clamp-4">{entry.notes}</p>}
      </div>
    </article>
  );
}

export default WorkoutJournal;
