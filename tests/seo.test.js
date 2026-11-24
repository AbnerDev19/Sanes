import test from "node:test";
import assert from "node:assert/strict";
import products from "../src/products.js";
import {
  canonicalSite,
  structuredCatalog,
  productMetadata,
  safeJson,
  discoveryFiles,
} from "../src/lib/seo.js";
import { appPath, routeFromLocation } from "../src/lib/routes.js";

test("home indexa URLs estáticas sem declarar ofertas inexistentes", () => {
  const site = canonicalSite();
  const graph = structuredCatalog(products, site)["@graph"];
  assert.equal(graph[0]["@type"], "Organization");
  assert.equal(graph[1].numberOfItems, 111);
  assert.ok(
    graph[1].itemListElement.every(
      (row) => !row.item && !row.url.includes("#"),
    ),
  );
  assert.equal(graph[1].itemListElement[0].url, site + "produto/SB-001/");
  const noPrice = productMetadata(products[0], site);
  assert.equal(noPrice.structured["@type"], "WebPage");
  assert.equal(noPrice.structured.offers, undefined);
  const priced = productMetadata({ ...products[0], unit_price: 25.5 }, site);
  assert.equal(priced.structured["@type"], "Product");
  assert.equal(priced.structured.offers.price, 25.5);
});
test("sitemap e roteamento incluem caminhos limpos e base do Pages", () => {
  assert.equal(
    canonicalSite("https://example.com/shop?x=1#foo"),
    "https://example.com/shop/",
  );
  const files = discoveryFiles(canonicalSite(), products);
  assert.ok(files.robots.includes("sitemap.xml"));
  assert.equal(files.sitemap.match(/<loc>/g)?.length, 112);
  assert.ok(files.sitemap.includes("/Sanes/produto/SB-111/"));
  assert.ok(!files.sitemap.includes("#/produto"));
  assert.deepEqual(routeFromLocation("/Sanes/produto/SB-001/", "", "/Sanes/"), {
    name: "product",
    productId: "SB-001",
  });
  assert.deepEqual(routeFromLocation("/Sanes/", "#/admin/pedidos", "/Sanes/"), {
    name: "admin",
    path: "/pedidos",
  });
  assert.equal(appPath("conta", "/Sanes"), "/Sanes/conta");
});
test("JSON-LD escapa tags", () => {
  assert.ok(!safeJson({ name: "</script><script>bad</script>" }).includes("<"));
});
