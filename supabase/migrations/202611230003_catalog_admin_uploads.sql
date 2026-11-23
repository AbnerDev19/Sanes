begin;
-- 003: catálogo administrável, configuração da loja, pedidos de visitante e
-- arquivos de logomarca. Não apaga tabelas nem dados das migrações 001/002.

-- Categorias ------------------------------------------------------------------
create table if not exists public.categories (
 name text primary key check(length(trim(name)) between 1 and 80),
 sort_order integer not null default 0,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
insert into public.categories(name,sort_order) values
 ('Térmicos e bebidas',1),('Bolsas e mochilas',2),('Canetas',3),
 ('Kits e presentes',4),('Escritório e tecnologia',5),('Churrasco e lazer',6)
on conflict(name) do nothing;
-- Categorias já usadas por produtos importados continuam válidas.
insert into public.categories(name,sort_order)
 select distinct category,100 from public.products where length(trim(category)) between 1 and 80
on conflict(name) do nothing;

-- Produtos: destaque, ordem, cores, modelos e galeria --------------------------
alter table public.products
 add column if not exists featured boolean not null default false,
 add column if not exists sort_order integer not null default 0,
 add column if not exists colors jsonb not null default '[]',
 add column if not exists variants jsonb not null default '[]',
 add column if not exists gallery jsonb not null default '[]',
 add column if not exists created_at timestamptz not null default now();
alter table public.products drop constraint if exists products_options_check;
alter table public.products add constraint products_options_check check(
 jsonb_typeof(colors)='array' and jsonb_array_length(colors)<=40
 and jsonb_typeof(variants)='array' and jsonb_array_length(variants)<=40
 and jsonb_typeof(gallery)='array' and jsonb_array_length(gallery)<=12);
alter table public.products drop constraint if exists products_category_fkey;
-- Renomear uma categoria atualiza os produtos; excluir exige movê-los antes.
alter table public.products add constraint products_category_fkey
 foreign key(category) references public.categories(name) on update cascade on delete restrict;
create index if not exists products_catalog_order on public.products(featured desc,sort_order,name);

-- Configuração da loja (linha única): WhatsApp de destino ----------------------
create table if not exists public.store_settings (
 id boolean primary key default true check(id),
 whatsapp text not null check(whatsapp ~ '^55[1-9][0-9](9[0-9]{8}|[2-5][0-9]{7})$'),
 updated_at timestamptz not null default now()
);
insert into public.store_settings(id,whatsapp) values(true,'5561981333737') on conflict(id) do nothing;

-- Itens e arquivos dos pedidos -------------------------------------------------
alter table public.order_items
 add column if not exists colors jsonb not null default '[]',
 add column if not exists variant text not null default '';
create table if not exists public.order_files (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 order_item_id uuid not null references public.order_items(id) on delete cascade,
 storage_path text not null unique check(length(storage_path) between 3 and 300),
 file_name text not null check(length(file_name) between 1 and 160),
 mime_type text not null check(mime_type in ('image/png','image/jpeg','application/pdf')),
 size_bytes integer not null check(size_bytes between 1 and 10485760),
 created_at timestamptz not null default now()
);
create index if not exists order_files_order on public.order_files(order_id);

-- Permissões -------------------------------------------------------------------
-- Contas anônimas (visitantes que enviam arquivos) nunca são equipe.
create or replace function public.is_store_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.store_members m where m.user_id=(select auth.uid()))
   and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false;
$$;
revoke all on function public.is_store_member() from public;
grant execute on function public.is_store_member() to anon,authenticated;

alter table public.categories enable row level security;
alter table public.store_settings enable row level security;
alter table public.order_files enable row level security;
drop policy if exists categories_public_read on public.categories;
drop policy if exists categories_staff_write on public.categories;
drop policy if exists settings_public_read on public.store_settings;
drop policy if exists settings_staff_update on public.store_settings;
drop policy if exists products_staff_write on public.products;
drop policy if exists order_files_read on public.order_files;
create policy categories_public_read on public.categories for select to anon,authenticated using(active or (select public.is_store_member()));
create policy categories_staff_write on public.categories for all to authenticated using((select public.is_store_member())) with check((select public.is_store_member()));
create policy settings_public_read on public.store_settings for select to anon,authenticated using(true);
create policy settings_staff_update on public.store_settings for update to authenticated using((select public.is_store_member())) with check((select public.is_store_member()));
create policy products_staff_write on public.products for all to authenticated using((select public.is_store_member())) with check((select public.is_store_member()));
create policy order_files_read on public.order_files for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.user_id=(select auth.uid()) or (select public.is_store_member()))));
grant select on public.categories,public.store_settings to anon,authenticated;
grant insert,update,delete on public.categories,public.products to authenticated;
grant update(whatsapp,updated_at) on public.store_settings to authenticated;
grant select on public.order_files to authenticated;
grant all on public.categories,public.store_settings,public.order_files to service_role;

-- Armazenamento: fotos do catálogo (equipe) e logomarcas (privadas) ------------
drop policy if exists catalog_staff_insert on storage.objects;
drop policy if exists catalog_staff_update on storage.objects;
drop policy if exists catalog_staff_delete on storage.objects;
create policy catalog_staff_insert on storage.objects for insert to authenticated with check(bucket_id='catalog' and (select public.is_store_member()));
create policy catalog_staff_update on storage.objects for update to authenticated using(bucket_id='catalog' and (select public.is_store_member()));
create policy catalog_staff_delete on storage.objects for delete to authenticated using(bucket_id='catalog' and (select public.is_store_member()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('order-files','order-files',false,10485760,array['image/png','image/jpeg','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Cada pessoa grava apenas em <seu id>/..., com no máximo 40 arquivos por dia.
create or replace function public.order_upload_allowed(p_name text) returns boolean language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null
  and split_part(p_name,'/',1)=(select auth.uid())::text
  and p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,140}$'
  and lower(p_name) ~ '\.(png|jpe?g|pdf)$'
  and (select count(*) from storage.objects o where o.bucket_id='order-files'
       and split_part(o.name,'/',1)=(select auth.uid())::text
       and o.created_at>now()-interval '1 day')<40;
$$;
-- Arquivos já vinculados a um pedido não podem ser apagados pelo cliente.
create or replace function public.order_file_unlinked(p_name text) returns boolean language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.order_files f where f.storage_path=p_name);
$$;
revoke all on function public.order_upload_allowed(text),public.order_file_unlinked(text) from public;
grant execute on function public.order_upload_allowed(text),public.order_file_unlinked(text) to authenticated;
drop policy if exists order_files_upload on storage.objects;
drop policy if exists order_files_select on storage.objects;
drop policy if exists order_files_delete on storage.objects;
create policy order_files_upload on storage.objects for insert to authenticated
 with check(bucket_id='order-files' and (select public.order_upload_allowed(name)));
create policy order_files_select on storage.objects for select to authenticated
 using(bucket_id='order-files' and (split_part(name,'/',1)=(select auth.uid())::text or (select public.is_store_member())));
create policy order_files_delete on storage.objects for delete to authenticated
 using(bucket_id='order-files' and split_part(name,'/',1)=(select auth.uid())::text and (select public.order_file_unlinked(name)));

-- Envio de pedido (visitante anônimo ou conta) ----------------------------------
create or replace function public.submit_order(p_request_key uuid,p_items jsonb,p_customer jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); existing public.orders%rowtype; product public.products%rowtype;
 entry jsonb; file jsonb; color jsonb; amount integer; units integer := 0; sum_price numeric := 0;
 all_priced boolean := true; new_order uuid; new_item uuid; result public.orders%rowtype;
 digits text; account_email text; anonymous boolean; file_count integer := 0; color_units integer;
 obj record; ufs text[] := array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
begin
 if uid is null then raise exception 'Sessão de envio indisponível. Recarregue a página e tente novamente.'; end if;
 if p_request_key is null then raise exception 'Identificação de envio obrigatória.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_request_key::text,0));
 select * into existing from public.orders where user_id=uid and request_key=p_request_key;
 if found then return public.order_json(existing.id); end if;
 if (select count(*) from public.orders where user_id=uid and created_at>now()-interval '1 hour')>=10 then
  raise exception 'Muitos pedidos em pouco tempo. Aguarde alguns minutos ou fale conosco pelo WhatsApp.'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Carrinho inválido.'; end if;
 if jsonb_typeof(p_customer) is distinct from 'object'
  or length(trim(coalesce(p_customer->>'name',''))) not between 2 and 100
  or length(coalesce(p_customer->>'company',''))>120
  or length(trim(coalesce(p_customer->>'city',''))) not between 2 and 120
  or not (coalesce(p_customer->>'state','') = any(ufs))
  or length(coalesce(p_customer->>'email',''))>150
  or length(coalesce(p_customer->>'notes',''))>1500 then raise exception 'Dados de contato inválidos.'; end if;
 if coalesce(p_customer->>'email','')<>'' and p_customer->>'email' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
 digits:=regexp_replace(coalesce(p_customer->>'phone',''),'[^0-9]','','g');
 if length(digits) in (12,13) and left(digits,2)='55' then digits:=substring(digits from 3); end if;
 if digits !~ '^[1-9][0-9]([2-5][0-9]{7}|9[0-9]{8})$' then raise exception 'Telefone brasileiro com DDD obrigatório.'; end if;
 select u.email,coalesce(u.is_anonymous,false) into account_email,anonymous from auth.users u where u.id=uid;
 if not found then raise exception 'Sessão de envio inválida.'; end if;
 -- Validação completa antes de gravar.
 for entry in select value from jsonb_array_elements(p_items) loop
  if coalesce(entry->>'qty','') !~ '^[0-9]{1,6}$' then raise exception 'Quantidade inválida.'; end if;
  amount:=(entry->>'qty')::integer;
  select * into product from public.products where id=entry->>'id' and active for share;
  if not found then raise exception 'Um produto não está disponível. Atualize o catálogo.'; end if;
  if amount<product.min_qty or amount>100000 then raise exception 'Quantidade fora do permitido para %.',product.name; end if;
  if length(coalesce(entry->>'variant',''))>80 or length(coalesce(entry->>'method',''))>80
   or length(coalesce(entry->>'text',''))>1200 then raise exception 'Personalização inválida.'; end if;
  if jsonb_typeof(coalesce(entry->'colors','[]')) is distinct from 'array' or jsonb_array_length(coalesce(entry->'colors','[]'))>20 then raise exception 'Cores inválidas.'; end if;
  color_units:=0;
  for color in select value from jsonb_array_elements(coalesce(entry->'colors','[]')) loop
   if length(trim(coalesce(color->>'name',''))) not between 1 and 60 then raise exception 'Cor inválida.'; end if;
   if color ? 'qty' and color->>'qty' is not null then
    if color->>'qty' !~ '^[0-9]{1,6}$' then raise exception 'Quantidade por cor inválida.'; end if;
    color_units:=color_units+(color->>'qty')::integer;
   end if;
  end loop;
  if color_units>amount then raise exception 'A soma das cores ultrapassa a quantidade de %.',product.name; end if;
  if jsonb_typeof(coalesce(entry->'files','[]')) is distinct from 'array' or jsonb_array_length(coalesce(entry->'files','[]'))>5 then raise exception 'Até 5 arquivos por produto.'; end if;
  for file in select value from jsonb_array_elements(coalesce(entry->'files','[]')) loop
   file_count:=file_count+1;
   if split_part(coalesce(file->>'path',''),'/',1)<>uid::text then raise exception 'Arquivo não pertence a este envio.'; end if;
   select o.name,o.metadata into obj from storage.objects o where o.bucket_id='order-files' and o.name=file->>'path';
   if not found then raise exception 'Um arquivo não terminou de enviar. Tente novamente.'; end if;
   if exists(select 1 from public.order_files f where f.storage_path=file->>'path') then raise exception 'Arquivo já usado em outro pedido.'; end if;
   if length(coalesce(file->>'name','')) not between 1 and 160 then raise exception 'Nome de arquivo inválido.'; end if;
  end loop;
  units:=units+amount;
  if product.unit_price is null then all_priced:=false; else sum_price:=sum_price+product.unit_price*amount; end if;
 end loop;
 if file_count>20 then raise exception 'Envie no máximo 20 arquivos por pedido.'; end if;
 insert into public.orders(user_id,request_key,customer,estimated_total,total_units)
 values(uid,p_request_key,jsonb_build_object(
  'name',trim(p_customer->>'name'),
  'email',case when not anonymous and account_email is not null then account_email else coalesce(p_customer->>'email','') end,
  'company',trim(coalesce(p_customer->>'company','')),'phone',coalesce(p_customer->>'phone',''),
  'city',trim(p_customer->>'city'),'state',p_customer->>'state','notes',coalesce(p_customer->>'notes',''),
  'guest',anonymous),
  case when all_priced then sum_price else null end,units) returning id into new_order;
 for entry in select value from jsonb_array_elements(p_items) loop
  select * into product from public.products where id=entry->>'id';
  insert into public.order_items(order_id,product_id,product_name,quantity,color,colors,variant,method,details,art_name,unit_price,source_min_qty)
  values(new_order,product.id,product.name,(entry->>'qty')::integer,
   coalesce((select string_agg(trim(c->>'name')||case when c->>'qty' is not null then ' ('||(c->>'qty')||')' else '' end,', ')
     from jsonb_array_elements(coalesce(entry->'colors','[]')) c),''),
   coalesce((select jsonb_agg(jsonb_build_object('name',trim(c->>'name'),'qty',(c->>'qty')::integer)) from jsonb_array_elements(coalesce(entry->'colors','[]')) c),'[]'),
   coalesce(entry->>'variant',''),coalesce(entry->>'method',''),coalesce(entry->>'text',''),
   coalesce((select string_agg(f->>'name',', ') from jsonb_array_elements(coalesce(entry->'files','[]')) f),''),
   product.unit_price,product.min_qty) returning id into new_item;
  for file in select value from jsonb_array_elements(coalesce(entry->'files','[]')) loop
   select o.metadata into obj from storage.objects o where o.bucket_id='order-files' and o.name=file->>'path';
   insert into public.order_files(order_id,order_item_id,storage_path,file_name,mime_type,size_bytes)
   values(new_order,new_item,file->>'path',file->>'name',
    coalesce(obj.metadata->>'mimetype',case when lower(file->>'path') like '%.pdf' then 'application/pdf' when lower(file->>'path') like '%.png' then 'image/png' else 'image/jpeg' end),
    greatest(1,coalesce((obj.metadata->>'size')::integer,1)));
  end loop;
 end loop;
 return public.order_json(new_order);
end;
$$;
create or replace function public.order_json(p_order_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(o)
  ||jsonb_build_object('order_items',(select coalesce(jsonb_agg(to_jsonb(i) order by i.ctid),'[]'::jsonb) from public.order_items i where i.order_id=o.id))
  ||jsonb_build_object('order_files',(select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at),'[]'::jsonb) from public.order_files f where f.order_id=o.id))
 from public.orders o where o.id=p_order_id;
$$;
revoke all on function public.order_json(uuid) from public,anon,authenticated;
revoke all on function public.submit_order(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.submit_order(uuid,jsonb,jsonb) to authenticated;
commit;
