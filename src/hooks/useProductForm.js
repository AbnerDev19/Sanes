import { useState } from "react";
import { validateQuantity } from "../order";
import { combineCartItems, MAX_FILES_PER_ITEM } from "../lib/commerce";
import {
  saveAttachment,
  deleteAttachments,
  inspectFile,
} from "../lib/attachments";

const EMPTY = {
  qty: "",
  colors: [],
  colorQty: {},
  split: false,
  customColor: "",
  variant: "",
  method: "",
  text: "",
  files: [],
};

// Formulário de personalização: adiciona um item novo ou edita um do carrinho.
export default function useProductForm({ cart, setCart, onAdded }) {
  const [product, setProduct] = useState(null),
    [editingKey, setEditingKey] = useState(null),
    [values, setValues] = useState(EMPTY),
    [removed, setRemoved] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (patch) => setValues((v) => ({ ...v, ...patch }));

  const open = (p, item = null) => {
    setProduct(p);
    setEditingKey(item?.key || null);
    setRemoved([]);
    setError("");
    if (!item) {
      set({ ...EMPTY, qty: String(p.min) });
      return;
    }
    const listed = new Set(p.colors || []);
    const colors = item.colors || [];
    const known = colors.filter((c) => listed.has(c.name));
    setValues({
      qty: String(item.qty),
      colors: known.map((c) => c.name),
      colorQty: Object.fromEntries(
        known.filter((c) => c.qty).map((c) => [c.name, String(c.qty)]),
      ),
      split: known.some((c) => c.qty),
      customColor: colors
        .filter((c) => !listed.has(c.name))
        .map((c) => c.name)
        .join(", "),
      variant: item.variant || "",
      method: item.method || "",
      text: item.text || "",
      files: (item.files || []).map((f) => ({ ...f, isNew: false })),
    });
  };

  // Fechar sem salvar descarta só os arquivos anexados nesta abertura.
  const close = () => {
    const fresh = values.files.filter((f) => f.isNew).map((f) => f.id);
    if (fresh.length) deleteAttachments(fresh);
    setProduct(null);
    setEditingKey(null);
  };

  const accept = async (file) => {
    const { type, error } = await inspectFile(file);
    if (error) {
      setError(error);
      return null;
    }
    const meta = {
      id: crypto.randomUUID(),
      name: file.name.slice(0, 160) || "arquivo",
      type,
      size: file.size,
      isNew: true,
    };
    await saveAttachment(meta.id, file);
    return meta;
  };

  const addFiles = async (list) => {
    setError("");
    const incoming = Array.from(list || []);
    const room = MAX_FILES_PER_ITEM - values.files.length;
    if (incoming.length > room)
      setError(`Anexe até ${MAX_FILES_PER_ITEM} arquivos por produto.`);
    setBusy(true);
    const added = [];
    for (const file of incoming.slice(0, Math.max(0, room))) {
      const meta = await accept(file);
      if (meta) added.push(meta);
    }
    setBusy(false);
    setValues((v) => ({ ...v, files: [...v.files, ...added] }));
  };

  const dropFile = (meta) => {
    if (meta.isNew) deleteAttachments([meta.id]);
    else setRemoved((r) => [...r, meta.id]);
  };

  const replaceFile = async (id, file) => {
    if (!file) return;
    setError("");
    setBusy(true);
    const meta = await accept(file);
    setBusy(false);
    if (!meta) return;
    const old = values.files.find((f) => f.id === id);
    if (old) dropFile(old);
    setValues((v) => ({
      ...v,
      files: v.files.map((f) => (f.id === id ? meta : f)),
    }));
  };

  const removeFile = (id) => {
    const old = values.files.find((f) => f.id === id);
    if (old) dropFile(old);
    setValues((v) => ({ ...v, files: v.files.filter((f) => f.id !== id) }));
  };

  const buildColors = (qty) => {
    const custom = (product.colors?.length ? "" : values.customColor)
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((name) => ({ name, qty: null }));
    const listed = values.colors.map((name) => ({
      name,
      qty: values.split ? Number(values.colorQty[name]) : null,
    }));
    if (values.split && listed.length > 1) {
      if (listed.some((c) => !Number.isSafeInteger(c.qty) || c.qty < 1))
        return { error: "Informe quantas unidades de cada cor você quer." };
      const sum = listed.reduce((s, c) => s + c.qty, 0);
      if (sum !== qty)
        return {
          error: `A divisão por cor soma ${sum} unidades, mas o pedido tem ${qty}. Ajuste os valores.`,
        };
      return { colors: [...listed, ...custom] };
    }
    return {
      colors: [...listed.map((c) => ({ ...c, qty: null })), ...custom],
    };
  };

  const add = () => {
    setError("");
    if (busy) return;
    if (!validateQuantity(values.qty, product.min)) {
      setError(
        `Informe uma quantidade inteira a partir de ${product.min} unidades.`,
      );
      return;
    }
    const qty = Number(values.qty);
    if (product.variants?.length && !values.variant) {
      setError("Escolha o modelo do produto.");
      return;
    }
    const { colors, error: colorError } = buildColors(qty);
    if (colorError) {
      setError(colorError);
      return;
    }
    const item = {
      id: product.id,
      name: product.nome,
      key: editingKey || crypto.randomUUID(),
      qty,
      minimumUnconfirmed: product.min_confirmed === false,
      colors,
      variant: values.variant,
      method: values.method,
      text: values.text.trim().slice(0, 1200),
      files: values.files.map(({ isNew, ...f }) => f),
    };
    const rest = editingKey ? cart.filter((i) => i.key !== editingKey) : cart;
    const position = editingKey
      ? cart.findIndex((i) => i.key === editingKey)
      : rest.length;
    const next = [...rest];
    next.splice(Math.max(0, position), 0, item);
    try {
      setCart(combineCartItems(next));
    } catch (e) {
      setError(e.message);
      return;
    }
    if (removed.length) deleteAttachments(removed);
    setValues((v) => ({ ...v, files: [] }));
    setProduct(null);
    const edited = Boolean(editingKey);
    setEditingKey(null);
    onAdded(edited);
  };

  return {
    product,
    editing: Boolean(editingKey),
    open,
    close,
    add,
    form: {
      values,
      set,
      error,
      busy,
      addFiles,
      replaceFile,
      removeFile,
    },
  };
}
