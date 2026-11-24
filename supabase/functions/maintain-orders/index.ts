import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { sameSecret } from "../_shared/webhook-auth.mjs";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (!(await sameSecret(request.headers.get("x-sanes-maintenance-secret"), Deno.env.get("ORDER_MAINTENANCE_SECRET")))) {
    return new Response(null, { status: 401 });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response(null, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const queue = await db.rpc("queue_expired_order_files");
    if (queue.error) throw queue.error;
    const paths: string[] = queue.data.map((row: { path: string }) => row.path);
    let removed = 0;
    if (paths.length) {
      const deleted = await db.storage.from("order-files").remove(paths);
      if (deleted.error) throw deleted.error;
      const ack = await db.rpc("finish_order_file_purge", { paths });
      if (ack.error) throw ack.error;
      removed = ack.data;
    }
    const cleanup = await db.rpc("cleanup_anonymous_profiles");
    if (cleanup.error) throw cleanup.error;
    const accounts = await db.rpc("expired_anonymous_accounts");
    if (accounts.error) throw accounts.error;
    let accountsRemoved = 0;
    let accountsFailed = 0;
    for (const { user_id } of accounts.data) {
      const result = await db.auth.admin.deleteUser(user_id);
      if (result.error) accountsFailed++;
      else accountsRemoved++;
    }
    return Response.json({ removed, anonymousRecordsRemoved: cleanup.data, accountsRemoved, accountsFailed }, { status: accountsFailed ? 503 : 200 });
  } catch {
    console.error("Falha na manutenção de pedidos.");
    return new Response(null, { status: 503 });
  }
});
