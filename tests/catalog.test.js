import test from "node:test";
import assert from "node:assert/strict";
import products from "../src/products.js";
import {
  CATEGORIES,
  filterCatalog,
  productHash,
  productIdFromHash,
} from "../src/lib/catalog.js";
test("all products belong to the six explicit categories", () => {
  assert.equal(new Set(products.map((p) => p.categoria)).size, 6);
  assert.ok(products.every((p) => CATEGORIES.includes(p.categoria)));
});
test("minimum filter does not pretend unconfirmed minimums are known", () => {
  const rows = filterCatalog(products, { maxMinimum: 30 });
  assert.ok(rows.length);
  assert.ok(rows.every((p) => p.min <= 30 && p.min_confirmed !== false));
  assert.ok(!rows.some((p) => p.id === "SB-104"));
});
test("search is accent insensitive and sorting does not mutate the catalog", () => {
  const before = products.map((p) => p.id);
  assert.ok(filterCatalog(products, { query: "termica" }).length);
  const rows = filterCatalog(products, { sort: "category" });
  assert.ok(
    rows.every(
      (p, i) =>
        !i || rows[i - 1].categoria.localeCompare(p.categoria, "pt-BR") <= 0,
    ),
  );
  assert.deepEqual(
    products.map((p) => p.id),
    before,
  );
});
test("share hashes identify a product and malformed links are safe", () => {
  assert.equal(productIdFromHash(productHash("SB-104")), "SB-104");
  assert.equal(productIdFromHash("#catalogo"), null);
  assert.equal(productIdFromHash("#/produto/%"), "__invalid__");
});
