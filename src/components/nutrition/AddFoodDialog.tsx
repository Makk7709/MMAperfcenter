import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodSearchInput } from "@/components/FoodSearchInput";
import { cn } from "@/lib/utils";
import {
  EMPTY_MACROS,
  MAX_PORTION_GRAMS,
  MEAL_TYPES,
  scaleMacros,
  type FoodProduct,
  type Macros,
  type MealType,
} from "@/lib/nutrition";
import type { NewNutritionLog } from "@/hooks/useNutrition";

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string;
  dayLabel: string;
  defaultMeal: MealType;
  /** Product coming from the barcode scanner. */
  initialProduct?: FoodProduct | null;
  pending: boolean;
  onSubmit: (log: NewNutritionLog) => Promise<unknown>;
}

const PORTIONS = [30, 50, 100, 150, 200, 250];

const MACRO_FIELDS: { key: keyof Macros; label: string; step: string }[] = [
  { key: "calories", label: "Kcal", step: "1" },
  { key: "protein", label: "Protéines", step: "0.1" },
  { key: "carbs", label: "Glucides", step: "0.1" },
  { key: "fat", label: "Lipides", step: "0.1" },
];

const Chip = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      "border px-3 py-1.5 text-xs font-medium transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/40 hover:border-korev-gold/50",
    )}
  >
    {children}
  </button>
);

export function AddFoodDialog({
  open,
  onOpenChange,
  dateKey,
  dayLabel,
  defaultMeal,
  initialProduct,
  pending,
  onSubmit,
}: AddFoodDialogProps) {
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [name, setName] = useState(
    initialProduct ? (initialProduct.brand ? `${initialProduct.name} (${initialProduct.brand})` : initialProduct.name) : "",
  );
  const [per100, setPer100] = useState<Macros>(initialProduct?.per100 ?? EMPTY_MACROS);
  const [source, setSource] = useState<"off" | "manual" | null>(initialProduct ? "off" : null);
  const [serving, setServing] = useState(initialProduct?.servingGrams);
  const [grams, setGrams] = useState(initialProduct?.servingGrams ?? 100);

  const total = useMemo(() => scaleMacros(per100, grams), [per100, grams]);
  const ready = !!source && name.trim().length > 0 && grams > 0 && total.calories > 0;

  const pickProduct = (food: FoodProduct) => {
    setPer100(food.per100);
    setSource("off");
    setServing(food.servingGrams);
    setGrams(food.servingGrams ?? 100);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    try {
      await onSubmit({
        date: dateKey,
        meal_type: meal,
        food_name: `${name.trim().slice(0, 150)} (${grams} g)`,
        calories: total.calories,
        protein_g: total.protein,
        carbs_g: total.carbs,
        fat_g: total.fat,
      });
      onOpenChange(false);
    } catch {
      // Error toast comes from the mutation; the dialog stays open for a retry.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <p className="korev-eyebrow">Nutrition · {dayLabel}</p>
          <DialogTitle className="font-display text-2xl uppercase">Ajouter un aliment</DialogTitle>
          <DialogDescription>Valeurs Open Food Facts pour 100 g, ajustées à la quantité consommée.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="korev-eyebrow mb-2">Repas</legend>
            <div className="flex flex-wrap gap-1.5">
              {MEAL_TYPES.map((m) => (
                <Chip key={m.value} active={meal === m.value} onClick={() => setMeal(m.value)}>
                  {m.label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label className="korev-eyebrow text-[11px] font-normal">Aliment</Label>
            <FoodSearchInput
              value={name}
              onChange={(v) => {
                setName(v);
                if (!v && source === "off") setSource(null);
              }}
              onFoodSelect={pickProduct}
              placeholder="Poulet, riz, skyr, banane…"
            />
            {!source && (
              <button type="button" onClick={() => setSource("manual")} className="text-xs text-korev-gold hover:underline">
                Saisir les valeurs nutritionnelles moi-même
              </button>
            )}
          </div>

          {source && (
            <div className="space-y-3 border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <p className="korev-eyebrow">Pour 100 g</p>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {source === "off" ? "Open Food Facts · modifiable" : "Saisie manuelle"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MACRO_FIELDS.map((f) => (
                  <div key={f.key}>
                    <Label htmlFor={`per100-${f.key}`} className="text-[10px] text-muted-foreground">{f.label}</Label>
                    <Input
                      id={`per100-${f.key}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={f.step}
                      value={per100[f.key] || ""}
                      onChange={(e) => setPer100({ ...per100, [f.key]: Math.max(0, Number(e.target.value) || 0) })}
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {source && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="food-grams" className="korev-eyebrow text-[11px] font-normal">Quantité consommée</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="food-grams"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_PORTION_GRAMS}
                    value={grams || ""}
                    onChange={(e) => setGrams(Math.min(MAX_PORTION_GRAMS, Math.max(0, Math.round(Number(e.target.value) || 0))))}
                    className="h-9 w-24 text-right"
                  />
                  <span className="text-sm text-muted-foreground">g</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {serving && (
                  <Chip active={grams === serving} onClick={() => setGrams(serving)}>
                    1 portion · {serving} g
                  </Chip>
                )}
                {PORTIONS.map((g) => (
                  <Chip key={g} active={grams === g && grams !== serving} onClick={() => setGrams(g)}>
                    {g} g
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {source && (
            <div className="korev-frame korev-chamfer p-4 [--chamfer:12px]">
              <div className="flex items-baseline justify-between">
                <p className="korev-eyebrow">Total pour {grams || 0} g</p>
                <p className="korev-metric text-3xl leading-none">
                  {total.calories}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">kcal</span>
                </p>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {([
                  ["Protéines", total.protein],
                  ["Glucides", total.carbs],
                  ["Lipides", total.fat],
                ] as const).map(([label, value]) => (
                  <div key={label} className="flex flex-col-reverse bg-background/50 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                    <dd className="korev-metric text-base">{value.toLocaleString("fr-FR")} g</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={pending || !ready}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ajouter au journal
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
