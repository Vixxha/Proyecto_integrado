-- Declarative schema. Apply only to the designated development project.
-- No existing tables are dropped. All demo records are explicitly identified.
create table public.navidad_campaigns (
  id text primary key check (id ~ '^20[0-9]{2}$'),
  name text not null,
  is_demo boolean not null default true
);

create table public.navidad_sectors (
  id text primary key,
  name text not null unique,
  is_demo boolean not null default true
);

create table public.navidad_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('viewer', 'operator', 'admin'))
);

create table public.navidad_children (
  id text primary key check (length(trim(id)) between 1 and 80),
  name text not null check (length(trim(name)) between 1 and 160),
  birth_date date not null,
  is_demo boolean not null default true
);

create table public.navidad_registrations (
  campaign_id text not null references public.navidad_campaigns(id),
  child_id text not null references public.navidad_children(id),
  sector_id text not null references public.navidad_sectors(id),
  guardian text not null check (length(trim(guardian)) between 1 and 160),
  phone text not null default '' check (length(phone) <= 40),
  address text not null default '' check (length(address) <= 240),
  created_at timestamptz not null default now(),
  primary key (campaign_id, child_id),
  unique (campaign_id, child_id, sector_id)
);
create index navidad_registrations_child_idx on public.navidad_registrations(child_id);
create index navidad_registrations_sector_campaign_idx on public.navidad_registrations(sector_id, campaign_id);

create table public.navidad_gifts (
  id text primary key,
  campaign_id text not null,
  child_id text not null,
  sector_id text not null,
  gift_name text not null check (length(trim(gift_name)) between 1 and 160),
  assigned_at timestamptz not null default now(),
  delivered_at date,
  recipient text check (recipient is null or length(trim(recipient)) between 1 and 160),
  delivered_by uuid references auth.users(id),
  unique (campaign_id, child_id),
  foreign key (campaign_id, child_id, sector_id) references public.navidad_registrations(campaign_id, child_id, sector_id),
  check ((delivered_at is null and recipient is null) or (delivered_at is not null and recipient is not null)),
  check (delivered_at is null or extract(year from delivered_at)::text = campaign_id)
);
create index navidad_gifts_child_idx on public.navidad_gifts(child_id);
create index navidad_gifts_registration_idx on public.navidad_gifts(campaign_id, child_id, sector_id);
create index navidad_gifts_sector_campaign_idx on public.navidad_gifts(sector_id, campaign_id);
create index navidad_gifts_pending_idx on public.navidad_gifts(campaign_id, sector_id) where delivered_at is null;
create index navidad_gifts_delivery_idx on public.navidad_gifts(campaign_id, delivered_at) where delivered_at is not null;
create index navidad_gifts_delivered_by_idx on public.navidad_gifts(delivered_by) where delivered_by is not null;

alter table public.navidad_campaigns enable row level security;
alter table public.navidad_sectors enable row level security;
alter table public.navidad_staff enable row level security;
alter table public.navidad_children enable row level security;
alter table public.navidad_registrations enable row level security;
alter table public.navidad_gifts enable row level security;

-- Only an administrator using the SQL editor / privileged backend enrolls staff.
-- A user's editable metadata is never an authorization source.
create policy navidad_staff_self_read on public.navidad_staff for select to authenticated
  using (user_id = (select auth.uid()));

create policy navidad_campaigns_staff_read on public.navidad_campaigns for select to authenticated
  using (exists (select 1 from public.navidad_staff where user_id = (select auth.uid())));
create policy navidad_sectors_staff_read on public.navidad_sectors for select to authenticated
  using (exists (select 1 from public.navidad_staff where user_id = (select auth.uid())));
create policy navidad_children_staff_read on public.navidad_children for select to authenticated
  using (exists (select 1 from public.navidad_staff where user_id = (select auth.uid())));
create policy navidad_registrations_staff_read on public.navidad_registrations for select to authenticated
  using (exists (select 1 from public.navidad_staff where user_id = (select auth.uid())));
create policy navidad_gifts_staff_read on public.navidad_gifts for select to authenticated
  using (exists (select 1 from public.navidad_staff where user_id = (select auth.uid())));

create policy navidad_children_operator_insert on public.navidad_children for insert to authenticated
  with check (exists (select 1 from public.navidad_staff where user_id = (select auth.uid()) and role in ('operator', 'admin')));
create policy navidad_registrations_operator_insert on public.navidad_registrations for insert to authenticated
  with check (exists (select 1 from public.navidad_staff where user_id = (select auth.uid()) and role in ('operator', 'admin')));
create policy navidad_gifts_operator_insert on public.navidad_gifts for insert to authenticated
  with check (delivered_at is null and recipient is null and delivered_by is null and exists (select 1 from public.navidad_staff where user_id = (select auth.uid()) and role in ('operator', 'admin')));
create policy navidad_gifts_operator_update on public.navidad_gifts for update to authenticated
  using (delivered_at is null and exists (select 1 from public.navidad_staff where user_id = (select auth.uid()) and role in ('operator', 'admin')))
  with check (delivered_at is not null and recipient is not null and delivered_by = (select auth.uid()) and exists (select 1 from public.navidad_staff where user_id = (select auth.uid()) and role in ('operator', 'admin')));

-- Explicit column privileges prevent reassignment of a gift during delivery.
revoke all on public.navidad_campaigns, public.navidad_sectors, public.navidad_staff, public.navidad_children, public.navidad_registrations, public.navidad_gifts from anon, authenticated;
grant select on public.navidad_campaigns, public.navidad_sectors, public.navidad_staff, public.navidad_children, public.navidad_registrations, public.navidad_gifts to authenticated;
grant insert on public.navidad_children, public.navidad_registrations, public.navidad_gifts to authenticated;
grant update (delivered_at, recipient, delivered_by) on public.navidad_gifts to authenticated;

create function public.navidad_register_child(
  p_campaign text, p_sector text, p_child_id text, p_name text, p_birth_date date,
  p_guardian text, p_phone text default '', p_address text default ''
) returns void language plpgsql security invoker set search_path = '' as $$
declare existing public.navidad_children;
begin
  if p_birth_date < make_date(p_campaign::int - 15, 1, 1) or p_birth_date > make_date(p_campaign::int, 12, 31) then
    raise exception 'Revisa la fecha de nacimiento para la campaña.';
  end if;
  insert into public.navidad_children(id, name, birth_date)
    values (trim(p_child_id), trim(p_name), p_birth_date) on conflict (id) do nothing;
  select * into existing from public.navidad_children where id = trim(p_child_id);
  if existing.name is distinct from trim(p_name) or existing.birth_date is distinct from p_birth_date then
    raise exception 'El código ya corresponde a un niño o niña con otros datos.';
  end if;
  insert into public.navidad_registrations(campaign_id, child_id, sector_id, guardian, phone, address)
    values (p_campaign, trim(p_child_id), p_sector, trim(p_guardian), trim(p_phone), trim(p_address));
exception when unique_violation then
  raise exception 'El niño o niña ya está inscrito en esta campaña.';
end;
$$;
revoke all on function public.navidad_register_child(text,text,text,text,date,text,text,text) from public, anon;
grant execute on function public.navidad_register_child(text,text,text,text,date,text,text,text) to authenticated;

create function public.navidad_deliver_gift(p_gift_id text, p_recipient text, p_date date)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  if p_date is null or coalesce(length(trim(p_recipient)), 0) not between 1 and 160 then raise exception 'Indica fecha y receptor de la entrega.'; end if;
  update public.navidad_gifts set delivered_at = p_date, recipient = trim(p_recipient), delivered_by = (select auth.uid())
    where id = p_gift_id and delivered_at is null;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.navidad_deliver_gift(text,text,date) from public, anon;
grant execute on function public.navidad_deliver_gift(text,text,date) to authenticated;

-- Enforce campaign age limits even when an operator calls the Data API directly.
create function public.navidad_validate_registration() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare birth date;
begin
  select birth_date into birth from public.navidad_children where id = new.child_id;
  if birth is null or birth < make_date(new.campaign_id::int - 15, 1, 1) or birth > make_date(new.campaign_id::int, 12, 31) then
    raise exception 'Revisa la fecha de nacimiento para la campaña.';
  end if;
  return new;
end;
$$;
revoke all on function public.navidad_validate_registration() from public, anon, authenticated;
create trigger navidad_registration_age before insert or update on public.navidad_registrations
for each row execute function public.navidad_validate_registration();
