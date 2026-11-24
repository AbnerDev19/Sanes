import test from "node:test";
import assert from "node:assert/strict";
import { orderNotice } from "../supabase/functions/notify-order/notification.mjs";
import { sameSecret } from "../supabase/functions/_shared/webhook-auth.mjs";

test("webhook só aceita evento de criação e omite dados do cliente", async () => {
  const event = {
    type: "INSERT",
    schema: "public",
    table: "orders",
    record: {
      id: "20000000-0000-4000-8000-000000000001",
      number: 42,
      customer: { name: "Dado privado" },
    },
  };
  const site = "https://abnerdev19.github.io/Sanes/";
  const notice = orderNotice(event, site);
  assert.match(notice.text, /Sanes\/admin\/pedidos\//);
  assert.doesNotMatch(notice.text, /Dado privado/);
  assert.equal(orderNotice({ ...event, type: "DELETE" }, site), null);
  assert.equal(await sameSecret("correto", "correto"), true);
  assert.equal(await sameSecret("incorreto", "correto"), false);
  assert.equal(await sameSecret("", ""), false);
});
