import { addDays, format, parseISO, startOfDay, subDays } from "date-fns";

/**
 * Calendar day ("YYYY-MM-DD") in the user's time zone. `toISOString()` gives the
 * UTC day, which files anything logged between midnight and 2 a.m. in France on
 * the previous day.
 */
export const toDateKey = (date: Date = new Date()): string => format(date, "yyyy-MM-dd");

/** Local midnight of a "YYYY-MM-DD" key (`new Date(key)` would be UTC midnight). */
export const fromDateKey = (key: string): Date => parseISO(key);

export const shiftDateKey = (key: string, days: number): string => toDateKey(addDays(fromDateKey(key), days));

/** Day key of a stored timestamp (e.g. `completed_at`), in the user's time zone. */
export const timestampToDateKey = (timestamp: string): string => toDateKey(new Date(timestamp));

/** The `count` day keys ending today, oldest first. */
export const lastDateKeys = (count: number, today: Date = new Date()): string[] =>
  Array.from({ length: count }, (_, i) => toDateKey(subDays(today, count - 1 - i)));

/** ISO timestamp of local midnight `days` days ago, for `completed_at >= …` filters. */
export const startOfDayDaysAgo = (days: number, today: Date = new Date()): string =>
  startOfDay(subDays(today, days)).toISOString();
