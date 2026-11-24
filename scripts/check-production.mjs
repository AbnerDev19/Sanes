import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { assertPublicKey } from "../src/lib/publicConfig.js";
import importReport from "../catalog/import-report.json" with { type: "json" };
import { auditCatalog } from "./audit-catalog.mjs";
import { canonicalSite } from "../src/lib/seo.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const env = { ...loadEnv("production", root, "VITE_"), ...process.env };
const configOnly = process.argv.includes("--config-only");
const requireBackend =
  !configOnly || process.argv.includes("--require-backend");
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

const errors = await auditCatalog();
if (errors.length) throw new Error(errors.join("\n"));
canonicalSite(env.VITE_SITE_URL);
if (requireBackend || url || key) {
  if (
    !url ||
    !key ||
    !url.startsWith("https://") ||
    url.includes("YOUR_PROJECT")
  )
    throw new Error(
      "Informe a URL HTTPS do Supabase e a chave pública para compilar em produção.",
    );
  assertPublicKey(key);
}
if (
  requireBackend &&
  importReport.documents.some(({ status }) => status !== "extracted") &&
  env.CATALOG_PENDING_ACCEPTED !== "true"
)
  throw new Error(
    "Há um catálogo pendente. Importe o documento ou registre a decisão com CATALOG_PENDING_ACCEPTED=true.",
  );
if (configOnly) {
  console.log("Catálogo e configuração de build validados.");
  process.exit(0);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const products = await db
  .from("products")
  .select("id")
  .eq("active", true)
  .limit(1);
if (products.error || !products.data?.length)
  throw new Error("Catálogo remoto vazio ou inacessível.");

if (process.argv.includes("--smoke")) {
  const token = env.SANES_SMOKE_CAPTCHA_TOKEN;
  const auth = await db.auth.signInAnonymously(
    token ? { options: { captchaToken: token } } : undefined,
  );
  if (auth.error || !auth.data.user)
    throw new Error("Login anônimo indisponível. Confira Auth e CAPTCHA.");
  try {
    const settings = await db
      .from("store_settings")
      .select("whatsapp")
      .single();
    if (settings.error || !settings.data?.whatsapp)
      throw new Error("Configurações da loja indisponíveis.");
    const checks = [
      [
        "submit_order",
        { p_request_key: null, p_items: [], p_customer: {} },
        /Identificação/,
      ],
      ["reorder_products", { p_ids: [] }, /Acesso restrito/],
      ["reorder_categories", { p_names: [] }, /Acesso restrito/],
    ];
    for (const [name, args, expected] of checks) {
      const { error } = await db.rpc(name, args);
      if (error?.code !== "P0001" || !expected.test(error.message))
        throw new Error(`Resposta inesperada da RPC ${name}.`);
    }
    for (const bucket of ["catalog", "order-files"]) {
      const { error } = await db.storage.from(bucket).list("", { limit: 1 });
      if (error) throw new Error(`Bucket ${bucket} indisponível.`);
    }
  } finally {
    await db.auth.signOut({ scope: "local" });
  }
}
console.log("Configuração pública e catálogo remoto conferidos.");
