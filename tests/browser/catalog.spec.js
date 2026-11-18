import { test, expect } from "@playwright/test";
import { mockStore } from "./store-mock.js";
test.beforeEach(async ({ page }) => {
  await mockStore(page);
});
test("missing photos have a neutral placeholder and no generic product image", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Buscar produtos").fill("Munique");
  const card = page.locator(".product-card");
  await expect(card.getByText("Foto em breve", { exact: true })).toBeVisible();
  await expect(card.locator("img")).toHaveCount(0);
  await expect(card.locator(".product-badge")).toHaveCount(0);
});
test("product links can be loaded directly, refreshed and shared", async ({
  page,
}) => {
  await page.goto("/#/produto/SB-104");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Garrafa Térmica Koalla Collor",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Compartilhar no WhatsApp" }),
  ).toHaveAttribute("href", /SB-104/);
  await page.getByRole("button", { name: "Personalizar e adicionar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("link", { name: "Voltar ao catálogo" }).click();
  await expect(page.locator("#catalogo")).toBeVisible();
});
test("maximum minimum-order filter hides unconfirmed quantities", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Pedido mínimo máximo", { exact: true })
    .selectOption("30");
  await page.getByLabel("Buscar produtos").fill("Koalla Collor");
  await expect(page.locator(".product-card")).toHaveCount(0);
  await page
    .getByLabel("Pedido mínimo máximo", { exact: true })
    .selectOption("");
  await expect(page.locator(".product-card")).toHaveCount(1);
});
