import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeWhatsapp,
  whatsappLink,
  formatWhatsapp,
  WHATSAPP,
} from "../src/config.js";
import { routeFromHash } from "../src/lib/routes.js";

test("WhatsApp: normaliza, valida e monta o link com texto", () => {
  assert.equal(normalizeWhatsapp("(61) 98133-3737"), "5561981333737");
  assert.equal(normalizeWhatsapp("+55 61 98133-3737"), "5561981333737");
  assert.equal(normalizeWhatsapp("6133334444"), "556133334444");
  assert.equal(normalizeWhatsapp("123"), "");
  assert.equal(normalizeWhatsapp("5561081333737"), "");
  assert.equal(WHATSAPP, "5561981333737");
  assert.equal(
    whatsappLink("5511987654321", "Olá & tchau"),
    "https://wa.me/5511987654321?text=Ol%C3%A1%20%26%20tchau",
  );
  assert.equal(whatsappLink("inválido"), `https://wa.me/${WHATSAPP}`);
  assert.equal(formatWhatsapp("5561981333737"), "+55 (61) 98133-3737");
});

test("rotas por hash: início, produto e painel", () => {
  assert.deepEqual(routeFromHash(""), { name: "home" });
  assert.deepEqual(routeFromHash("#catalogo"), { name: "home" });
  assert.deepEqual(routeFromHash("#/produto/SB-104"), {
    name: "product",
    productId: "SB-104",
  });
  assert.deepEqual(routeFromHash("#/admin"), { name: "admin", path: "/" });
  assert.deepEqual(routeFromHash("#/admin/pedidos/1"), {
    name: "admin",
    path: "/pedidos/1",
  });
  assert.deepEqual(routeFromHash("#/administrar"), { name: "home" });
});
