begin;
alter table public.products add column if not exists material text not null default '' check(length(material)<=120);
alter table public.order_items add column if not exists source_min_confirmed boolean;

create or replace function sanes_private.record_minimum_confirmation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 select min_confirmed into new.source_min_confirmed from public.products where id=new.product_id;
 return new;
end;
$$;
drop trigger if exists record_minimum_confirmation on public.order_items;
create trigger record_minimum_confirmation before insert on public.order_items
 for each row execute function sanes_private.record_minimum_confirmation();

-- Atualiza apenas campos fornecidos, sem ler uma cópia antiga das edições da equipe.
create or replace function public.update_imported_catalog(rows jsonb)
returns table(id text) language sql set search_path='' as $$
 with patch as (
  select r->>'id' as id,r from jsonb_array_elements(rows) r
 )
 update public.products p set
  name=coalesce(patch.r->>'name',p.name), description=coalesce(patch.r->>'description',p.description),
  capacity=coalesce(patch.r->>'capacity',p.capacity), material=coalesce(patch.r->>'material',p.material),
  dimensions=coalesce(patch.r->>'dimensions',p.dimensions), image_url=coalesce(patch.r->>'image_url',p.image_url),
  min_qty=coalesce((patch.r->>'min_qty')::integer,p.min_qty),
  min_confirmed=coalesce((patch.r->>'min_confirmed')::boolean,p.min_confirmed)
 from patch where p.id=patch.id and
 row(p.name,p.description,p.capacity,p.material,p.dimensions,p.image_url,p.min_qty,p.min_confirmed) is distinct from row(
  coalesce(patch.r->>'name',p.name),coalesce(patch.r->>'description',p.description),
  coalesce(patch.r->>'capacity',p.capacity),coalesce(patch.r->>'material',p.material),
  coalesce(patch.r->>'dimensions',p.dimensions),coalesce(patch.r->>'image_url',p.image_url),
  coalesce((patch.r->>'min_qty')::integer,p.min_qty),coalesce((patch.r->>'min_confirmed')::boolean,p.min_confirmed)
 ) returning p.id;
$$;
revoke all on function public.update_imported_catalog(jsonb) from public,anon,authenticated;
grant execute on function public.update_imported_catalog(jsonb) to service_role;
commit;
