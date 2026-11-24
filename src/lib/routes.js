import { productIdFromHash } from "./catalog.js";

export function appPath(path = "", base = import.meta.env?.BASE_URL || "/") {
  return `${base.replace(/\/?$/, "/")}${path.replace(/^\/+/, "")}`;
}

export const productPath = (id) => appPath(`produto/${encodeURIComponent(id)}`);

export function routeFromHash(hash) {
  const productId = productIdFromHash(hash);
  if (productId) return { name: "product", productId };
  if (hash === "#/privacidade") return { name: "privacy" };
  if (hash === "#/termos") return { name: "terms" };
  if (hash === "#/conta") return { name: "account" };
  if (hash === "#/admin" || hash.startsWith("#/admin/"))
    return { name: "admin", path: hash.slice("#/admin".length) || "/" };
  return { name: "home" };
}

export function routeFromLocation(pathname, hash, base = appPath()) {
  if (hash.startsWith("#/")) return routeFromHash(hash);
  const root = appPath("", base);
  if (!pathname.startsWith(root)) return { name: "home" };
  return routeFromHash(`#/${pathname.slice(root.length).replace(/\/$/, "")}`);
}

export function restorePagesPath() {
  const current = new URL(location.href);
  const saved = current.searchParams.get("__sanes_path");
  if (saved === null) return;
  current.searchParams.delete("__sanes_path");
  const base = appPath();
  const next =
    saved.startsWith(base) && !saved.startsWith("//") && !saved.includes("\\")
      ? new URL(saved, location.origin)
      : current;
  history.replaceState(
    null,
    "",
    next.origin === location.origin && next.pathname.startsWith(base)
      ? next
      : current,
  );
}
