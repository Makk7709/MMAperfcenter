import { describe, expect, it } from "vitest";
import { asMealType, defaultMealType, parseOffProduct, scaleMacros, sumMacros } from "./nutrition";

describe("defaultMealType", () => {
  const at = (h: number) => new Date(2026, 8, 26, h, 0);
  it("follows the time of day", () => {
    expect(defaultMealType(at(7))).toBe("breakfast");
    expect(defaultMealType(at(12))).toBe("lunch");
    expect(defaultMealType(at(16))).toBe("snack");
    expect(defaultMealType(at(20))).toBe("dinner");
    expect(defaultMealType(at(2))).toBe("snack");
  });
});

describe("asMealType", () => {
  it("falls back to snack on unknown values", () => {
    expect(asMealType("lunch")).toBe("lunch");
    expect(asMealType("brunch")).toBe("snack");
  });
});

describe("scaleMacros", () => {
  it("scales per-100 g values and keeps decimals", () => {
    expect(scaleMacros({ calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 }, 40)).toEqual({
      calories: 156,
      protein: 6.8,
      carbs: 26.5,
      fat: 2.8,
    });
  });
  it("never goes negative", () => {
    expect(scaleMacros({ calories: 100, protein: 1, carbs: 1, fat: 1 }, -5).calories).toBe(0);
  });
});

describe("sumMacros", () => {
  it("adds NUMERIC strings coming from PostgREST", () => {
    expect(
      sumMacros([
        { calories: 200, protein_g: "10.5", carbs_g: 20, fat_g: "3.2" },
        { calories: 100, protein_g: 4.6, carbs_g: "0", fat_g: 1 },
      ]),
    ).toEqual({ calories: 300, protein: 15.1, carbs: 20, fat: 4.2 });
  });
});

describe("parseOffProduct", () => {
  it("reads name, brand, macros and serving", () => {
    expect(
      parseOffProduct({
        product_name: "Skyr",
        product_name_fr: "Skyr nature",
        brands: "Siggi's, Arla",
        serving_quantity: "150",
        nutriments: { "energy-kcal_100g": 63, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 },
      }),
    ).toEqual({
      name: "Skyr nature",
      brand: "Siggi's",
      per100: { calories: 63, protein: 11, carbs: 4, fat: 0.2 },
      servingGrams: 150,
    });
  });
  it("derives kcal from kJ when needed", () => {
    expect(parseOffProduct({ product_name: "X", nutriments: { energy_100g: 418.4 } })?.per100.calories).toBe(100);
  });
  it("rejects products without nutrition data", () => {
    expect(parseOffProduct({ product_name: "Eau", nutriments: {} })).toBeNull();
    expect(parseOffProduct(null)).toBeNull();
  });
});
