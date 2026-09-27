import { test, expect, signIn } from "./fixtures";

test("protected dashboard redirects to authentication", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth/);
  await expect(
    page.getByRole("button", { name: "Se connecter", exact: true }),
  ).toBeVisible();
});

for (const [width, height] of [
  [320, 568],
  [375, 667],
  [390, 844],
  [768, 1024],
  [1440, 900],
]) {
  test(`authenticated hero keeps both actions visible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await signIn(page);
    for (const name of ["Coach IA MMA", "Champion Access"]) {
      const button = page.getByRole("button", { name, exact: true });
      await expect(button).toBeVisible();
      const inside = await button.evaluate((el) => {
        const buttonRect = el.getBoundingClientRect();
        const hero = el.closest("section")!.getBoundingClientRect();
        return (
          buttonRect.top >= hero.top &&
          buttonRect.bottom <= hero.bottom &&
          buttonRect.left >= 0 &&
          buttonRect.right <= innerWidth
        );
      });
      expect(inside).toBe(true);
    }
  });
}

test("authenticated analysis dialog exposes the actual upload controls", async ({
  page,
}) => {
  await signIn(page);
  await page
    .getByRole("button", { name: /analyser.*sparring/i })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Importer une vidéo de sparring" }),
  ).toBeVisible();
  await expect(page.getByLabel("Comment vous reconnaître")).toBeEditable();
});

test("checkout sends the selected plan only after consent", async ({
  page,
  backend,
}) => {
  await signIn(page);
  await page.goto("/pricing");
  const pay = page.getByRole("button", { name: "Passer à Pro", exact: true });
  await pay.click();
  expect(backend.checkoutRequests).toHaveLength(0);
  await page.locator("#withdrawal-waiver").check();
  await pay.click();
  await expect.poll(() => backend.checkoutRequests.length).toBe(1);
  expect(backend.checkoutRequests[0]).toEqual({
    plan: "pro",
    withdrawalWaiver: true,
  });
  await expect(page).toHaveURL(/payment-success/);
});

test("plans whose features are not built cannot be bought", async ({
  page,
  backend,
}) => {
  await signIn(page);
  await page.goto("/pricing");
  const soon = page.getByRole("button", { name: "Bientôt disponible" });
  await expect(soon).toHaveCount(2);
  for (const button of await soon.all()) await expect(button).toBeDisabled();
  await expect(page.getByText(/Usage raisonnable/)).toBeVisible();
  expect(backend.checkoutRequests).toHaveLength(0);
});

test("unknown route shows a real 404 message", async ({ page }) => {
  await page.goto("/nonexistent-page-audit");
  await expect(
    page.getByRole("heading", { name: "Page introuvable", exact: true }),
  ).toBeVisible();
});

test("intro keeps keyboard focus inside the modal until skipped", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/auth");
  const dialog = page.getByRole("dialog", { name: "Introduction KOREV" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Passer" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Email", exact: true }),
  ).toBeVisible();
});

test("nutrition persists a manual meal with the portion-adjusted calories", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter un aliment" });
  await dialog
    .getByRole("button", {
      name: "Saisir les valeurs nutritionnelles moi-même",
    })
    .click();
  await dialog.getByLabel("Aliment", { exact: true }).fill("Riz de test");
  await dialog.getByLabel("Kcal", { exact: true }).fill("130");
  await dialog.getByLabel("Protéines", { exact: true }).fill("3");
  await dialog.getByLabel("Glucides", { exact: true }).fill("28");
  await dialog.getByLabel("Lipides", { exact: true }).fill("1");
  await dialog.getByLabel("Quantité consommée").fill("200");
  await dialog.getByRole("button", { name: "Ajouter au journal" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("progressbar", { name: "Calories consommées" }),
  ).toHaveAttribute("aria-valuenow", "260");
  await expect(
    page.getByRole("button", { name: "Retirer Riz de test" }),
  ).toBeVisible();
});
