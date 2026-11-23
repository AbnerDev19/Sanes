import { useEffect, useState } from "react";
import fallback from "../products";
import { supabase, loadProducts } from "./supabase";

// Catálogo: começa com a base local (site funciona sem backend) e é
// substituído pelo catálogo do Supabase quando disponível.
export default function useCatalog() {
  const [products, setProducts] = useState(fallback),
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
    return () => {
      active = false;
    };
  }, [revision]);
  return {
    products,
    catalogError,
    retryCatalog: () => setRevision((n) => n + 1),
  };
}
