import test from "node:test";
import assert from "node:assert/strict";
import { validateQuantity } from "../src/order.js";
import products from "../src/products.js";
test("enforces integer minimum quantities", () => {
  assert.equal(validateQuantity(29, 30), false);
  assert.equal(validateQuantity(30.5, 30), false);
  assert.equal(validateQuantity("", 30), false);
  assert.equal(validateQuantity("30", 30), true);
  assert.equal(validateQuantity(Infinity, 30), false);
});
test("catalog has unique identifiers and valid minimums", () => {
  assert.equal(products.length, 111);
  assert.equal(new Set(products.map((p) => p.id)).size, 111);
  assert.ok(products.every((p) => Number.isInteger(p.min) && p.min > 0));
});
