import { test, expect } from "@playwright/test";
import { mockStore } from "./store-mock.js";
test.beforeEach(async ({ page }) => {
  await mockStore(page);
});

async function fits(page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    dialogs: [...document.querySelectorAll("[role=dialog]")].map((el) => ({
      width: el.clientWidth,
      content: el.scrollWidth,
    })),
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
  for (const dialog of dimensions.dialogs)
    expect(dialog.content).toBeLessThanOrEqual(dialog.width + 1);
}

for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
  test(`catalog and quote fit ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 768 ? 740 : 900 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".stroke-text__svg")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.fonts.status), {
        message: "Local fonts finish loading",
      })
      .toBe("loaded");
    await fits(page);
    if (width < 1024) {
      const menu = page.getByRole("button", { name: "Abrir menu" });
      await expect(menu).toBeVisible();
      await menu.click();
      await expect(
        page.getByRole("navigation", { name: "Navegação no celular" }),
      ).toBeVisible();
      await fits(page);
      await page
        .getByRole("navigation", { name: "Navegação no celular" })
        .getByRole("link", { name: "Catálogo", exact: true })
        .click();
      await expect(
        page.getByRole("navigation", { name: "Navegação no celular" }),
      ).toHaveCount(0);
    } else
      await expect(
        page.getByRole("button", { name: "Abrir menu" }),
      ).toBeHidden();
    await page.getByLabel("Buscar produtos").fill("Munique");
    await expect(page.locator(".product-card")).toHaveCount(1);
    await fits(page);
    await page
      .getByRole("button", {
        name: "Personalizar Garrafa Térmica Munique",
        exact: true,
      })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await fits(page);
    await page
      .getByLabel("Observações")
      .fill(
        "Uma personalização para o evento da empresa com uma frase longa e a marca em destaque.",
      );
    if (width < 768)
      expect(
        await page
          .getByLabel("Observações")
          .evaluate((el) => getComputedStyle(el).fontSize),
      ).toBe("16px");
    await page.getByLabel("Modelo *").selectOption("750 ml");
    await page
      .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Meu carrinho 1", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Meu carrinho 1", exact: true }),
    ).toBeVisible();
    await fits(page);
    await page
      .getByRole("button", {
        name: "Aumentar quantidade de Garrafa Térmica Munique",
        exact: true,
      })
      .click();
    await expect(
      page.getByLabel("Quantidade de Garrafa Térmica Munique", { exact: true }),
    ).toHaveValue("31");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByLabel("Nome completo *").fill("Teste de responsividade");
    await expect(
      page.getByRole("button", { name: /Finalizar pedido/ }),
    ).toBeVisible();
    await fits(page);
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.getByLabel("Buscar produtos").fill("");
    await page.locator("#contato").scrollIntoViewIfNeeded();
    await fits(page);
    if (process.env.CAPTURE_SCREENSHOTS === "1") {
      await page.screenshot({
        path: testInfo.outputPath(`sanes-${width}.png`),
        fullPage: true,
        animations: "disabled",
        timeout: 10000,
      });
    }
    expect(errors).toEqual([]);
  });
}
