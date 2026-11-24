import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import products from "../catalog/products.json" with { type: "json" };
import { FEATURED } from "../src/lib/catalog.js";
import { auditCatalog } from "./audit-catalog.mjs";

const dryRun = process.argv.includes("--dry-run");
const update = process.argv.includes("--update");
const updateMin = process.argv.includes("--update-min");
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (updateMin && !update) throw new Error("--update-min requer --update.");
const errors = await auditCatalog();
if (errors.length) throw new Error(errors.join("\n"));
if (dryRun && (!url || !key)) {
  console.log(
    `Simulação local: ${products.length} produtos e ${products.filter((p) => p.imagem).length} fotos validados. Forneça as credenciais no ambiente privado para conferir o estado remoto.`,
  );
  process.exit(0);
}
if (!url || !key)
  throw new Error(
    "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente privado.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = db.storage.from("catalog");
const report = {
  criados: 0,
  atualizados: 0,
  ignorados: 0,
  falhas: 0,
  fotosEnviadas: 0,
  fotosExistentes: 0,
};
const fail = (label, error, count = 1) => {
  report.falhas += count;
  console.error(`${label}: ${error.message}`);
};

for (let start = 0; start < products.length; start += 50) {
  const batch = products.slice(start, start + 50);
  const existing = await db
    .from("products")
    .select("id")
    .in(
      "id",
      batch.map((p) => p.id),
    );
  if (existing.error) {
    fail("Consulta de produtos", existing.error, batch.length);
    continue;
  }
  const ids = new Set(existing.data.map(({ id }) => id));
  const creates = [];
  const updates = [];
  const categoryNames = [
    ...new Set(batch.filter((p) => !ids.has(p.id)).map((p) => p.categoria)),
  ];
  if (categoryNames.length && !dryRun) {
    const categories = await db.from("categories").upsert(
      categoryNames.map((name) => ({ name })),
      { onConflict: "name", ignoreDuplicates: true },
    );
    if (categories.error) {
      fail("Cadastro de categorias", categories.error, batch.length);
      continue;
    }
  }
  for (const [index, p] of batch.entries()) {
    const exists = ids.has(p.id);
    if (exists && !update) {
      report.ignorados++;
      continue;
    }
    const row = {
      id: p.id,
      name: p.nome,
      capacity: p.capacidade || "",
      description: p.desc || "",
      ...(p.material ? { material: p.material } : {}),
      ...(p.dim ? { dimensions: p.dim } : {}),
    };
    if (!exists || updateMin)
      Object.assign(row, {
        min_qty: p.min,
        min_confirmed: p.min_confirmed !== false,
      });
    if (!exists)
      Object.assign(row, {
        category: p.categoria,
        sort_order: start + index + 1,
        featured: FEATURED.includes(p.id),
        source_document: p.source_document || "Base original enviada",
        ...(p.source_page ? { source_page: p.source_page } : {}),
      });
    if (p.imagem) {
      const path = p.imagem.replace(/^assets\//, "");
      try {
        if (!dryRun) {
          const present = await bucket.exists(path);
          if (
            present.error &&
            present.error.code !== "NoSuchKey" &&
            !(present.error.status === 404 && !present.error.code)
          )
            throw present.error;
          if (present.data && !update) report.fotosExistentes++;
          else {
            const bytes = await readFile(
              new URL(`../public/${p.imagem}`, import.meta.url),
            );
            const result = await bucket.upload(path, bytes, {
              contentType: "image/webp",
              upsert: update,
              cacheControl: "3600",
            });
            if (result.error) {
              if (
                !update &&
                /duplicate|already exists/i.test(result.error.message)
              )
                report.fotosExistentes++;
              else throw result.error;
            } else report.fotosEnviadas++;
          }
        }
        row.image_url = bucket.getPublicUrl(path).data.publicUrl;
      } catch (error) {
        fail(`Foto ${p.id}`, error);
        continue;
      }
    }
    (exists ? updates : creates).push(row);
  }
  if (dryRun) {
    report.criados += creates.length;
    report.atualizados += updates.length;
    continue;
  }
  if (creates.length) {
    const result = await db
      .from("products")
      .upsert(creates, {
        onConflict: "id",
        ignoreDuplicates: true,
        defaultToNull: false,
      })
      .select("id");
    if (result.error) fail("Inclusão do lote", result.error, creates.length);
    else {
      report.criados += result.data.length;
      report.ignorados += creates.length - result.data.length;
    }
  }
  if (updates.length) {
    const result = await db.rpc("update_imported_catalog", { rows: updates });
    if (result.error) fail("Atualização do lote", result.error, updates.length);
    else {
      report.atualizados += result.data.length;
      report.ignorados += updates.length - result.data.length;
    }
  }
}
console.log(
  dryRun ? "Simulação (atualizados = candidatos):" : "Importação concluída:",
  report,
);
if (report.falhas) process.exitCode = 1;
