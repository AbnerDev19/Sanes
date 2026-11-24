import { appPath } from "../lib/routes";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, Star } from "lucide-react";
import ProductImage from "../components/ProductImage";
import { fetchProducts, patchProduct, reorderProducts } from "./api";

const fold = (v) =>
  String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export default function AdminProducts({ onChange }) {
  const [products, setProducts] = useState([]),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );
  const shown = useMemo(() => {
    const term = fold(query.trim());
    return products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!term || fold(`${p.id} ${p.name} ${p.category}`).includes(term)),
    );
  }, [products, query, category]);

  const toggle = async (p, field) => {
    setBusy(`${p.id}-${field}`);
    setError("");
    try {
      const saved = await patchProduct(p.id, { [field]: !p[field] });
      setProducts((all) => all.map((x) => (x.id === p.id ? saved : x)));
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  // Troca de posição com o vizinho visível (respeita filtros) e salva a
  // ordem completa de uma vez.
  const move = async (p, direction) => {
    const index = shown.indexOf(p),
      neighbor = shown[index + direction];
    if (!neighbor) return;
    const ids = products.map((x) => x.id);
    const a = ids.indexOf(p.id),
      b = ids.indexOf(neighbor.id);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    const byId = new Map(products.map((x) => [x.id, x]));
    const previous = products;
    setProducts(ids.map((id, i) => ({ ...byId.get(id), sort_order: i + 1 })));
    setBusy(`${p.id}-move`);
    setError("");
    try {
      await reorderProducts(ids);
      onChange();
    } catch (err) {
      setProducts(previous);
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <section>
      <div className="admin-heading">
        <div>
          <h1>Produtos</h1>
          <p>
            {products.length} produtos · a ordem desta lista é a ordem do
            catálogo (destaques aparecem primeiro).
          </p>
        </div>
        <a className="btn primary" href={appPath("admin/produtos/novo")}>
          <Plus size={17} /> Novo produto
        </a>
      </div>
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden="true" />
          <input
            aria-label="Buscar produtos no painel"
            placeholder="Buscar por nome ou código"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar por categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && <p role="status">Carregando produtos…</p>}
      <ul className="admin-list products">
        {shown.map((p, i) => (
          <li key={p.id} className={p.active ? "" : "inactive"}>
            <div className="admin-row">
              <span className="row-thumb">
                <ProductImage p={{ nome: p.name, imagem: p.image_url }} />
              </span>
              <a
                className="row-main"
                href={appPath(`admin/produtos/${encodeURIComponent(p.id)}`)}
              >
                <strong>{p.name}</strong>
                <small>
                  {p.id} · {p.category}
                  {p.unit_price !== null && p.unit_price !== undefined
                    ? ` · R$ ${Number(p.unit_price).toFixed(2).replace(".", ",")}`
                    : ""}
                </small>
              </a>
              <span className="row-toggles">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={p.active}
                    disabled={busy === `${p.id}-active`}
                    onChange={() => toggle(p, "active")}
                  />
                  <span>{p.active ? "Ativo" : "Inativo"}</span>
                </label>
                <button
                  type="button"
                  className={p.featured ? "star on" : "star"}
                  aria-pressed={p.featured}
                  aria-label={`Destaque: ${p.name}`}
                  title={p.featured ? "Remover destaque" : "Destacar"}
                  disabled={busy === `${p.id}-featured`}
                  onClick={() => toggle(p, "featured")}
                >
                  <Star size={17} />
                </button>
              </span>
              <span className="row-order">
                <button
                  type="button"
                  className="icon"
                  aria-label={`Mover ${p.name} para cima`}
                  disabled={!i || Boolean(busy)}
                  onClick={() => move(p, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="icon"
                  aria-label={`Mover ${p.name} para baixo`}
                  disabled={i === shown.length - 1 || Boolean(busy)}
                  onClick={() => move(p, 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      {!loading && !shown.length && (
        <div className="admin-card empty-state">
          <h2>Nenhum produto encontrado</h2>
        </div>
      )}
    </section>
  );
}
