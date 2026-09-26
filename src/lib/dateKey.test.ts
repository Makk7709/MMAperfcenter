import { describe, expect, it } from "vitest";
import { fromDateKey, lastDateKeys, shiftDateKey, startOfDayDaysAgo, timestampToDateKey, toDateKey } from "./dateKey";

describe("dateKey", () => {
  it("uses the local calendar day, not the UTC one", () => {
    const lateEvening = new Date(2026, 8, 26, 23, 30);
    const justAfterMidnight = new Date(2026, 8, 27, 0, 30);
    expect(toDateKey(lateEvening)).toBe("2026-09-26");
    expect(toDateKey(justAfterMidnight)).toBe("2026-09-27");
  });

  it("parses a key as local midnight", () => {
    const d = fromDateKey("2026-09-26");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 26, 0]);
  });

  it("shifts across month boundaries", () => {
    expect(shiftDateKey("2026-09-30", 1)).toBe("2026-10-01");
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("maps a timestamp to the local day", () => {
    const local = new Date(2026, 8, 27, 0, 15);
    expect(timestampToDateKey(local.toISOString())).toBe("2026-09-27");
  });

  it("lists the last days oldest first", () => {
    expect(lastDateKeys(3, new Date(2026, 8, 1, 12))).toEqual(["2026-08-30", "2026-08-31", "2026-09-01"]);
  });

  it("gives local midnight for range filters", () => {
    const iso = startOfDayDaysAgo(6, new Date(2026, 8, 26, 15));
    const d = new Date(iso);
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([20, 0, 0]);
  });
});
