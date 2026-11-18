import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockStore } from "./store-mock.js";
test.beforeEach(async ({ page }) => {
  await mockStore(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
test("main page has no detected WCAG A/AA violations", async ({ page }) => {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ html: n.html, summary: n.failureSummary })),
    })),
  ).toEqual([]);
});
test("personalization starts on its quantity field and traps custom tabindex controls", async ({
  page,
}) => {
  await page.getByLabel("Buscar produtos").fill("Munique");
  await page
    .getByRole("button", {
      name: "Personalizar Garrafa Térmica Munique",
      exact: true,
    })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").locator("input[type=number]"),
  ).toBeFocused();
  await page.getByRole("dialog").evaluate((el) => {
    const control = document.createElement("div");
    control.tabIndex = 0;
    control.textContent = "Controle de teste";
    control.setAttribute("data-test-focus", "last");
    el.appendChild(control);
  });
  await page.locator("[data-test-focus=last]").focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Fechar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator("[data-test-focus=last]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("reduced-motion keeps titles readable and disables click sparks", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .getByRole("link", { name: "Encontre seu brinde", exact: true })
    .click();
  expect(await page.locator("canvas[aria-hidden=true]").count()).toBe(0);
});
