import catalog from "../catalog/products.json" with { type: "json" };
import { FEATURED } from "./lib/catalog.js";

// Base local usada quando o Supabase não está disponível.
export function normalizeLocalProduct(p, index) {
  return {
    ...p,
    colors: Array.isArray(p.colors) ? p.colors : [],
    variants: Array.isArray(p.variants) ? p.variants : [],
    gallery: Array.isArray(p.gallery) ? p.gallery : [],
    featured: p.featured ?? FEATURED.includes(p.id),
    sort_order: p.sort_order ?? index + 1,
    unit_price: typeof p.unit_price === "number" ? p.unit_price : null,
  };
}

export default catalog.map(normalizeLocalProduct);
