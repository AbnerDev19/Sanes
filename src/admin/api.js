// Acesso a dados do painel. Toda permissão é verificada no banco (RLS e
// funções restritas à equipe); aqui só montamos as chamadas.
import { supabase } from "../lib/supabase";

const fail = (error, fallback) => {
  if (!error) return;
  if (error.code === "23503")
    throw new Error(
      "Este registro está em uso (pedidos ou produtos ligados a ele). Desative em vez de excluir.",
    );
  if (error.code === "23505")
    throw new Error("Já existe um registro com esse código ou nome.");
  if (error.code === "P0001" && error.message) throw new Error(error.message);
  throw new Error(fallback);
};

// Produtos ----------------------------------------------------------------
export async function fetchProducts() {
  const all = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order")
      .order("name")
      .range(start, start + 499);
    fail(error, "Não foi possível carregar os produtos.");
    all.push(...data);
    if (data.length < 500) return all;
  }
}

export async function saveProduct(row, isNew) {
  const payload = { ...row, updated_at: new Date().toISOString() };
  const query = isNew
    ? supabase.from("products").insert(payload)
    : supabase.from("products").update(payload).eq("id", row.id);
  const { data, error } = await query.select().maybeSingle();
  fail(error, "Não foi possível salvar o produto.");
  if (!data)
    throw new Error("Sem permissão para alterar produtos com esta conta.");
  return data;
}

export async function patchProduct(id, patch) {
  return saveProduct({ id, ...patch }, false);
}

export async function deleteProduct(id) {
  const { error, count } = await supabase
    .from("products")
    .delete({ count: "exact" })
    .eq("id", id);
  fail(error, "Não foi possível excluir o produto.");
  if (!count) throw new Error("Produto não encontrado ou sem permissão.");
}

export async function reorderProducts(ids) {
  const { error } = await supabase.rpc("reorder_products", { p_ids: ids });
  fail(error, "Não foi possível salvar a nova ordem.");
}

// Reduz fotos grandes para no máximo 1400px em WebP antes de enviar.
async function optimize(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadProductImage(productId, file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type))
    throw new Error("Use fotos em JPG, PNG ou WebP.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Foto muito grande (máximo 15 MB).");
  const body = await optimize(file);
  const ext =
    body.type === "image/webp"
      ? "webp"
      : file.type === "image/png"
        ? "png"
        : "jpg";
  const safeId = productId.replace(/[^A-Za-z0-9_-]/g, "") || "produto";
  const path = `produtos/${safeId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("catalog")
    .upload(path, body, { contentType: body.type, cacheControl: "31536000" });
  fail(error, "Não foi possível enviar a foto.");
  return supabase.storage.from("catalog").getPublicUrl(path).data.publicUrl;
}

export async function removeProductImage(url) {
  const marker = "/object/public/catalog/";
  const at = String(url).indexOf(marker);
  if (at < 0) return;
  const path = decodeURIComponent(url.slice(at + marker.length));
  if (path.startsWith("produtos/"))
    await supabase.storage.from("catalog").remove([path]);
}

// Categorias ----------------------------------------------------------------
export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("name");
  fail(error, "Não foi possível carregar as categorias.");
  return data;
}

export async function addCategory(name, sortOrder) {
  const { error } = await supabase
    .from("categories")
    .insert({ name: name.trim(), sort_order: sortOrder });
  fail(error, "Não foi possível criar a categoria.");
}

export async function updateCategory(name, patch) {
  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("name", name)
    .select();
  fail(error, "Não foi possível salvar a categoria.");
  if (!data?.length) throw new Error("Sem permissão para alterar categorias.");
}

export async function deleteCategory(name) {
  const { error } = await supabase.from("categories").delete().eq("name", name);
  if (error?.code === "23503")
    throw new Error(
      "Há produtos nesta categoria. Mova-os para outra categoria ou desative-a.",
    );
  fail(error, "Não foi possível excluir a categoria.");
}

export async function reorderCategories(names) {
  const { error } = await supabase.rpc("reorder_categories", {
    p_names: names,
  });
  fail(error, "Não foi possível salvar a nova ordem.");
}

// Configurações -------------------------------------------------------------
export async function fetchSettings() {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .maybeSingle();
  fail(error, "Não foi possível carregar as configurações.");
  return data;
}

export async function saveWhatsapp(whatsapp) {
  const { data, error } = await supabase
    .from("store_settings")
    .update({ whatsapp, updated_at: new Date().toISOString() })
    .eq("id", true)
    .select();
  fail(error, "Não foi possível salvar o número.");
  if (!data?.length)
    throw new Error("Sem permissão para alterar as configurações.");
  window.dispatchEvent(new Event("sanes:settings-changed"));
}

// Pedidos -------------------------------------------------------------------
const ORDER_FIELDS = "*,order_items(*),order_files(*)";

export async function fetchOrders({ offset = 0, status = "" } = {}) {
  let query = supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .order("created_at", { ascending: false })
    .range(offset, offset + 49);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  fail(error, "Não foi possível carregar os pedidos.");
  return data;
}

export async function fetchOrder(id) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("id", id)
    .maybeSingle();
  fail(error, "Não foi possível carregar o pedido.");
  return data;
}

export async function updateOrderStatus(id, status) {
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: id,
    p_status: status,
  });
  fail(error, "Não foi possível atualizar o status.");
}

// PDF é servido como anexo, sem abrir conteúdo ativo no navegador.
export async function orderFileLinks(files) {
  const bucket = supabase.storage.from("order-files");
  return Object.fromEntries(
    await Promise.all(
      files.map(async (file) => {
        const { data, error } = await bucket.createSignedUrl(
          file.storage_path,
          3600,
          file.mime_type === "application/pdf"
            ? { download: file.file_name }
            : undefined,
        );
        if (error) return [file.id, ""];
        return [file.id, data?.signedUrl || ""];
      }),
    ),
  );
}
