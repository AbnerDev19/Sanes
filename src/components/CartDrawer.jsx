import { ShoppingBag, ArrowRight, Trash2, Minus, Plus } from "lucide-react";
import { money } from "../lib/supabase";
import Checkout from "./Checkout";
export default function CartDrawer({
  cart,
  step,
  setStep,
  choose,
  minimumFor,
  updateQty,
  setCart,
  setCartOpen,
  totals,
  total,
  checkoutState,
  checkoutActions,
}) {
  return (
    <>
      <div className="eyebrow">SEU PROJETO COMEÇA AQUI</div>
      <h2 id="dialog-title">
        Meu carrinho<span className="cart-count">{cart.length}</span>
      </h2>
      {!cart.length ? (
        <div className="empty">
          <ShoppingBag size={44} />
          <h3>Uma boa ideia começa com uma escolha.</h3>
          <p>
            Escolha seus brindes, personalize e registre o pedido com sua conta.
          </p>
          <button
            className="btn primary"
            onClick={() => {
              setCartOpen(false);
              choose("Todos os produtos");
            }}
          >
            Explorar catálogo <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <>
          <div className="steps">
            <span className={step === 1 ? "current" : ""}>
              01 · Seus brindes
            </span>
            <span className={step === 2 ? "current" : ""}>02 · Seus dados</span>
          </div>
          {step === 1 ? (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <div className="cart-item" key={item.key}>
                    <div className="cart-item-top">
                      <div>
                        <small>{item.id}</small>
                        <h3>{item.name}</h3>
                      </div>
                      <button
                        className="icon"
                        aria-label={`Remover ${item.name}`}
                        onClick={() =>
                          setCart((c) => c.filter((i) => i.key !== item.key))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <p>
                      {item.color} · {item.method}
                    </p>
                    {item.text && <p className="item-note">{item.text}</p>}
                    {item.art && (
                      <small>Arte: {item.art} · enviar no WhatsApp</small>
                    )}
                    <div className="quantity">
                      <button
                        aria-label={`Diminuir quantidade de ${item.name}`}
                        onClick={() => updateQty(item.key, item.qty - 1)}
                        disabled={item.qty <= minimumFor(item.id)}
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        aria-label={`Quantidade de ${item.name}`}
                        type="number"
                        min={minimumFor(item.id)}
                        max="100000"
                        value={item.qty}
                        onChange={(e) => updateQty(item.key, e.target.value)}
                      />
                      <button
                        aria-label={`Aumentar quantidade de ${item.name}`}
                        onClick={() => updateQty(item.key, item.qty + 1)}
                      >
                        <Plus size={14} />
                      </button>
                      <span>unidades</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-summary">
                <span>
                  {cart.length}{" "}
                  {cart.length === 1
                    ? "item personalizado"
                    : "itens personalizados"}
                </span>
                <strong>{total} unidades</strong>
              </div>
              <div className="cart-price">
                <span>Subtotal estimado</span>
                <strong>
                  {totals.total === null ? "A confirmar" : money(totals.total)}
                </strong>
              </div>
              <p className="field-help">
                Valores, personalização, frete e prazo serão confirmados com a
                loja. Sem pagamento online nesta etapa.
              </p>
              <button className="btn primary full" onClick={() => setStep(2)}>
                Continuar <ArrowRight size={17} />
              </button>
              <button
                className="text-link full center"
                onClick={() => setCartOpen(false)}
              >
                Continuar explorando
              </button>
            </>
          ) : (
            <Checkout state={checkoutState} actions={checkoutActions} />
          )}
        </>
      )}
    </>
  );
}
