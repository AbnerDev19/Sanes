import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error(
    "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the private server environment. Never use a service key in VITE_ variables.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const products = JSON.parse(
  await readFile(path.join(root, "catalog/products.json"), "utf8"),
);
// Por padrão só cadastra produtos novos: o que a equipe editar no painel
// administrativo não é sobrescrito. Use --update para regravar textos e fotos.
const overwrite = process.argv.includes("--update");
const FEATURED = ["SB-104", "SB-105", "SB-106", "SB-068", "SB-086", "SB-078"];
let uploaded = 0;
for (const [index, product] of products.entries()) {
  let image_url = null;
  if (product.imagem) {
    const relative = product.imagem.replace(/^assets\//, "");
    const file = await readFile(path.join(root, "public", product.imagem));
    const { error } = await db.storage.from("catalog").upload(relative, file, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });
    if (error) throw new Error(`Picture ${product.id}: ${error.message}`);
    image_url = db.storage.from("catalog").getPublicUrl(relative)
      .data.publicUrl;
    uploaded++;
  }
  const row = {
    id: product.id,
    name: product.nome,
    category: product.categoria,
    capacity: product.capacidade || "",
    description: product.desc || "",
    dimensions: product.dim || null,
    min_qty: product.min,
    min_confirmed: product.min_confirmed !== false,
    image_url,
    source_document: product.source_document || "Base original enviada",
    source_page: product.source_page || null,
  };
  if (!overwrite) {
    row.sort_order = index + 1;
    row.featured = FEATURED.includes(product.id);
  }
  // Preços, disponibilidade, cores, modelos e destaques ficam com a loja.
  const { error } = await db
    .from("products")
    .upsert(row, { onConflict: "id", ignoreDuplicates: !overwrite });
  if (error) throw new Error(`Product ${product.id}: ${error.message}`);
}
console.log(
  `Imported ${products.length} products and ${uploaded} catalog pictures. Suggestions PDF remains pending; see catalog/import-report.json.`,
);
