-- Compact reporting and bounded detail pages; every query retains caller RLS.
create index navidad_registrations_campaign_sector_child_idx
  on public.navidad_registrations(campaign_id, sector_id, child_id);

create view public.navidad_sector_summary with (security_invoker = true) as
select r.campaign_id, r.sector_id, count(*)::integer as enrolled,
  count(g.id)::integer as assigned, count(g.delivered_at)::integer as delivered,
  (count(g.id) - count(g.delivered_at))::integer as pending
from public.navidad_registrations r
left join public.navidad_gifts g on g.campaign_id = r.campaign_id and g.child_id = r.child_id
group by r.campaign_id, r.sector_id;
revoke all on public.navidad_sector_summary from public, anon, authenticated;
grant select on public.navidad_sector_summary to authenticated;

create function public.navidad_dashboard() returns jsonb
language sql stable security invoker set search_path = '' as $$
  with metrics as materialized (select * from public.navidad_sector_summary),
  deliveries as materialized (
    select campaign_id, sector_id,
      date_bin(interval '7 days', delivered_at::timestamp, make_date(campaign_id::integer, 11, 9)::timestamp)::date as week,
      count(*)::integer as delivered
    from public.navidad_gifts where delivered_at is not null
    group by campaign_id, sector_id, week
  )
  select coalesce(jsonb_object_agg(c.id, jsonb_build_object(
    'sectors', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'enrolled', coalesce(m.enrolled,0),
      'assigned', coalesce(m.assigned,0), 'delivered', coalesce(m.delivered,0), 'pending', coalesce(m.pending,0)
    ) order by s.id), '[]'::jsonb) from public.navidad_sectors s
      left join metrics m on m.campaign_id = c.id and m.sector_id = s.id),
    'deliveries', (select coalesce(jsonb_agg(jsonb_build_object(
      'sector', d.sector_id, 'date', d.week, 'delivered', d.delivered
    ) order by d.week,d.sector_id),'[]'::jsonb) from deliveries d where d.campaign_id=c.id)
  )), '{}'::jsonb) from public.navidad_campaigns c;
$$;
revoke all on function public.navidad_dashboard() from public, anon;
grant execute on function public.navidad_dashboard() to authenticated;

create function public.navidad_records_page(
  p_campaign text, p_sector text default null, p_query text default '',
  p_status text default 'todos', p_assigned_only boolean default false,
  p_limit integer default 15, p_offset integer default 0
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 1000000 then
    raise exception 'Página fuera del rango permitido.' using errcode='22023';
  end if;
  if p_status is null or p_status not in ('todos','sin-asignar','pendientes','entregados') or length(coalesce(p_query,''))>120 then
    raise exception 'Filtro no válido.' using errcode='22023';
  end if;
  with filtered as materialized (
    select r.child_id
    from public.navidad_registrations r
    left join public.navidad_gifts g on g.campaign_id=r.campaign_id and g.child_id=r.child_id
    where r.campaign_id=p_campaign and (p_sector is null or r.sector_id=p_sector)
      and (not p_assigned_only or g.id is not null)
      and (p_status='todos' or (p_status='sin-asignar' and g.id is null)
        or (p_status='pendientes' and g.id is not null and g.delivered_at is null)
        or (p_status='entregados' and g.delivered_at is not null))
      and (coalesce(btrim(p_query),'')=''
        or strpos(lower(r.child_id),lower(btrim(p_query)))>0
        or strpos(lower(r.guardian),lower(btrim(p_query)))>0
        or exists (select 1 from public.navidad_children c where c.id=r.child_id and strpos(lower(c.name),lower(btrim(p_query)))>0))
  ), page_ids as materialized (
    select child_id from filtered order by child_id limit p_limit offset p_offset
  ), details as (
    select r.campaign_id,r.child_id,r.sector_id,r.guardian,r.phone,r.address,c.name,c.birth_date,
      g.id as gift_id,g.gift_name,g.delivered_at,g.recipient
    from page_ids p
    join public.navidad_registrations r on r.campaign_id=p_campaign and r.child_id=p.child_id
    join public.navidad_children c on c.id=r.child_id
    left join public.navidad_gifts g on g.campaign_id=r.campaign_id and g.child_id=r.child_id
  )
  select jsonb_build_object('total',(select count(*) from filtered),
    'records',(select coalesce(jsonb_agg(jsonb_build_object(
      'registration',jsonb_build_object('campaign',p.campaign_id,'childId',p.child_id,'sector',p.sector_id,
        'name',p.name,'birthDate',p.birth_date,'guardian',p.guardian,'phone',p.phone,'address',p.address),
      'gift',case when p.gift_id is null then null else jsonb_build_object('id',p.gift_id,'campaign',p.campaign_id,
        'childId',p.child_id,'sector',p.sector_id,'giftName',p.gift_name,'deliveredAt',p.delivered_at,'recipient',p.recipient) end
    ) order by p.child_id),'[]'::jsonb) from details p)
  ) into result;
  return result;
end $$;
revoke all on function public.navidad_records_page(text,text,text,text,boolean,integer,integer) from public, anon;
grant execute on function public.navidad_records_page(text,text,text,text,boolean,integer,integer) to authenticated;

-- The registration's sector is resolved atomically on the server.
create function public.navidad_assign_gift(p_campaign text,p_child_id text,p_name text)
returns void language plpgsql security invoker set search_path = '' as $$
declare child_sector text;
begin
  select sector_id into child_sector from public.navidad_registrations
    where campaign_id=p_campaign and child_id=p_child_id;
  if child_sector is null then raise exception 'Primero debes inscribir al niño o niña en esta campaña.'; end if;
  insert into public.navidad_gifts(id,campaign_id,child_id,sector_id,gift_name)
    values(p_campaign || '-' || p_child_id,p_campaign,p_child_id,child_sector,btrim(p_name));
exception when unique_violation then raise exception 'Este niño o niña ya tiene un regalo asignado.';
end $$;
revoke all on function public.navidad_assign_gift(text,text,text) from public, anon;
grant execute on function public.navidad_assign_gift(text,text,text) to authenticated;
