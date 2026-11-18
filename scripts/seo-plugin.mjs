import { writeFile } from "node:fs/promises";
import path from "node:path";
import products from "../catalog/products.json" with { type: "json" };
import {
  canonicalSite,
  SITE_TITLE,
  SITE_DESCRIPTION,
  structuredCatalog,
  safeJson,
  discoveryFiles,
} from "../src/lib/seo.js";
export function seoPlugin(env, root) {
  const site = canonicalSite(env.VITE_SITE_URL);
  const business = {
    address: env.VITE_BUSINESS_ADDRESS || "",
    cnpj: env.VITE_BUSINESS_CNPJ || "",
    email: env.VITE_BUSINESS_EMAIL || "",
  };
  const data = structuredCatalog(products, site, {
    whatsapp: (env.VITE_WHATSAPP || "5561981333737").replace(/\D/g, ""),
    business,
  });
  const files = discoveryFiles(site);
  let building = false;
  return {
    name: "sanes-static-seo",
    configResolved(config) {
      building = config.command === "build";
    },
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "link",
            attrs: { rel: "canonical", href: site },
            injectTo: "head",
          },
          {
            tag: "link",
            attrs: {
              rel: "icon",
              type: "image/svg+xml",
              href: "./favicon.svg",
            },
            injectTo: "head",
          },
          ...Object.entries({
            "og:type": "website",
            "og:locale": "pt_BR",
            "og:title": SITE_TITLE,
            "og:description": SITE_DESCRIPTION,
            "og:url": site,
            "og:image": new URL("assets/reference-0.png", site).href,
            "og:image:alt":
              "Composição ilustrativa de kit corporativo do projeto Sanes Brindes",
            "twitter:card": "summary_large_image",
            "twitter:title": SITE_TITLE,
            "twitter:description": SITE_DESCRIPTION,
            "twitter:image": new URL("assets/reference-0.png", site).href,
          }).map(([name, content]) => ({
            tag: "meta",
            attrs: name.startsWith("og:")
              ? { property: name, content }
              : { name, content },
            injectTo: "head",
          })),
          {
            tag: "script",
            attrs: { type: "application/ld+json" },
            children: safeJson(data),
            injectTo: "head",
          },
        ],
      };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split("?")[0];
        if (name === "/robots.txt" || name === "/sitemap.xml") {
          res.setHeader(
            "Content-Type",
            name.endsWith(".xml") ? "application/xml" : "text/plain",
          );
          res.end(name.endsWith(".xml") ? files.sitemap : files.robots);
        } else next();
      });
    },
    async closeBundle() {
      if (!building) return;
      await Promise.all([
        writeFile(path.join(root, "dist/robots.txt"), files.robots),
        writeFile(path.join(root, "dist/sitemap.xml"), files.sitemap),
      ]);
    },
  };
}
