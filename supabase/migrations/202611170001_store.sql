begin;
create table if not exists public.products (
 id text primary key check(length(id) between 1 and 80),
 name text not null, category text not null, capacity text not null default '',
 description text not null default '', dimensions text,
 min_qty integer not null default 1 check(min_qty between 1 and 100000),
 min_confirmed boolean not null default true,
 unit_price numeric(12,2) check(unit_price >= 0),
 image_url text, source_document text, source_page integer,
 active boolean not null default true,
 updated_at timestamptz not null default now()
);
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '' check(length(name)<=100),
 company text not null default '' check(length(company)<=120),
 phone text not null default '' check(length(phone)<=30),
 city text not null default '' check(length(city)<=120),
 updated_at timestamptz not null default now()
);
create table if not exists public.carts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 items jsonb not null default '[]' check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=100 and pg_column_size(items)<=262144),
 updated_at timestamptz not null default now()
);
create table if not exists public.store_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','staff'))
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 number bigint generated always as identity unique,
 user_id uuid not null references auth.users(id),
 request_key uuid not null,
 status text not null default 'requested' check(status in ('requested','in_contact','quoted','confirmed','in_production','shipped','completed','cancelled')),
 customer jsonb not null,
 estimated_total numeric(14,2),
 total_units integer not null check(total_units>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,request_key)
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 product_id text not null references public.products(id),
 product_name text not null, quantity integer not null check(quantity between 1 and 100000),
 color text not null default '', method text not null default '', details text not null default '',
 art_name text not null default '', unit_price numeric(12,2),
 source_min_qty integer not null
);
create index if not exists orders_user_created on public.orders(user_id,created_at desc);
create index if not exists order_items_order on public.order_items(order_id);
create or replace function public.is_store_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.store_members where user_id=(select auth.uid()));
$$;
revoke all on function public.is_store_member() from public;
grant execute on function public.is_store_member() to authenticated;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.carts enable row level security;
alter table public.store_members enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy products_public_read on public.products for select to anon,authenticated using(active);
create policy products_staff_read on public.products for select to authenticated using((select public.is_store_member()));
create policy profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy cart_owner on public.carts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy member_self on public.store_members for select to authenticated using(user_id=(select auth.uid()));
create policy order_read on public.orders for select to authenticated using(user_id=(select auth.uid()) or (select public.is_store_member()));
create policy item_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=(select auth.uid()) or (select public.is_store_member()))));
-- Order writes go through a validated, idempotent transaction. Clients cannot
-- supply prices, assign another customer, or mark an order as paid/confirmed.
create or replace function public.place_order(p_request_key uuid,p_items jsonb,p_customer jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); existing public.orders%rowtype; product public.products%rowtype;
 entry jsonb; amount integer; units integer := 0; sum_price numeric := 0; all_priced boolean := true;
 order_id uuid; result public.orders%rowtype; email text;
begin
 if uid is null then raise exception 'Entre na sua conta para enviar o pedido.'; end if;
 if p_request_key is null then raise exception 'Identificação de envio obrigatória.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_request_key::text,0));
 select * into existing from public.orders where user_id=uid and request_key=p_request_key;
 if found then return to_jsonb(existing)||jsonb_build_object('order_items',(select coalesce(jsonb_agg(to_jsonb(i)),'[]'::jsonb) from public.order_items i where i.order_id=existing.id)); end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Carrinho inválido.'; end if;
 if jsonb_typeof(p_customer) is distinct from 'object' or length(trim(coalesce(p_customer->>'name',''))) not between 1 and 100
 or length(coalesce(p_customer->>'company',''))>120 or length(coalesce(p_customer->>'phone',''))>30
 or length(coalesce(p_customer->>'city',''))>120 or length(coalesce(p_customer->>'notes',''))>1200
 or length(coalesce(p_customer->>'date',''))>10 then raise exception 'Dados de contato inválidos.'; end if;
 select u.email into email from auth.users u where u.id=uid and u.email_confirmed_at is not null;
 if email is null then raise exception 'Confirme seu e-mail antes de registrar o pedido.'; end if;
 for entry in select value from jsonb_array_elements(p_items) loop
  if coalesce(entry->>'qty','') !~ '^[0-9]{1,6}$' then raise exception 'Quantidade inválida.'; end if;
  amount := (entry->>'qty')::integer;
  select * into product from public.products where id=entry->>'id' and active for share;
  if not found then raise exception 'Um produto não está disponível. Atualize o catálogo.'; end if;
  if amount<product.min_qty or amount>100000 then raise exception 'Quantidade fora do permitido para %.',product.name; end if;
  if length(coalesce(entry->>'color',''))>80 or length(coalesce(entry->>'method',''))>80
   or length(coalesce(entry->>'text',''))>1200 or length(coalesce(entry->>'art',''))>255 then raise exception 'Personalização inválida.'; end if;
  units:=units+amount;
  if product.unit_price is null then all_priced:=false; else sum_price:=sum_price+product.unit_price*amount; end if;
 end loop;
 insert into public.orders(user_id,request_key,customer,estimated_total,total_units)
 values(uid,p_request_key,jsonb_build_object('name',trim(p_customer->>'name'),'email',email,'company',coalesce(p_customer->>'company',''),
 'phone',coalesce(p_customer->>'phone',''),'city',coalesce(p_customer->>'city',''),'date',coalesce(p_customer->>'date',''),'notes',coalesce(p_customer->>'notes','')),
 case when all_priced then sum_price else null end,units) returning id into order_id;
 for entry in select value from jsonb_array_elements(p_items) loop
  select * into product from public.products where id=entry->>'id';
  insert into public.order_items(order_id,product_id,product_name,quantity,color,method,details,art_name,unit_price,source_min_qty)
  values(order_id,product.id,product.name,(entry->>'qty')::integer,coalesce(entry->>'color',''),coalesce(entry->>'method',''),
   coalesce(entry->>'text',''),coalesce(entry->>'art',''),product.unit_price,product.min_qty);
 end loop;
 -- Never delete a cart here: another browser may have added items meanwhile.
 select * into result from public.orders where id=order_id;
 return to_jsonb(result)||jsonb_build_object('order_items',(select coalesce(jsonb_agg(to_jsonb(i)),'[]'::jsonb) from public.order_items i where i.order_id=result.id));
end;
$$;
revoke all on function public.place_order(uuid,jsonb,jsonb) from public;
grant execute on function public.place_order(uuid,jsonb,jsonb) to authenticated;
create or replace function public.update_order_status(p_order_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_store_member() then raise exception 'Acesso restrito à loja.'; end if;
 if p_status not in ('requested','in_contact','quoted','confirmed','in_production','shipped','completed','cancelled') then raise exception 'Status inválido.'; end if;
 update public.orders set status=p_status,updated_at=now() where id=p_order_id;
 if not found then raise exception 'Pedido não encontrado.'; end if;
end;
$$;
revoke all on function public.update_order_status(uuid,text) from public;
grant execute on function public.update_order_status(uuid,text) to authenticated;
revoke all on public.products,public.profiles,public.carts,public.store_members,public.orders,public.order_items from anon,authenticated;
grant select on public.products to anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.carts to authenticated;
grant select on public.store_members,public.orders,public.order_items to authenticated;
grant all on public.products,public.profiles,public.carts,public.store_members,public.orders,public.order_items to service_role;
-- Product pictures are public. Customer artwork remains in WhatsApp for now;
-- no private customer uploads are made public by this migration.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catalog','catalog',true,10485760,array['image/webp','image/jpeg','image/png']) on conflict(id) do nothing;
create policy catalog_picture_read on storage.objects for select to anon,authenticated using(bucket_id='catalog');
commit;
