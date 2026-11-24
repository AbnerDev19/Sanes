begin;

alter table public.store_settings
 add column if not exists order_file_retention_days integer check (order_file_retention_days between 1 and 3650),
 add column if not exists anonymous_retention_days integer check (anonymous_retention_days between 2 and 3650);

create index if not exists order_files_storage_prefix on storage.objects ((name collate "C"),created_at)
 where bucket_id='order-files';
create or replace function public.order_upload_allowed(p_name text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and split_part(p_name,'/',1)=auth.uid()::text
 and p_name ~* '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,140}$'
 and p_name ~* '\.(png|jpe?g|pdf)$'
 and (select count(*) from storage.objects o where o.bucket_id='order-files'
  and o.name collate "C" >= auth.uid()::text||'/'
  and o.name collate "C" < auth.uid()::text||'0'
  and o.created_at > now()-interval '1 day')<40;
$$;
revoke execute on function public.order_upload_allowed(text) from public,anon;

create table if not exists sanes_private.order_file_purge_queue (
 storage_path text primary key,
 queued_at timestamptz not null default now()
);
create or replace function sanes_private.queue_removed_logo()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into sanes_private.order_file_purge_queue(storage_path) values(old.storage_path)
 on conflict do nothing;
 return null;
end;
$$;
drop trigger if exists queue_removed_logo on public.order_files;
create trigger queue_removed_logo after delete on public.order_files
 for each row execute function sanes_private.queue_removed_logo();

create or replace function sanes_private.reject_queued_logo()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select from sanes_private.order_file_purge_queue where storage_path=new.storage_path) then
  raise exception 'Uma logomarca antiga está em limpeza. Anexe o arquivo novamente.';
 end if;
 return new;
end;
$$;
drop trigger if exists reject_queued_logo on public.order_files;
create trigger reject_queued_logo before insert on public.order_files
 for each row execute function sanes_private.reject_queued_logo();

create or replace function public.queue_expired_order_files()
returns table(path text) language plpgsql security definer set search_path='' as $$
declare candidate record; retention_days integer;
begin
 select order_file_retention_days into retention_days from public.store_settings where id;
 if retention_days is not null then
  insert into sanes_private.order_file_purge_queue(storage_path)
   select f.storage_path from public.order_files f join public.orders o on o.id=f.order_id
   where o.status in ('completed','cancelled') and o.updated_at<now()-make_interval(days=>retention_days)
   and not exists(select from sanes_private.order_file_purge_queue q where q.storage_path=f.storage_path)
   order by o.updated_at limit 100 on conflict do nothing;
 end if;
 for candidate in
  select o.name from storage.objects o where o.bucket_id='order-files' and o.created_at<now()-interval '48 hours'
  and split_part(o.name,'/',1) ~ '^[0-9a-f-]{36}$'
  and not exists(select from public.order_files f where f.storage_path=o.name)
  and not exists(select from sanes_private.order_file_purge_queue q where q.storage_path=o.name)
  order by o.created_at limit 100
 loop
  if pg_try_advisory_xact_lock(hashtextextended(split_part(candidate.name,'/',1),1))
     and not exists(select from public.order_files f where f.storage_path=candidate.name) then
   insert into sanes_private.order_file_purge_queue(storage_path) values(candidate.name) on conflict do nothing;
  end if;
 end loop;
 return query select q.storage_path from sanes_private.order_file_purge_queue q order by q.queued_at,q.storage_path limit 100;
end;
$$;

-- Só confirma a exclusão após Storage remover os bytes usando sua API.
create or replace function public.finish_order_file_purge(paths text[])
returns integer language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
 if coalesce(cardinality(paths),0)>100 then raise exception 'Lote de limpeza inválido.'; end if;
 delete from public.order_files f using sanes_private.order_file_purge_queue q
 where f.storage_path=q.storage_path and q.storage_path=any(paths)
 and not exists(select from storage.objects o where o.bucket_id='order-files' and o.name=q.storage_path);
 delete from sanes_private.order_file_purge_queue q where q.storage_path=any(paths)
 and not exists(select from storage.objects o where o.bucket_id='order-files' and o.name=q.storage_path);
 get diagnostics affected=row_count;
 return affected;
end;
$$;

create or replace function public.expired_anonymous_accounts()
returns table(user_id uuid) language sql security definer set search_path='' as $$
 select u.id from auth.users u cross join public.store_settings s
 where s.id and s.anonymous_retention_days is not null and u.is_anonymous
 and greatest(u.created_at,u.last_sign_in_at)<now()-make_interval(days=>s.anonymous_retention_days)
 and not exists(select from public.orders o where o.user_id=u.id)
 and not exists(select from public.store_members m where m.user_id=u.id)
 and not exists(select from storage.objects obj where obj.bucket_id='order-files'
  and obj.name collate "C" >= u.id::text||'/' and obj.name collate "C" < u.id::text||'0')
 order by u.created_at limit 100;
$$;
-- Limpa dados privados gravados por versões anteriores, inclusive se o
-- visitante teve pedidos. As contas com pedidos são conservadas no Auth.
create or replace function public.cleanup_anonymous_profiles()
returns integer language plpgsql security definer set search_path='' as $$
declare
 retention_days integer;
 affected_carts integer;
 affected_profiles integer;
begin
 select anonymous_retention_days into retention_days from public.store_settings where id;
 if retention_days is null then return 0; end if;
 delete from public.carts where user_id in (
  select c.user_id from public.carts c join auth.users u on u.id=c.user_id
  where u.is_anonymous and greatest(u.created_at,u.last_sign_in_at)<now()-make_interval(days=>retention_days)
  order by c.user_id limit 100
 );
 get diagnostics affected_carts=row_count;
 delete from public.profiles where id in (
  select p.id from public.profiles p join auth.users u on u.id=p.id
  where u.is_anonymous and greatest(u.created_at,u.last_sign_in_at)<now()-make_interval(days=>retention_days)
  order by p.id limit 100
 );
 get diagnostics affected_profiles=row_count;
 return affected_carts+affected_profiles;
end;
$$;
revoke all on function public.cleanup_anonymous_profiles() from public,anon,authenticated;
grant execute on function public.cleanup_anonymous_profiles() to service_role;

revoke all on function public.queue_expired_order_files(),public.finish_order_file_purge(text[]),
 public.expired_anonymous_accounts() from public,anon,authenticated;
grant execute on function public.queue_expired_order_files(),public.finish_order_file_purge(text[]),
 public.expired_anonymous_accounts() to service_role;

commit;
