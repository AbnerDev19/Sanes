import { useMemo, useState } from "react";
import { filterCatalog } from "../lib/catalog";

export const ALL_PRODUCTS = "Todos os produtos";
const PAGE = 9;

export default function useCatalogFilters(products) {
  const [category, setCategory] = useState(ALL_PRODUCTS),
    [query, setQueryState] = useState(""),
    [maxMinimum, setMaxMinimumState] = useState(""),
    [sort, setSort] = useState("featured"),
    [limit, setLimit] = useState(PAGE);
  const filtered = useMemo(
    () => filterCatalog(products, { category, query, maxMinimum, sort }),
    [products, category, query, maxMinimum, sort],
  );
  return {
    category,
    query,
    maxMinimum,
    sort,
    limit,
    filtered,
    setSort,
    setQuery: (value) => {
      setQueryState(value);
      setLimit(PAGE);
    },
    setMaxMinimum: (value) => {
      setMaxMinimumState(value);
      setLimit(PAGE);
    },
    showMore: () => setLimit((l) => l + PAGE),
    reset: () => {
      setQueryState("");
      setCategory(ALL_PRODUCTS);
    },
    choose: (value) => {
      setCategory(value);
      setLimit(PAGE);
    },
  };
}
