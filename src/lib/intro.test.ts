import { describe, expect, it } from "vitest";
import { shouldPlayIntro } from "./intro";

describe("shouldPlayIntro", () => {
  const base = { pathname: "/", seen: false, reducedMotion: false };

  it("plays on the first visit of the session", () => {
    expect(shouldPlayIntro(base)).toBe(true);
    expect(shouldPlayIntro({ ...base, pathname: "/auth" })).toBe(true);
  });

  it("plays only once per session", () => {
    expect(shouldPlayIntro({ ...base, seen: true })).toBe(false);
  });

  it("respects the reduced-motion preference", () => {
    expect(shouldPlayIntro({ ...base, reducedMotion: true })).toBe(false);
  });

  it("skips pages reached from an email or payment link", () => {
    expect(shouldPlayIntro({ ...base, pathname: "/payment-success" })).toBe(false);
    expect(shouldPlayIntro({ ...base, pathname: "/reset-password" })).toBe(false);
    expect(shouldPlayIntro({ ...base, pathname: "/legal" })).toBe(false);
    expect(shouldPlayIntro({ ...base, pathname: "/legalese" })).toBe(true);
  });
});
