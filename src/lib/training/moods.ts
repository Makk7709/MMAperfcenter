export const MOODS = [
  { value: "excellent", label: "Excellent", level: 5 },
  { value: "good", label: "Bien", level: 4 },
  { value: "neutral", label: "Neutre", level: 3 },
  { value: "tired", label: "Fatigué", level: 2 },
  { value: "bad", label: "Difficile", level: 1 },
] as const;

export type Mood = (typeof MOODS)[number]["value"];

export const moodOf = (value: string | null | undefined) => MOODS.find((m) => m.value === value) ?? MOODS[2];
