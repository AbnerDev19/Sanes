export const CATEGORIES = [
  "Térmicos e bebidas",
  "Bolsas e mochilas",
  "Canetas",
  "Kits e presentes",
  "Escritório e tecnologia",
  "Churrasco e lazer",
];
export const LEGACY_CATEGORIES = {
  "Garrafas Térmicas": CATEGORIES[0],
  Garrafas: CATEGORIES[0],
  "Copos Térmicos": CATEGORIES[0],
  Copos: CATEGORIES[0],
  "Vidros e Cristais": CATEGORIES[0],
  "Bolsas e Mochilas": CATEGORIES[1],
  "Bolsas e Acessórios": CATEGORIES[1],
  Canetas: CATEGORIES[2],
  Kits: CATEGORIES[3],
  "Escritório e Tecnologia": CATEGORIES[4],
  "Casa e Escritório": CATEGORIES[4],
  Acessórios: CATEGORIES[4],
  "Churrasco e Lazer": CATEGORIES[5],
};
// Categorias antigas viram as atuais; categorias criadas no painel são mantidas.
export const normalizeCategory = (value) =>
  LEGACY_CATEGORIES[value] ||
  (String(value || "").trim() ? String(value).trim() : "Categoria a revisar");
export const FEATURED = [
  "SB-104",
  "SB-105",
  "SB-106",
  "SB-068",
  "SB-086",
  "SB-078",
];
const fold = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
export function filterCatalog(
  products,
  {
    category = "Todos os produtos",
    query = "",
    maxMinimum = "",
    sort = "featured",
  } = {},
) {
  const term = fold(query.trim());
  const result = products.filter(
    (p) =>
      (category === "Todos os produtos" || p.categoria === category) &&
      (!maxMinimum ||
        (p.min_confirmed !== false && p.min <= Number(maxMinimum))) &&
      fold(
        `${p.nome} ${p.categoria} ${p.codigo} ${p.desc} ${(p.colors || []).join(" ")}`,
      ).includes(term),
  );
  const name = (a, b) => a.nome.localeCompare(b.nome, "pt-BR");
  const order = (p) => (Number.isFinite(p.sort_order) ? p.sort_order : 999999);
  return result.sort(
    sort === "name"
      ? name
      : sort === "minimum"
        ? (a, b) => a.min - b.min || name(a, b)
        : sort === "category"
          ? (a, b) =>
              a.categoria.localeCompare(b.categoria, "pt-BR") || name(a, b)
          : (a, b) =>
              Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
              order(a) - order(b) ||
              name(a, b),
  );
}
export const productHash = (id) => `#/produto/${encodeURIComponent(id)}`;
export function productIdFromHash(hash) {
  if (!hash.startsWith("#/produto/")) return null;
  try {
    return decodeURIComponent(hash.slice("#/produto/".length)) || "__invalid__";
  } catch {
    return "__invalid__";
  }
}
