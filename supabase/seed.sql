-- Idempotent, additive demo seed. Does not create auth users, staff, or real data.
begin;
insert into public.navidad_campaigns(id, name) values ('2026', 'Navidad 2026'), ('2025', 'Navidad 2025') on conflict do nothing;
insert into public.navidad_sectors(id, name) values
  ('norte','Norte'), ('centro','Centro'), ('oriente','Oriente'), ('poniente','Poniente'), ('sur','Sur'), ('cordillera','Cordillera') on conflict do nothing;

create temporary table navidad_demo_rows on commit drop as
with fixtures(sector, enrolled, assigned, delivered) as (values
  ('centro',2450,2300,1900), ('norte',2180,2020,1640), ('sur',2640,2380,1590),
  ('oriente',1960,1730,1150), ('poniente',2230,1950,1410), ('cordillera',1380,1140,650)
), campaigns(campaign, factor) as (values ('2026',1::numeric), ('2025',0.81::numeric))
select campaign, sector, i, sector || '-' || i as child_id,
  round(assigned * factor)::int as assigned, round(delivered * factor)::int as delivered,
  case when i % 100 < 8 then 0 when i % 100 < 20 then 1 when i % 100 < 39 then 2 when i % 100 < 62 then 3 when i % 100 < 84 then 4 else 5 end as week_index
from fixtures cross join campaigns cross join lateral generate_series(0, round(enrolled * factor)::int - 1) i;

insert into public.navidad_children(id, name, birth_date)
select distinct child_id, 'Niño/a de prueba ' || (i + 1) || ' · ' || sector, make_date(2015 + i % 10, 6, 15)
from navidad_demo_rows on conflict do nothing;

insert into public.navidad_registrations(campaign_id, child_id, sector_id, guardian, phone, address)
select campaign, child_id, sector, 'Apoderado/a de prueba ' || (i + 1), '', 'Dirección ficticia ' || (i + 1) || ', La Florida'
from navidad_demo_rows on conflict do nothing;

insert into public.navidad_gifts(id, campaign_id, child_id, sector_id, gift_name, assigned_at, delivered_at, recipient)
select campaign || '-' || child_id, campaign, child_id, sector,
  (array['Set de arte', 'Juego de construcción', 'Juego de mesa', 'Pelota deportiva'])[i % 4 + 1],
  make_date(campaign::int, 11, 1)::timestamptz,
  case when i < delivered then make_date(campaign::int, 11, 9) + week_index * 7 end,
  case when i < delivered then 'Apoderado/a de prueba ' || (i + 1) end
from navidad_demo_rows where i < assigned on conflict do nothing;
commit;
