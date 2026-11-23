import { Search, X, Plus, ChevronDown, SlidersHorizontal } from "lucide-react";
import TechText from "./TechText";
import ProductCard from "./ProductCard";
import { ALL_PRODUCTS } from "../hooks/useCatalogFilters";

export default function CatalogSection({
  products,
  categories,
  filters,
  onChoose,
  onCustomize,
  reducedMotion,
}) {
  const {
    category,
    query,
    maxMinimum,
    sort,
    limit,
    filtered,
    setQuery,
    setMaxMinimum,
    setSort,
    showMore,
    reset,
  } = filters;
  return (
    <section className="catalog wrap" id="catalogo">
      <div className="section-heading" data-reveal>
        <div>
          <div className="eyebrow">O PRÓXIMO PRESENTE DA SUA MARCA</div>
          <h2 className="tech-heading" aria-label="Escolhas que marcam.">
            <TechText
              key={String(reducedMotion)}
              text="Escolhas que marcam."
              fontFamily="Manrope Variable, sans-serif"
              fontSize={36}
              fontWeight={650}
              letterSpacing={-0.045}
              align="left"
              color="#252629"
              accentColor="#b58c31"
              intro={reducedMotion ? "none" : "assemble"}
              introDuration={1.5}
              specks={10}
              labels={false}
              draggable={false}
              clickKick={!reducedMotion}
              sweep={!reducedMotion}
              reveal={reducedMotion ? "off" : "letter"}
              guides={false}
            />
          </h2>
        </div>
        <p>
          Para o dia a dia, para grandes momentos.
          <br />
          Encontre o brinde que conta a sua história.
        </p>
      </div>
      <div className="category-tabs" aria-label="Categorias">
        {[ALL_PRODUCTS, ...categories].map((g, i) => (
          <button
            key={g}
            className={category === g ? "active" : ""}
            onClick={() => onChoose(g)}
          >
            {g}
            {i === 0 && <span>{products.length}</span>}
          </button>
        ))}
      </div>
      <div className="catalog-tools">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar produtos"
            placeholder="O que você está procurando?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="icon"
              aria-label="Limpar busca"
              onClick={() => setQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <label className="minimum-filter">
          Pedido mínimo
          <select
            aria-label="Pedido mínimo máximo"
            value={maxMinimum}
            onChange={(e) => setMaxMinimum(e.target.value)}
          >
            <option value="">Qualquer quantidade</option>
            {[15, 30, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                Até {n} unidades
              </option>
            ))}
          </select>
        </label>
        <span className="result-count">
          {filtered.length} produtos encontrados
        </span>
        <label className="sort">
          <SlidersHorizontal size={15} />
          <select
            aria-label="Ordenar produtos"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="featured">Destaques</option>
            <option value="name">Nome: A a Z</option>
            <option value="minimum">Menor pedido mínimo</option>
            <option value="category">Categoria</option>
          </select>
          <ChevronDown size={13} />
        </label>
      </div>
      <div className="product-grid">
        {filtered.slice(0, limit).map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            index={i}
            onCustomize={onCustomize}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="empty">
          <Search size={35} />
          <h3>Nenhum brinde por aqui.</h3>
          <p>Tente outra busca ou explore todas as categorias.</p>
          <button className="btn primary" onClick={reset}>
            Ver todos os produtos
          </button>
        </div>
      )}
      {filtered.length > limit && (
        <div className="load-more">
          <button className="btn outline" onClick={showMore}>
            Explorar mais produtos <Plus size={16} />
          </button>
          <small>
            Mostrando {Math.min(limit, filtered.length)} de {filtered.length}{" "}
            produtos
          </small>
        </div>
      )}
    </section>
  );
}
