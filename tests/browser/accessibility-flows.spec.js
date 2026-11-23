import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockStore } from "./store-mock.js";
import { addMunique, fillCustomer, openProduct } from "./helpers.js";

async function audit(page, name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      screen: name,
      id: v.id,
      nodes: v.nodes.map((n) => n.html),
    })),
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("personalização, carrinho, dados e envio sem violações detectadas", async ({
  page,
}) => {
  await mockStore(page);
  await page.goto("/");
  await openProduct(page, "Munique", "Garrafa Térmica Munique");
  await page.getByRole("button", { name: "Preto", exact: true }).click();
  await page.getByRole("button", { name: "Azul", exact: true }).click();
  await page.getByLabel("Dividir a quantidade entre as cores").check();
  await audit(page, "personalização");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await addMunique(page);
  await page
    .getByRole("button", { name: "Meu carrinho 1", exact: true })
    .click();
  await audit(page, "carrinho");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(page.getByLabel("Nome completo *")).toBeFocused();
  await audit(page, "dados com erros");
  await fillCustomer(page);
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(
    page.getByRole("heading", { name: /pronto para envio/ }),
  ).toBeVisible();
  await audit(page, "envio");
});

test("painel administrativo sem violações detectadas", async ({ page }) => {
  await mockStore(page, { staff: true });
  await page.goto("/#/admin");
  await audit(page, "login do painel");
  await page.getByLabel("E-mail").fill("junior@example.com");
  await page.getByLabel("Senha").fill("password-test");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
  await audit(page, "pedidos");
  for (const [link, heading] of [
    ["Produtos", "Produtos"],
    ["Categorias", "Categorias"],
    ["Configurações", "Configurações"],
  ]) {
    await page.getByRole("link", { name: link, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: heading, level: 1 }),
    ).toBeVisible();
    await audit(page, link);
  }
  await page.goto("/#/admin/produtos/SB-001");
  await expect(page.getByLabel("Nome *")).toHaveValue(
    "Garrafa Térmica Munique",
  );
  await audit(page, "editor de produto");
});

test("painel cabe em celular de 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await mockStore(page, { staff: true });
  await page.goto("/#/admin");
  await page.getByLabel("E-mail").fill("junior@example.com");
  await page.getByLabel("Senha").fill("password-test");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  for (const hash of [
    "#/admin/pedidos",
    "#/admin/produtos",
    "#/admin/produtos/SB-001",
    "#/admin/categorias",
    "#/admin/configuracoes",
  ]) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { width, content } = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(content, hash).toBeLessThanOrEqual(width + 1);
    if (process.env.CAPTURE_SCREENSHOTS === "1")
      await page.screenshot({
        path: test.info().outputPath(`admin-${hash.split("/").pop()}.png`),
        fullPage: true,
      });
  }
});
