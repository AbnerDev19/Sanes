export function todayBrazil(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type) => parts.find((p) => p.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function phoneDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55"))
    digits = digits.slice(2);
  return digits;
}
export function formatBrazilianPhone(value) {
  const d = phoneDigits(value).slice(0, 11);
  if (!d) return "";
  if (d.length < 3) return `(${d}`;
  const body = d.slice(2),
    cut = body.length > 8 ? 5 : 4;
  return `(${d.slice(0, 2)}) ${body.slice(0, cut)}${body.length > cut ? "-" + body.slice(cut) : ""}`;
}
export function validPhone(value) {
  return /^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(phoneDigits(value));
}
export function validDeliveryDate(value, now = new Date()) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= todayBrazil(now)
  );
}
export const UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

// Retorna { campo: mensagem } com os problemas do formulário do cliente.
export function contactErrors(customer) {
  const errors = {};
  const name = String(customer.name || "").trim();
  if (name.length < 2) errors.name = "Informe seu nome completo.";
  if (!validPhone(customer.phone))
    errors.phone = "Informe um telefone com DDD, por exemplo (61) 98133-3737.";
  if (String(customer.city || "").trim().length < 2)
    errors.city = "Informe a cidade.";
  if (!UFS.includes(customer.state)) errors.state = "Selecione o estado.";
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
    errors.email = "Informe um e-mail válido ou deixe em branco.";
  return errors;
}

export function contactError(customer) {
  return Object.values(contactErrors(customer))[0] || "";
}
