export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "lunch", label: "Déjeuner" },
  { value: "snack", label: "Collation" },
  { value: "dinner", label: "Dîner" },
];

export const MEAL_LABELS: Record<MealType, string> = Object.fromEntries(
  MEAL_TYPES.map((m) => [m.value, m.label]),
) as Record<MealType, string>;

export const asMealType = (value: string): MealType =>
  MEAL_TYPES.some((m) => m.value === value) ? (value as MealType) : "snack";

/** Meal most likely being logged at this time of day. */
export const defaultMealType = (date: Date = new Date()): MealType => {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 15) return "lunch";
  if (h >= 18 && h < 23) return "dinner";
  return "snack";
};

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const EMPTY_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

const oneDecimal = (n: number) => Math.round(n * 10) / 10;

/** Physical ceilings per 100 g: pure fat is 900 kcal, no nutrient exceeds 100 g. */
export const PER100_MAX: Macros = { calories: 900, protein: 100, carbs: 100, fat: 100 };

export const clampPer100 = (m: Macros): Macros => ({
  calories: Math.min(PER100_MAX.calories, Math.max(0, m.calories)),
  protein: Math.min(PER100_MAX.protein, Math.max(0, m.protein)),
  carbs: Math.min(PER100_MAX.carbs, Math.max(0, m.carbs)),
  fat: Math.min(PER100_MAX.fat, Math.max(0, m.fat)),
});

/** Macros for `grams` of a food described per 100 g. Calories are whole numbers, the rest keep one decimal. */
export const scaleMacros = (per100: Macros, grams: number): Macros => {
  const ratio = Math.max(0, grams) / 100;
  return {
    calories: Math.round(per100.calories * ratio),
    protein: oneDecimal(per100.protein * ratio),
    carbs: oneDecimal(per100.carbs * ratio),
    fat: oneDecimal(per100.fat * ratio),
  };
};

interface LogMacros {
  calories: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
}

export const sumMacros = (logs: LogMacros[]): Macros =>
  logs.reduce<Macros>(
    (t, l) => ({
      calories: t.calories + (Number(l.calories) || 0),
      protein: oneDecimal(t.protein + (Number(l.protein_g) || 0)),
      carbs: oneDecimal(t.carbs + (Number(l.carbs_g) || 0)),
      fat: oneDecimal(t.fat + (Number(l.fat_g) || 0)),
    }),
    EMPTY_MACROS,
  );

export interface FoodProduct {
  name: string;
  brand?: string;
  per100: Macros;
  /** Grams in one serving, when the product declares it. */
  servingGrams?: number;
}

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Reads an Open Food Facts product (API v2). Returns null when it has no usable nutrition data. */
export const parseOffProduct = (product: unknown): FoodProduct | null => {
  if (!product || typeof product !== "object") return null;
  const p = product as Record<string, unknown>;
  const n = (p.nutriments ?? {}) as Record<string, unknown>;

  const kcal = num(n["energy-kcal_100g"]) || Math.round(num(n["energy_100g"]) / 4.184);
  const per100 = clampPer100({
    calories: Math.round(kcal),
    protein: oneDecimal(num(n.proteins_100g)),
    carbs: oneDecimal(num(n.carbohydrates_100g)),
    fat: oneDecimal(num(n.fat_100g)),
  });
  if (!per100.calories && !per100.protein && !per100.carbs && !per100.fat) return null;

  const name = String(p.product_name_fr || p.product_name || "").trim().slice(0, 120) || "Produit scanné";
  const brand = String(p.brands ?? "").split(",")[0].trim().slice(0, 40) || undefined;
  const serving = num(p.serving_quantity);

  return { name, brand, per100, servingGrams: serving >= 1 && serving <= 2000 ? Math.round(serving) : undefined };
};

export const MAX_PORTION_GRAMS = 2000;
