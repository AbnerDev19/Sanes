import { supabase, siteUrl } from "./supabase";
import { getAttachment, extensionFor } from "./attachments";
import { buildOrderMessage } from "./commerce";

export const LINK_DAYS = 30;
const PENDING_KEY = "sanes-pending-order";

export class SubmitError extends Error {
  constructor(message, { canFallback = true } = {}) {
    super(message);
    this.canFallback = canFallback;
  }
}

export const adminOrderLink = (id) => `${siteUrl()}#/admin/pedidos/${id}`;

// Mensagem sem registro no sistema: arquivos vão anexados à mão na conversa.
export function manualMessage({ cart, customer, notes }) {
  return buildOrderMessage({ items: cart, customer, notes });
}

function requestKeyFor(uid, fingerprint) {
  let pending = null;
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
  } catch {}
  if (!pending || pending.uid !== uid || pending.fingerprint !== fingerprint)
    pending = { uid, fingerprint, key: crypto.randomUUID() };
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {}
  return pending.key;
}

export function clearPendingOrder() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}

async function ensureUser(rawSession) {
  if (rawSession?.user?.id) return rawSession.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data?.user?.id)
    throw new SubmitError(
      "Não foi possível preparar o envio seguro dos arquivos agora.",
    );
  return data.user.id;
}

/**
 * Registra o pedido no Supabase: envia as logomarcas para o armazenamento
 * privado, grava o pedido (submit_order) e gera links temporários dos arquivos.
 */
export async function submitOrder({
  cart,
  customer,
  notes,
  rawSession,
  onProgress = () => {},
}) {
  if (!supabase) throw new SubmitError("Sistema de pedidos indisponível.");
  onProgress("Preparando envio…");
  const uid = await ensureUser(rawSession);
  const fingerprint = JSON.stringify([cart, customer, notes]);
  const requestKey = requestKeyFor(uid, fingerprint);
  const paths = new Map();
  const files = cart.flatMap((item) => item.files || []);
  for (const [n, meta] of files.entries()) {
    onProgress(`Enviando arquivos (${n + 1}/${files.length})…`);
    const file = await getAttachment(meta.id);
    if (!file)
      throw new SubmitError(
        `O arquivo "${meta.name}" não está mais neste navegador. Edite o produto e anexe-o novamente.`,
        { canFallback: true },
      );
    const path = `${uid}/${requestKey}/${meta.id}.${extensionFor(meta.type)}`;
    const { error } = await supabase.storage
      .from("order-files")
      .upload(path, file, { contentType: meta.type, upsert: false });
    // Reenvio após falha: o arquivo já está lá.
    if (error && !/exist|duplicate/i.test(error.message || ""))
      throw new SubmitError(
        `Não foi possível enviar "${meta.name}". Verifique sua conexão e tente novamente.`,
      );
    paths.set(meta.id, path);
  }
  onProgress("Registrando pedido…");
  const { data: order, error } = await supabase.rpc("submit_order", {
    p_request_key: requestKey,
    p_items: cart.map((i) => ({
      id: i.id,
      qty: i.qty,
      colors: i.colors,
      variant: i.variant,
      method: i.method,
      text: i.text,
      files: (i.files || []).map((f) => ({
        path: paths.get(f.id),
        name: f.name,
      })),
    })),
    p_customer: {
      name: customer.name.trim(),
      company: customer.company.trim(),
      phone: customer.phone,
      city: customer.city.trim(),
      state: customer.state,
      email: customer.email || "",
      notes,
    },
  });
  if (error)
    throw new SubmitError(
      error.code === "P0001" && error.message
        ? error.message
        : "Não foi possível registrar o pedido agora.",
    );
  const fileLinks = new Map();
  const ordered = [...paths.entries()];
  if (ordered.length) {
    onProgress("Gerando links dos arquivos…");
    const { data: signed } = await supabase.storage
      .from("order-files")
      .createSignedUrls(
        ordered.map(([, path]) => path),
        LINK_DAYS * 24 * 60 * 60,
      );
    (signed || []).forEach((row, n) => {
      if (row?.signedUrl) fileLinks.set(ordered[n][0], row.signedUrl);
    });
  }
  clearPendingOrder();
  const adminLink = adminOrderLink(order.id);
  return {
    order,
    adminLink,
    message: buildOrderMessage({
      items: cart,
      customer,
      notes,
      orderNumber: order.number,
      fileLinks,
      adminLink,
      storedFiles: true,
    }),
  };
}
