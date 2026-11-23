import {
  ShoppingBag,
  ArrowRight,
  Trash2,
  Minus,
  Plus,
  Pencil,
  Paperclip,
  AlertTriangle,
} from "lucide-react";
import { money } from "../lib/supabase";
import { colorSummary } from "../lib/commerce";
import { AttachmentThumb, useMissingAttachments } from "./Attachments";
import Checkout from "./Checkout";

function CartItem({ item, minimum, missing, onQty, onEdit, onRemove }) {
  return (
    <div className="cart-item">
      <div className="cart-item-top">
        <div>
          <small>{item.id}</small>
          <h3>{item.name}</h3>
        </div>
        <div className="cart-item-actions">
          <button
            className="icon"
            aria-label={`Editar ${item.name}`}
            title="Editar"
            onClick={onEdit}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon"
            aria-label={`Remover ${item.name}`}
            title="Remover"
            onClick={onRemove}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <dl className="cart-item-details">
        <dt>Cor</dt>
        <dd>{colorSummary(item.colors) || "A definir"}</dd>
        {item.variant && (
          <>
            <dt>Modelo</dt>
            <dd>{item.variant}</dd>
          </>
        )}
        {item.method && (
          <>
            <dt>Técnica</dt>
            <dd>{item.method}</dd>
          </>
        )}
      </dl>
      {item.text && <p className="item-note">{item.text}</p>}
      {item.files?.length > 0 && (
        <ul className="cart-files">
          {item.files.map((f) => (
            <li key={f.id} className={missing.includes(f.id) ? "missing" : ""}>
              <AttachmentThumb file={f} />
              <span>{f.name}</span>
              {missing.includes(f.id) && (
                <small>
                  <AlertTriangle size={13} aria-hidden="true" /> Não está neste
                  aparelho: edite e anexe de novo
                </small>
              )}
            </li>
          ))}
        </ul>
      )}
      {!item.files?.length && (
        <small className="no-logo">
          <Paperclip size={13} aria-hidden="true" /> Sem logomarca anexada
        </small>
      )}
      <div className="quantity">
        <button
          aria-label={`Diminuir quantidade de ${item.name}`}
          onClick={() => onQty(item.qty - 1)}
          disabled={item.qty <= minimum}
        >
          <Minus size={14} />
        </button>
        <input
          aria-label={`Quantidade de ${item.name}`}
          type="number"
          inputMode="numeric"
          min={minimum}
          max="100000"
          value={item.qty}
          onChange={(e) => onQty(e.target.value)}
        />
        <button
          aria-label={`Aumentar quantidade de ${item.name}`}
          onClick={() => onQty(item.qty + 1)}
        >
          <Plus size={14} />
        </button>
        <span>unidades</span>
      </div>
    </div>
  );
}

export default function CartDrawer({
  cart,
  step,
  setStep,
  onExplore,
  onClose,
  minimumFor,
  updateQty,
  onEdit,
  onRemove,
  totals,
  checkout,
  session,
  showAccount,
}) {
  const missing = useMissingAttachments(cart.flatMap((i) => i.files || []));
  const done = Boolean(checkout.result);
  return (
    <>
      <div className="eyebrow">SEU PEDIDO PERSONALIZADO</div>
      <h2 id="dialog-title">
        Meu carrinho<span className="cart-count">{cart.length}</span>
      </h2>
      {!cart.length ? (
        <div className="empty">
          <ShoppingBag size={44} />
          <h3>Uma boa ideia começa com uma escolha.</h3>
          <p>
            Escolha seus brindes, personalize e envie o pedido para a Sanes.
          </p>
          <button className="btn primary" onClick={onExplore}>
            Explorar catálogo <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        <>
          {!done && (
            <div className="steps">
              <span className={step === 1 ? "current" : ""}>
                01 · Seus brindes
              </span>
              <span className={step === 2 ? "current" : ""}>
                02 · Seus dados
              </span>
            </div>
          )}
          {step === 1 && !done ? (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <CartItem
                    key={item.key}
                    item={item}
                    minimum={minimumFor(item.id)}
                    missing={missing}
                    onQty={(value) => updateQty(item.key, value)}
                    onEdit={() => onEdit(item)}
                    onRemove={() => onRemove(item)}
                  />
                ))}
              </div>
              <label className="cart-notes">
                Observações gerais do pedido <small>opcional</small>
                <textarea
                  maxLength={700}
                  placeholder="Prazo desejado, evento, forma de entrega…"
                  value={checkout.notes}
                  onChange={(e) => checkout.setNotes(e.target.value)}
                />
              </label>
              <div className="cart-summary">
                <span>
                  {cart.length}{" "}
                  {cart.length === 1
                    ? "item personalizado"
                    : "itens personalizados"}
                </span>
                <strong>{totals.units} unidades</strong>
              </div>
              <div className="cart-price">
                <span>Subtotal estimado</span>
                <strong>
                  {totals.total === null ? "A confirmar" : money(totals.total)}
                </strong>
              </div>
              <p className="field-help">
                Valores, personalização, frete e prazo serão confirmados pela
                Sanes. Sem pagamento online.
              </p>
              <button className="btn primary full" onClick={() => setStep(2)}>
                Continuar <ArrowRight size={17} />
              </button>
              <button className="text-link full center" onClick={onClose}>
                Continuar explorando
              </button>
            </>
          ) : (
            <Checkout
              checkout={checkout}
              session={session}
              showAccount={showAccount}
              onBack={() => setStep(1)}
              onClose={onClose}
              missingFiles={missing.length}
            />
          )}
        </>
      )}
    </>
  );
}
