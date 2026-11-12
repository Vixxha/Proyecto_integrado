-- Integration checks against the demo dataset. All fixtures are rolled back.
begin;
create temporary table navidad_check_users (kind text primary key, id uuid not null default gen_random_uuid());
insert into navidad_check_users(kind) values ('outsider'), ('viewer'), ('operator');
insert into auth.users(id, email)
select id, 'navidad-rollback-' || id || '@example.invalid' from navidad_check_users;
insert into public.navidad_staff(user_id, role)
select id, kind from navidad_check_users where kind in ('viewer', 'operator');
grant select on navidad_check_users to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', (select id::text from navidad_check_users where kind = 'outsider'), true);
do $$ begin
  if exists (select 1 from public.navidad_children) then raise exception 'Non-member could read children'; end if;
  if exists (select 1 from public.navidad_registrations) then raise exception 'Non-member could read registrations'; end if;
end $$;

select set_config('request.jwt.claim.sub', (select id::text from navidad_check_users where kind = 'viewer'), true);
do $$ begin
  if not exists (select 1 from public.navidad_registrations) then raise exception 'Viewer cannot read'; end if;
  begin
    perform public.navidad_register_child('2026','centro','DEMO-CHECK-FORBIDDEN','Ficticio',date '2019-01-01','Ficticio','','');
    raise exception 'Viewer could register a child';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.navidad_registrations where child_id = 'DEMO-CHECK-FORBIDDEN';
    raise exception 'Viewer holds delete privileges';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', (select id::text from navidad_check_users where kind = 'operator'), true);
do $$
declare
  test_child text := 'DEMO-CHECK-' || (select id::text from navidad_check_users where kind = 'operator');
  first_delivery boolean;
  repeated_delivery boolean;
begin
  perform public.navidad_register_child('2026','centro',test_child,'Niña ficticia de verificación',date '2019-04-12','Apoderada ficticia','','');
  begin
    perform public.navidad_register_child('2026','centro',test_child,'Niña ficticia de verificación',date '2019-04-12','Apoderada ficticia','','');
    raise exception 'Duplicate was accepted';
  exception when raise_exception then
    if sqlerrm not like '%ya está inscrito%' then raise; end if;
  end;
  perform public.navidad_assign_gift('2026',test_child,'Set ficticio de verificación');
  begin
    insert into public.navidad_gifts(id,campaign_id,child_id,sector_id,gift_name)
    values ('OTHER-' || test_child,'2026',test_child,'centro','Regalo duplicado');
    raise exception 'Duplicate gift was accepted';
  exception when unique_violation then null;
  end;
  first_delivery := public.navidad_deliver_gift('2026-' || test_child,'Apoderada ficticia',date '2026-11-12');
  repeated_delivery := public.navidad_deliver_gift('2026-' || test_child,'Apoderada ficticia',date '2026-11-12');
  if first_delivery is distinct from true or repeated_delivery is distinct from false then raise exception 'Delivery is not idempotent'; end if;
end $$;

reset role;
set local role anon;
do $$ begin
  if has_table_privilege(current_user,'public.navidad_children','SELECT') then raise exception 'Anon can read children'; end if;
  begin
    perform count(*) from public.navidad_children;
    raise exception 'Anonymous select was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS: non-member, viewer, operator, duplicates, delivery and anon access' as result;
rollback;
