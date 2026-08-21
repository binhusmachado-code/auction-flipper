create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  price_id text,
  plan text check (plan in ('monthly', 'yearly')),
  status text not null default 'incomplete',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  experience text,
  budget_range text,
  county text,
  strategy text,
  onboarding_completed boolean not null default false,
  learning_progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id text primary key,
  address text not null,
  city text not null default '',
  state text not null default 'FL',
  zip text not null default '',
  county text not null,
  price numeric not null default 0,
  opening_bid numeric,
  deposit_required numeric,
  assessed_value numeric not null default 0,
  estimated_value numeric not null default 0,
  valuation_verified boolean not null default false,
  property_type text not null default 'Unknown',
  auction_type text not null default 'Tax Deed',
  sale_type text not null default 'Tax Deed',
  auction_date date,
  case_number text,
  parcel_id text,
  owner_name text,
  source text not null,
  source_url text not null,
  description text not null default '',
  image_url text not null default '',
  images jsonb not null default '[]'::jsonb,
  status text not null default 'Active',
  latitude double precision not null default 0,
  longitude double precision not null default 0,
  beds numeric not null default 0,
  baths numeric not null default 0,
  sqft numeric not null default 0,
  lot_size numeric,
  year_built integer,
  days_on_market integer not null default 0,
  rehab_estimate numeric not null default 0,
  arv numeric not null default 0,
  notes text not null default '',
  tax_amount numeric not null default 0,
  interest_rate numeric not null default 0,
  redemption_period integer not null default 0,
  delinquent_years integer not null default 0,
  source_hash text,
  source_verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists public.user_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  county text,
  auction_type text,
  min_price numeric,
  max_price numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calculator_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  inputs jsonb not null,
  results jsonb not null,
  resale_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_health (
  source_id text primary key,
  county text not null,
  status text not null check (status in ('live', 'partial', 'stale', 'failed', 'in_development', 'no_future_sale')),
  record_count integer not null default 0,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  error_message text,
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.has_active_membership(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = check_user_id
      and status in ('active', 'trialing')
      and current_period_end is not null
      and current_period_end > now()
  );
$$;

revoke all on function public.has_active_membership(uuid) from public;
grant execute on function public.has_active_membership(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.member_preferences enable row level security;
alter table public.properties enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_alerts enable row level security;
alter table public.calculator_scenarios enable row level security;
alter table public.source_health enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = 'member');

drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription" on public.subscriptions for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users manage own preferences" on public.member_preferences;
create policy "Users manage own preferences" on public.member_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Active members read properties" on public.properties;
create policy "Active members read properties" on public.properties for select to authenticated using (public.has_active_membership());

drop policy if exists "Members manage own favorites" on public.user_favorites;
create policy "Members manage own favorites" on public.user_favorites for all to authenticated using (user_id = auth.uid() and public.has_active_membership()) with check (user_id = auth.uid() and public.has_active_membership());

drop policy if exists "Members manage own alerts" on public.user_alerts;
create policy "Members manage own alerts" on public.user_alerts for all to authenticated using (user_id = auth.uid() and public.has_active_membership()) with check (user_id = auth.uid() and public.has_active_membership());

drop policy if exists "Members manage own scenarios" on public.calculator_scenarios;
create policy "Members manage own scenarios" on public.calculator_scenarios for all to authenticated using (user_id = auth.uid() and public.has_active_membership()) with check (user_id = auth.uid() and public.has_active_membership());

create or replace view public.public_auction_calendar
with (security_barrier = true)
as
select county, auction_date, source, min(source_url) as source_url, count(*)::integer as property_count,
       max(source_verified_at) as last_verified_at
from public.properties
where status = 'Active' and auction_date >= current_date
group by county, auction_date, source;

revoke all on public.public_auction_calendar from public;
grant select on public.public_auction_calendar to anon, authenticated;

revoke all on public.profiles, public.subscriptions, public.member_preferences, public.properties,
  public.user_favorites, public.user_alerts, public.calculator_scenarios, public.source_health from anon;
grant select, update on public.profiles to authenticated;
grant select on public.subscriptions, public.properties, public.source_health to authenticated;
grant select, insert, update, delete on public.member_preferences, public.user_favorites,
  public.user_alerts, public.calculator_scenarios to authenticated;
