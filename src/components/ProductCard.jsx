import { ArrowUpRight, Plus } from "lucide-react";
import IMG from "./ProductImage";
import { money } from "../lib/supabase";
import { productHash } from "../lib/catalog";
export default function ProductCard({
  product: p,
  index: i,
  onCustomize: open,
}) {
  return (
    <article
      className="product-card"
      key={p.id}
      data-reveal
      data-reveal-delay={(i % 3) * 85}
    >
      <div className={"product-picture tone-" + (i % 4)}>
        {p.featured ? (
          <span className="product-badge featured">Destaque</span>
        ) : (
          p.imagem && <span className="product-badge">{p.capacidade}</span>
        )}
        <button
          className="product-image-button"
          onClick={() => open(p)}
          aria-label={`Personalizar ${p.nome}${p.imagem ? "" : ": Foto em breve"}`}
        >
          <IMG p={p} />
          <span className="picture-arrow" aria-hidden="true">
            <ArrowUpRight size={20} />
          </span>
        </button>
      </div>
      <div className="product-info">
        <div className="product-category">
          {p.categoria}
          <span>{p.codigo}</span>
        </div>
        <h3>
          <a href={productHash(p.id)}>{p.nome}</a>
        </h3>
        <small className="product-capacity">
          {p.capacidade || "Especificação a confirmar"}
        </small>
        <p>{p.desc}</p>
        {p.colors?.length > 0 && (
          <small className="product-colors">
            {p.colors.length === 1
              ? "1 cor disponível"
              : `${p.colors.length} cores disponíveis`}
          </small>
        )}
        <div className="product-bottom">
          <div>
            <strong>
              {typeof p.unit_price === "number"
                ? money(p.unit_price)
                : "Sob consulta"}
            </strong>
            <small>
              {p.min_confirmed === false
                ? "Pedido mínimo a confirmar"
                : `A partir de ${p.min} unidades`}
            </small>
          </div>
          <button
            className="add-button"
            onClick={() => open(p)}
            aria-label={`Personalizar ${p.nome}`}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </article>
  );
}
