begin;

drop policy if exists profiles_registered_only on public.profiles;
create policy profiles_registered_only on public.profiles as restrictive for all to authenticated
 using (not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false))
 with check (not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false));
drop policy if exists carts_registered_only on public.carts;
create policy carts_registered_only on public.carts as restrictive for all to authenticated
 using (not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false))
 with check (not coalesce((select auth.jwt()->>'is_anonymous')::boolean, false));

drop function if exists public.place_order(uuid,jsonb,jsonb);
drop function if exists public.place_order_v1(uuid,jsonb,jsonb);
revoke execute on function public.update_order_status(uuid,text),
 public.order_upload_allowed(text), public.order_file_unlinked(text) from public,anon;

create or replace function public.order_file_unlinked(p_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select split_part(p_name,'/',1) = (select auth.uid())::text
   and not exists(select from public.order_files where storage_path=p_name);
$$;

create or replace function public.is_store_owner()
returns boolean language sql stable security definer set search_path='' as $$
 select not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)
   and exists(select from public.store_members where user_id=(select auth.uid()) and role='owner');
$$;
revoke all on function public.is_store_owner() from public,anon,authenticated;
grant execute on function public.is_store_owner() to authenticated;

drop policy if exists settings_staff_update on public.store_settings;
create policy settings_staff_update on public.store_settings for update to authenticated
 using ((select public.is_store_owner())) with check ((select public.is_store_owner()));

-- A política restritiva mantém a autorização original para edição e limita DELETE.
drop policy if exists products_owner_delete on public.products;
create policy products_owner_delete on public.products as restrictive for delete to authenticated
 using ((select public.is_store_owner()));
drop policy if exists categories_owner_delete on public.categories;
create policy categories_owner_delete on public.categories as restrictive for delete to authenticated
 using ((select public.is_store_owner()));
revoke insert, update, delete, truncate on public.store_members from public,anon,authenticated;

alter table public.store_settings add column if not exists max_orders_per_hour integer not null default 100
 check (max_orders_per_hour between 1 and 10000);
create index if not exists orders_created_at on public.orders(created_at);
create or replace function public.enforce_order_rate()
returns trigger language plpgsql security definer set search_path='' as $$
declare max_orders integer;
begin
 perform pg_advisory_xact_lock(535458, 1);
 select max_orders_per_hour into max_orders from public.store_settings where id;
 if (select count(*) from public.orders where created_at > now()-interval '1 hour') >= coalesce(max_orders,100) then
  raise exception 'A loja recebeu muitos pedidos nesta hora. Aguarde alguns minutos ou fale conosco pelo WhatsApp.';
 end if;
 if (select count(*) from public.orders where user_id=new.user_id and created_at > now()-interval '1 hour') >= 10 then
  raise exception 'Muitos pedidos em pouco tempo. Aguarde alguns minutos ou fale conosco pelo WhatsApp.';
 end if;
 return new;
end;
$$;
revoke all on function public.enforce_order_rate() from public,anon,authenticated;
drop trigger if exists enforce_order_rate on public.orders;
create trigger enforce_order_rate before insert on public.orders for each row execute function public.enforce_order_rate();

create table if not exists public.audit_log (
 id bigint generated always as identity primary key,
 actor_id uuid,
 occurred_at timestamptz not null default now(),
 table_name text not null,
 action text not null,
 previous jsonb,
 current_value jsonb
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from public,anon,authenticated,service_role;
grant select on public.audit_log to authenticated;
drop policy if exists audit_team_read on public.audit_log;
create policy audit_team_read on public.audit_log for select to authenticated using ((select public.is_store_member()));

create or replace function public.audit_store_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare before_value jsonb; after_value jsonb;
begin
 if tg_table_name='orders' then
  before_value:=jsonb_build_object('number',old.number,'status',old.status);
  after_value:=jsonb_build_object('number',new.number,'status',new.status);
 elsif tg_table_name='products' then
  before_value:=jsonb_build_object('id',old.id);
 else
  if tg_op<>'INSERT' then before_value:=to_jsonb(old)-'updated_at'; end if;
  if tg_op<>'DELETE' then after_value:=to_jsonb(new)-'updated_at'; end if;
 end if;
 if before_value is distinct from after_value then
  insert into public.audit_log(actor_id,table_name,action,previous,current_value)
  values(auth.uid(),tg_table_name,tg_op,before_value,after_value);
 end if;
 return null;
end;
$$;
revoke all on function public.audit_store_change() from public,anon,authenticated;
drop trigger if exists audit_settings on public.store_settings;
create trigger audit_settings after update on public.store_settings for each row execute function public.audit_store_change();
drop trigger if exists audit_members on public.store_members;
create trigger audit_members after insert or update or delete on public.store_members for each row execute function public.audit_store_change();
drop trigger if exists audit_order_status on public.orders;
create trigger audit_order_status after update of status on public.orders
 for each row when (old.status is distinct from new.status) execute function public.audit_store_change();
drop trigger if exists audit_product_delete on public.products;
create trigger audit_product_delete after delete on public.products for each row execute function public.audit_store_change();

create or replace function public.update_order_status(p_order_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare
 previous_status text;
 stages text[] := array['requested','in_contact','quoted','confirmed','in_production','shipped','completed'];
begin
 if not public.is_store_member() then raise exception 'Acesso restrito à loja.'; end if;
 if p_status is null or (p_status <> 'cancelled' and not p_status = any(stages)) then raise exception 'Status inválido.'; end if;
 select status into previous_status from public.orders where id=p_order_id for update;
 if not found then raise exception 'Pedido não encontrado.'; end if;
 if p_status=previous_status then return; end if;
 if previous_status in ('completed','cancelled')
    or (p_status<>'cancelled' and array_position(stages,p_status)<array_position(stages,previous_status)) then
  raise exception 'Esta mudança de status não é permitida.';
 end if;
 update public.orders set status=p_status,updated_at=now() where id=p_order_id;
end;
$$;
revoke all on function public.update_order_status(uuid,text) from public,anon;
grant execute on function public.update_order_status(uuid,text) to authenticated;

commit;
