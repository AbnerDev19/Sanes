import { access } from "node:fs/promises";
import { CATEGORIES } from "../src/lib/catalog.js";
import products from "../catalog/products.json" with { type: "json" };

export async function auditCatalog(entries = products) {
  const seen = new Set();
  const errors = [];
  for (const p of entries) {
    if (!/^SB-[0-9]+$/.test(p.id) || seen.has(p.id))
      errors.push(`ID inválido ou duplicado: ${p.id}`);
    seen.add(p.id);
    if (!CATEGORIES.includes(p.categoria))
      errors.push(`${p.id}: categoria desconhecida`);
    if (
      !p.nome?.trim() ||
      !Number.isInteger(p.min) ||
      p.min < 1 ||
      p.min > 100000
    )
      errors.push(`${p.id}: nome ou quantidade mínima inválida`);
    if (p.imagem) {
      if (!/^assets\/catalog\/[a-z0-9._-]+\.webp$/.test(p.imagem)) {
        errors.push(`${p.id}: caminho inválido da foto`);
        continue;
      }
      try {
        await access(new URL(`../public/${p.imagem}`, import.meta.url));
      } catch {
        errors.push(`${p.id}: foto ausente (${p.imagem})`);
      }
    }
  }
  return errors;
}

if (
  import.meta.main ||
  process.argv[1]?.endsWith("/audit-catalog.mjs") ||
  process.argv[1]?.endsWith("\\audit-catalog.mjs")
) {
  const errors = await auditCatalog();
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(
      `Catálogo validado: ${products.length} produtos, ${products.filter((p) => p.imagem).length} fotos.`,
    );
  }
}
