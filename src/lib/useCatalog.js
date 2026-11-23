import { useEffect, useMemo, useState } from "react";
import fallback from "../products";
import { supabase, loadProducts, loadCategories } from "./supabase";
import { CATEGORIES } from "./catalog";

// Catálogo: começa com a base local (site funciona sem backend) e é
// substituído pelo catálogo do Supabase quando disponível.
export default function useCatalog() {
  const [products, setProducts] = useState(fallback),
    [categoryOrder, setCategoryOrder] = useState(CATEGORIES),
    [catalogError, setCatalogError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    loadProducts()
      .then((data) => {
        if (!active) return;
        setProducts(data);
        setCatalogError("");
      })
      .catch(() => {
        if (active)
          setCatalogError(
            "Não foi possível atualizar o catálogo. Tente novamente antes de enviar seu pedido.",
          );
      });
    loadCategories()
      .then((names) => {
        if (active && names?.length) setCategoryOrder(names);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [revision]);
  // Só mostra categorias com produtos; categorias novas sem ordem vão ao fim.
  const categories = useMemo(() => {
    const used = new Set(products.map((p) => p.categoria));
    return [
      ...categoryOrder.filter((c) => used.has(c)),
      ...[...used].filter((c) => !categoryOrder.includes(c)).sort(),
    ];
  }, [products, categoryOrder]);
  return {
    products,
    categories,
    catalogError,
    retryCatalog: () => setRevision((n) => n + 1),
  };
}
