begin;

create schema if not exists sanes_private;
revoke all on schema sanes_private from public,anon,authenticated;

create or replace function sanes_private.option_key(value text)
returns text language sql immutable set search_path='' as $$
 select regexp_replace(normalize(lower(trim(value)),NFD),U&'[\0300-\036f]','','g');
$$;

create or replace function sanes_private.validate_order_customer(data jsonb, ufs text[])
returns jsonb language plpgsql immutable set search_path='' as $$
declare
 field text;
 digits text;
begin
 if jsonb_typeof(data) is distinct from 'object' then raise exception 'Dados de contato inválidos.'; end if;
 foreach field in array array['name','company','city','email','notes','state'] loop
  data:=jsonb_set(data,array[field],to_jsonb(trim(regexp_replace(coalesce(data->>field,''),'[[:cntrl:]]',' ','g'))));
 end loop;
 if length(data->>'name') not between 2 and 100 or length(data->>'company')>120
  or length(data->>'city') not between 2 and 120 or not (data->>'state'=any(ufs))
  or length(data->>'email')>150 or length(data->>'notes')>1500 then
  raise exception 'Dados de contato inválidos.'; end if;
 if data->>'email'<>'' and data->>'email' !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido.'; end if;
 if length(coalesce(data->>'phone',''))>30 then raise exception 'Telefone brasileiro com DDD obrigatório.'; end if;
 digits:=regexp_replace(coalesce(data->>'phone',''),'[^0-9]','','g');
 if length(digits) in (12,13) and left(digits,2)='55' then digits:=substring(digits from 3); end if;
 if digits !~ '^[1-9][0-9]([2-5][0-9]{7}|9[0-9]{8})$' then raise exception 'Telefone brasileiro com DDD obrigatório.'; end if;
 return jsonb_set(data,'{phone}',to_jsonb(digits));
end;
$$;

create or replace function sanes_private.validate_order_options(entry jsonb, product public.products, amount integer)
returns void language plpgsql immutable set search_path='' as $$
declare
 chosen_variant text:=trim(coalesce(entry->>'variant',''));
 colors jsonb:=coalesce(entry->'colors','[]');
 color jsonb;
 color_key text;
 seen text[]:=array[]::text[];
 color_units integer:=0;
begin
 if length(chosen_variant)>80 or length(coalesce(entry->>'method',''))>80
  or length(coalesce(entry->>'text',''))>1200
  or (entry->>'method') ~ '[[:cntrl:]]' then raise exception 'Personalização inválida.'; end if;
 if jsonb_array_length(product.variants)>0 then
  if chosen_variant='' then raise exception 'Escolha um modelo para %.',product.name; end if;
  if not product.variants ? chosen_variant then raise exception 'Modelo inválido para %.',product.name; end if;
 elsif chosen_variant<>'' then raise exception 'Este produto não possui modelos cadastrados.'; end if;
 if jsonb_typeof(colors) is distinct from 'array' then raise exception 'Cores inválidas.'; end if;
 if jsonb_array_length(colors)>20 then raise exception 'Cores inválidas.'; end if;
 for color in select value from jsonb_array_elements(colors) loop
  if jsonb_typeof(color->'name') is distinct from 'string'
   or length(trim(color->>'name')) not between 1 and 60
   or (color->>'name') ~ '[[:cntrl:]]' then raise exception 'Cor inválida.'; end if;
  color_key:=sanes_private.option_key(color->>'name');
  if color_key=any(seen) then raise exception 'Cor repetida no mesmo item.'; end if;
  seen:=array_append(seen,color_key);
  if jsonb_array_length(product.colors)>0 and not exists (
   select from jsonb_array_elements_text(product.colors) c where sanes_private.option_key(c.value)=color_key
  ) then raise exception 'Cor inválida para %.',product.name; end if;
  if color->>'qty' is not null then
   if color->>'qty' !~ '^[0-9]{1,6}$' then raise exception 'Quantidade por cor inválida.'; end if;
   if (color->>'qty')::integer<1 then raise exception 'Quantidade por cor inválida.'; end if;
   color_units:=color_units+(color->>'qty')::integer;
  end if;
 end loop;
 if color_units>amount then raise exception 'A soma das cores ultrapassa a quantidade de %.',product.name; end if;
end;
$$;

create or replace function sanes_private.validate_order_file(file jsonb, uid uuid, seen_paths text[])
returns void language plpgsql set search_path='' as $$
declare
 file_path text:=coalesce(file->>'path','');
 expected_mime text;
 metadata jsonb;
begin
 if split_part(file_path,'/',1)<>uid::text then raise exception 'Arquivo não pertence a este envio.'; end if;
 if file_path !~* '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,140}$'
  or file_path !~* '\.(png|jpe?g|pdf)$' then raise exception 'Caminho ou extensão do arquivo inválida.'; end if;
 if file_path=any(seen_paths) then raise exception 'O mesmo arquivo aparece mais de uma vez no pedido.'; end if;
 if jsonb_typeof(file->'name') is distinct from 'string' or length(trim(file->>'name')) not between 1 and 160
  or length(file->>'name')>160 or (file->>'name') ~ '[[:cntrl:]]' then raise exception 'Nome de arquivo inválido.'; end if;
 select o.metadata into metadata from storage.objects o where o.bucket_id='order-files' and o.name=file_path for share;
 if not found then raise exception 'Um arquivo não terminou de enviar. Tente novamente.'; end if;
 if exists(select from public.order_files f where f.storage_path=file_path) then raise exception 'Arquivo já usado em outro pedido.'; end if;
 expected_mime:=case when lower(file_path) like '%.png' then 'image/png'
  when lower(file_path) like '%.pdf' then 'application/pdf' else 'image/jpeg' end;
 if metadata->>'mimetype' is distinct from expected_mime then raise exception 'O tipo do arquivo não corresponde à extensão.'; end if;
 if coalesce(metadata->>'size','') !~ '^[0-9]{1,8}$' then raise exception 'Tamanho de arquivo inválido.'; end if;
 if (metadata->>'size')::integer not between 1 and 10485760 then raise exception 'Tamanho de arquivo inválido.'; end if;
end;
$$;

-- NULL nas linhas anteriores conserva dados históricos sem inventar sua ordem.
alter table public.order_items add column if not exists position integer check (position>0);
create unique index if not exists order_items_position on public.order_items(order_id,position)
 where position is not null;

create or replace function public.valid_catalog_list(value jsonb, max_length integer, gallery boolean)
returns boolean language sql immutable set search_path='' as $$
 select case when jsonb_typeof(value)<>'array' then false else not exists (
  select from jsonb_array_elements(value) element
  where jsonb_typeof(element)<>'string' or length(trim(element #>> '{}')) not between 1 and max_length
    or (element #>> '{}') ~ '[[:cntrl:]]'
    or (gallery and (element #>> '{}') !~ '^(https://[^[:space:]]+|assets/[A-Za-z0-9._/-]+)$')
    or (gallery and (element #>> '{}') ~ '(^|/)\.\.(/|$)')
 ) end;
$$;
alter table public.products drop constraint if exists products_element_format;
-- Valide separadamente depois de revisar opções históricas no painel.
alter table public.products add constraint products_element_format check (
 public.valid_catalog_list(colors,60,false) and public.valid_catalog_list(variants,80,false)
 and public.valid_catalog_list(gallery,2048,true)
) not valid;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin
 new.updated_at:=now();
 return new;
end;
$$;
revoke all on function public.touch_updated_at() from public,anon,authenticated;
drop trigger if exists touch_product on public.products;
create trigger touch_product before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists touch_settings on public.store_settings;
create trigger touch_settings before update on public.store_settings for each row execute function public.touch_updated_at();

create or replace function public.submit_order(p_request_key uuid,p_items jsonb,p_customer jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); existing public.orders%rowtype; product public.products%rowtype;
 entry jsonb; file jsonb; color jsonb; amount integer; units integer := 0; sum_price numeric := 0;
 all_priced boolean := true; new_order uuid; new_item uuid; result public.orders%rowtype;
 digits text; account_email text; anonymous boolean; file_count integer := 0;
 seen_paths text[] := array[]::text[]; item_position integer := 0;
 obj record; ufs text[] := array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
begin
 if uid is null then raise exception 'Sessão de envio indisponível. Recarregue a página e tente novamente.'; end if;
 if p_request_key is null then raise exception 'Identificação de envio obrigatória.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,1));
 select * into existing from public.orders where user_id=uid and request_key=p_request_key;
 if found then return public.order_json(existing.id); end if;
 if (select count(*) from public.orders where user_id=uid and created_at>now()-interval '1 hour')>=10 then
  raise exception 'Muitos pedidos em pouco tempo. Aguarde alguns minutos ou fale conosco pelo WhatsApp.'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Carrinho inválido.'; end if;
 p_customer := sanes_private.validate_order_customer(p_customer,ufs);
 digits := p_customer->>'phone';
 select u.email,coalesce(u.is_anonymous,false) into account_email,anonymous from auth.users u where u.id=uid;
 if not found then raise exception 'Sessão de envio inválida.'; end if;
 -- Validação completa antes de gravar.
 for entry in select value from jsonb_array_elements(p_items) loop
  if coalesce(entry->>'qty','') !~ '^[0-9]{1,6}$' then raise exception 'Quantidade inválida.'; end if;
  amount:=(entry->>'qty')::integer;
  select * into product from public.products where id=entry->>'id' and active for share;
  if not found then raise exception 'Um produto não está disponível. Atualize o catálogo.'; end if;
  if amount<product.min_qty or amount>100000 then raise exception 'Quantidade fora do permitido para %.',product.name; end if;
  perform sanes_private.validate_order_options(entry,product,amount);
  if jsonb_typeof(coalesce(entry->'files','[]')) is distinct from 'array' or jsonb_array_length(coalesce(entry->'files','[]'))>5 then raise exception 'Até 5 arquivos por produto.'; end if;
  for file in select value from jsonb_array_elements(coalesce(entry->'files','[]')) loop
   file_count:=file_count+1;
   perform sanes_private.validate_order_file(file,uid,seen_paths);
   seen_paths:=array_append(seen_paths,file->>'path');
  end loop;
  units:=units+amount;
  if product.unit_price is null then all_priced:=false; else sum_price:=sum_price+product.unit_price*amount; end if;
 end loop;
 if file_count>20 then raise exception 'Envie no máximo 20 arquivos por pedido.'; end if;
 insert into public.orders(user_id,request_key,customer,estimated_total,total_units)
 values(uid,p_request_key,jsonb_build_object(
  'name',trim(p_customer->>'name'),
  'email',case when not anonymous and account_email is not null then account_email else coalesce(p_customer->>'email','') end,
  'company',trim(coalesce(p_customer->>'company','')),'phone',digits,
  'city',trim(p_customer->>'city'),'state',p_customer->>'state','notes',coalesce(p_customer->>'notes',''),
  'guest',anonymous),
  case when all_priced then sum_price else null end,units) returning id into new_order;
 for entry in select value from jsonb_array_elements(p_items) loop
  select * into product from public.products where id=entry->>'id';
  item_position:=item_position+1;
  insert into public.order_items(position,order_id,product_id,product_name,quantity,color,colors,variant,method,details,art_name,unit_price,source_min_qty)
  values(item_position,new_order,product.id,product.name,(entry->>'qty')::integer,
   coalesce((select string_agg(trim(c->>'name')||case when c->>'qty' is not null then ' ('||(c->>'qty')||')' else '' end,', ')
     from jsonb_array_elements(coalesce(entry->'colors','[]')) c),''),
   coalesce((select jsonb_agg(jsonb_build_object('name',trim(c->>'name'),'qty',(c->>'qty')::integer)) from jsonb_array_elements(coalesce(entry->'colors','[]')) c),'[]'),
   trim(coalesce(entry->>'variant','')),trim(coalesce(entry->>'method','')),trim(regexp_replace(coalesce(entry->>'text',''),'[[:cntrl:]]',' ','g')),
   coalesce((select string_agg(f->>'name',', ') from jsonb_array_elements(coalesce(entry->'files','[]')) f),''),
   product.unit_price,product.min_qty) returning id into new_item;
  for file in select value from jsonb_array_elements(coalesce(entry->'files','[]')) loop
   select o.metadata into obj from storage.objects o where o.bucket_id='order-files' and o.name=file->>'path';
   insert into public.order_files(order_id,order_item_id,storage_path,file_name,mime_type,size_bytes)
   values(new_order,new_item,file->>'path',file->>'name',
    obj.metadata->>'mimetype',(obj.metadata->>'size')::integer);
  end loop;
 end loop;
 return public.order_json(new_order);
end;
$$;
create or replace function public.order_json(p_order_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(o)
  ||jsonb_build_object('order_items',(select coalesce(jsonb_agg(to_jsonb(i) order by i.position nulls last,i.id),'[]'::jsonb) from public.order_items i where i.order_id=o.id))
  ||jsonb_build_object('order_files',(select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at),'[]'::jsonb) from public.order_files f where f.order_id=o.id))
 from public.orders o where o.id=p_order_id;
$$;
revoke all on function public.order_json(uuid) from public,anon,authenticated;
revoke all on function public.submit_order(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.submit_order(uuid,jsonb,jsonb) to authenticated;

commit;
