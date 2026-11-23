import { test, expect } from "@playwright/test";
import { mockStore, ANON_ID } from "./store-mock.js";
import { addMunique, fillCustomer, openProduct } from "./helpers.js";

async function openCheckout(page) {
  await page
    .getByRole("button", { name: "Meu carrinho 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
}

async function login(page) {
  await page
    .getByRole("button", { name: "Entrar na conta", exact: true })
    .click();
  await page.getByLabel("E-mail da conta").fill("cliente@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("password-test");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Minha conta", exact: true }),
  ).toBeVisible();
}

const message = async (page) =>
  decodeURIComponent(
    (await page
      .getByRole("link", { name: /Enviar pedido pelo WhatsApp/ })
      .getAttribute("href")) || "",
  );

test("visitante envia pedido com logomarca: arquivo vai ao armazenamento e o link vai na mensagem", async ({
  page,
}) => {
  const state = await mockStore(page);
  await page.goto("/");
  await addMunique(page);
  await page
    .getByRole("button", { name: "Meu carrinho 1", exact: true })
    .click();
  const cart = page.getByRole("dialog");
  await expect(cart.getByText("Preto, Azul")).toBeVisible();
  await expect(cart.getByText("750 ml")).toBeVisible();
  await expect(cart.getByText("logo empresa.png")).toBeVisible();
  await cart
    .getByLabel(/Observações gerais do pedido/)
    .fill("Entrega até dia 20");
  await cart.getByRole("button", { name: "Continuar", exact: true }).click();
  await cart.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(cart.getByText("Informe seu nome completo.")).toBeVisible();
  await expect(cart.getByText("Selecione o estado.")).toBeVisible();
  expect(state.calls).toHaveLength(0);
  await fillCustomer(page);
  await cart.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(
    cart.getByRole("heading", { name: "Pedido #42 pronto para envio" }),
  ).toBeVisible();
  expect(state.uploads).toHaveLength(1);
  expect(state.uploads[0].bucket).toBe("order-files");
  expect(state.uploads[0].path.startsWith(`${ANON_ID}/`)).toBe(true);
  expect(state.uploads[0].path).toMatch(/\.png$/);
  const item = state.calls[0].p_items[0];
  expect(item).not.toHaveProperty("unit_price");
  expect(item.colors.map((c) => c.name)).toEqual(["Preto", "Azul"]);
  expect(item.files[0].path).toBe(state.uploads[0].path);
  expect(state.calls[0].p_customer.state).toBe("DF");
  const link = await cart
    .getByRole("link", { name: /Enviar pedido pelo WhatsApp/ })
    .getAttribute("href");
  expect(link).toContain("https://wa.me/5561981333737?text=");
  const text = await message(page);
  for (const part of [
    "NOVO PEDIDO — SANES BRINDES",
    "Pedido nº 42",
    "Nome: Maria Souza",
    "Cidade: Brasília/DF",
    "Produto 1: Garrafa Térmica Munique (SB-001)",
    "Quantidade: 30 unidades",
    "Cor: Preto, Azul",
    "Modelo: 750 ml",
    "Logomarca: logo empresa.png — http://127.0.0.1:54321/storage/v1/object/sign/order-files/",
    "Observações: Logo centralizada",
    "OBSERVAÇÕES GERAIS:\nEntrega até dia 20",
    "#/admin/pedidos/",
    "Aguardo retorno para dar continuidade ao atendimento!",
  ])
    expect(text).toContain(part);
  // Sessão anônima de envio não vira "Minha conta".
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Entrar na conta", exact: true }),
  ).toBeVisible();
});

test("falha ao registrar preserva o carrinho, reusa a chave e oferece envio manual", async ({
  page,
}) => {
  const state = await mockStore(page, { failOrder: true });
  await page.addInitScript(() => {
    window.open = (url) => {
      window.__manual = url;
      return null;
    };
  });
  await page.goto("/");
  await addMunique(page);
  await openCheckout(page);
  await fillCustomer(page);
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Seu carrinho foi preservado",
  );
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect.poll(() => state.calls.length).toBe(2);
  expect(state.calls[1].p_request_key).toBe(state.calls[0].p_request_key);
  await page
    .getByRole("button", { name: /Enviar pelo WhatsApp sem registrar/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pedido pronto para envio" }),
  ).toBeVisible();
  await expect(page.getByText("Não esqueça das logomarcas")).toBeVisible();
  const manual = decodeURIComponent(await page.evaluate(() => window.__manual));
  expect(manual).toContain("logo empresa.png (vou anexar nesta conversa)");
  expect(manual).not.toContain("Pedido nº");
});

test("sem login anônimo habilitado, o erro é claro e há alternativa", async ({
  page,
}) => {
  await mockStore(page, { anonymousDisabled: true });
  await page.goto("/");
  await addMunique(page);
  await openCheckout(page);
  await fillCustomer(page);
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(page.getByRole("alert")).toContainText("envio seguro");
  await expect(
    page.getByRole("button", { name: /Enviar pelo WhatsApp sem registrar/ }),
  ).toBeVisible();
});

test("editar item do carrinho mantém a logomarca e valida a divisão por cor", async ({
  page,
}) => {
  await mockStore(page);
  await page.goto("/");
  await addMunique(page);
  await page
    .getByRole("button", { name: "Meu carrinho 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar Garrafa Térmica Munique" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("logo empresa.png")).toBeVisible();
  await dialog.locator("input[type=number]").first().fill("40");
  await dialog.getByLabel("Dividir a quantidade entre as cores").check();
  await dialog.getByLabel("Preto", { exact: true }).fill("10");
  await dialog.getByLabel("Azul", { exact: true }).fill("10");
  await dialog.getByRole("button", { name: /Salvar alterações/ }).click();
  await expect(dialog.getByRole("alert")).toContainText("soma 20");
  await dialog.getByLabel("Azul", { exact: true }).fill("30");
  await dialog.getByRole("button", { name: /Salvar alterações/ }).click();
  await expect(
    page.getByLabel("Quantidade de Garrafa Térmica Munique", { exact: true }),
  ).toHaveValue("40");
  await expect(page.getByText("Preto (10), Azul (30)")).toBeVisible();
  await expect(page.getByText("logo empresa.png")).toBeVisible();
  await page
    .getByRole("button", { name: "Remover Garrafa Térmica Munique" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meu carrinho 0" }),
  ).toBeVisible();
});

test("arquivo com extensão de imagem mas conteúdo inválido é recusado", async ({
  page,
}) => {
  await mockStore(page);
  await page.goto("/");
  await openProduct(page, "Munique", "Garrafa Térmica Munique");
  await page
    .getByRole("dialog")
    .getByLabel("Selecionar logomarca ou arte")
    .setInputFiles({
      name: "virus.png",
      mimeType: "image/png",
      buffer: Buffer.from("<script>alert(1)</script>"),
    });
  await expect(page.getByRole("alert")).toContainText(
    "não é um PNG, JPG ou PDF válido",
  );
  await expect(page.locator(".attachment-list")).toHaveCount(0);
});

test("cliente com conta registra o pedido e ele aparece no histórico", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockStore(page);
  await page.goto("/");
  await addMunique(page, { logo: false });
  await login(page);
  await openCheckout(page);
  await expect(page.getByLabel("Nome completo *")).toHaveValue("Cliente Teste");
  await page.getByLabel("Estado *").selectOption("DF");
  await page.getByRole("button", { name: /Finalizar pedido/ }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido #42 pronto para envio" }),
  ).toBeVisible();
  expect(state.uploads).toHaveLength(0);
  expect(state.calls[0].p_items[0].qty).toBe(30);
  expect(await message(page)).toContain("Logomarca: Não enviada");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Minha conta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido #42", exact: true }),
  ).toBeVisible();
});

test("sair da conta esconde o carrinho da conta do próximo visitante", async ({
  page,
}) => {
  await mockStore(page);
  await page.goto("/");
  await addMunique(page, { logo: false });
  await login(page);
  await page.getByRole("button", { name: "Minha conta", exact: true }).click();
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Entrar na conta", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Meu carrinho 0", exact: true }),
  ).toBeVisible();
});

test("WhatsApp de destino vem da configuração da loja", async ({ page }) => {
  await mockStore(page, { whatsapp: "5511987654321" });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /Atendimento personalizado/ }),
  ).toHaveAttribute("href", "https://wa.me/5511987654321");
});
