begin;
-- 004: ordenação do catálogo pelo painel (uma chamada reordena a lista toda).
create or replace function public.reorder_products(p_ids text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_store_member() then raise exception 'Acesso restrito à loja.'; end if;
 if p_ids is null or cardinality(p_ids)>5000 then raise exception 'Lista inválida.'; end if;
 update public.products p set sort_order=o.position, updated_at=now()
 from unnest(p_ids) with ordinality as o(id,position)
 where p.id=o.id and p.sort_order is distinct from o.position;
end;
$$;
create or replace function public.reorder_categories(p_names text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_store_member() then raise exception 'Acesso restrito à loja.'; end if;
 if p_names is null or cardinality(p_names)>500 then raise exception 'Lista inválida.'; end if;
 update public.categories c set sort_order=o.position
 from unnest(p_names) with ordinality as o(name,position)
 where c.name=o.name and c.sort_order is distinct from o.position;
end;
$$;
revoke all on function public.reorder_products(text[]),public.reorder_categories(text[]) from public,anon;
grant execute on function public.reorder_products(text[]),public.reorder_categories(text[]) to authenticated;
commit;
