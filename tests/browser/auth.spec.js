import { test, expect } from "@playwright/test";
import { mockStore, USER_ID } from "./store-mock.js";
test("registration requires email confirmation and recovery remains available", async ({
  page,
}) => {
  await mockStore(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Entrar na conta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Criar uma conta", exact: true })
    .click();
  await page.getByLabel("Seu nome", { exact: true }).fill("Cliente");
  await page.getByLabel("E-mail da conta").fill("cliente@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("password-test");
  const signup = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/auth/v1/signup",
  );
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  expect(new URL((await signup).url()).searchParams.get("redirect_to")).toBe(
    "http://127.0.0.1:4175/conta",
  );
  await expect(page.getByRole("status")).toContainText("confirme o cadastro");
  await page
    .getByRole("button", { name: "Esqueci a senha", exact: true })
    .click();
  const recovery = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/auth/v1/recover",
  );
  await page
    .getByRole("button", { name: "Enviar instruções", exact: true })
    .click();
  expect(new URL((await recovery).url()).searchParams.get("redirect_to")).toBe(
    "http://127.0.0.1:4175/conta",
  );
  await expect(page.getByRole("status")).toContainText("Se houver uma conta");
});
test("password recovery callback opens the password-change screen", async ({
  page,
}) => {
  await mockStore(page);
  const token = [
    Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url"),
    Buffer.from(
      JSON.stringify({
        sub: USER_ID,
        role: "authenticated",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url"),
    "test",
  ].join(".");
  await page.goto(
    `/#access_token=${token}&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=recovery`,
  );
  await expect(
    page.getByRole("heading", { name: "Escolha uma nova senha", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Senha", { exact: true }).fill("updated-password-test");
  await page
    .getByRole("button", { name: "Salvar nova senha", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Minha conta", exact: true }),
  ).toBeVisible();
});

test("rodapé dá acesso à conta do comprador e ao painel", async ({ page }) => {
  await mockStore(page);
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByText("11.893.105/0001-33")).toBeVisible();
  await footer.getByRole("link", { name: "Área do comprador" }).click();
  await expect(
    page.getByRole("heading", { name: "Área do comprador" }),
  ).toBeVisible();
  await page.getByLabel("E-mail da conta").fill("cliente@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("password-test");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Meus pedidos" }),
  ).toBeVisible();
  await footer.getByRole("link", { name: "Painel administrativo" }).click();
  await expect(
    page.getByRole("heading", { name: "Acesso restrito" }),
  ).toBeVisible();
});

test("recuperação administrativa retorna ao painel", async ({ page }) => {
  await mockStore(page);
  await page.goto("/admin");
  await page.getByLabel("E-mail", { exact: true }).fill("junior@example.com");
  const recovery = page.waitForRequest(
    (request) => new URL(request.url()).pathname === "/auth/v1/recover",
  );
  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  expect(new URL((await recovery).url()).searchParams.get("redirect_to")).toBe(
    "http://127.0.0.1:4175/admin",
  );
  await expect(page.getByRole("status")).toContainText("receberá um link");
});
