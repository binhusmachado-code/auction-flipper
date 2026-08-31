-- Product expansion: public signup, tiered access, saved discovery, research tracking,
-- evidence notes/documents, learning progress, and partner-service requests.

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
  add column if not exists tier text,
  add column if not exists billing_interval text;

update public.subscriptions
set tier = coalesce(tier, case when plan in ('monthly', 'yearly') then 'investor' else 'free' end),
    billing_interval = coalesce(billing_interval, case when plan = 'yearly' then 'year' when plan = 'monthly' then 'month' end);

alter table public.subscriptions
  alter column tier set default 'free',
  add constraint subscriptions_tier_check check (tier in ('free', 'investor', 'pro')),
  add constraint subscriptions_billing_interval_check check (billing_interval is null or billing_interval in ('month', 'year')),
  add constraint subscriptions_plan_check check (
    plan is null or plan in (
      'monthly', 'yearly',
      'investor_monthly', 'investor_yearly',
      'pro_monthly', 'pro_yearly'
    )
  );

alter table public.user_alerts
  add column if not exists name text,
  add column if not exists state text,
  add column if not exists city text,
  add column if not exists property_type text,
  add column if not exists sale_type text,
  add column if not exists frequency text not null default 'daily',
  add column if not exists query jsonb not null default '{}'::jsonb,
  add column if not exists last_sent_at timestamptz;

alter table public.user_alerts
  drop constraint if exists user_alerts_frequency_check;
alter table public.user_alerts
  add constraint user_alerts_frequency_check check (frequency in ('instant', 'daily', 'weekly'));

create table if not exists public.plan_entitlements (
  tier text primary key check (tier in ('free', 'investor', 'pro')),
  tracked_property_limit integer not null check (tracked_property_limit >= 0),
  saved_search_limit integer not null check (saved_search_limit >= 0),
  alert_frequency text not null check (alert_frequency in ('none', 'daily', 'instant')),
  full_property_records boolean not null default false,
  csv_export boolean not null default false,
  advanced_reports boolean not null default false,
  team_access boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.plan_entitlements (
  tier, tracked_property_limit, saved_search_limit, alert_frequency,
  full_property_records, csv_export, advanced_reports, team_access
) values
  ('free', 5, 1, 'none', false, false, false, false),
  ('investor', 100, 10, 'daily', true, true, false, false),
  ('pro', 500, 20, 'instant', true, true, true, false)
on conflict (tier) do update set
  tracked_property_limit = excluded.tracked_property_limit,
  saved_search_limit = excluded.saved_search_limit,
  alert_frequency = excluded.alert_frequency,
  full_property_records = excluded.full_property_records,
  csv_export = excluded.csv_export,
  advanced_reports = excluded.advanced_reports,
  team_access = excluded.team_access,
  updated_at = now();

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  filters jsonb not null default '{}'::jsonb,
  alert_frequency text not null default 'none' check (alert_frequency in ('none', 'daily', 'instant')),
  enabled boolean not null default true,
  last_match_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.property_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  status text not null default 'watching' check (
    status in ('watching', 'researching', 'due_diligence', 'ready', 'won', 'lost', 'paid', 'removed')
  ),
  next_action text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create table if not exists public.property_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  storage_path text not null,
  filename text not null check (char_length(filename) between 1 and 255),
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 25000000),
  document_type text not null default 'other' check (
    document_type in ('auction_notice', 'title_search', 'tax_record', 'appraiser_record', 'map', 'photo', 'other')
  ),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, storage_path)
);

create table if not exists public.property_source_records (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id) on delete cascade,
  source_type text not null check (
    source_type in ('auction', 'appraiser', 'tax_collector', 'clerk', 'gis', 'rules', 'title', 'other')
  ),
  source_name text not null,
  source_url text not null,
  status text not null default 'available' check (status in ('available', 'stale', 'unavailable')),
  verified_at timestamptz,
  retrieved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, source_type, source_url)
);

create table if not exists public.property_change_history (
  id bigint generated by default as identity primary key,
  property_id text not null references public.properties(id) on delete cascade,
  field_name text not null,
  previous_value text,
  current_value text,
  source_record_id uuid references public.property_source_records(id) on delete set null,
  detected_at timestamptz not null default now()
);

create table if not exists public.learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed boolean not null default false,
  quiz_score integer check (quiz_score is null or quiz_score between 0 and 100),
  notes text,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text references public.properties(id) on delete set null,
  service_type text not null check (service_type in ('title_search', 'skip_trace')),
  status text not null default 'requested' check (status in ('requested', 'contacted', 'closed', 'cancelled')),
  details text check (details is null or char_length(details) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.has_account_access()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and account_status = 'active'
  );
$$;

create or replace function private.current_plan_tier()
returns text
language sql
stable
security definer set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
        and account_status = 'active'
    ) then 'pro'
    when exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and account_status = 'active'
        and manual_access_until > now()
    ) then 'pro'
    else coalesce((
      select tier from public.subscriptions
      where user_id = (select auth.uid())
        and status in ('active', 'trialing')
        and current_period_end is not null
        and current_period_end > now()
    ), 'free')
  end;
$$;

create or replace function private.has_active_membership()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select private.has_account_access()
    and private.current_plan_tier() in ('investor', 'pro');
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do update
    set email = excluded.email, updated_at = now();

  insert into public.subscriptions (user_id, tier, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.current_member_plan()
returns table (
  tier text,
  tracked_property_limit integer,
  saved_search_limit integer,
  alert_frequency text,
  full_property_records boolean,
  csv_export boolean,
  advanced_reports boolean,
  team_access boolean
)
language sql
stable
security definer set search_path = ''
as $$
  select e.tier, e.tracked_property_limit, e.saved_search_limit, e.alert_frequency,
         e.full_property_records, e.csv_export, e.advanced_reports, e.team_access
  from public.plan_entitlements e
  where e.tier = private.current_plan_tier();
$$;

create or replace function public.list_property_previews(limit_count integer default 24)
returns table (
  id text,
  address text,
  city text,
  state text,
  zip text,
  county text,
  opening_bid numeric,
  auction_date date,
  sale_type text,
  auction_type text,
  property_type text,
  image_url text,
  source text,
  source_url text,
  source_verified_at timestamptz,
  status text
)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.address, p.city, p.state, p.zip, p.county, p.opening_bid,
         p.auction_date, p.sale_type, p.auction_type, p.property_type, p.image_url,
         p.source, p.source_url, p.source_verified_at, p.status
  from public.properties p
  where p.status = 'Active'
    and (p.auction_date is null or p.auction_date >= current_date)
  order by p.auction_date asc nulls last, p.id asc
  limit greatest(1, least(coalesce(limit_count, 24), 24));
$$;

revoke all on function private.has_account_access() from public, anon;
revoke all on function private.current_plan_tier() from public, anon;
revoke all on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.has_account_access() to authenticated;
grant execute on function private.current_plan_tier() to authenticated;
revoke all on function public.current_member_plan() from public;
grant execute on function public.current_member_plan() to authenticated;
revoke all on function public.list_property_previews(integer) from public;
grant execute on function public.list_property_previews(integer) to anon, authenticated;

alter table public.plan_entitlements enable row level security;
alter table public.saved_searches enable row level security;
alter table public.property_tracking enable row level security;
alter table public.property_notes enable row level security;
alter table public.property_documents enable row level security;
alter table public.property_source_records enable row level security;
alter table public.property_change_history enable row level security;
alter table public.learning_progress enable row level security;
alter table public.service_requests enable row level security;

create policy "Everyone reads plan entitlements" on public.plan_entitlements
for select to anon, authenticated using (true);

create policy "Users manage own saved searches" on public.saved_searches
for all to authenticated
using (user_id = (select auth.uid()) and private.has_account_access())
with check (user_id = (select auth.uid()) and private.has_account_access());

create policy "Users manage own property tracking" on public.property_tracking
for all to authenticated
using (user_id = (select auth.uid()) and private.has_account_access())
with check (user_id = (select auth.uid()) and private.has_account_access());

create policy "Users manage own property notes" on public.property_notes
for all to authenticated
using (user_id = (select auth.uid()) and private.has_account_access())
with check (user_id = (select auth.uid()) and private.has_account_access());

create policy "Users manage own property documents" on public.property_documents
for all to authenticated
using (user_id = (select auth.uid()) and private.has_account_access())
with check (user_id = (select auth.uid()) and private.has_account_access());

create policy "Paid members read property sources" on public.property_source_records
for select to authenticated using (private.has_active_membership());

create policy "Paid members read property changes" on public.property_change_history
for select to authenticated using (private.has_active_membership());

create policy "Users manage own learning progress" on public.learning_progress
for all to authenticated
using (user_id = (select auth.uid()) and private.has_account_access())
with check (user_id = (select auth.uid()) and private.has_account_access());

create policy "Users manage own service requests" on public.service_requests
for all to authenticated
using (user_id = (select auth.uid()) and private.has_account_access())
with check (user_id = (select auth.uid()) and private.has_account_access());

drop policy if exists "Members manage own favorites" on public.user_favorites;
create policy "Account holders manage own favorites" on public.user_favorites
for all to authenticated
using (user_id = (select auth.uid()) and private.has_account_access())
with check (user_id = (select auth.uid()) and private.has_account_access());

drop policy if exists "Members manage own alerts" on public.user_alerts;
create policy "Account holders manage own alerts" on public.user_alerts
for all to authenticated
using (user_id = (select auth.uid()) and private.has_account_access())
with check (user_id = (select auth.uid()) and private.has_account_access());

revoke all on public.plan_entitlements, public.saved_searches, public.property_tracking,
  public.property_notes, public.property_documents, public.property_source_records,
  public.property_change_history, public.learning_progress, public.service_requests from anon;
grant select on public.plan_entitlements to anon, authenticated;
grant select, insert, update, delete on public.saved_searches, public.property_tracking,
  public.property_notes, public.property_documents, public.learning_progress,
  public.service_requests to authenticated;
grant select on public.property_source_records, public.property_change_history to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-documents', 'property-documents', false, 25000000,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own property documents" on storage.objects;
create policy "Users upload own property documents" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'property-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.has_account_access()
);

drop policy if exists "Users read own property documents" on storage.objects;
create policy "Users read own property documents" on storage.objects
for select to authenticated
using (
  bucket_id = 'property-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.has_account_access()
);

drop policy if exists "Users delete own property documents" on storage.objects;
create policy "Users delete own property documents" on storage.objects
for delete to authenticated
using (
  bucket_id = 'property-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.has_account_access()
);

create index if not exists subscriptions_active_user_idx
  on public.subscriptions (user_id, tier, current_period_end desc)
  where status in ('active', 'trialing');
create index if not exists saved_searches_user_updated_idx
  on public.saved_searches (user_id, updated_at desc);
create index if not exists saved_searches_alert_idx
  on public.saved_searches (alert_frequency, last_match_at)
  where enabled and alert_frequency <> 'none';
create index if not exists property_tracking_user_status_idx
  on public.property_tracking (user_id, status, updated_at desc);
create index if not exists property_tracking_property_idx
  on public.property_tracking (property_id);
create index if not exists property_tracking_due_idx
  on public.property_tracking (user_id, due_at)
  where due_at is not null and status not in ('lost', 'paid', 'removed');
create index if not exists property_notes_user_property_idx
  on public.property_notes (user_id, property_id, created_at desc);
create index if not exists property_documents_user_property_idx
  on public.property_documents (user_id, property_id, created_at desc);
create index if not exists property_source_records_property_idx
  on public.property_source_records (property_id, source_type, verified_at desc);
create index if not exists property_change_history_property_idx
  on public.property_change_history (property_id, detected_at desc);
create index if not exists learning_progress_user_idx
  on public.learning_progress (user_id, updated_at desc);
create index if not exists service_requests_user_status_idx
  on public.service_requests (user_id, status, created_at desc);
