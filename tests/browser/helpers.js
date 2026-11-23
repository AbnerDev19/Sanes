import { expect } from "@playwright/test";

// PNG 1x1 válido (assinatura real) usado como logomarca de teste.
export const LOGO = {
  name: "logo empresa.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a6d00000000049454e44ae426082",
    "hex",
  ),
};

export async function openProduct(page, search, name) {
  await page.getByLabel("Buscar produtos").fill(search);
  await page
    .getByRole("button", { name: `Personalizar ${name}`, exact: true })
    .first()
    .click();
}

// SB-001 no simulador tem cores (Preto, Azul, Branco) e modelos (500/750 ml).
export async function addMunique(page, { logo = true } = {}) {
  await openProduct(page, "Munique", "Garrafa Térmica Munique");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Preto", exact: true }).click();
  await dialog.getByRole("button", { name: "Azul", exact: true }).click();
  await dialog.getByLabel("Modelo *").selectOption("750 ml");
  await dialog.getByLabel("Observações").fill("Logo centralizada");
  if (logo) {
    await dialog.getByLabel("Selecionar logomarca ou arte").setInputFiles(LOGO);
    await expect(dialog.getByText("logo empresa.png")).toBeVisible();
  }
  await dialog
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function fillCustomer(page) {
  await page.getByLabel("Nome completo *").fill("Maria Souza");
  await page.getByLabel("Telefone / WhatsApp *").fill("61999990000");
  await page.getByLabel("Cidade *").fill("Brasília");
  await page.getByLabel("Estado *").selectOption("DF");
}
