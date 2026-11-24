export async function sameSecret(provided, expected) {
  if (!expected || !provided) return false;
  const bytes = new TextEncoder();
  const digest = async (value) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.encode(value)));
  const [a, b] = await Promise.all([digest(provided), digest(expected)]);
  return a.reduce((different, byte, index) => different | (byte ^ b[index]), 0) === 0;
}
