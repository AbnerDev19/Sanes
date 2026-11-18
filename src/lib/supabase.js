import { createClient } from "@supabase/supabase-js";
import { normalizeCategory } from "./catalog";
import { assertPublicKey } from "./publicConfig";
const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
let valid = false;
try {
  assertPublicKey(key);
  valid = Boolean(
    url &&
    key &&
    /^https?:$/.test(new URL(url).protocol) &&
    new URL(url).hostname &&
    url !== "https://YOUR_PROJECT.supabase.co",
  );
} catch {}
export const supabaseConfigured = valid;
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
export const siteUrl = () =>
  new URL(
    import.meta.env.BASE_URL,
    window.location.origin + window.location.pathname,
  ).href.split("#")[0];
export function mapProduct(p) {
  return {
    id: p.id,
    codigo: p.id,
    nome: p.name,
    categoria: normalizeCategory(p.category),
    capacidade: p.capacity,
    desc: p.description,
    dim: p.dimensions,
    min: p.min_qty,
    min_confirmed: p.min_confirmed,
    unit_price: p.unit_price === null ? null : Number(p.unit_price),
    preco: p.unit_price === null ? "Sob consulta" : Number(p.unit_price),
    imagem: p.image_url,
    source_document: p.source_document,
    source_page: p.source_page,
  };
}
export async function loadProducts() {
  if (!supabase) return null;
  const all = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("id")
      .range(start, start + 499);
    if (error) throw error;
    all.push(...data.map(mapProduct));
    if (data.length < 500) break;
  }
  return all;
}
export async function getOrders(offset = 0) {
  if (!supabase) throw new Error("Atendimento temporariamente indisponível.");
  const { data, error } = await supabase
    .from("orders")
    .select("*,order_items(*)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + 49);
  if (error) throw error;
  return data;
}
export const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
export const statusLabels = {
  requested: "Pedido recebido",
  in_contact: "Em atendimento",
  quoted: "Orçamento enviado",
  confirmed: "Pedido confirmado",
  in_production: "Em produção",
  shipped: "Enviado",
  completed: "Concluído",
  cancelled: "Cancelado",
};
