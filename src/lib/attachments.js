// Arquivos de logomarca guardados no próprio navegador (IndexedDB) até o
// envio do pedido. Assim o carrinho sobrevive a um recarregamento sem enviar
// nada à internet antes da hora. Sem IndexedDB, cai para a memória da página.
import { FILE_TYPES, MAX_FILE_BYTES } from "./commerce.js";

const DB = "sanes-attachments",
  STORE = "files";
const memory = new Map();
let opening;

function open() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  opening ||= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return opening;
}

function run(mode, action) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        if (!db) return resolve(undefined);
        const tx = db.transaction(STORE, mode);
        const req = action(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export async function saveAttachment(id, file) {
  memory.set(id, file);
  try {
    await run("readwrite", (s) => s.put(file, id));
  } catch {}
}

export async function getAttachment(id) {
  if (memory.has(id)) return memory.get(id);
  try {
    const file = await run("readonly", (s) => s.get(id));
    if (file) memory.set(id, file);
    return file || null;
  } catch {
    return null;
  }
}

export async function deleteAttachments(ids) {
  for (const id of ids) memory.delete(id);
  try {
    await run("readwrite", (s) => {
      let last;
      for (const id of ids) last = s.delete(id);
      return last;
    });
  } catch {}
}

// Remove arquivos que não pertencem mais a nenhum item do carrinho.
export async function pruneAttachments(keepIds) {
  const keep = new Set(keepIds);
  try {
    const keys = (await run("readonly", (s) => s.getAllKeys())) || [];
    const stale = keys.filter((k) => !keep.has(k));
    if (stale.length) await deleteAttachments(stale);
  } catch {}
}

const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/pdf": "pdf",
};
export const extensionFor = (type) => EXTENSIONS[type] || "bin";

// Confere tamanho e a assinatura real do arquivo (não só a extensão).
export async function inspectFile(file) {
  if (!file) return { error: "Selecione um arquivo." };
  if (file.size <= 0) return { error: "O arquivo está vazio." };
  if (file.size > MAX_FILE_BYTES)
    return {
      error: `"${file.name}" tem mais de 10 MB. Envie um arquivo menor.`,
    };
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const starts = (...bytes) => bytes.every((b, i) => head[i] === b);
  const type = starts(0x89, 0x50, 0x4e, 0x47)
    ? "image/png"
    : starts(0xff, 0xd8, 0xff)
      ? "image/jpeg"
      : starts(0x25, 0x50, 0x44, 0x46)
        ? "application/pdf"
        : "";
  if (!FILE_TYPES.includes(type))
    return {
      error: `"${file.name}" não é um PNG, JPG ou PDF válido.`,
    };
  return { type };
}
