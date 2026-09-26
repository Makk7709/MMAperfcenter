import { useEffect, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Plus, ScanLine, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { AddFoodDialog } from "@/components/nutrition/AddFoodDialog";
import { useNutrition, type NutritionGoals } from "@/hooks/useNutrition";
import { fromDateKey, shiftDateKey, toDateKey } from "@/lib/dateKey";
import { defaultMealType, MEAL_TYPES, type FoodProduct, type MealType } from "@/lib/nutrition";
import { cn } from "@/lib/utils";

interface NutritionTrackerProps {
  /** Incremented by the dashboard to open the barcode scanner. */
  scanRequest?: number;
}

const dayLabelOf = (key: string) => {
  const d = fromDateKey(key);
  if (isToday(d)) return "Aujourd'hui";
  if (isYesterday(d)) return "Hier";
  return format(d, "EEEE d MMMM", { locale: fr });
};

const fmt = (n: number) => n.toLocaleString("fr-FR");

const pct = (value: number, target: number) => (target > 0 ? Math.min(100, (value / target) * 100) : 0);

const MACROS = [
  { key: "protein", goal: "daily_protein_g", label: "Protéines", bar: "bg-primary" },
  { key: "carbs", goal: "daily_carbs_g", label: "Glucides", bar: "bg-foreground/50" },
  { key: "fat", goal: "daily_fat_g", label: "Lipides", bar: "bg-corner-blue" },
] as const;

const GOAL_FIELDS: { key: keyof NutritionGoals; label: string; max: number }[] = [
  { key: "daily_calories", label: "Calories (kcal / jour)", max: 10000 },
  { key: "daily_protein_g", label: "Protéines (g / jour)", max: 1000 },
  { key: "daily_carbs_g", label: "Glucides (g / jour)", max: 2000 },
  { key: "daily_fat_g", label: "Lipides (g / jour)", max: 1000 },
];

export const NutritionTracker = ({ scanRequest = 0 }: NutritionTrackerProps) => {
  const todayKey = toDateKey();
  const [dateKey, setDateKey] = useState(todayKey);
  const { logs, totals, week, goals, isLoading, isError, addLog, adding, deleteLog, deletingId, saveGoals, savingGoals } =
    useNutrition(dateKey);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [add, setAdd] = useState<{ open: boolean; key: number; meal: MealType; product: FoodProduct | null }>({
    open: false,
    key: 0,
    meal: "snack",
    product: null,
  });
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalsForm, setGoalsForm] = useState<Record<keyof NutritionGoals, string>>({
    daily_calories: "",
    daily_protein_g: "",
    daily_carbs_g: "",
    daily_fat_g: "",
  });

  useEffect(() => {
    if (scanRequest > 0) setScannerOpen(true);
  }, [scanRequest]);

  const isTodaySelected = dateKey === todayKey;
  const dayLabel = dayLabelOf(dateKey);
  const remaining = goals.daily_calories - totals.calories;

  const openAdd = (meal?: MealType, product: FoodProduct | null = null) =>
    setAdd((s) => ({
      open: true,
      key: s.key + 1,
      meal: meal ?? (isTodaySelected ? defaultMealType() : "lunch"),
      product,
    }));

  const openGoals = () => {
    setGoalsForm({
      daily_calories: String(goals.daily_calories),
      daily_protein_g: String(goals.daily_protein_g),
      daily_carbs_g: String(goals.daily_carbs_g),
      daily_fat_g: String(goals.daily_fat_g),
    });
    setGoalsOpen(true);
  };

  const submitGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveGoals({
        daily_calories: Math.round(Number(goalsForm.daily_calories)),
        daily_protein_g: Math.round(Number(goalsForm.daily_protein_g)),
        daily_carbs_g: Math.round(Number(goalsForm.daily_carbs_g)),
        daily_fat_g: Math.round(Number(goalsForm.daily_fat_g)),
      });
      setGoalsOpen(false);
    } catch {
      // Error toast comes from the mutation.
    }
  };

  const weekMax = Math.max(goals.daily_calories, ...week.map((d) => d.calories)) || 1;

  return (
    <section className="liquid-glass-solid space-y-6 p-4 sm:p-6" aria-labelledby="nutrition-title">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="korev-eyebrow">Nutrition de combat</p>
          <h2 id="nutrition-title" className="korev-display mt-1 truncate text-3xl first-letter:uppercase">
            {dayLabel}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setDateKey(shiftDateKey(dateKey, -1))} aria-label="Jour précédent">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDateKey(shiftDateKey(dateKey, 1))}
            disabled={isTodaySelected}
            aria-label="Jour suivant"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={openGoals} aria-label="Modifier mes objectifs">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {!isTodaySelected && (
        <button type="button" onClick={() => setDateKey(todayKey)} className="-mt-3 text-xs font-medium text-korev-gold hover:underline">
          Revenir à aujourd'hui
        </button>
      )}

      <div className="grid gap-5 sm:grid-cols-[1.1fr_1fr]">
        <div className="korev-frame korev-chamfer p-5 [--chamfer:14px]">
          <p className="korev-eyebrow">Calories</p>
          <p className="korev-metric mt-2 text-5xl leading-none">
            {totals.calories.toLocaleString("fr-FR")}
            <span className="ml-2 text-sm font-normal text-muted-foreground">/ {goals.daily_calories.toLocaleString("fr-FR")} kcal</span>
          </p>
          <div className="mt-4 h-2 overflow-hidden bg-muted" role="progressbar" aria-valuenow={totals.calories} aria-valuemin={0} aria-valuemax={goals.daily_calories} aria-label="Calories consommées">
            <div className="h-full bg-gradient-primary transition-[width] duration-700" style={{ width: `${pct(totals.calories, goals.daily_calories)}%` }} />
          </div>
          <p className={cn("mt-2 text-sm", remaining < 0 ? "text-primary" : "text-muted-foreground")}>
            {remaining >= 0 ? `${remaining.toLocaleString("fr-FR")} kcal restantes` : `${(-remaining).toLocaleString("fr-FR")} kcal au-dessus de l'objectif`}
          </p>
        </div>

        <dl className="space-y-3.5 self-center">
          {MACROS.map((m) => (
            <div key={m.key}>
              <div className="flex items-baseline justify-between text-sm">
                <dt className="text-muted-foreground">{m.label}</dt>
                <dd className="korev-metric">
                  {Math.round(totals[m.key])}
                  <span className="text-xs font-normal text-muted-foreground"> / {goals[m.goal]} g</span>
                </dd>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden bg-muted">
                <div className={cn("h-full transition-[width] duration-700", m.bar)} style={{ width: `${pct(totals[m.key], goals[m.goal])}%` }} />
              </div>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <p className="korev-eyebrow mb-3">7 derniers jours</p>
        <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Calories des 7 derniers jours">
          {week.map((d) => {
            const selected = d.date === dateKey;
            const date = fromDateKey(d.date);
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setDateKey(d.date)}
                aria-pressed={selected}
                aria-label={`${format(date, "EEEE d MMMM", { locale: fr })} : ${d.calories} kcal`}
                className="group flex flex-col items-center gap-1.5"
              >
                <span className="relative flex h-16 w-full items-end bg-muted/40">
                  <span
                    className="absolute inset-x-0 border-t border-dashed border-korev-gold/40"
                    style={{ bottom: `${(goals.daily_calories / weekMax) * 100}%` }}
                    aria-hidden
                  />
                  <span
                    className={cn("w-full transition-[height]", selected ? "bg-gradient-primary" : "bg-foreground/25 group-hover:bg-foreground/40")}
                    style={{ height: `${(d.calories / weekMax) * 100}%` }}
                  />
                </span>
                <span className={cn("text-[10px] uppercase", selected ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {format(date, "EEEEEE", { locale: fr })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" aria-label="Chargement" />}
        {isError && <p className="text-sm text-destructive">Le journal de ce jour n'a pas pu être chargé.</p>}
        {!isLoading && !isError && logs.length === 0 && (
          <p className="border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Rien de noté {isTodaySelected ? "aujourd'hui" : "ce jour-là"}. Scannez un produit ou recherchez un aliment.
          </p>
        )}
        {MEAL_TYPES.map((meal) => {
          const items = logs.filter((l) => l.meal_type === meal.value);
          if (items.length === 0) return null;
          const kcal = items.reduce((s, l) => s + l.calories, 0);
          return (
            <div key={meal.value}>
              <div className="flex items-center justify-between border-b border-border pb-1.5">
                <p className="korev-eyebrow">{meal.label}</p>
                <div className="flex items-center gap-2">
                  <span className="korev-metric text-sm">{kcal} <span className="text-xs font-normal text-muted-foreground">kcal</span></span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAdd(meal.value)} aria-label={`Ajouter au ${meal.label.toLowerCase()}`}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <ul>
                {items.map((log) => (
                  <li key={log.id} className="flex items-center gap-2 border-b border-border/50 py-2 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{log.food_name}</p>
                      <p className="text-xs text-muted-foreground">
                        P {fmt(log.protein_g)} g · G {fmt(log.carbs_g)} g · L {fmt(log.fat_g)} g
                      </p>
                    </div>
                    <span className="korev-metric shrink-0 text-sm">{log.calories}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteLog(log.id)}
                      disabled={deletingId === log.id}
                      aria-label={`Retirer ${log.food_name}`}
                    >
                      {deletingId === log.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setScannerOpen(true)}>
          <ScanLine className="h-4 w-4" />
          Scanner
        </Button>
        <Button onClick={() => openAdd()}>
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      <AddFoodDialog
        key={add.key}
        open={add.open}
        onOpenChange={(open) => setAdd((s) => ({ ...s, open }))}
        dateKey={dateKey}
        dayLabel={dayLabel}
        defaultMeal={add.meal}
        initialProduct={add.product}
        pending={adding}
        onSubmit={addLog}
      />

      <BarcodeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onProductFound={(p) => openAdd(undefined, p)} />

      <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <p className="korev-eyebrow">Nutrition</p>
            <DialogTitle className="font-display text-2xl uppercase">Mes objectifs</DialogTitle>
            <DialogDescription>Apports visés par jour, utilisés pour les barres de progression.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitGoals} className="space-y-4">
            {GOAL_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`goal-${f.key}`}>{f.label}</Label>
                <Input
                  id={`goal-${f.key}`}
                  type="number"
                  inputMode="numeric"
                  min={f.key === "daily_calories" ? 500 : 0}
                  max={f.max}
                  value={goalsForm[f.key]}
                  onChange={(e) => setGoalsForm({ ...goalsForm, [f.key]: e.target.value })}
                  required
                />
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={savingGoals}>
              {savingGoals && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};
