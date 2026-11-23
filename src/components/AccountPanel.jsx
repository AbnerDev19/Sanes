import { useEffect, useState } from "react";
import { supabase, getOrders, money, statusLabels } from "../lib/supabase";
import {
  orderContactMessage,
  orderToMessageItems,
  colorSummary,
} from "../lib/commerce";
import { whatsappLink } from "../config";
export default function AccountPanel({ session, staff, wa, onLogout }) {
  const [orders, setOrders] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [more, setMore] = useState(false);
  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOrders();
      setOrders(data);
      setMore(data.length === 50);
    } catch {
      setError("Não foi possível carregar seus pedidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
  }, []);
  const loadMore = async () => {
    setBusy("more");
    setError("");
    try {
      const data = await getOrders(orders.length);
      setOrders((current) => [
        ...current,
        ...data.filter((next) => !current.some((old) => old.id === next.id)),
      ]);
      setMore(data.length === 50);
    } catch {
      setError("Não foi possível carregar mais pedidos. Tente novamente.");
    } finally {
      setBusy("");
    }
  };
  const update = async (id, status) => {
    setBusy(id);
    const { error } = await supabase.rpc("update_order_status", {
      p_order_id: id,
      p_status: status,
    });
    if (error) setError("Não foi possível atualizar o pedido.");
    else await reload();
    setBusy("");
  };
  return (
    <section className="account-panel">
      <div className="eyebrow">SUA CONTA SANES</div>
      <h2 id="dialog-title">
        {staff ? "Atendimento da loja" : "Meus pedidos"}
      </h2>
      <p className="account-email">{session.user.email}</p>
      {staff && (
        <a className="btn primary full" href="#/admin">
          Abrir painel administrativo
        </a>
      )}
      <div className="account-actions">
        <button className="text-link" onClick={reload} disabled={loading}>
          Atualizar pedidos
        </button>
        <button
          className="text-link"
          onClick={async () => {
            setBusy("logout");
            const { error } = await supabase.auth.signOut();
            if (error) {
              setError("Não foi possível sair. Tente novamente.");
              setBusy("");
            } else onLogout();
          }}
          disabled={busy === "logout"}
        >
          Sair da conta
        </button>
      </div>
      {loading && <p role="status">Carregando pedidos…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && !orders.length && (
        <div className="empty">
          <h3>Seu primeiro pedido começa no catálogo.</h3>
          <p>Escolha os produtos, personalize e envie para a loja.</p>
        </div>
      )}
      {orders.map((order) => (
        <article className="order-card" key={order.id}>
          <div className="order-card-top">
            <h3>Pedido #{order.number}</h3>
            <span>{statusLabels[order.status]}</span>
          </div>
          <small>
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "medium",
              timeZone: "America/Sao_Paulo",
            }).format(new Date(order.created_at))}{" "}
            · {order.total_units} unidades
          </small>
          {staff && (
            <p>
              {order.customer.name} · {order.customer.email}
              <br />
              {order.customer.phone} · {order.customer.city}
            </p>
          )}
          <ul>
            {orderToMessageItems(order).map((item, n) => (
              <li key={order.order_items[n].id}>
                {item.qty} × {item.name}
                <small>
                  {[
                    colorSummary(item.colors) || "Cor a definir",
                    item.variant,
                    item.method,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
                {item.text && <small className="item-note">{item.text}</small>}
                {item.files.length > 0 && (
                  <small>
                    Logomarca: {item.files.map((f) => f.name).join(", ")}
                  </small>
                )}
              </li>
            ))}
          </ul>
          <p>
            {order.estimated_total === null
              ? "Valores, frete e prazo a confirmar com a loja."
              : `Subtotal estimado: ${money(order.estimated_total)}. Frete e personalização a confirmar.`}
          </p>
          {!staff && (
            <a
              className="btn outline full"
              href={whatsappLink(wa, orderContactMessage(order))}
              target="_blank"
              rel="noreferrer"
            >
              Conversar sobre este pedido
            </a>
          )}
          {staff && (
            <label>
              Atualizar atendimento
              <select
                aria-label={`Status do pedido ${order.number}`}
                disabled={busy === order.id}
                value={order.status}
                onChange={(e) => update(order.id, e.target.value)}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </article>
      ))}
      {more && (
        <button
          className="btn outline full"
          disabled={busy === "more"}
          onClick={loadMore}
        >
          {busy === "more" ? "Carregando…" : "Carregar mais pedidos"}
        </button>
      )}
      <p className="field-help">
        Pedidos ficam registrados na sua conta. A confirmação da compra, arte e
        pagamento é combinada diretamente com a loja.
      </p>
    </section>
  );
}
