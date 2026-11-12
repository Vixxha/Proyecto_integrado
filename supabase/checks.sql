-- Run after schema + seed, in the development SQL editor or via MCP.
select campaign_id, count(*) as enrolled from public.navidad_registrations group by campaign_id order by campaign_id;
-- 2026: 12840. 2025: 10401.
select campaign_id, count(*) as assigned, count(delivered_at) as delivered,
  count(*) filter (where delivered_at is null) as pending
from public.navidad_gifts group by campaign_id order by campaign_id;
-- 2026: 11520 / 8340 / 3180. 2025: 9331 / 6756 / 2575.

select campaign_id, child_id, count(*) from public.navidad_registrations
group by campaign_id, child_id having count(*) > 1; -- Must be empty.

select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename like 'navidad_%'; -- All true.

-- Verify no data is exposed to unauthenticated visitors.
begin;
set local role anon;
select has_table_privilege(current_user, 'public.navidad_children', 'SELECT') as can_read_children;
-- false. Do not grant anon SELECT to bypass a configuration problem.
rollback;
