import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ backend: { checkoutRequests: unknown[] } }>({
  backend: [
    async ({ page }, use) => {
      const user = {
        id: "00000000-0000-4000-8000-000000000001",
        aud: "authenticated",
        role: "authenticated",
        email: "fighter@example.test",
        email_confirmed_at: new Date().toISOString(),
        user_metadata: { full_name: "Test Fighter" },
      };
      const profile = {
        ...user,
        full_name: "Test Fighter",
        age: 28,
        height: 180,
        weight: 80,
        fitness_level: "intermediaire",
        martial_arts_discipline: "mma",
        goals: ["performance"],
      };
      const session = {
        access_token: "e2e-token",
        refresh_token: "e2e-refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user,
      };
      const checkoutRequests: unknown[] = [];
      const food: Record<string, unknown>[] = [];
      await page.route("https://world.openfoodfacts.org/**", (route) =>
        route.fulfill({ json: { products: [] } }),
      );
      await page.route("https://e2e.supabase.co/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        const json = (value: unknown, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(value),
          });
        if (path === "/auth/v1/token") return json(session);
        if (path === "/auth/v1/user") return json(user);
        if (path === "/functions/v1/check-subscription")
          return json({ plan: "free", status: "active", subscribed: false });
        if (path === "/functions/v1/create-checkout") {
          checkoutRequests.push(request.postDataJSON());
          return json({
            url: "http://127.0.0.1:4177/payment-success?session_id=cs_e2e",
          });
        }
        if (path === "/functions/v1/fetch-mma-results")
          return json({ results: [] });
        if (path === "/functions/v1/ai-coach")
          return json(
            { error: "Quota de test atteint", code: "FEATURE_LIMIT_REACHED" },
            402,
          );
        if (path.startsWith("/rest/v1/rpc/")) {
          if (path.endsWith("has_feature_access")) return json(true);
          if (path.endsWith("get_feature_limit")) return json(3);
          return json([]);
        }
        const table = path.split("/").pop();
        const single = (request.headers().accept ?? "").includes(
          "vnd.pgrst.object",
        );
        if (table === "profiles") return json(single ? profile : [profile]);
        if (table === "subscriptions") {
          const row = { user_id: user.id, plan: "free", status: "active" };
          return json(single ? row : [row]);
        }
        if (table === "nutrition_logs") {
          if (request.method() === "POST") {
            const payload = request.postDataJSON();
            food.push({
              ...(Array.isArray(payload) ? payload[0] : payload),
              id: "food-" + food.length,
            });
          }
          return json(single ? food.at(-1) : food);
        }
        if (single) return json(null);
        return json([]);
      });
      await use({ checkoutRequests });
    },
    { auto: true },
  ],
});
export { expect };
export async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("fighter@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("Test-password-42!");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /^MMA Performance/ }),
  ).toBeVisible();
}
