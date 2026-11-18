import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { seoPlugin } from "./scripts/seo-plugin.mjs";
import { assertPublicKey } from "./src/lib/publicConfig.js";
const projectRoot = fileURLToPath(new URL("./", import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "VITE_");
  assertPublicKey(
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      env.VITE_SUPABASE_ANON_KEY,
  );
  const publicEnv = { ...env, ...process.env };
  const optionalKeys = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_WHATSAPP",
    "VITE_SITE_URL",
    "VITE_BUSINESS_ADDRESS",
    "VITE_BUSINESS_CNPJ",
    "VITE_BUSINESS_HOURS",
    "VITE_BUSINESS_EMAIL",
  ];
  return {
    define: Object.fromEntries(
      optionalKeys.map((key) => [
        `import.meta.env.${key}`,
        JSON.stringify(publicEnv[key] || ""),
      ]),
    ),
    plugins: [seoPlugin({ ...env, ...process.env }, projectRoot)],
    root: "app",
    envDir: projectRoot,
    resolve: {
      alias: { "/src": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    base: "./",
    publicDir: "../public",
    esbuild: { jsx: "automatic" },
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      rollupOptions: {
        output: { manualChunks: { supabase: ["@supabase/supabase-js"] } },
      },
    },
  };
});
