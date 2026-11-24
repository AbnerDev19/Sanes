import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Search,
} from "lucide-react";
import { money, statusLabels } from "../lib/supabase";
import { colorSummary, fileSize, orderToMessageItems } from "../lib/commerce";
import { phoneDigits } from "../lib/checkout";
import {
  fetchOrders,
  fetchOrder,
  updateOrderStatus,
  orderFileLinks,
} from "./api";

const fold = (v) =>
  String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const date = (value) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
const place = (c) => [c.city, c.state].filter(Boolean).join("/");

function StatusSelect({ order, onChanged, label }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <label className="status-select">
      {label}
      <select
        aria-label={`Status do pedido ${order.number}`}
        value={order.status}
        disabled={busy}
        onChange={async (e) => {
          setBusy(true);
          setError("");
          try {
            await updateOrderStatus(order.id, e.target.value);
            onChanged(e.target.value);
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {Object.entries(statusLabels).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]),
    [status, setStatus] = useState(""),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false),
    [error, setError] = useState("");
  const load = async (offset = 0) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrders({ offset, status });
      setOrders((current) => (offset ? [...current, ...data] : data));
      setMore(data.length === 50);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [status]);
  const shown = useMemo(() => {
    const term = fold(query.trim());
    if (!term) return orders;
    return orders.filter((o) =>
      fold(
        `${o.number} ${o.customer?.name} ${o.customer?.company} ${o.customer?.phone} ${o.customer?.city}`,
      ).includes(term),
    );
  }, [orders, query]);
  return (
    <section>
      <div className="admin-heading">
        <div>
          <h1>Pedidos</h1>
          <p>Pedidos enviados pelo site, do mais recente ao mais antigo.</p>
        </div>
        <button className="btn outline" onClick={() => load()}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden="true" />
          <input
            aria-label="Buscar pedidos"
            placeholder="Buscar por nome, empresa, telefone ou número"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && !orders.length && <p role="status">Carregando pedidos…</p>}
      {!loading && !error && !shown.length && (
        <div className="admin-card empty-state">
          <h2>Nenhum pedido encontrado</h2>
          <p>Quando um cliente finalizar um pedido, ele aparece aqui.</p>
        </div>
      )}
      <ul className="admin-list orders">
        {shown.map((o) => (
          <li key={o.id}>
            <a href={`#/admin/pedidos/${o.id}`} className="admin-row">
              <span className="order-number">#{o.number}</span>
              <span className="row-main">
                <strong>{o.customer?.name}</strong>
                <small>
                  {[o.customer?.company, place(o.customer || {})]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </span>
              <span className="row-meta">
                <small>{date(o.created_at)}</small>
                <small>
                  {o.order_items?.length} produto
                  {o.order_items?.length === 1 ? "" : "s"} · {o.total_units} un.
                  {o.order_files?.length > 0 && (
                    <>
                      {" "}
                      · <Paperclip size={12} aria-label="com arquivos" />
                      {o.order_files.length}
                    </>
                  )}
                </small>
              </span>
              <span className={`status-pill status-${o.status}`}>
                {statusLabels[o.status]}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {more && (
        <button
          className="btn outline full"
          disabled={loading}
          onClick={() => load(orders.length)}
        >
          {loading ? "Carregando…" : "Carregar mais"}
        </button>
      )}
    </section>
  );
}

export function AdminOrderDetail({ id }) {
  const [order, setOrder] = useState(null),
    [links, setLinks] = useState({}),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrder(id);
      setOrder(data);
      if (data?.order_files?.length)
        setLinks(await orderFileLinks(data.order_files));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [id]);
  const back = (
    <a className="text-link" href="#/admin/pedidos">
      <ArrowLeft size={16} /> Todos os pedidos
    </a>
  );
  if (loading && !order)
    return (
      <section>
        {back}
        <p role="status">Carregando pedido…</p>
      </section>
    );
  if (!order)
    return (
      <section>
        {back}
        <div className="admin-card">
          <h1>Pedido não encontrado</h1>
          {error && <p className="error">{error}</p>}
        </div>
      </section>
    );
  const c = order.customer || {};
  const digits = phoneDigits(c.phone);
  const items = orderToMessageItems(order);
  const filesByItem = (itemId) =>
    (order.order_files || []).filter((f) => f.order_item_id === itemId);
  return (
    <section className="order-detail">
      {back}
      <div className="admin-heading">
        <div>
          <h1>Pedido #{order.number}</h1>
          <p>
            Recebido em {date(order.created_at)}
            {c.guest ? " · cliente sem cadastro" : " · cliente com conta"}
          </p>
        </div>
        <StatusSelect
          order={order}
          label="Status"
          onChanged={(status) => setOrder({ ...order, status })}
        />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="detail-grid">
        <div className="admin-card">
          <h2>Cliente</h2>
          <dl className="admin-dl">
            <dt>Nome</dt>
            <dd>{c.name}</dd>
            <dt>Empresa</dt>
            <dd>{c.company || "Não informada"}</dd>
            <dt>Telefone</dt>
            <dd>{c.phone}</dd>
            <dt>Cidade</dt>
            <dd>{place(c)}</dd>
            {c.email && (
              <>
                <dt>E-mail</dt>
                <dd>{c.email}</dd>
              </>
            )}
          </dl>
          {digits && (
            <a
              className="btn primary full"
              href={`https://wa.me/55${digits}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Conversar com o cliente <MessageCircle size={17} />
            </a>
          )}
        </div>
        <div className="admin-card">
          <h2>Resumo</h2>
          <dl className="admin-dl">
            <dt>Produtos</dt>
            <dd>{order.order_items?.length}</dd>
            <dt>Unidades</dt>
            <dd>{order.total_units}</dd>
            <dt>Estimativa</dt>
            <dd>
              {order.estimated_total === null
                ? "Sob consulta"
                : money(order.estimated_total)}
            </dd>
            <dt>Arquivos</dt>
            <dd>{order.order_files?.length || 0}</dd>
          </dl>
          {c.notes && (
            <>
              <h3>Observações gerais</h3>
              <p className="pre">{c.notes}</p>
            </>
          )}
        </div>
      </div>
      <h2 className="admin-subtitle">Produtos solicitados</h2>
      <ol className="detail-items">
        {(order.order_items || []).map((raw, n) => {
          const item = items[n];
          return (
            <li key={raw.id} className="admin-card">
              <h3>
                {n + 1}. {item.name} <small>{item.id}</small>
              </h3>
              <dl className="admin-dl">
                <dt>Quantidade</dt>
                <dd>{item.qty} unidades</dd>
                <dt>Cor</dt>
                <dd>{colorSummary(item.colors) || "A definir"}</dd>
                <dt>Modelo</dt>
                <dd>{item.variant || "Padrão"}</dd>
                {item.method && (
                  <>
                    <dt>Técnica</dt>
                    <dd>{item.method}</dd>
                  </>
                )}
                <dt>Observações</dt>
                <dd className="pre">{item.text || "Nenhuma"}</dd>
              </dl>
              <div className="detail-files">
                <strong>Logomarca</strong>
                {!filesByItem(raw.id).length && <p>Não enviada pelo site.</p>}
                {filesByItem(raw.id).map((f) => (
                  <div className="detail-file" key={f.id}>
                    <FileText size={18} aria-hidden="true" />
                    <span>
                      {f.file_name}
                      <small>{fileSize(f.size_bytes)}</small>
                    </span>
                    {links[f.id] ? (
                      <>
                        {f.mime_type !== "application/pdf" && (
                          <a
                            className="btn outline small"
                            href={links[f.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver <ExternalLink size={14} />
                          </a>
                        )}
                        <a
                          className="btn outline small"
                          href={
                            f.mime_type === "application/pdf"
                              ? links[f.id]
                              : `${links[f.id]}&download=${encodeURIComponent(f.file_name)}`
                          }
                        >
                          Baixar <Download size={14} />
                        </a>
                      </>
                    ) : (
                      <small>Link indisponível</small>
                    )}
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
