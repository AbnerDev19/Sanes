export const DEFAULT_SITE_URL = "https://abnerdev19.github.io/Sanes/";
export const SITE_TITLE = "Sanes Brindes — Sua marca, presente.";
export const SITE_DESCRIPTION =
  "Explore o catálogo Sanes Brindes, personalize seus itens e solicite um orçamento pelo WhatsApp. Valores, arte e prazo sob consulta.";

export function canonicalSite(value = DEFAULT_SITE_URL) {
  const url = new URL(value || DEFAULT_SITE_URL);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("VITE_SITE_URL deve ser uma URL HTTP(S) sem credenciais.");
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.href;
}

export const productUrl = (product, site) =>
  new URL(`produto/${encodeURIComponent(product.id)}/`, site).href;

export function structuredCatalog(
  products,
  site,
  { whatsapp = "", business = {} } = {},
) {
  const organization = {
    "@type": "Organization",
    "@id": `${site}#organization`,
    name: "Sanes Brindes",
    url: site,
    logo: new URL("favicon.svg", site).href,
  };
  if (whatsapp) organization.telephone = `+${whatsapp}`;
  if (business.email) organization.email = business.email;
  if (business.address) organization.address = business.address;
  if (business.cnpj) organization.taxID = business.cnpj;
  const list = {
    "@type": "ItemList",
    "@id": `${site}#catalogo`,
    name: "Catálogo Sanes Brindes",
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: productUrl(product, site),
    })),
  };
  return { "@context": "https://schema.org", "@graph": [organization, list] };
}

export function productMetadata(product, site) {
  const title = `${product.nome} | Sanes Brindes`;
  const description =
    product.desc?.trim() ||
    `Conheça ${product.nome} e solicite um orçamento personalizado na Sanes Brindes.`;
  const canonical = productUrl(product, site);
  const image = new URL("assets/social-sanes.jpg", site).href;
  const price = product.unit_price ?? product.preco;
  const priced =
    typeof price === "number" && Number.isFinite(price) && price >= 0;
  const structured = priced
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.nome,
        url: canonical,
        sku: product.id,
        description,
        category: product.categoria,
        ...(product.imagem
          ? { image: new URL(product.imagem, site).href }
          : {}),
        offers: {
          "@type": "Offer",
          url: canonical,
          price,
          priceCurrency: "BRL",
        },
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        url: canonical,
        description,
      };
  return { title, description, canonical, image, structured };
}

export const safeJson = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
export const escapeMarkup = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function discoveryFiles(site, products = []) {
  const urls = [site, ...products.map((product) => productUrl(product, site))];
  return {
    robots: `User-agent: *\nAllow: /\nSitemap: ${site}sitemap.xml\n`,
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeMarkup(url)}</loc></url>`).join("\n")}\n</urlset>\n`,
  };
}
