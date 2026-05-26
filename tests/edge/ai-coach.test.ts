// ----------------------------------------------------------------------------
// Harness pour la fonction ai-coach.
//
// On valide la logique de gating (refus si quota dépassé, refus si pas d'auth,
// acceptation profil minimal) à travers un dispatcher local mimant les
// décisions de production.
// ----------------------------------------------------------------------------

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

interface GateInput {
  hasAuth: boolean;
  quotaUsed: number;
  quotaLimit: number;
  role: "user" | "coach" | "admin";
}

function gate(input: GateInput): { allowed: boolean; reason?: string } {
  if (!input.hasAuth) return { allowed: false, reason: "unauthenticated" };
  if (input.role === "admin" || input.role === "coach") return { allowed: true };
  if (input.quotaUsed >= input.quotaLimit) return { allowed: false, reason: "quota_exceeded" };
  return { allowed: true };
}

Deno.test("ai-coach rejects unauthenticated requests", () => {
  const r = gate({ hasAuth: false, quotaUsed: 0, quotaLimit: 10, role: "user" });
  assertEquals(r.allowed, false);
  assertEquals(r.reason, "unauthenticated");
});

Deno.test("ai-coach refuses when quota is exhausted", () => {
  const r = gate({ hasAuth: true, quotaUsed: 10, quotaLimit: 10, role: "user" });
  assertEquals(r.allowed, false);
  assertEquals(r.reason, "quota_exceeded");
});

Deno.test("ai-coach accepts a minimal valid profile under quota", () => {
  const r = gate({ hasAuth: true, quotaUsed: 0, quotaLimit: 10, role: "user" });
  assertEquals(r.allowed, true);
  assert(r.reason === undefined);
});

Deno.test("ai-coach bypasses quota for admin and coach roles", () => {
  const admin = gate({ hasAuth: true, quotaUsed: 999, quotaLimit: 10, role: "admin" });
  const coach = gate({ hasAuth: true, quotaUsed: 999, quotaLimit: 10, role: "coach" });
  assertEquals(admin.allowed, true);
  assertEquals(coach.allowed, true);
});
