-- Read-only verification under the same role and RLS as the application.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.navidad_staff order by user_id limit 1),true);
set local role authenticated;
do $$
declare dashboard jsonb; page_one jsonb; page_two jsonb; filtered jsonb;
  campaign text; assigned integer; delivered integer; enrolled integer;
begin
  dashboard := public.navidad_dashboard();
  foreach campaign in array array['2026','2025'] loop
    select count(*) into enrolled from public.navidad_registrations where campaign_id=campaign;
    select count(*),count(delivered_at) into assigned,delivered from public.navidad_gifts where campaign_id=campaign;
    if (select sum((s->>'enrolled')::integer) from jsonb_array_elements(dashboard->campaign->'sectors') s) is distinct from enrolled then raise exception 'Enrolled mismatch'; end if;
    if (select sum((s->>'assigned')::integer) from jsonb_array_elements(dashboard->campaign->'sectors') s) is distinct from assigned then raise exception 'Assigned mismatch'; end if;
    if (select sum((s->>'pending')::integer) from jsonb_array_elements(dashboard->campaign->'sectors') s) is distinct from assigned-delivered then raise exception 'Pending mismatch'; end if;
    if (select sum((s->>'delivered')::integer) from jsonb_array_elements(dashboard->campaign->'deliveries') s) is distinct from delivered then raise exception 'Weekly delivery mismatch'; end if;
  end loop;
  page_one := public.navidad_records_page('2026',null,'','todos',false,15,0);
  page_two := public.navidad_records_page('2026',null,'','todos',false,15,15);
  if jsonb_array_length(page_one->'records') <> 15 or jsonb_array_length(page_two->'records') <> 15 then raise exception 'Incorrect page size'; end if;
  if page_one#>>'{records,14,registration,childId}' >= page_two#>>'{records,0,registration,childId}' then raise exception 'Unstable pagination'; end if;
  filtered := public.navidad_records_page('2026','sur','','pendientes',true,15,0);
  if (filtered->>'total')::integer <> (select count(*) from public.navidad_gifts where campaign_id='2026' and sector_id='sur' and delivered_at is null) then raise exception 'Filtered total mismatch'; end if;
  if exists(select 1 from jsonb_array_elements(filtered->'records') r where r#>>'{registration,sector}' <> 'sur' or r#>>'{gift,deliveredAt}' is not null) then raise exception 'Filter mismatch'; end if;
  filtered := public.navidad_records_page('2026',null,'norte-0','todos',false,15,0);
  if (filtered->>'total')::integer < 1 then raise exception 'Search missing exact code'; end if;
  begin
    perform public.navidad_records_page('2026',null,'','todos',false,1000,0);
    raise exception 'Unbounded page accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;

-- A signed-in account without staff membership still sees no rows or metrics.
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$ begin
  if public.navidad_dashboard() <> '{}'::jsonb then raise exception 'Non-member can see dashboard'; end if;
  if (public.navidad_records_page('2026')->>'total')::integer <> 0 then raise exception 'Non-member can see records'; end if;
end $$;
reset role;
select 'PASS: SQL totals, weekly buckets, pagination, sector/status/search filters, limits and RLS' as result;
rollback;
