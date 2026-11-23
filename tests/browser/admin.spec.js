import { test, expect } from "@playwright/test";
import { mockStore } from "./store-mock.js";
import { addMunique, fillCustomer } from "./helpers.js";

async function adminLogin(page) {
  await page.goto("/#/admin");
  await page.getByLabel("E-mail").fill("junior@example.com");
  await page.getByLabel("Senha").fill("password-test");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test("conta sem permissão não acessa o painel", async ({ page }) => {
  await mockStore(page);
  await adminLogin(page);
  await expect(
    page.getByRole("heading", { name: "Acesso restrito" }),
  ).toBeVisible();
});

test("Júnior vê o pedido com a logomarca e atualiza o status", async ({
  page,
}) => {
  const state = await mockStore(page, { staff: true });
  await page.goto("/");
  await addMunique(page);
  await page
    .getByRole("button", { name: "Meu carrinho 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await fillCustomer(page);
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido #42 pronto para envio" }),
  ).toBeVisible();
  await adminLogin(page);
  await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
  await page.getByRole("link", { name: /#42/ }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido #42", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Brasília/DF")).toBeVisible();
  await expect(page.getByText("Preto, Azul")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver", exact: true }),
  ).toHaveAttribute(
    "href",
    /\/storage\/v1\/object\/sign\/order-files\/.+token=/,
  );
  await expect(
    page.getByRole("link", { name: /Conversar com o cliente/ }),
  ).toHaveAttribute("href", "https://wa.me/5561999990000");
  await page.getByLabel("Status do pedido 42").selectOption("in_contact");
  await expect.poll(() => state.orders[0].status).toBe("in_contact");
});

test("Júnior edita produto, destaca, reordena e troca o WhatsApp", async ({
  page,
}) => {
  const state = await mockStore(page, { staff: true });
  await adminLogin(page);
  await page.getByRole("link", { name: "Produtos" }).click();
  await page.getByLabel("Buscar produtos no painel").fill("Koalla");
  await page
    .getByRole("button", {
      name: "Destaque: Garrafa Térmica Koalla",
      exact: true,
    })
    .click();
  await expect
    .poll(() => state.products.find((p) => p.id === "SB-002").featured)
    .toBe(true);
  await page.getByLabel("Buscar produtos no painel").fill("");
  await page
    .getByRole("button", { name: "Mover Garrafa Térmica Koalla para cima" })
    .click();
  await expect.poll(() => state.reorders.length).toBe(1);
  expect(state.reorders[0].slice(0, 2)).toEqual(["SB-002", "SB-001"]);

  await page.getByRole("link", { name: "Garrafa Térmica Munique" }).click();
  await expect(
    page.getByRole("heading", { name: "Garrafa Térmica Munique", level: 1 }),
  ).toBeVisible();
  await page.getByLabel("Adicionar em Cores disponíveis").fill("Verde");
  await page.getByLabel("Adicionar em Cores disponíveis").press("Enter");
  await page.getByLabel("Preço unitário (R$)").fill("19,90");
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.getByText("Produto salvo")).toBeVisible();
  const munique = state.products.find((p) => p.id === "SB-001");
  expect(munique.colors).toEqual(["Preto", "Azul", "Branco", "Verde"]);
  expect(munique.unit_price).toBe(19.9);

  await page.getByRole("link", { name: "Configurações" }).click();
  await page.getByLabel("Novo número").fill("11987654321");
  await page.getByRole("button", { name: "Salvar número" }).click();
  await expect(page.getByText("Número salvo")).toBeVisible();
  expect(state.settings.whatsapp).toBe("5511987654321");
  await page.getByRole("link", { name: "Ver loja" }).click();
  await expect(
    page.getByRole("link", { name: /Atendimento personalizado/ }),
  ).toHaveAttribute("href", "https://wa.me/5511987654321");
});

test("novo produto aparece no catálogo da loja", async ({ page }) => {
  const state = await mockStore(page, { staff: true });
  await adminLogin(page);
  await page.goto("/#/admin/produtos/novo");
  await expect(page.getByLabel("Código *")).toHaveValue("SB-112");
  await page.getByLabel("Nome *").fill("Caneca Cerâmica Sanes");
  await page.getByLabel("Categoria *").selectOption("Térmicos e bebidas");
  await page.getByLabel("Pedido mínimo *").fill("24");
  await page.getByRole("button", { name: "Salvar produto" }).click();
  await expect(page.getByText("Produto salvo")).toBeVisible();
  expect(state.products.at(-1).id).toBe("SB-112");
  await page.goto("/");
  await page.getByLabel("Buscar produtos").fill("Caneca Cerâmica");
  await expect(page.locator(".product-card")).toHaveCount(1);
});
