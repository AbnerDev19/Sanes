import { productIdFromHash } from "./catalog.js";

export function routeFromHash(hash) {
  const productId = productIdFromHash(hash);
  if (productId) return { name: "product", productId };
  if (hash === "#/conta") return { name: "account" };
  if (hash === "#/admin" || hash.startsWith("#/admin/"))
    return { name: "admin", path: hash.slice("#/admin".length) || "/" };
  return { name: "home" };
}
