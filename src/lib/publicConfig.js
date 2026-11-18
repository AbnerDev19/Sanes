export function assertPublicKey(key) {
  if (!key) return;
  let role;
  try {
    role = JSON.parse(
      atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ).role;
  } catch {}
  if (key.startsWith("sb_secret_") || (role && role !== "anon"))
    throw new Error(
      "A browser build must use a Supabase publishable/anon key. A privileged or user-session key is not allowed.",
    );
}
