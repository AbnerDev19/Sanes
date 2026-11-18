export const DEFAULT_SITE_URL = "https://abnerdev19.github.io/Sanes/";
export const SITE_TITLE = "Sanes Brindes — Sua marca, presente.";
export const SITE_DESCRIPTION =
  "Explore o catálogo Sanes Brindes, personalize seus itens e solicite um orçamento pelo WhatsApp. Valores, arte e prazo sob consulta.";
export function canonicalSite(value = DEFAULT_SITE_URL) {
  const url = new URL(value || DEFAULT_SITE_URL);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("VITE_SITE_URL deve ser uma URL HTTP(S).");
  url.hash = "";
  url.search = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.href;
}
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
    itemListElement: products.map((p, index) => {
      const url = new URL(`#/produto/${encodeURIComponent(p.id)}`, site).href;
      const item = {
        "@type": "Product",
        "@id": url,
        name: p.nome,
        sku: p.id,
        category: p.categoria,
        description: p.desc,
        url,
      };
      if (p.imagem) item.image = new URL(p.imagem, site).href;
      return { "@type": "ListItem", position: index + 1, url, item };
    }),
  };
  return { "@context": "https://schema.org", "@graph": [organization, list] };
}
export const safeJson = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
export function discoveryFiles(site) {
  const escaped = site
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return {
    robots: `User-agent: *\nAllow: /\nSitemap: ${site}sitemap.xml\n`,
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escaped}</loc></url></urlset>\n`,
  };
}
