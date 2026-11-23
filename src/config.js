// Único ponto do código com o WhatsApp de destino. Em produção o número vem da
// tabela store_settings (alterado no painel administrativo); VITE_WHATSAPP e o
// valor abaixo são apenas reservas para quando o banco não estiver disponível.
const FALLBACK_WHATSAPP = "5561981333737";

export function normalizeWhatsapp(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const full =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^55[1-9]\d(?:9\d{8}|[2-5]\d{7})$/.test(full) ? full : "";
}

export const WHATSAPP =
  normalizeWhatsapp(import.meta.env?.VITE_WHATSAPP) || FALLBACK_WHATSAPP;

export function whatsappLink(number, text = "") {
  const target = normalizeWhatsapp(number) || WHATSAPP;
  return `https://wa.me/${target}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function formatWhatsapp(number) {
  const d = normalizeWhatsapp(number).slice(2);
  if (!d) return "";
  return `+55 (${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}
