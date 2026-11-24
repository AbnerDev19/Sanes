import { sameSecret } from "../_shared/webhook-auth.mjs";
import { orderNotice } from "./notification.mjs";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (!(await sameSecret(request.headers.get("x-sanes-webhook-secret"), Deno.env.get("ORDER_WEBHOOK_SECRET")))) {
    return new Response(null, { status: 401 });
  }
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("ORDER_NOTIFY_FROM");
  const to = Deno.env.get("ORDER_NOTIFY_TO");
  const site = Deno.env.get("ORDER_NOTIFY_SITE_URL");
  if (!key || !from || !to || !site) return new Response(null, { status: 204 });
  try {
    const event = await request.json();
    const notice = orderNotice(event, site);
    if (!notice) return new Response(null, { status: 400 });
    const delivered = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `sanes-order-${event.record.id}`,
      },
      body: JSON.stringify({ from, to: [to], ...notice }),
      signal: AbortSignal.timeout(10000),
    });
    if (!delivered.ok) {
      console.error("Falha ao notificar pedido", delivered.status);
      return new Response(null, { status: 502 });
    }
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
});
