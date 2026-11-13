-- Public intake: no anonymous reads, updates or direct table writes.
drop policy if exists "Allow anon access" on public.tutores;
drop policy if exists "Allow anon access" on public.beneficiarios;
revoke all on public.tutores, public.beneficiarios from anon;

create or replace function public.familias_valid_rut(p_rut text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare r text := upper(regexp_replace(coalesce(p_rut,''), '[.\s-]', '', 'g')); s int := 0; m int := 2; i int; d text;
begin
  if r !~ '^[0-9]{7,8}[0-9K]$' then return false; end if;
  for i in reverse length(r)-1..1 loop
    s := s + substr(r,i,1)::int*m; m := case when m=7 then 2 else m+1 end;
  end loop;
  d := case 11-(s%11) when 11 then '0' when 10 then 'K' else (11-(s%11))::text end;
  return right(r,1)=d and left(r,length(r)-1)::bigint > 0;
end; $$;
revoke all on function public.familias_valid_rut(text) from public, anon, authenticated;

create or replace function public.familias_inscribir(p_solicitud jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  g jsonb := p_solicitud->'adulto'; c jsonb; tutor uuid; existing public.tutores;
  guardian_rut text; crut text; birth date; territory int; receipt uuid := gen_random_uuid();
begin
  if p_solicitud->>'consentimiento' is distinct from 'true' or p_solicitud->>'mayor_edad' is distinct from 'true' then
    raise exception 'Debes confirmar que eres mayor de edad y autorizar el uso de los datos.';
  end if;
  if jsonb_typeof(p_solicitud->'hijos') is distinct from 'array' then raise exception 'Agrega a tus hijos.'; end if;
  if jsonb_array_length(p_solicitud->'hijos') not between 1 and 6 then raise exception 'Inscribe entre 1 y 6 hijos por solicitud.'; end if;
  guardian_rut := upper(regexp_replace(coalesce(g->>'rut',''), '[.\s-]', '', 'g'));
  guardian_rut := left(guardian_rut,length(guardian_rut)-1)||'-'||right(guardian_rut,1);
  if not public.familias_valid_rut(guardian_rut) then raise exception 'Revisa el RUT del adulto responsable.'; end if;
  if coalesce(length(trim(g->>'nombre')),0) not between 3 and 160
    or coalesce(g->>'telefono','') !~ '^\+?56[0-9]{9}$'
    or coalesce(length(trim(g->>'direccion')),0) not between 5 and 240
    or coalesce(g->>'territorio','') !~ '^[1-7]$' then
    raise exception 'Revisa el nombre, teléfono, dirección y territorio del adulto.';
  end if;
  territory := (g->>'territorio')::int;
  perform pg_advisory_xact_lock(hashtextextended(guardian_rut, 0));
  select * into existing from public.tutores where tutores.rut=guardian_rut;
  if found then
    if existing.nombre_completo is distinct from trim(g->>'nombre') or existing.telefono is distinct from g->>'telefono'
      or existing.direccion is distinct from trim(g->>'direccion') or existing.territorio is distinct from territory then
      raise exception 'No fue posible completar la inscripción. Solicita revisión de los datos en la municipalidad.';
    end if;
    tutor := existing.id;
  else
    insert into public.tutores(rut,nombre_completo,telefono,direccion,territorio)
    values(guardian_rut,trim(g->>'nombre'),g->>'telefono',trim(g->>'direccion'),territory) returning id into tutor;
  end if;
  for c in select value from jsonb_array_elements(p_solicitud->'hijos') loop
    crut := upper(regexp_replace(coalesce(c->>'rut',''), '[.\s-]', '', 'g'));
    crut := left(crut,length(crut)-1)||'-'||right(crut,1);
    if not public.familias_valid_rut(crut) or crut=guardian_rut then raise exception 'Revisa el RUT de cada hijo o hija.'; end if;
    if coalesce(length(trim(c->>'nombre')),0) not between 3 and 160 or coalesce(c->>'sexo','') not in ('M','F','Otro')
      or coalesce(c->>'origen','') not in ('Junta de Vecinos','Jardín Infantil','Dideco','Otro')
      or coalesce(length(c->>'institucion'),0)>160 then raise exception 'Completa los datos de cada hijo o hija.'; end if;
    if c->>'origen' in ('Junta de Vecinos','Jardín Infantil') and coalesce(length(trim(c->>'institucion')),0)<3 then
      raise exception 'Indica el nombre de la institución.';
    end if;
    begin birth := (c->>'nacimiento')::date; exception when others then raise exception 'Revisa la fecha de nacimiento.'; end;
    if birth is null or birth>current_date or birth <= (current_date-interval '16 years')::date then raise exception 'La inscripción es para niños y niñas de 0 a 15 años.'; end if;
    insert into public.beneficiarios(tutor_id,rut,nombre_completo,fecha_nacimiento,sexo,origen,nombre_institucion,territorio,observaciones)
    values(tutor,crut,trim(c->>'nombre'),birth,c->>'sexo',c->>'origen',nullif(trim(c->>'institucion'),''),territory,
      'Inscripción web. Adulto declara mayoría de edad y autoriza uso de datos para inscripción municipal. Comprobante: '||receipt::text||'. Fecha: '||now()::text);
  end loop;
  return receipt;
exception when unique_violation then
  raise exception 'No fue posible completar la inscripción. Revisa si ya fue realizada o solicita ayuda en la municipalidad.';
end; $$;
revoke all on function public.familias_inscribir(jsonb) from public, authenticated;
grant execute on function public.familias_inscribir(jsonb) to anon;
notify pgrst, 'reload schema';
