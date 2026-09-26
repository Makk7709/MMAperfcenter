import { useEffect, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { unlockAudio } from "@/lib/training/sound";
import { cn } from "@/lib/utils";
import type { SessionExercise, SessionSet } from "@/hooks/useTraining";

type SetValues = Partial<Pick<SessionSet, "weight_kg" | "reps" | "completed">>;

interface ExerciseBlockProps {
  exercise: SessionExercise;
  disabled?: boolean;
  onAddSet: () => void;
  onUpdateSet: (setId: string, values: SetValues) => Promise<unknown>;
  onDeleteSet: (setId: string) => void;
  onRemove: () => void;
  /** Called when a set is validated, to start the rest countdown. */
  onSetDone: (restSeconds: number) => void;
}

export function ExerciseBlock({ exercise, disabled, onAddSet, onUpdateSet, onDeleteSet, onRemove, onSetDone }: ExerciseBlockProps) {
  const done = exercise.sets.filter((s) => s.completed).length;
  return (
    <article className="liquid-glass-solid p-4 sm:p-5" aria-label={exercise.exercise.name}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold uppercase leading-tight tracking-tight">{exercise.exercise.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {exercise.exercise.muscle_groups?.join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="korev-eyebrow">
            <span className="text-foreground">{done}</span>/{exercise.sets.length}
          </span>
          <RemoveExerciseButton name={exercise.exercise.name} setsDone={done} disabled={disabled} onRemove={onRemove} />
        </div>
      </header>

      <div className="mt-4 grid grid-cols-[2rem_1fr_1fr_2.75rem_2rem] items-center gap-2 px-1 korev-eyebrow text-[10px]">
        <span>N°</span>
        <span>Kg</span>
        <span>Rép.</span>
        <span className="text-center">Fait</span>
        <span className="sr-only">Supprimer</span>
      </div>
      <ol className="mt-1.5 space-y-1.5">
        {exercise.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            disabled={disabled}
            onUpdate={(values) => onUpdateSet(set.id, values)}
            onDelete={() => onDeleteSet(set.id)}
            onDone={() => onSetDone(exercise.rest_seconds)}
          />
        ))}
      </ol>

      <Button variant="ghost" size="sm" className="mt-3 w-full border border-dashed border-border text-muted-foreground hover:text-foreground" onClick={onAddSet} disabled={disabled}>
        <Plus className="h-4 w-4" />
        Ajouter une série
      </Button>
    </article>
  );
}

// Validated sets are real training data: removing them takes a confirmation.
function RemoveExerciseButton({ name, setsDone, disabled, onRemove }: {
  name: string;
  setsDone: number;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
      onClick={setsDone === 0 ? onRemove : undefined}
      disabled={disabled}
      aria-label={`Retirer ${name}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
  if (setsDone === 0) return trigger;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer {name} ?</AlertDialogTitle>
          <AlertDialogDescription>
            {setsDone === 1 ? "La série validée sera supprimée" : `Les ${setsDone} séries validées seront supprimées`} de cette séance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Garder l'exercice</AlertDialogCancel>
          <AlertDialogAction onClick={onRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Retirer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const toNumber = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function SetRow({ set, disabled, onUpdate, onDelete, onDone }: {
  set: SessionSet;
  disabled?: boolean;
  onUpdate: (values: SetValues) => Promise<unknown>;
  onDelete: () => void;
  onDone: () => void;
}) {
  const [weight, setWeight] = useState(String(set.weight_kg));
  const [reps, setReps] = useState(String(set.reps));

  useEffect(() => setWeight(String(set.weight_kg)), [set.weight_kg]);
  useEffect(() => setReps(String(set.reps)), [set.reps]);

  const values = () => ({ weight_kg: Math.min(999, toNumber(weight)), reps: Math.min(999, Math.round(toNumber(reps))) });

  const commit = () => {
    const v = values();
    if (v.weight_kg !== set.weight_kg || v.reps !== set.reps) void onUpdate(v);
  };

  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (saving) return;
    unlockAudio();
    const completing = !set.completed;
    setSaving(true);
    try {
      const saved = await onUpdate({ ...values(), completed: completing });
      if (completing && saved) onDone();
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    "h-10 w-full min-w-0 border border-input bg-input px-2 text-center font-display text-base font-semibold tabular-nums",
    "focus-visible:border-primary focus-visible:outline-none disabled:opacity-60",
  );

  return (
    <li className={cn("grid grid-cols-[2rem_1fr_1fr_2.75rem_2rem] items-center gap-2 px-1 py-0.5", set.completed && "opacity-80")}>
      <span className="korev-metric text-center text-sm text-muted-foreground">{set.set_number}</span>
      <input
        aria-label={`Charge de la série ${set.set_number}, en kilos`}
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={commit}
        onFocus={(e) => e.target.select()}
        disabled={disabled || set.completed}
        className={inputClass}
      />
      <input
        aria-label={`Répétitions de la série ${set.set_number}`}
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={commit}
        onFocus={(e) => e.target.select()}
        disabled={disabled || set.completed}
        className={inputClass}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-busy={saving}
        aria-pressed={set.completed}
        aria-label={set.completed ? `Série ${set.set_number} validée, annuler` : `Valider la série ${set.set_number}`}
        className={cn(
          "flex h-10 w-full items-center justify-center border transition-colors disabled:opacity-60",
          set.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-korev-deep/50 text-muted-foreground hover:border-primary hover:text-primary",
        )}
      >
        <Check className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Supprimer la série ${set.set_number}`}
        className="flex h-10 items-center justify-center text-muted-foreground/60 hover:text-destructive disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}
