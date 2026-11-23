import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const migration = (name) =>
  readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");

// Estruturas mínimas de Auth/Storage do Supabase para rodar o SQL localmente.
const SUPABASE_STUBS = `create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean not null default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('is_anonymous',coalesce(nullif(current_setting('request.jwt.claim.anon',true),''),'false')::boolean)$$;
 grant usage on schema auth to anon,authenticated;
 create schema storage;grant usage on schema storage to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb,created_at timestamptz not null default now());
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;`;

const GUEST = "00000000-0000-4000-8000-0000000000a1",
  OTHER = "00000000-0000-4000-8000-0000000000a2",
  OWNER = "00000000-0000-4000-8000-0000000000a3",
  ANON_MEMBER = "00000000-0000-4000-8000-0000000000a4",
  KEY = "20000000-0000-4000-8000-000000000001";

async function setup() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const name of [
    "202611170001_store.sql",
    "202611170002_order_contact_validation.sql",
    "202611230003_catalog_admin_uploads.sql",
    "202611230004_admin_ordering.sql",
  ])
    await db.exec(await migration(name));
  await db.query(
    `insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
     ($1,null,null,true),($2,null,null,true),($3,'junior@example.com',now(),false),($4,null,null,true)`,
    [GUEST, OTHER, OWNER, ANON_MEMBER],
  );
  await db.query(
    "insert into public.store_members values($1,'owner'),($2,'staff')",
    [OWNER, ANON_MEMBER],
  );
  await db.exec(`insert into public.products(id,name,category,min_qty,colors,variants)
    values('SB-001','Garrafa','Térmicos e bebidas',30,'["Preto","Azul"]','["500 ml","750 ml"]'),
          ('SB-002','Caneta','Canetas',50,'[]','[]');`);
  const as = async (id, anonymous = false) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || "",
    ]);
    await db.query("select set_config('request.jwt.claim.anon',$1,false)", [
      String(anonymous),
    ]);
    await db.exec(`set role ${id ? "authenticated" : "anon"}`);
  };
  return { db, as };
}

const customer = {
  name: "Maria Souza",
  company: "",
  phone: "(61) 99999-0000",
  city: "Brasília",
  state: "DF",
  notes: "",
};
const path = (uid, file = "logo.png") => `${uid}/${KEY}/${file}`;

test("catálogo e configuração: leitura pública, escrita só da equipe", async () => {
  const { db, as } = await setup();
  await as(null);
  assert.equal(
    (await db.query("select whatsapp from public.store_settings")).rows[0]
      .whatsapp,
    "5561981333737",
  );
  assert.equal(
    (await db.query("select * from public.categories")).rows.length,
    6,
  );
  await assert.rejects(
    db.exec("update public.store_settings set whatsapp='5511999999999'"),
    /permission denied/,
  );
  await as(GUEST, true);
  await db.exec("update public.store_settings set whatsapp='5511999999999'");
  await db.exec("update public.products set featured=true");
  await db.exec("reset role");
  assert.equal(
    (await db.query("select whatsapp from public.store_settings")).rows[0]
      .whatsapp,
    "5561981333737",
    "visitante não altera o WhatsApp (RLS filtra a linha)",
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.products where featured",
      )
    ).rows[0].n,
    0,
  );
  // Conta anônima listada em store_members não ganha poderes de equipe.
  await as(ANON_MEMBER, true);
  await db.exec("update public.products set featured=true");
  await db.exec("reset role");
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.products where featured",
      )
    ).rows[0].n,
    0,
  );
  await as(OWNER);
  await db.exec("update public.store_settings set whatsapp='5561988887777'");
  await db.exec(
    "update public.products set featured=true,sort_order=2 where id='SB-001'",
  );
  await db.exec(
    "update public.categories set name='Garrafas e copos' where name='Térmicos e bebidas'",
  );
  assert.equal(
    (await db.query("select category from public.products where id='SB-001'"))
      .rows[0].category,
    "Garrafas e copos",
  );
  await assert.rejects(
    db.exec("delete from public.categories where name='Canetas'"),
    /foreign key/,
  );
  await assert.rejects(
    db.exec("update public.store_settings set whatsapp='123'"),
    /check constraint/,
  );
  await db.query(
    "insert into public.products(id,name,category,min_qty) values('SB-900','Novo','Canetas',10)",
  );
  await db.query("delete from public.products where id='SB-900'");
  await db.close();
});

test("visitante envia logomarca e pedido; arquivos ficam privados", async () => {
  const { db, as } = await setup();
  await as(GUEST, true);
  await db.query(
    'insert into storage.objects(bucket_id,name,metadata) values(\'order-files\',$1,\'{"mimetype":"image/png","size":2048}\')',
    [path(GUEST)],
  );
  await assert.rejects(
    db.query(
      "insert into storage.objects(bucket_id,name) values('order-files',$1)",
      [path(OTHER)],
    ),
    /row-level security/,
    "não grava na pasta de outra pessoa",
  );
  await assert.rejects(
    db.query(
      "insert into storage.objects(bucket_id,name) values('order-files',$1)",
      [path(GUEST, "script.svg")],
    ),
    /row-level security/,
  );
  await assert.rejects(
    db.query(
      "insert into storage.objects(bucket_id,name) values('catalog','x.webp')",
    ),
    /row-level security/,
  );
  const item = {
    id: "SB-001",
    qty: 40,
    colors: [
      { name: "Preto", qty: 20 },
      { name: "Azul", qty: 20 },
    ],
    variant: "750 ml",
    text: "Logo centralizada",
    files: [{ path: path(GUEST), name: "logo empresa.png" }],
  };
  const submit = (items, data = customer, key = KEY) =>
    db.query("select public.submit_order($1,$2,$3) as r", [
      key,
      JSON.stringify(items),
      JSON.stringify(data),
    ]);
  await assert.rejects(submit([{ ...item, qty: 10 }]), /Quantidade fora/);
  await assert.rejects(
    submit([{ ...item, colors: [{ name: "Preto", qty: 41 }] }]),
    /soma das cores/,
  );
  await assert.rejects(
    submit([item], { ...customer, state: "XX" }),
    /contato inválidos/,
  );
  await assert.rejects(
    submit([item], { ...customer, phone: "1234" }),
    /Telefone/,
  );
  await assert.rejects(
    submit([{ ...item, files: [{ path: path(OTHER), name: "a.png" }] }]),
    /não pertence/,
  );
  await assert.rejects(
    submit([
      { ...item, files: [{ path: path(GUEST, "missing.png"), name: "a.png" }] },
    ]),
    /não terminou/,
  );
  const order = (await submit([item])).rows[0].r;
  assert.equal(order.total_units, 40);
  assert.equal(order.customer.guest, true);
  assert.equal(order.customer.state, "DF");
  assert.equal(order.order_items[0].variant, "750 ml");
  assert.equal(order.order_items[0].color, "Preto (20), Azul (20)");
  assert.equal(order.order_files.length, 1);
  assert.equal(order.order_files[0].mime_type, "image/png");
  assert.equal(order.order_files[0].size_bytes, 2048);
  const again = (await submit([item])).rows[0].r;
  assert.equal(again.id, order.id, "reenvio não duplica o pedido");
  await db.query("delete from storage.objects where name=$1", [path(GUEST)]);
  await db.exec("reset role");
  assert.equal(
    (await db.query("select count(*)::int n from storage.objects")).rows[0].n,
    1,
    "arquivo vinculado ao pedido não é apagado",
  );
  await as(OTHER, true);
  assert.equal((await db.query("select * from public.orders")).rows.length, 0);
  assert.equal(
    (await db.query("select * from public.order_files")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
  await as(OWNER);
  assert.equal((await db.query("select * from public.orders")).rows.length, 1);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    1,
  );
  await db.query("select public.update_order_status($1,'in_contact')", [
    order.id,
  ]);
  await db.close();
});

test("conta confirmada usa o e-mail da conta e há limite de pedidos", async () => {
  const { db, as } = await setup();
  await as(OWNER);
  const order = (
    await db.query("select public.submit_order($1,$2,$3) as r", [
      KEY,
      JSON.stringify([{ id: "SB-002", qty: 50 }]),
      JSON.stringify({ ...customer, email: "forjado@example.com" }),
    ])
  ).rows[0].r;
  assert.equal(order.customer.email, "junior@example.com");
  assert.equal(order.customer.guest, false);
  for (let n = 2; n <= 10; n++)
    await db.query("select public.submit_order($1,$2,$3)", [
      `20000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`,
      JSON.stringify([{ id: "SB-002", qty: 50 }]),
      JSON.stringify(customer),
    ]);
  await assert.rejects(
    db.query("select public.submit_order($1,$2,$3)", [
      "20000000-0000-4000-8000-000000000099",
      JSON.stringify([{ id: "SB-002", qty: 50 }]),
      JSON.stringify(customer),
    ]),
    /Muitos pedidos/,
  );
  await db.close();
});

test("equipe reordena produtos e categorias; visitante não", async () => {
  const { db, as } = await setup();
  await as(GUEST, true);
  await assert.rejects(
    db.query("select public.reorder_products($1)", [["SB-002", "SB-001"]]),
    /restrito/,
  );
  await as(OWNER);
  await db.query("select public.reorder_products($1)", [["SB-002", "SB-001"]]);
  await db.query("select public.reorder_categories($1)", [
    ["Canetas", "Térmicos e bebidas"],
  ]);
  const rows = (
    await db.query("select id,sort_order from public.products order by id")
  ).rows;
  assert.deepEqual(
    rows.map((r) => r.sort_order),
    [2, 1],
  );
  assert.equal(
    (
      await db.query(
        "select sort_order from public.categories where name='Canetas'",
      )
    ).rows[0].sort_order,
    1,
  );
  await db.close();
});
