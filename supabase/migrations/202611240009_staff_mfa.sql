begin;
alter table public.store_settings add column if not exists staff_mfa_required boolean not null default false;

create or replace function public.is_store_member()
returns boolean language sql stable security definer set search_path='' as $$
 select not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false)
   and exists(select from public.store_members where user_id=(select auth.uid()))
   and (not coalesce((select staff_mfa_required from public.store_settings where id),false)
     or coalesce((select auth.jwt()->>'aal')='aal2',false));
$$;
revoke all on function public.is_store_member() from public,anon,authenticated;
grant execute on function public.is_store_member() to anon,authenticated;

create or replace function public.is_store_owner()
returns boolean language sql stable security definer set search_path='' as $$
 select public.is_store_member()
   and exists(select from public.store_members where user_id=(select auth.uid()) and role='owner');
$$;
revoke all on function public.is_store_owner() from public,anon,authenticated;
grant execute on function public.is_store_owner() to authenticated;
-- Apenas o responsável pelo projeto pode exigir ou afrouxar MFA e retenção.
revoke update on public.store_settings from public,anon,authenticated;
grant update(whatsapp,updated_at) on public.store_settings to authenticated;
commit;
