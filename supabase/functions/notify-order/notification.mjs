export function orderNotice(event, siteUrl) {
  const row = event?.record;
  if (event?.type !== "INSERT" || event.schema !== "public" || event.table !== "orders"
    || !row || !/^[0-9]+$/.test(String(row.number))
    || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(String(row.id))) return null;
  const site = new URL(siteUrl);
  if (site.protocol !== "https:") throw new Error("A URL da loja deve usar HTTPS.");
  if (!site.pathname.endsWith("/")) site.pathname += "/";
  const orderUrl = new URL(`admin/pedidos/${row.id}`, site);
  const subject = `Novo pedido nº ${row.number} — Sanes Brindes`;
  return { subject, text: `${subject}\n${orderUrl.href}` };
}
