import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanCart,
  mergeCarts,
  cartTotals,
  orderContactMessage,
  buildOrderMessage,
  combineCartItems,
} from "../src/lib/commerce.js";
const products = [
  { id: "A", nome: "Garrafa", min: 30, unit_price: 12.5 },
  { id: "B", nome: "Caneta", min: 50, unit_price: null },
];
const item = {
  id: "A",
  name: "Forged",
  key: "guest-key",
  qty: 30,
  color: "Azul",
  method: "Laser",
  text: "Logo",
};
test("guest merge preserves customizations without duplicating the same cart row", () => {
  const merged = mergeCarts(
    [item],
    [item, { ...item, key: "other", text: "Outro logo" }],
    products,
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].name, "Garrafa");
  assert.equal(merged[1].text, "Outro logo");
  assert.equal(
    cleanCart(
      [
        { ...item, qty: 1 },
        { ...item, id: "not-found" },
        { ...item, qty: 100001 },
      ],
      products,
    ).length,
    0,
  );
});
test("a quote is not displayed as a zero-valued purchase", () => {
  assert.deepEqual(cartTotals([item], products), { units: 30, total: 375 });
  assert.equal(
    cartTotals([item, { ...item, id: "B", qty: 50 }], products).total,
    null,
  );
  assert.equal(cartTotals([], products).total, null);
});
test("pedido salvo gera a mensagem no modelo da Sanes, sem duplicar anexos", () => {
  const message = orderContactMessage(
    {
      id: "order-id",
      number: 42,
      customer: {
        name: "Ana",
        email: "ana@example.com",
        phone: "(61) 99999-0000",
        city: "Brasília",
        state: "DF",
        notes: "Entrega em dezembro",
      },
      order_items: [
        {
          id: "i1",
          product_id: "A",
          product_name: "Garrafa",
          quantity: 30,
          color: "Azul",
          colors: [{ name: "Azul", qty: null }],
          variant: "750 ml",
          method: "Laser",
          details: "Logo",
        },
      ],
      order_files: [{ id: "f1", order_item_id: "i1", file_name: "arte.pdf" }],
    },
    { adminLink: "https://loja/#/admin/pedidos/order-id" },
  );
  for (const text of [
    "NOVO PEDIDO — SANES BRINDES",
    "Pedido nº 42",
    "Cidade: Brasília/DF",
    "Produto 1: Garrafa (A)",
    "Quantidade: 30 unidades",
    "Cor: Azul",
    "Modelo: 750 ml",
    "Personalização: Laser",
    "Logomarca: arte.pdf (enviada pelo site)",
    "OBSERVAÇÕES GERAIS:\nEntrega em dezembro",
    "Pedido completo: https://loja/#/admin/pedidos/order-id",
    "Aguardo retorno para dar continuidade ao atendimento!",
  ])
    assert.ok(message.includes(text), text);
  assert.ok(!message.includes("undefined"));
  assert.ok(!message.includes("vou anexar"));
});

test("mensagem sem registro pede anexo manual e usa links quando existem", () => {
  const items = [
    {
      id: "A",
      name: "Garrafa",
      qty: 40,
      colors: [
        { name: "Preto", qty: 10 },
        { name: "Azul", qty: 30 },
      ],
      variant: "",
      method: "",
      text: "",
      files: [
        { id: "f1", name: "logo.png" },
        { id: "f2", name: "manual.pdf" },
      ],
    },
  ];
  const customer = { name: "Ana", phone: "61", city: "Goiânia", state: "GO" };
  const message = buildOrderMessage({
    items,
    customer,
    fileLinks: new Map([["f1", "https://arquivo/logo"]]),
  });
  assert.ok(message.includes("Empresa: Não informada"));
  assert.ok(message.includes("Cor: Preto (10), Azul (30)"));
  assert.ok(message.includes("Modelo: Padrão"));
  assert.ok(message.includes("Logomarca 1: logo.png — https://arquivo/logo"));
  assert.ok(
    message.includes("Logomarca 2: manual.pdf (vou anexar nesta conversa)"),
  );
  assert.ok(
    message.includes("Vou enviar o arquivo da logomarca nesta conversa."),
  );
  assert.ok(message.includes("OBSERVAÇÕES GERAIS:\nNenhuma"));
});

test("carrinho antigo é convertido e dados inválidos são descartados", () => {
  const [restored] = cleanCart(
    [
      {
        id: "A",
        key: "old",
        qty: 30,
        color: "Azul",
        method: "A definir com a equipe",
        text: "Logo",
        art: "arte.pdf",
      },
    ],
    products,
  );
  assert.deepEqual(restored.colors, [{ name: "Azul", qty: null }]);
  assert.equal(restored.method, "");
  assert.match(restored.text, /arte\.pdf/);
  assert.deepEqual(restored.files, []);
  const [clean] = cleanCart(
    [
      {
        id: "A",
        qty: 30,
        colors: [{ name: "Preto", qty: 50 }, "Preto", { name: "" }],
        files: [
          { id: "abcdefgh-1", name: "a.png", type: "image/png", size: 10 },
          { id: "x", name: "b.svg", type: "image/svg+xml", size: 10 },
          {
            id: "abcdefgh-2",
            name: "c.pdf",
            type: "application/pdf",
            size: 11 * 1024 * 1024,
          },
        ],
      },
    ],
    products,
  );
  assert.deepEqual(clean.colors, [{ name: "Preto", qty: null }]);
  assert.deepEqual(
    clean.files.map((f) => f.id),
    ["abcdefgh-1"],
  );
});

test("itens com a mesma personalização somam; arquivos diferentes não", () => {
  const base = {
    id: "A",
    name: "Garrafa",
    qty: 30,
    colors: [{ name: "Azul", qty: null }],
    variant: "",
    method: "",
    text: "",
    files: [],
  };
  assert.equal(combineCartItems([base, { ...base, key: "2" }])[0].qty, 60);
  const withFile = {
    ...base,
    key: "3",
    files: [{ id: "abcdefgh-9", name: "l.png", type: "image/png", size: 1 }],
  };
  assert.equal(combineCartItems([base, withFile]).length, 2);
});

import { assertPublicKey } from "../src/lib/publicConfig.js";
test("browser builds reject privileged and user-session keys", () => {
  assert.doesNotThrow(() => assertPublicKey("sb_publishable_test"));
  assert.throws(() => assertPublicKey("sb_secret_test"), /privileged/);
  const jwt = (role) =>
    "header." +
    Buffer.from(JSON.stringify({ role })).toString("base64url") +
    ".signature";
  assert.throws(() => assertPublicKey(jwt("service_role")), /privileged/);
  assert.throws(() => assertPublicKey(jwt("authenticated")), /privileged/);
  assert.doesNotThrow(() => assertPublicKey(jwt("anon")));
});
