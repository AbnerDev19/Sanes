begin;
-- The original migration remains unchanged. Guest quotes use WhatsApp only:
-- anonymous visitors receive no new access to private tables or order RPCs.
do $$
begin
 if to_regprocedure('public.place_order_v1(uuid,jsonb,jsonb)') is null then
  alter function public.place_order(uuid,jsonb,jsonb) rename to place_order_v1;
 end if;
end;
$$;
revoke all on function public.place_order_v1(uuid,jsonb,jsonb) from public,anon,authenticated;
create or replace function public.place_order(p_request_key uuid,p_items jsonb,p_customer jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare digits text;delivery date;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta para registrar um pedido no histórico.';end if;
 digits:=regexp_replace(coalesce(p_customer->>'phone',''),'[^0-9]','','g');
 if length(digits) in (12,13) and left(digits,2)='55' then digits:=substring(digits from 3);end if;
 if digits !~ '^[1-9][0-9]([2-5][0-9]{7}|9[0-9]{8})$' then raise exception 'Telefone brasileiro com DDD obrigatório.';end if;
 if coalesce(p_customer->>'date','')<>'' then
  if p_customer->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Data de entrega inválida.';end if;
  begin delivery:=(p_customer->>'date')::date;exception when others then raise exception 'Data de entrega inválida.';end;
  if delivery<(current_timestamp at time zone 'America/Sao_Paulo')::date then raise exception 'Data de entrega não pode ser passada.';end if;
 end if;
 return public.place_order_v1(p_request_key,p_items,p_customer);
end;
$$;
revoke all on function public.place_order(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.place_order(uuid,jsonb,jsonb) to authenticated;
commit;
