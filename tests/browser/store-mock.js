import { readFile } from "node:fs/promises";
const catalog = JSON.parse(
  await readFile(
    new URL("../../catalog/products.json", import.meta.url),
    "utf8",
  ),
);
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const ANON_ID = "00000000-0000-4000-8000-00000000a000";
const CATEGORY_ORDER = [
  "Térmicos e bebidas",
  "Bolsas e mochilas",
  "Canetas",
  "Kits e presentes",
  "Escritório e tecnologia",
  "Churrasco e lazer",
];

// Simula as respostas do Supabase (Auth, REST, RPC e Storage) usadas pelo site.
export async function mockStore(
  page,
  {
    failOrder = false,
    cartDelay = 0,
    whatsapp = null,
    staff = false,
    anonymousDisabled = false,
  } = {},
) {
  const state = {
    cart: [],
    orders: [],
    calls: [],
    uploads: [],
    signedIn: false,
    anonymous: false,
    settings: { id: true, whatsapp: whatsapp || "5561981333737" },
    reorders: [],
  };
  const user = {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "cliente@example.com",
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    user_metadata: { name: "Cliente Teste" },
    app_metadata: { provider: "email" },
    is_anonymous: false,
  };
  const anon = {
    id: ANON_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "",
    created_at: new Date().toISOString(),
    user_metadata: {},
    app_metadata: {},
    is_anonymous: true,
  };
  state.products = catalog.map((p, i) => ({
    id: p.id,
    name: p.nome,
    category: p.categoria,
    capacity: p.capacidade,
    description: p.desc,
    dimensions: p.dim || null,
    min_qty: p.min,
    min_confirmed: p.min_confirmed !== false,
    unit_price: p.id === "SB-001" ? 12.5 : null,
    image_url: p.imagem || null,
    source_document: p.source_document || null,
    source_page: p.source_page || null,
    active: true,
    featured: false,
    sort_order: i + 1,
    colors: p.id === "SB-001" ? ["Preto", "Azul", "Branco"] : [],
    variants: p.id === "SB-001" ? ["500 ml", "750 ml"] : [],
    gallery: [],
  }));
  state.categories = CATEGORY_ORDER.map((name, i) => ({
    name,
    sort_order: i + 1,
    active: true,
  }));
  const jwt = (who) =>
    [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
        "base64url",
      ),
      Buffer.from(
        JSON.stringify({
          sub: who.id,
          aud: "authenticated",
          role: "authenticated",
          email: who.email,
          is_anonymous: who.is_anonymous,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url"),
      "test-signature",
    ].join(".");
  const session = (who) => ({
    access_token: jwt(who),
    refresh_token: "test-refresh",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: who,
  });
  const product = (id) => state.products.find((p) => p.id === id);
  const eq = (url, key) => url.searchParams.get(key)?.replace(/^eq\./, "");

  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      method = req.method(),
      path = url.pathname;
    let body;
    try {
      body = req.postDataJSON();
    } catch {}
    const single = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
    const respond = (json, status = 200) =>
      route.fulfill({
        status,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
          "access-control-expose-headers": "content-range",
          "content-type": "application/json",
        },
        body: status === 204 ? "" : JSON.stringify(json),
      });
    const rows = (list) =>
      respond(
        single ? (list[0] ?? null) : list,
        single && !list[0] ? 406 : 200,
      );
    if (method === "OPTIONS") return respond({}, 200);

    // Auth ------------------------------------------------------------------
    if (path === "/auth/v1/token") {
      state.signedIn = true;
      return respond(session(user));
    }
    if (path === "/auth/v1/user")
      return respond(state.anonymous && !state.signedIn ? anon : user);
    if (path === "/auth/v1/signup") {
      if (!body?.email) {
        if (anonymousDisabled)
          return respond(
            { code: 422, msg: "Anonymous sign-ins are disabled" },
            422,
          );
        state.anonymous = true;
        return respond(session(anon));
      }
      return respond({
        ...user,
        identities: [{ id: USER_ID }],
        confirmation_sent_at: new Date().toISOString(),
      });
    }
    if (path === "/auth/v1/recover") return respond({});
    if (path === "/auth/v1/logout") {
      state.signedIn = false;
      return respond(null, 204);
    }

    // Catálogo e configuração -------------------------------------------------
    if (path === "/rest/v1/products") {
      if (method === "GET") {
        const onlyActive = url.searchParams.get("active") === "eq.true";
        return rows(state.products.filter((p) => !onlyActive || p.active));
      }
      if (method === "PATCH") {
        const p = product(eq(url, "id"));
        if (!staff || !p) return rows([]);
        Object.assign(p, body);
        return rows([p]);
      }
      if (method === "POST") {
        if (!staff) return respond({ message: "denied", code: "42501" }, 403);
        if (product(body.id))
          return respond({ message: "duplicate", code: "23505" }, 409);
        state.products.push({ active: true, gallery: [], ...body });
        return rows([product(body.id)]);
      }
      if (method === "DELETE") {
        const id = eq(url, "id");
        if (
          state.orders.some((o) =>
            o.order_items.some((i) => i.product_id === id),
          )
        )
          return respond({ message: "fk", code: "23503" }, 409);
        state.products = state.products.filter((p) => p.id !== id);
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-expose-headers": "content-range",
            "content-range": "*/1",
          },
          body: "",
        });
      }
    }
    if (path === "/rest/v1/categories") {
      if (method === "GET")
        return rows(
          [...state.categories]
            .filter((c) => staff || c.active)
            .sort((a, b) => a.sort_order - b.sort_order),
        );
      if (method === "PATCH") {
        const c = state.categories.find((x) => x.name === eq(url, "name"));
        if (!staff || !c) return rows([]);
        if (body.name && body.name !== c.name)
          state.products
            .filter((p) => p.category === c.name)
            .forEach((p) => (p.category = body.name));
        Object.assign(c, body);
        return rows([c]);
      }
      if (method === "POST") {
        state.categories.push({ active: true, ...body });
        return respond(null, 201);
      }
    }
    if (path === "/rest/v1/store_settings") {
      if (method === "GET")
        return whatsapp || staff
          ? rows([state.settings])
          : respond({ message: "relation does not exist" }, 404);
      if (method === "PATCH") {
        if (!staff) return rows([]);
        Object.assign(state.settings, body);
        return rows([state.settings]);
      }
    }
    if (path === "/rest/v1/rpc/reorder_products") {
      state.reorders.push(body.p_ids);
      body.p_ids.forEach((id, i) => (product(id).sort_order = i + 1));
      return respond(null, 204);
    }

    // Conta -------------------------------------------------------------------
    if (path === "/rest/v1/store_members")
      return rows(staff && state.signedIn ? [{ role: "owner" }] : []);
    if (path === "/rest/v1/profiles") {
      if (method === "GET")
        return rows([
          {
            id: USER_ID,
            name: "Cliente Teste",
            company: "Empresa Teste",
            phone: "61999990000",
            city: "Brasília",
          },
        ]);
      return respond(null, 201);
    }
    if (path === "/rest/v1/carts") {
      if (method === "GET") {
        if (cartDelay) await new Promise((r) => setTimeout(r, cartDelay));
        return rows(state.cart.length ? [{ items: state.cart }] : []);
      }
      state.cart = body.items;
      return respond(null, 201);
    }

    // Arquivos ----------------------------------------------------------------
    if (path.startsWith("/storage/v1/object/sign/order-files")) {
      if (!body.paths)
        return respond({
          signedURL: `/object/sign/${path.split("/sign/")[1]}?token=signed-test`,
        });
      return respond(
        body.paths.map((p) => ({
          path: p,
          error: null,
          signedURL: `/object/sign/order-files/${p}?token=signed-test`,
        })),
      );
    }
    if (path.startsWith("/storage/v1/object/")) {
      const [bucket, ...rest] = path
        .slice("/storage/v1/object/".length)
        .split("/");
      state.uploads.push({ bucket, path: rest.join("/") });
      return respond({ Key: `${bucket}/${rest.join("/")}`, Id: "file-id" });
    }

    // Pedidos -----------------------------------------------------------------
    if (path === "/rest/v1/rpc/submit_order") {
      state.calls.push(body);
      if (failOrder)
        return respond(
          { message: "Um produto não está disponível.", code: "P0001" },
          400,
        );
      const existing = state.orders.find(
        (o) => o.request_key === body.p_request_key,
      );
      if (existing) return respond(existing);
      const id = `20000000-0000-4000-8000-00000000000${state.orders.length + 1}`;
      const items = body.p_items.map((i, n) => ({
        id: `item-${n}`,
        product_id: i.id,
        product_name: product(i.id).name,
        quantity: i.qty,
        colors: i.colors,
        color: (i.colors || []).map((c) => c.name).join(", "),
        variant: i.variant,
        method: i.method,
        details: i.text,
        unit_price: product(i.id).unit_price,
      }));
      const files = body.p_items.flatMap((i, n) =>
        (i.files || []).map((f, k) => ({
          id: `file-${n}-${k}`,
          order_item_id: `item-${n}`,
          storage_path: f.path,
          file_name: f.name,
          mime_type: "image/png",
          size_bytes: 120,
        })),
      );
      const order = {
        id,
        number: 42 + state.orders.length,
        request_key: body.p_request_key,
        user_id: state.signedIn ? USER_ID : ANON_ID,
        status: "requested",
        created_at: new Date().toISOString(),
        customer: {
          ...body.p_customer,
          email: state.signedIn ? user.email : body.p_customer.email,
          guest: !state.signedIn,
        },
        total_units: body.p_items.reduce((s, i) => s + i.qty, 0),
        estimated_total: null,
        order_items: items,
        order_files: files,
      };
      state.orders.unshift(order);
      return respond(order);
    }
    if (path === "/rest/v1/rpc/update_order_status") {
      const order = state.orders.find((o) => o.id === body.p_order_id);
      order.status = body.p_status;
      return respond(null, 204);
    }
    if (path === "/rest/v1/orders") {
      const id = eq(url, "id");
      return rows(id ? state.orders.filter((o) => o.id === id) : state.orders);
    }
    return respond(
      { message: `Unexpected test endpoint ${method} ${path}` },
      400,
    );
  });
  return state;
}
