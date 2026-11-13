-- Persist complete form submissions and project them into the existing dashboard.
create table public.familias_web_submissions (
  id uuid primary key,
  campaign_id text not null references public.navidad_campaigns(id),
  sector_id text not null references public.navidad_sectors(id),
  payload jsonb not null check (octet_length(payload::text) <= 20000),
  is_demo boolean not null,
  created_at timestamptz not null default now()
);
alter table public.familias_web_submissions enable row level security;
revoke all on public.familias_web_submissions from public, anon, authenticated;
grant select on public.familias_web_submissions to authenticated;
create policy familias_web_staff_read on public.familias_web_submissions for select to authenticated
using (exists (select 1 from public.navidad_staff where user_id = (select auth.uid())));
create index familias_web_campaign_sector_idx on public.familias_web_submissions(campaign_id,sector_id);

create function public.familias_dashboard_inscribir(p_solicitud jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  g jsonb := p_solicitud->'adulto'; c jsonb; birth date;
  campaign text := p_solicitud->>'campana'; sector text := g->>'sector';
  test_data boolean := coalesce(p_solicitud->>'prueba','false') = 'true';
  campaign_demo boolean; receipt uuid; old_payload jsonb; guardian_rut text; child_rut text; child_key text;
  child_number int := 0; stored_child public.navidad_children; seen text[] := '{}';
begin
  if p_solicitud is null or octet_length(p_solicitud::text)>20000 then raise exception 'Solicitud no válida.'; end if;
  begin receipt := (p_solicitud->>'solicitud_id')::uuid; exception when others then raise exception 'Identificador de solicitud no válido.'; end;
  if receipt is null then raise exception 'Falta el identificador de solicitud.'; end if;
  if p_solicitud->>'consentimiento' is distinct from 'true' or p_solicitud->>'mayor_edad' is distinct from 'true' then
    raise exception 'Confirma tu mayoría de edad y la autorización de datos.';
  end if;
  if campaign is distinct from '2026' then raise exception 'La campaña disponible es Navidad 2026.'; end if;
  select is_demo into campaign_demo from public.navidad_campaigns where id=campaign;
  if not found or (test_data and not campaign_demo) then raise exception 'Esta campaña no admite datos de prueba.'; end if;
  if sector is null or not exists(select 1 from public.navidad_sectors where id=sector) then raise exception 'Selecciona un sector del dashboard.'; end if;
  if jsonb_typeof(p_solicitud->'hijos') is distinct from 'array' then raise exception 'Agrega a tus hijos.'; end if;
  if jsonb_array_length(p_solicitud->'hijos') not between 1 and 6 then raise exception 'Inscribe entre 1 y 6 hijos por solicitud.'; end if;
  guardian_rut := upper(regexp_replace(coalesce(g->>'rut',''), '[.\s-]', '', 'g'));
  guardian_rut := left(guardian_rut,length(guardian_rut)-1)||'-'||right(guardian_rut,1);
  if not public.familias_valid_rut(guardian_rut) and not(test_data and guardian_rut='12345678-1') then raise exception 'Revisa el RUT del adulto.'; end if;
  if coalesce(length(trim(g->>'nombre')),0) not between 3 and 160
    or coalesce(g->>'telefono','') !~ '^\+56[0-9]{9}$'
    or coalesce(length(trim(g->>'direccion')),0) not between 5 and 240 then raise exception 'Revisa los datos de contacto del adulto.'; end if;
  -- A retry after a lost HTTP response returns the same saved receipt.
  perform pg_advisory_xact_lock(hashtextextended(receipt::text,0));
  select payload into old_payload from public.familias_web_submissions where id=receipt;
  if found then
    if old_payload is distinct from p_solicitud then raise exception 'La solicitud ya fue enviada con otros datos. Inicia otra inscripción.'; end if;
    return receipt;
  end if;
  insert into public.familias_web_submissions(id,campaign_id,sector_id,payload,is_demo)
    values(receipt,campaign,sector,p_solicitud,test_data);
  for c in select value from jsonb_array_elements(p_solicitud->'hijos') loop
    child_number := child_number+1;
    child_rut := upper(regexp_replace(coalesce(c->>'rut',''), '[.\s-]', '', 'g'));
    child_rut := left(child_rut,length(child_rut)-1)||'-'||right(child_rut,1);
    if not public.familias_valid_rut(child_rut) and not(test_data and child_rut='12345678-1') then raise exception 'Revisa el RUT de cada hijo o hija.'; end if;
    if not(test_data and child_rut='12345678-1') and (child_rut=guardian_rut or child_rut=any(seen)) then raise exception 'Cada hijo debe tener un RUT diferente.'; end if;
    seen := array_append(seen,child_rut);
    if coalesce(length(trim(c->>'nombre')),0) not between 3 and 160
      or coalesce(c->>'sexo','') not in ('M','F','Otro')
      or coalesce(c->>'origen','') not in ('Junta de Vecinos','Jardín Infantil','Dideco','Otro')
      or coalesce(length(c->>'institucion'),0)>160 then raise exception 'Completa los datos de cada hijo o hija.'; end if;
    if c->>'origen' in ('Junta de Vecinos','Jardín Infantil') and coalesce(length(trim(c->>'institucion')),0)<3 then raise exception 'Indica el nombre de la institución.'; end if;
    begin birth := (c->>'nacimiento')::date; exception when others then raise exception 'Revisa la fecha de nacimiento.'; end;
    if birth is null or birth>current_date or birth<make_date(campaign::int-15,1,1) then raise exception 'Para Navidad 2026, la fecha de nacimiento debe ser desde el 1 de enero de 2011 hasta hoy.'; end if;
    child_key := case when test_data then 'TEST-'||receipt::text||'-'||child_number::text else child_rut end;
    perform pg_advisory_xact_lock(hashtextextended(child_key,1));
    insert into public.navidad_children(id,name,birth_date,is_demo)
      values(child_key,case when test_data then left('[PRUEBA] '||trim(c->>'nombre'),160) else trim(c->>'nombre') end,birth,test_data)
      on conflict(id) do nothing;
    select * into stored_child from public.navidad_children where id=child_key;
    if stored_child.name is distinct from trim(c->>'nombre') and not test_data or stored_child.birth_date is distinct from birth then
      raise exception 'No fue posible registrar estos datos. Solicita una revisión en la municipalidad.';
    end if;
    insert into public.navidad_registrations(campaign_id,child_id,sector_id,guardian,phone,address)
      values(campaign,child_key,sector,case when test_data then left('[PRUEBA] '||trim(g->>'nombre'),160) else trim(g->>'nombre') end,g->>'telefono',trim(g->>'direccion'));
  end loop;
  return receipt;
exception when unique_violation then raise exception 'La inscripción ya existe para esta campaña. Solicita revisión en la municipalidad.';
end; $$;
revoke all on function public.familias_dashboard_inscribir(jsonb) from public, anon, authenticated;
grant execute on function public.familias_dashboard_inscribir(jsonb) to anon;
notify pgrst, 'reload schema';
