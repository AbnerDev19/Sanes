// Regras do carrinho e da mensagem do pedido. Sem dependências de navegador:
// também roda nos testes do Node.
export const MAX_QTY = 100000;
export const MAX_FILES_PER_ITEM = 5;
export const MAX_FILES_PER_ORDER = 20;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_TYPES = ["image/png", "image/jpeg", "application/pdf"];
const LEGACY_PLACEHOLDERS = /^(a definir|outra\b)/i;

const text = (value, max) =>
  String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);

export function cleanColors(colors, qty) {
  if (!Array.isArray(colors)) return [];
  const seen = new Set();
  const rows = colors.slice(0, 20).flatMap((c) => {
    const name = text(typeof c === "string" ? c : c?.name, 60);
    if (!name || seen.has(name.toLocaleLowerCase("pt-BR"))) return [];
    seen.add(name.toLocaleLowerCase("pt-BR"));
    const n = Number(c?.qty);
    return [{ name, qty: Number.isSafeInteger(n) && n > 0 ? n : null }];
  });
  // Distribuição por cor só vale se não ultrapassar o total do item.
  const split = rows.reduce((s, c) => s + (c.qty || 0), 0);
  return split > qty ? rows.map((c) => ({ ...c, qty: null })) : rows;
}

export function cleanFiles(files) {
  if (!Array.isArray(files)) return [];
  return files.slice(0, MAX_FILES_PER_ITEM).flatMap((f) =>
    typeof f?.id === "string" &&
    /^[A-Za-z0-9-]{8,60}$/.test(f.id) &&
    FILE_TYPES.includes(f.type) &&
    Number.isSafeInteger(f.size) &&
    f.size > 0 &&
    f.size <= MAX_FILE_BYTES
      ? [
          {
            id: f.id,
            name: singleLine(f.name, 160) || "arquivo",
            type: f.type,
            size: f.size,
          },
        ]
      : [],
  );
}

export function cleanCart(items, products) {
  if (!Array.isArray(items)) return [];
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.slice(0, 100).flatMap((item, index) => {
    const p = byId.get(item?.id);
    if (
      !p ||
      !Number.isSafeInteger(item.qty) ||
      item.qty < p.min ||
      item.qty > MAX_QTY
    )
      return [];
    // Itens salvos pela versão anterior: cor em texto e só o nome da arte.
    const legacyColor =
      typeof item.color === "string" && !LEGACY_PLACEHOLDERS.test(item.color)
        ? [item.color]
        : [];
    const method = text(item.method, 80);
    let notes = text(item.text, 1200);
    if (item.art && !Array.isArray(item.files))
      notes = text(
        `${notes}${notes ? "\n" : ""}Arte de referência: ${item.art} (enviar no WhatsApp)`,
        1200,
      );
    return [
      {
        id: p.id,
        name: p.nome,
        key:
          typeof item.key === "string" && item.key
            ? item.key.slice(0, 80)
            : `restored-${index}-${p.id}`,
        qty: item.qty,
        colors: cleanColors(item.colors ?? legacyColor, item.qty),
        variant: text(item.variant, 80),
        method: LEGACY_PLACEHOLDERS.test(method) ? "" : method,
        text: notes,
        files: cleanFiles(item.files),
      },
    ];
  });
}

export function mergeCarts(remote, local, products) {
  const all = cleanCart(remote, products);
  const keys = new Set(all.map((i) => i.key));
  for (const item of cleanCart(local, products))
    if (!keys.has(item.key)) {
      all.push(item);
      keys.add(item.key);
    }
  return combineCartItems(all);
}

export function personalizationKey(item) {
  return JSON.stringify([
    item.id,
    (item.colors || []).map((c) => [c.name, c.qty || null]),
    ...["variant", "method", "text"].map((field) => text(item[field], 1200)),
    (item.files || []).map((f) => f.id),
  ]);
}

// Itens idênticos (mesma personalização e mesmos arquivos) somam quantidades.
export function combineCartItems(items) {
  const rows = new Map();
  for (const item of items) {
    const key = personalizationKey(item),
      previous = rows.get(key);
    if (previous && !(item.colors || []).some((c) => c.qty)) {
      if (previous.qty + item.qty > MAX_QTY)
        throw new Error(
          "A quantidade total desse item não pode ultrapassar 100.000 unidades.",
        );
      previous.qty += item.qty;
    } else rows.set(previous ? `${key}-${item.key}` : key, { ...item });
  }
  if (rows.size > 100)
    throw new Error("O carrinho aceita até 100 personalizações diferentes.");
  const all = [...rows.values()];
  if (all.reduce((s, i) => s + (i.files?.length || 0), 0) > MAX_FILES_PER_ORDER)
    throw new Error(
      `Envie no máximo ${MAX_FILES_PER_ORDER} arquivos por pedido.`,
    );
  return all;
}

export function cartTotals(cart, products) {
  const index = new Map(products.map((p) => [p.id, p]));
  let total = 0;
  const priced = cart.every((item) => {
    const price = index.get(item.id)?.unit_price;
    if (typeof price !== "number" || !Number.isFinite(price)) return false;
    total += Math.round(price * 100) * item.qty;
    return true;
  });
  return {
    units: cart.reduce((s, i) => s + i.qty, 0),
    total: cart.length && priced ? total / 100 : null,
  };
}

export const colorSummary = (colors) =>
  (colors || [])
    .map((c) => (c.qty ? `${c.name} (${c.qty})` : c.name))
    .join(", ");

export const fileSize = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const singleLine = (value, max) =>
  text(String(value ?? "").replace(/[\p{Cc}\u2028\u2029]/gu, " "), max);

const messageText = (value, max) =>
  singleLine(value, max).replace(
    /(?:https?:\/\/|www\.)\S+/gi,
    "[link omitido]",
  );

export function buildOrderMessage({
  items,
  customer,
  notes = "",
  orderNumber = null,
  adminLink = "",
  storedFiles = false,
}) {
  const heading = [
    "NOVO PEDIDO — SANES BRINDES",
    orderNumber ? `Pedido nº ${orderNumber}` : "",
    `Nome: ${messageText(customer.name, 75)}`,
    `Telefone: ${messageText(customer.phone, 30)}`,
  ]
    .filter(Boolean)
    .join("\n");
  const fileCount = items.reduce(
    (total, item) => total + (item.files?.length || 0),
    0,
  );
  const suffix = [
    items.some((item) => item.minimumUnconfirmed)
      ? "Pedido mínimo a confirmar em parte do orçamento."
      : "",
    fileCount && !storedFiles
      ? `Vou anexar ${fileCount} arquivo(s) nesta conversa.`
      : "",
    adminLink ? `Pedido completo: ${adminLink}` : "",
  ].filter(Boolean);
  const summary = [];
  const message = (remaining, extra = "") =>
    [
      heading,
      ...summary,
      extra,
      remaining
        ? `+${remaining} itens${adminLink ? ", veja o pedido completo no painel" : " para detalhar no atendimento"}.`
        : "",
      ...suffix,
    ]
      .filter(Boolean)
      .join("\n");
  // Margem para o domínio, o número e a query na URL final.
  const fits = (value) =>
    encodeURIComponent(value.toWellFormed()).length <= 1450;
  for (const item of items) {
    const options = [colorSummary(item.colors), item.variant, item.method]
      .filter(Boolean)
      .join(" · ");
    const files =
      !storedFiles && item.files?.length
        ? ` · ${item.files.map((f) => messageText(f.name, 35)).join(", ")} (vou anexar nesta conversa)`
        : "";
    summary.push(
      `• ${messageText(item.name, 70)} (${messageText(item.id, 30)}): ${item.qty} un.${options ? ` · ${messageText(options, 80)}` : ""}${files}`,
    );
    if (!fits(message(items.length - summary.length))) {
      summary.pop();
      break;
    }
  }
  const extra =
    !storedFiles && notes ? `Observações: ${messageText(notes, 160)}` : "";
  const remaining = items.length - summary.length;
  return (
    fits(message(remaining, extra))
      ? message(remaining, extra)
      : message(remaining)
  ).toWellFormed();
}

// Pedido salvo no banco → itens no formato da mensagem.
export function orderToMessageItems(order) {
  const files = order.order_files || [];
  return (order.order_items || []).map((i) => ({
    id: i.product_id,
    name: i.product_name,
    qty: i.quantity,
    colors:
      Array.isArray(i.colors) && i.colors.length
        ? i.colors
        : i.color && !LEGACY_PLACEHOLDERS.test(i.color)
          ? [{ name: i.color }]
          : [],
    variant: i.variant || "",
    method: LEGACY_PLACEHOLDERS.test(i.method || "") ? "" : i.method || "",
    text: i.details || "",
    files: files
      .filter((f) => f.order_item_id === i.id)
      .map((f) => ({ id: f.id, name: f.file_name })),
  }));
}

export function orderContactMessage(order, { adminLink = "" } = {}) {
  const c = order.customer || {};
  return buildOrderMessage({
    items: orderToMessageItems(order),
    customer: c,
    notes: c.notes || "",
    orderNumber: order.number,
    adminLink,
    storedFiles: true,
  });
}
