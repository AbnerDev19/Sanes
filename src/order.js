export function validateQuantity(value, min) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= 100000;
}
