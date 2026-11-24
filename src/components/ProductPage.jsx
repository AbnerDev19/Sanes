import { appPath, productPath } from "../lib/routes";
import { ArrowLeft, MessageCircle, Plus } from "lucide-react";
import { ProductGallery } from "./ProductModal";
import { money } from "../lib/supabase";
export default function ProductPage({ product, onCustomize }) {
  if (!product)
    return (
      <section className="product-page wrap">
        <h1>Produto não encontrado</h1>
        <p>Este link não corresponde a um produto disponível no catálogo.</p>
        <a className="btn outline" href={appPath("#catalogo")}>
          Voltar ao catálogo
        </a>
      </section>
    );
  const url = new URL(
    productPath(product.id),
    location.origin + location.pathname,
  ).href;
  const share = `https://wa.me/?text=${encodeURIComponent(`Veja ${product.nome} no catálogo Sanes Brindes: ${url}`)}`;
  return (
    <section className="product-page wrap">
      <a className="text-link" href={appPath("#catalogo")}>
        <ArrowLeft size={18} />
        Voltar ao catálogo
      </a>
      <div className="product-page-grid">
        <div className="product-page-image">
          <ProductGallery product={product} />
        </div>
        <div>
          <div className="eyebrow">
            {product.categoria} · {product.id}
          </div>
          <h1>{product.nome}</h1>
          {product.desc && <p>{product.desc}</p>}
          <dl>
            <dt>Capacidade / especificação</dt>
            <dd>{product.capacidade || "Especificação a confirmar"}</dd>
            {product.material && (
              <>
                <dt>Material</dt>
                <dd>{product.material}</dd>
              </>
            )}
            <dt>Pedido mínimo</dt>
            <dd>
              {product.min_confirmed === false
                ? "A confirmar com a loja"
                : `${product.min} unidades`}
            </dd>
            {product.dim && (
              <>
                <dt>Medidas</dt>
                <dd>{product.dim}</dd>
              </>
            )}
            {product.colors?.length > 0 && (
              <>
                <dt>Cores disponíveis</dt>
                <dd>{product.colors.join(", ")}</dd>
              </>
            )}
            {product.variants?.length > 0 && (
              <>
                <dt>Modelos</dt>
                <dd>{product.variants.join(", ")}</dd>
              </>
            )}
          </dl>
          <strong>
            {typeof product.unit_price === "number"
              ? money(product.unit_price)
              : "Sob consulta"}
          </strong>
          <p className="field-help">
            Cores, disponibilidade, arte, frete e prazo são confirmados pela
            loja.
          </p>
          <button
            className="btn primary full"
            onClick={() => onCustomize(product)}
          >
            Personalizar e adicionar <Plus size={18} />
          </button>
          <a
            className="btn outline full"
            href={share}
            target="_blank"
            rel="noreferrer"
          >
            Compartilhar no WhatsApp <MessageCircle size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}
