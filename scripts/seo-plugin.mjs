import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import products from "../catalog/products.json" with { type: "json" };
import { FALLBACK_WHATSAPP, normalizeWhatsapp } from "../src/config.js";
import {
  canonicalSite,
  SITE_TITLE,
  SITE_DESCRIPTION,
  structuredCatalog,
  productMetadata,
  escapeMarkup,
  safeJson,
  discoveryFiles,
} from "../src/lib/seo.js";

function seoHead({ title, description, canonical, image, structured }, base) {
  const esc = escapeMarkup;
  const metadata = {
    "og:type": "website",
    "og:locale": "pt_BR",
    "og:title": title,
    "og:description": description,
    "og:url": canonical,
    "og:image": image,
    "og:image:width": "1200",
    "og:image:height": "630",
    "og:image:alt": "Kit de brindes da Sanes",
    "twitter:card": "summary_large_image",
    "twitter:title": title,
    "twitter:description": description,
    "twitter:image": image,
  };
  return [
    `<title>${esc(title)}</title>`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<link rel="icon" type="image/svg+xml" href="${esc(base)}favicon.svg">`,
    `<meta name="description" content="${esc(description)}">`,
    ...Object.entries(metadata).map(
      ([name, value]) =>
        `<meta ${name.startsWith("og:") ? "property" : "name"}="${name}" content="${esc(value)}">`,
    ),
    `<script type="application/ld+json">${safeJson(structured)}</script>`,
  ].join("\n    ");
}

export function seoPlugin(env, root) {
  const site = canonicalSite(env.VITE_SITE_URL);
  const files = discoveryFiles(site, products);
  const home = {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    canonical: site,
    image: new URL("assets/social-sanes.jpg", site).href,
    structured: structuredCatalog(products, site, {
      whatsapp: normalizeWhatsapp(env.VITE_WHATSAPP) || FALLBACK_WHATSAPP,
      business: {
        address: env.VITE_BUSINESS_ADDRESS,
        cnpj: env.VITE_BUSINESS_CNPJ,
        email: env.VITE_BUSINESS_EMAIL,
      },
    }),
  };
  let config;
  return {
    name: "sanes-static-seo",
    configResolved(value) {
      config = value;
    },
    transformIndexHtml(html) {
      return html.replace("<!-- SANES_META -->", seoHead(home, config.base));
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
      if (config.command !== "build") return;
      const out = path.join(root, "dist");
      const index = await readFile(path.join(out, "index.html"), "utf8");
      const rootHead = seoHead(home, config.base);
      if (!index.includes(rootHead))
        throw new Error(
          "Não foi possível localizar o cabeçalho de SEO no build.",
        );
      await Promise.all(
        products.map(async (product) => {
          const details = productMetadata(product, site);
          const directory = path.join(out, "produto", product.id);
          await mkdir(directory, { recursive: true });
          const esc = escapeMarkup;
          const content = `<div id="root"><main lang="pt-BR"><a href="${esc(config.base)}">Sanes Brindes</a><h1>${esc(product.nome)}</h1><p>${esc(details.description)}</p>${product.imagem ? `<img src="${esc(config.base + product.imagem)}" alt="${esc(product.nome)}" width="400">` : ""}<p>${product.min_confirmed === false ? "Pedido mínimo a confirmar" : `Pedido mínimo: ${product.min} unidades`}</p><a href="${esc(config.base)}#catalogo">Ver catálogo</a></main></div>`;
          const html = index
            .replace(rootHead, () => seoHead(details, config.base))
            .replace('<div id="root"></div>', () => content);
          await writeFile(path.join(directory, "index.html"), html);
        }),
      );
      const fallback = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Sanes Brindes</title><script>const root = new URL(${safeJson(config.base)}, location.origin); if (location.pathname !== root.pathname) { root.searchParams.set("__sanes_path",location.pathname+location.search+location.hash); location.replace(root.href); }</script><a href="${escapeMarkup(config.base)}">Voltar à loja Sanes</a></html>`;
      await Promise.all([
        writeFile(path.join(out, "robots.txt"), files.robots),
        writeFile(path.join(out, "sitemap.xml"), files.sitemap),
        writeFile(path.join(out, "404.html"), fallback),
      ]);
    },
  };
}
