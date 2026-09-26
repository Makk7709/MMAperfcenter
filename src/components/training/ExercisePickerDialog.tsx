import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useExercises } from "@/hooks/useTraining";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface ExercisePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (exerciseId: string) => void;
}

export function ExercisePickerDialog({ open, onOpenChange, onPick }: ExercisePickerDialogProps) {
  const { data: exercises = [], isLoading } = useExercises();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(exercises.map((e) => e.category))].sort((a, b) => a.localeCompare(b, "fr")), [exercises]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return exercises.filter(
      (e) =>
        (!category || e.category === category) &&
        (!q || normalize(e.name).includes(q) || e.muscle_groups?.some((m) => normalize(m).includes(q))),
    );
  }, [exercises, query, category]);

  const pick = (id: string) => {
    onPick(id);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5">
          <p className="korev-eyebrow">Séance / Exercices</p>
          <DialogTitle className="font-display text-xl uppercase">Ajouter un exercice</DialogTitle>
          <DialogDescription className="sr-only">Recherchez un exercice par nom ou par groupe musculaire.</DialogDescription>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Squat, dorsaux, gainage…"
              aria-label="Rechercher un exercice"
              className="pl-9"
            />
          </div>
          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "all"}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "shrink-0 border px-3 py-1.5 text-xs font-medium transition-colors",
                  category === c ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {c ?? "Tous"}
              </button>
            ))}
          </div>
        </DialogHeader>

        <ul className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Exercices">
          {isLoading && <li className="p-4 text-sm text-muted-foreground">Chargement…</li>}
          {!isLoading && filtered.length === 0 && <li className="p-4 text-sm text-muted-foreground">Aucun exercice ne correspond.</li>}
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => pick(e.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{e.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{e.muscle_groups?.join(" · ")}</span>
                </span>
                <span className="korev-eyebrow shrink-0 text-[10px]">{e.category}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
