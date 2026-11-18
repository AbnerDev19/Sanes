import test from "node:test";
import assert from "node:assert/strict";
import products from "../src/products.js";
import {
  canonicalSite,
  structuredCatalog,
  safeJson,
  discoveryFiles,
} from "../src/lib/seo.js";
test("static structured data has organization and real products without invented offers", () => {
  const site = canonicalSite();
  const graph = structuredCatalog(products, site)["@graph"];
  assert.equal(graph[0]["@type"], "Organization");
  assert.ok(!("address" in graph[0]));
  assert.equal(graph[1].numberOfItems, 111);
  const rows = graph[1].itemListElement;
  assert.equal(rows.filter((r) => r.item.image).length, 24);
  assert.ok(rows.every((r) => !r.item.offers));
  assert.equal(rows[0].item.url, site + "#/produto/SB-001");
});
test("canonical URL and sitemap do not claim hash routes are indexable pages", () => {
  assert.equal(
    canonicalSite("https://example.com/shop?x=1#foo"),
    "https://example.com/shop/",
  );
  const files = discoveryFiles(canonicalSite());
  assert.ok(files.robots.includes("sitemap.xml"));
  assert.ok(
    files.sitemap.includes("<loc>https://abnerdev19.github.io/Sanes/</loc>"),
  );
  assert.ok(!files.sitemap.includes("#/produto"));
});
test("JSON-LD serialization cannot terminate its script element", () => {
  assert.ok(!safeJson({ name: "</script><script>bad</script>" }).includes("<"));
});
