-- Evidence provenance and automatic verification audit trail.
-- Unknown values remain null/unknown; this migration never manufactures property facts.

alter table public.properties
  add column if not exists selling_authority text,
  add column if not exists legal_description text,
  add column if not exists registration_deadline timestamptz,
  add column if not exists payment_deadline timestamptz,
  add column if not exists photo_source text,
  add column if not exists photo_source_name text,
  add column if not exists photo_source_url text,
  add column if not exists photo_captured_at timestamptz,
  add column if not exists photo_verified_at timestamptz,
  add column if not exists occupancy_signal text not null default 'unknown',
  add column if not exists access_status text not null default 'unknown',
  add column if not exists permit_status text not null default 'unknown',
  add column if not exists utility_status text not null default 'unknown';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_photo_source_check') then
    alter table public.properties add constraint properties_photo_source_check
      check (photo_source is null or photo_source in ('official_auction', 'government_listing', 'licensed_provider', 'member_upload', 'street_view', 'unverified'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_occupancy_signal_check') then
    alter table public.properties add constraint properties_occupancy_signal_check
      check (occupancy_signal in ('unknown', 'vacant', 'occupied', 'possibly_occupied'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_access_status_check') then
    alter table public.properties add constraint properties_access_status_check
      check (access_status in ('unknown', 'verified', 'concern'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_permit_status_check') then
    alter table public.properties add constraint properties_permit_status_check
      check (permit_status in ('unknown', 'verified', 'concern'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_utility_status_check') then
    alter table public.properties add constraint properties_utility_status_check
      check (utility_status in ('unknown', 'verified', 'concern'));
  end if;
end $$;

alter table public.property_source_records
  add column if not exists official boolean not null default false,
  add column if not exists evidence jsonb not null default '{}'::jsonb,
  add column if not exists retrieval_hash text;

alter table public.property_source_records alter column official set default false;
update public.property_source_records set official = false where retrieval_hash is null;

alter table public.property_documents
  add column if not exists source_url text,
  add column if not exists document_date date,
  add column if not exists evidence jsonb not null default '{}'::jsonb;

-- Browser clients may attach and attest to evidence, but only a trusted backend
-- may promote a document to provider-validated evidence.
create or replace function private.protect_document_verification()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if (select auth.role()) in ('anon', 'authenticated') then
    new.verified_at := null;
    new.evidence := coalesce(new.evidence, '{}'::jsonb) - 'providerValidated';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_document_verification on public.property_documents;
create trigger protect_document_verification
  before insert or update on public.property_documents
  for each row execute function private.protect_document_verification();

revoke all on function private.protect_document_verification() from public, anon, authenticated;

create table if not exists public.property_verification_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  engine_version text not null,
  overall_status text not null check (overall_status in ('verified', 'partial', 'action_required', 'stop')),
  verified_count integer not null check (verified_count between 0 and 9),
  checks jsonb not null,
  checked_at timestamptz not null,
  last_source_verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.property_verification_runs enable row level security;

drop policy if exists "Users read own property verification runs" on public.property_verification_runs;
create policy "Users read own property verification runs"
  on public.property_verification_runs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users write own property verification runs" on public.property_verification_runs;

create index if not exists property_verification_runs_checked_at_idx
  on public.property_verification_runs (user_id, property_id, checked_at desc);

revoke insert, update, delete on public.property_verification_runs from authenticated;
grant select on public.property_verification_runs to authenticated;
grant insert on public.property_verification_runs to service_role;

-- Keep photo provenance in the public preview response so the UI never has to
-- guess whether an image is an actual property photo or generic imagery.
drop function if exists public.list_property_previews(integer);
create function public.list_property_previews(limit_count integer default 24)
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
  status text,
  photo_source text,
  photo_source_name text,
  photo_source_url text,
  photo_captured_at timestamptz,
  photo_verified_at timestamptz
)
language sql
stable
security definer set search_path = ''
as $$
  select p.id, p.address, p.city, p.state, p.zip, p.county, p.opening_bid,
         p.auction_date, p.sale_type, p.auction_type, p.property_type, p.image_url,
         p.source, p.source_url, p.source_verified_at, p.status,
         p.photo_source, p.photo_source_name, p.photo_source_url,
         p.photo_captured_at, p.photo_verified_at
  from public.properties p
  where p.status = 'Active'
    and (p.auction_date is null or p.auction_date >= current_date)
  order by p.auction_date asc nulls last, p.id asc
  limit greatest(1, least(coalesce(limit_count, 24), 24));
$$;

revoke all on function public.list_property_previews(integer) from public;
grant execute on function public.list_property_previews(integer) to anon, authenticated;

create or replace function public.sync_property_evidence(records jsonb)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  updated_count integer;
begin
  if jsonb_typeof(records) <> 'array' then
    raise exception 'Evidence payload must be an array';
  end if;

  update public.properties property
  set
    selling_authority = coalesce(nullif(record.value->>'selling_authority', ''), property.selling_authority),
    legal_description = coalesce(nullif(record.value->>'legal_description', ''), property.legal_description),
    registration_deadline = coalesce(nullif(record.value->>'registration_deadline', '')::timestamptz, property.registration_deadline),
    payment_deadline = coalesce(nullif(record.value->>'payment_deadline', '')::timestamptz, property.payment_deadline),
    photo_source = case
      when not (record.value ? 'photo_source') then property.photo_source
      when record.value->>'photo_source' in ('official_auction', 'government_listing', 'licensed_provider', 'member_upload', 'street_view', 'unverified') then record.value->>'photo_source'
      else null
    end,
    photo_source_name = case
      when record.value ? 'photo_source' and coalesce(record.value->>'photo_source', 'unverified') = 'unverified' then null
      when record.value ? 'photo_source_name' then nullif(record.value->>'photo_source_name', '')
      else property.photo_source_name
    end,
    photo_source_url = case
      when record.value ? 'photo_source' and coalesce(record.value->>'photo_source', 'unverified') = 'unverified' then null
      when record.value ? 'photo_source_url' then nullif(record.value->>'photo_source_url', '')
      else property.photo_source_url
    end,
    photo_captured_at = case
      when record.value ? 'photo_source' and coalesce(record.value->>'photo_source', 'unverified') = 'unverified' then null
      when record.value ? 'photo_captured_at' then nullif(record.value->>'photo_captured_at', '')::timestamptz
      else property.photo_captured_at
    end,
    photo_verified_at = case
      when record.value ? 'photo_source' and coalesce(record.value->>'photo_source', 'unverified') = 'unverified' then null
      when record.value ? 'photo_verified_at' then nullif(record.value->>'photo_verified_at', '')::timestamptz
      else property.photo_verified_at
    end,
    occupancy_signal = case when record.value->>'occupancy_signal' in ('vacant', 'occupied', 'possibly_occupied') then record.value->>'occupancy_signal' else property.occupancy_signal end,
    access_status = case when record.value->>'access_status' in ('verified', 'concern') then record.value->>'access_status' else property.access_status end,
    permit_status = case when record.value->>'permit_status' in ('verified', 'concern') then record.value->>'permit_status' else property.permit_status end,
    utility_status = case when record.value->>'utility_status' in ('verified', 'concern') then record.value->>'utility_status' else property.utility_status end
  from jsonb_array_elements(records) as record(value)
  where property.id = record.value->>'id';

  get diagnostics updated_count = row_count;

  insert into public.property_source_records (
    property_id, source_type, source_name, source_url, status, verified_at,
    retrieved_at, metadata, official, evidence, retrieval_hash, updated_at
  )
  select
    record.value->>'id', 'auction',
    coalesce(nullif(record.value->>'source', ''), 'Official auction source'),
    record.value->>'source_url',
    case when nullif(record.value->>'source_verified_at', '')::timestamptz >= now() - interval '14 days' then 'available' else 'stale' end,
    nullif(record.value->>'source_verified_at', '')::timestamptz,
    coalesce(nullif(record.value->>'updated_at', '')::timestamptz, now()),
    jsonb_build_object('ingestion', 'inventory-link-only'), false,
    jsonb_strip_nulls(jsonb_build_object(
      'providerValidated', false, 'saleType', record.value->>'sale_type',
      'sellingAuthority', record.value->>'selling_authority', 'saleStatus', record.value->>'status',
      'auctionDate', record.value->>'auction_date',
      'openingAmount', coalesce(record.value->>'opening_bid', record.value->>'price'),
      'deposit', record.value->>'deposit_required', 'address', record.value->>'address',
      'parcelId', record.value->>'parcel_id', 'caseNumber', record.value->>'case_number',
      'legalDescription', record.value->>'legal_description',
      'registrationDeadline', record.value->>'registration_deadline',
      'paymentDeadline', record.value->>'payment_deadline'
    )), md5(record.value::text), now()
  from jsonb_array_elements(records) as record(value)
  where nullif(record.value->>'id', '') is not null
    and nullif(record.value->>'source_url', '') like 'https://%'
    and nullif(record.value->>'source_verified_at', '') is not null
  on conflict (property_id, source_type, source_url) do update set
    source_name = excluded.source_name, status = excluded.status,
    verified_at = excluded.verified_at, retrieved_at = excluded.retrieved_at,
    metadata = excluded.metadata, official = excluded.official,
    evidence = excluded.evidence, retrieval_hash = excluded.retrieval_hash,
    updated_at = now();

  return updated_count;
end;
$$;

revoke all on function public.sync_property_evidence(jsonb) from public, anon, authenticated;
grant execute on function public.sync_property_evidence(jsonb) to service_role;

-- One RPC keeps inventory and evidence changes in the same database transaction.
create or replace function public.sync_tax_deed_inventory_v2(records jsonb, source_metadata jsonb)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  result jsonb;
begin
  result := public.sync_tax_deed_inventory(records, source_metadata);
  perform public.sync_property_evidence(records);
  return result;
end;
$$;

create or replace function public.sync_tax_lien_inventory_v2(records jsonb, source_metadata jsonb)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  result jsonb;
begin
  result := public.sync_tax_lien_inventory(records, source_metadata);
  perform public.sync_property_evidence(records);
  return result;
end;
$$;

revoke all on function public.sync_tax_deed_inventory_v2(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.sync_tax_lien_inventory_v2(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_tax_deed_inventory_v2(jsonb, jsonb) to service_role;
grant execute on function public.sync_tax_lien_inventory_v2(jsonb, jsonb) to service_role;

-- Numeric assumptions are untrusted JSON. Invalid, negative, NaN, and
-- infinity-like values return null, while omitted optional costs default to 0.
create or replace function private.safe_nonnegative_numeric(payload jsonb, field_name text)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  raw_value text := nullif(trim(payload->>field_name), '');
begin
  if raw_value is null then return 0; end if;
  if raw_value !~ '^[0-9]+([.][0-9]+)?$' then return null; end if;
  return raw_value::numeric;
exception when others then
  return null;
end;
$$;

create or replace function private.calculate_tax_deed_maximum(payload jsonb)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  resale_value numeric := private.safe_nonnegative_numeric(payload, 'resaleValue');
  selling_cost_rate numeric := private.safe_nonnegative_numeric(payload, 'sellingCostRate');
  auction_fees numeric := private.safe_nonnegative_numeric(payload, 'auctionFees');
  closing_costs numeric := private.safe_nonnegative_numeric(payload, 'closingCosts');
  title_costs numeric := private.safe_nonnegative_numeric(payload, 'titleAndLienCosts');
  repairs numeric := private.safe_nonnegative_numeric(payload, 'repairs');
  contingency numeric := private.safe_nonnegative_numeric(payload, 'contingency');
  holding_months numeric := private.safe_nonnegative_numeric(payload, 'holdingMonths');
  monthly_holding numeric := private.safe_nonnegative_numeric(payload, 'monthlyHolding');
  target_profit numeric := private.safe_nonnegative_numeric(payload, 'targetProfit');
  buyer_premium_rate numeric := private.safe_nonnegative_numeric(payload, 'buyerPremiumRate');
  planned_bid numeric := private.safe_nonnegative_numeric(payload, 'plannedBid');
begin
  if resale_value is null or resale_value <= 0
    or selling_cost_rate is null or selling_cost_rate > 100
    or auction_fees is null or closing_costs is null or title_costs is null
    or repairs is null or contingency is null or holding_months is null
    or monthly_holding is null or target_profit is null
    or buyer_premium_rate is null or buyer_premium_rate > 100
    or planned_bid is null then
    return null;
  end if;
  return greatest(0, (
    resale_value * (1 - selling_cost_rate / 100)
    - auction_fees - closing_costs - title_costs - repairs - contingency
    - holding_months * monthly_holding - target_profit
  ) / (1 + buyer_premium_rate / 100));
end;
$$;

revoke all on function private.safe_nonnegative_numeric(jsonb, text) from public, anon, authenticated;
revoke all on function private.calculate_tax_deed_maximum(jsonb) from public, anon, authenticated;

-- Recompute all nine gates from database evidence. The browser can request a
-- run, but it cannot supply the result or promote its own documents/sources.
create or replace function public.run_property_verification(target_property_id text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  property public.properties%rowtype;
  scenario jsonb;
  maximum_bid numeric := 0;
  latest_source_at timestamptz;
  sale_authority_ok boolean := false;
  identity_ok boolean := false;
  auction_terms_ok boolean := false;
  title_rules_ok boolean := false;
  physical_ok boolean := false;
  value_costs_ok boolean := false;
  maximum_bid_ok boolean := false;
  deadlines_ok boolean := false;
  archive_ok boolean := false;
  authority_conflict boolean := false;
  identity_conflict boolean := false;
  auction_conflict boolean := false;
  physical_conflict boolean := false;
  deadline_conflict boolean := false;
  bid_conflict boolean := false;
  stop_required boolean := false;
  verified_total integer := 0;
  report_checks jsonb;
  saved_run public.property_verification_runs%rowtype;
begin
  if current_user_id is null then raise exception 'Sign in to run verification'; end if;
  if not private.has_active_membership() then raise exception 'An active membership is required for server verification'; end if;

  select * into property from public.properties where id = target_property_id;
  if not found then raise exception 'Property not found'; end if;

  -- Return the latest run when none of its database inputs has changed. This
  -- makes opening a modal idempotent instead of growing the audit table.
  select * into saved_run
  from public.property_verification_runs report
  where report.user_id = current_user_id and report.property_id = target_property_id
    and report.checked_at >= now() - interval '24 hours'
    and report.checked_at >= property.updated_at
    and report.checked_at >= coalesce((select max(source.updated_at) from public.property_source_records source where source.property_id = target_property_id), 'epoch'::timestamptz)
    and report.checked_at >= coalesce((select max(greatest(document.created_at, coalesce(document.verified_at, document.created_at))) from public.property_documents document where document.user_id = current_user_id and document.property_id = target_property_id), 'epoch'::timestamptz)
    and report.checked_at >= coalesce((select max(record.updated_at) from public.calculator_scenarios record where record.user_id = current_user_id and record.property_id = target_property_id), 'epoch'::timestamptz)
    and report.checked_at >= coalesce((select max(tracker.updated_at) from public.property_tracking tracker where tracker.user_id = current_user_id and tracker.property_id = target_property_id), 'epoch'::timestamptz)
  order by report.checked_at desc limit 1;
  if found then return to_jsonb(saved_run); end if;

  select max(verified_at) into latest_source_at
  from public.property_source_records
  where property_id = target_property_id and official and status = 'available'
    and evidence->>'providerValidated' = 'true' and verified_at >= now() - interval '14 days';

  select exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and source.source_type in ('auction', 'clerk')
      and lower(trim(source.evidence->>'saleType')) = lower(trim(coalesce(property.sale_type, property.auction_type)))
      and lower(trim(source.evidence->>'sellingAuthority')) = lower(trim(property.selling_authority))
  ) into sale_authority_ok;

  select
    property.address <> '' and coalesce(property.parcel_id, '') <> ''
    and coalesce(property.case_number, '') <> '' and coalesce(property.legal_description, '') <> ''
    and (select count(*) from public.property_source_records source where source.property_id = target_property_id and source.official and source.status = 'available' and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true' and lower(trim(source.evidence->>'address')) = lower(trim(property.address))) >= 2
    and (select count(*) from public.property_source_records source where source.property_id = target_property_id and source.official and source.status = 'available' and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true' and lower(trim(source.evidence->>'parcelId')) = lower(trim(property.parcel_id))) >= 2
    and (select count(*) from public.property_source_records source where source.property_id = target_property_id and source.official and source.status = 'available' and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true' and lower(trim(source.evidence->>'caseNumber')) = lower(trim(property.case_number))) >= 2
    and (select count(*) from public.property_source_records source where source.property_id = target_property_id and source.official and source.status = 'available' and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true' and lower(trim(source.evidence->>'legalDescription')) = lower(trim(property.legal_description))) >= 2
  into identity_ok;

  select exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and source.source_type = 'auction' and source.evidence->>'saleStatus' = 'Active'
      and left(source.evidence->>'auctionDate', 10) = property.auction_date::text
      and source.evidence->>'openingAmount' ~ '^[0-9]+([.][0-9]+)?$'
      and (source.evidence->>'openingAmount')::numeric = coalesce(property.opening_bid, property.price)
      and source.evidence->>'deposit' ~ '^[0-9]+([.][0-9]+)?$'
      and (source.evidence->>'deposit')::numeric = property.deposit_required
  ) and exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and source.source_type = 'rules'
  ) into auction_terms_ok;

  select (
    exists (
      select 1 from public.property_source_records source
      where source.property_id = target_property_id and source.official and source.status = 'available'
        and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
        and source.source_type in ('title', 'clerk') and source.evidence ?& array['ownership', 'liens', 'parties', 'notices']
    ) or exists (
      select 1 from public.property_documents document
      where document.user_id = current_user_id and document.property_id = target_property_id
        and document.document_type = 'title_search' and document.source_url like 'https://%'
        and document.verified_at >= now() - interval '30 days' and document.evidence->>'providerValidated' = 'true'
    )
  ) and exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and source.source_type = 'rules' and (source.evidence ? 'redemptionRules' or source.evidence ? 'redemptionPeriod')
  ) into title_rules_ok;

  select exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and source.source_type in ('appraiser', 'clerk', 'gis', 'other')
      and source.evidence->>'accessStatus' = property.access_status
      and source.evidence->>'occupancySignal' = property.occupancy_signal
      and source.evidence->>'permitStatus' = property.permit_status
      and source.evidence->>'utilityStatus' = property.utility_status
      and property.access_status = 'verified' and property.occupancy_signal <> 'unknown'
      and property.permit_status = 'verified' and property.utility_status = 'verified'
  ) and (
    (property.photo_source in ('official_auction', 'government_listing', 'licensed_provider', 'street_view')
      and property.photo_source_url like 'https://%' and property.photo_verified_at >= now() - interval '14 days'
      and property.photo_captured_at >= now() - interval '730 days')
    or exists (
      select 1 from public.property_documents document
      where document.user_id = current_user_id and document.property_id = target_property_id
        and document.document_type = 'photo' and document.source_url like 'https://%'
        and document.verified_at >= now() - interval '30 days' and document.evidence->>'providerValidated' = 'true'
    )
  ) into physical_ok;

  select inputs into scenario from public.calculator_scenarios
  where user_id = current_user_id and property_id = target_property_id order by updated_at desc limit 1;

  if property.sale_type = 'Tax Deed' and scenario is not null then
    maximum_bid := private.calculate_tax_deed_maximum(scenario);
    value_costs_ok := length(trim(coalesce(scenario->>'resaleSource', ''))) >= 3
      and coalesce((scenario->>'valueChecked')::boolean, false)
      and coalesce((scenario->>'conditionChecked')::boolean, false)
      and coalesce((scenario->>'titleChecked')::boolean, false)
      and coalesce((scenario->>'feesChecked')::boolean, false)
      and coalesce(private.safe_nonnegative_numeric(scenario, 'repairs'), 0) > 0
      and coalesce(private.safe_nonnegative_numeric(scenario, 'holdingMonths'), 0) > 0
      and coalesce(private.safe_nonnegative_numeric(scenario, 'monthlyHolding'), 0) > 0
      and coalesce(private.safe_nonnegative_numeric(scenario, 'sellingCostRate'), 0) > 0
      and maximum_bid is not null;
    maximum_bid_ok := value_costs_ok and coalesce(maximum_bid, 0) > 0
      and coalesce(private.safe_nonnegative_numeric(scenario, 'contingency'), 0) > 0
      and coalesce(private.safe_nonnegative_numeric(scenario, 'targetProfit'), 0) > 0
      and (nullif(scenario->>'plannedBid', '') is null or private.safe_nonnegative_numeric(scenario, 'plannedBid') <= maximum_bid);
  end if;

  select exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and left(source.evidence->>'registrationDeadline', 10) = property.registration_deadline::date::text
      and left(source.evidence->>'auctionDate', 10) = property.auction_date::text
      and left(source.evidence->>'paymentDeadline', 10) = property.payment_deadline::date::text
  ) and exists (
    select 1 from public.property_tracking tracker
    where tracker.user_id = current_user_id and tracker.property_id = target_property_id and tracker.due_at is not null
  ) into deadlines_ok;

  select exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and source.source_type in ('auction', 'clerk') and (
        (source.evidence ? 'saleType' and lower(trim(source.evidence->>'saleType')) <> lower(trim(coalesce(property.sale_type, property.auction_type))))
        or (source.evidence ? 'sellingAuthority' and lower(trim(source.evidence->>'sellingAuthority')) <> lower(trim(property.selling_authority)))
      )
  ) into authority_conflict;

  select exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and (
        (source.evidence ? 'address' and lower(trim(source.evidence->>'address')) <> lower(trim(property.address)))
        or (source.evidence ? 'parcelId' and lower(trim(source.evidence->>'parcelId')) <> lower(trim(property.parcel_id)))
        or (source.evidence ? 'caseNumber' and lower(trim(source.evidence->>'caseNumber')) <> lower(trim(property.case_number)))
        or (source.evidence ? 'legalDescription' and lower(trim(source.evidence->>'legalDescription')) <> lower(trim(property.legal_description)))
      )
  ) into identity_conflict;

  select exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and source.source_type in ('auction', 'rules') and (
        (source.evidence ? 'saleStatus' and source.evidence->>'saleStatus' <> property.status)
        or (source.evidence ? 'auctionDate' and left(source.evidence->>'auctionDate', 10) <> property.auction_date::text)
        or (source.evidence ? 'openingAmount' and (
          source.evidence->>'openingAmount' !~ '^[0-9]+([.][0-9]+)?$'
          or (source.evidence->>'openingAmount')::numeric <> coalesce(property.opening_bid, property.price)
        ))
        or (source.evidence ? 'deposit' and (
          source.evidence->>'deposit' !~ '^[0-9]+([.][0-9]+)?$'
          or (source.evidence->>'deposit')::numeric <> property.deposit_required
        ))
      )
  ) into auction_conflict;

  select exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and source.source_type in ('appraiser', 'clerk', 'gis', 'other') and (
        (source.evidence ? 'accessStatus' and source.evidence->>'accessStatus' <> 'unknown' and source.evidence->>'accessStatus' <> property.access_status)
        or (source.evidence ? 'occupancySignal' and source.evidence->>'occupancySignal' <> 'unknown' and source.evidence->>'occupancySignal' <> property.occupancy_signal)
        or (source.evidence ? 'permitStatus' and source.evidence->>'permitStatus' <> 'unknown' and source.evidence->>'permitStatus' <> property.permit_status)
        or (source.evidence ? 'utilityStatus' and source.evidence->>'utilityStatus' <> 'unknown' and source.evidence->>'utilityStatus' <> property.utility_status)
      )
  ) into physical_conflict;

  select exists (
    select 1 from public.property_source_records source
    where source.property_id = target_property_id and source.official and source.status = 'available'
      and source.verified_at >= now() - interval '14 days' and source.evidence->>'providerValidated' = 'true'
      and (
        (source.evidence ? 'registrationDeadline' and left(source.evidence->>'registrationDeadline', 10) <> property.registration_deadline::date::text)
        or (source.evidence ? 'auctionDate' and left(source.evidence->>'auctionDate', 10) <> property.auction_date::text)
        or (source.evidence ? 'paymentDeadline' and left(source.evidence->>'paymentDeadline', 10) <> property.payment_deadline::date::text)
      )
  ) into deadline_conflict;

  archive_ok := latest_source_at is not null and exists (
    select 1 from public.property_documents document
    where document.user_id = current_user_id and document.property_id = target_property_id
      and document.document_type not in ('photo', 'other') and document.source_url like 'https://%'
      and document.verified_at >= now() - interval '30 days' and document.evidence->>'providerValidated' = 'true'
  );

  bid_conflict := scenario is not null and coalesce(maximum_bid, 0) > 0 and nullif(scenario->>'plannedBid', '') is not null
    and private.safe_nonnegative_numeric(scenario, 'plannedBid') > maximum_bid;
  stop_required := property.status in ('Cancelled', 'Removed')
    or authority_conflict or identity_conflict or auction_conflict or physical_conflict or deadline_conflict or bid_conflict
    or property.access_status = 'concern' or property.permit_status = 'concern' or property.utility_status = 'concern';
  verified_total := sale_authority_ok::integer + identity_ok::integer + auction_terms_ok::integer
    + title_rules_ok::integer + physical_ok::integer + value_costs_ok::integer
    + maximum_bid_ok::integer + deadlines_ok::integer + archive_ok::integer;
  report_checks := jsonb_build_array(
    jsonb_build_object('key','sale_authority','status',case when property.status in ('Cancelled','Removed') or authority_conflict then 'stop' when sale_authority_ok then 'verified' when latest_source_at is not null then 'partial' else 'action_required' end),
    jsonb_build_object('key','identity','status',case when identity_conflict then 'stop' when identity_ok then 'verified' when latest_source_at is not null then 'partial' else 'action_required' end),
    jsonb_build_object('key','auction_terms','status',case when property.status in ('Cancelled','Removed') or auction_conflict then 'stop' when auction_terms_ok then 'verified' when latest_source_at is not null then 'partial' else 'action_required' end),
    jsonb_build_object('key','title_and_rules','status',case when title_rules_ok then 'verified' else 'action_required' end),
    jsonb_build_object('key','access_condition','status',case when physical_conflict or property.access_status = 'concern' or property.permit_status = 'concern' or property.utility_status = 'concern' then 'stop' when physical_ok then 'verified' when latest_source_at is not null then 'partial' else 'action_required' end),
    jsonb_build_object('key','value_and_costs','status',case when value_costs_ok then 'verified' when scenario is not null then 'partial' else 'action_required' end),
    jsonb_build_object('key','maximum_bid','status',case when bid_conflict then 'stop' when maximum_bid_ok then 'verified' when scenario is not null then 'partial' else 'action_required' end),
    jsonb_build_object('key','deadlines','status',case when deadline_conflict then 'stop' when deadlines_ok then 'verified' when latest_source_at is not null then 'partial' else 'action_required' end),
    jsonb_build_object('key','documents_and_timestamp','status',case when archive_ok then 'verified' when latest_source_at is not null then 'partial' else 'action_required' end)
  );

  insert into public.property_verification_runs (
    user_id, property_id, engine_version, overall_status, verified_count, checks, checked_at, last_source_verified_at
  ) values (
    current_user_id, target_property_id, 'server-v1',
    case when stop_required then 'stop' when verified_total = 9 then 'verified' else 'action_required' end,
    verified_total, report_checks, now(), latest_source_at
  ) returning * into saved_run;
  delete from public.property_verification_runs old
  where old.user_id = current_user_id and old.property_id = target_property_id
    and old.id in (
      select report.id from public.property_verification_runs report
      where report.user_id = current_user_id and report.property_id = target_property_id
      order by report.checked_at desc offset 100
    );
  return to_jsonb(saved_run);
end;
$$;

revoke all on function public.run_property_verification(text) from public, anon;
grant execute on function public.run_property_verification(text) to authenticated;

-- The database refuses to promote a bid workflow from research based only on
-- browser-supplied checkboxes or arithmetic.
create or replace function private.enforce_bid_workflow_readiness()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  sale_type text;
  scenario jsonb;
  computed_maximum numeric;
begin
  if new.status not in ('ready', 'official_bid_submitted', 'won', 'lost', 'payment_due', 'paid') then
    return new;
  end if;

  if not exists (
    select 1
    from public.property_verification_runs report
    where report.user_id = new.user_id
      and report.property_id = new.property_id
      and report.overall_status = 'verified'
      and report.checked_at >= now() - interval '24 hours'
      and report.checked_at >= (select property.updated_at from public.properties property where property.id = new.property_id)
      and report.checked_at >= coalesce((select max(source.updated_at) from public.property_source_records source where source.property_id = new.property_id), 'epoch'::timestamptz)
      and report.checked_at >= coalesce((select max(greatest(document.created_at, coalesce(document.verified_at, document.created_at))) from public.property_documents document where document.user_id = new.user_id and document.property_id = new.property_id), 'epoch'::timestamptz)
      and report.checked_at >= coalesce((select max(record.updated_at) from public.calculator_scenarios record where record.user_id = new.user_id and record.property_id = new.property_id), 'epoch'::timestamptz)
      and report.checked_at >= coalesce((select max(tracker.updated_at) from public.property_tracking tracker where tracker.user_id = new.user_id and tracker.property_id = new.property_id), 'epoch'::timestamptz)
  ) then
    raise exception 'A fresh server-verified nine-check report is required before bidding';
  end if;

  select property.sale_type into sale_type
  from public.properties property
  where property.id = new.property_id;

  if sale_type = 'Tax Deed' then
    select record.inputs into scenario
    from public.calculator_scenarios record
    where record.user_id = new.user_id and record.property_id = new.property_id
    order by record.updated_at desc
    limit 1;

    if scenario is null
      or coalesce((scenario->>'valueChecked')::boolean, false) is not true
      or coalesce((scenario->>'conditionChecked')::boolean, false) is not true
      or coalesce((scenario->>'titleChecked')::boolean, false) is not true
      or coalesce((scenario->>'feesChecked')::boolean, false) is not true
      or length(trim(coalesce(scenario->>'resaleSource', ''))) < 3 then
      raise exception 'A complete saved tax-deed analysis is required before bidding';
    end if;

    computed_maximum := private.calculate_tax_deed_maximum(scenario);

    if computed_maximum is null then
      raise exception 'Every bid assumption must be a finite non-negative number and resale value must be positive';
    end if;
    if new.max_bid is null or new.max_bid <= 0 or new.max_bid > computed_maximum then
      raise exception 'The stored bid exceeds the server-calculated maximum';
    end if;
  elsif sale_type = 'Tax Lien' then
    raise exception 'Tax-lien bidding remains locked until the server yield and redemption-limit calculator is available';
  else
    raise exception 'This sale type is not eligible for guided bidding';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_bid_workflow_readiness on public.bid_workflows;
create trigger enforce_bid_workflow_readiness
  before insert or update of status, max_bid, completed_steps on public.bid_workflows
  for each row execute function private.enforce_bid_workflow_readiness();

revoke all on function private.enforce_bid_workflow_readiness() from public, anon, authenticated;

-- Any evidence/input mutation invalidates prior server audits immediately,
-- including deletions that cannot be detected by comparing remaining rows.
create or replace function private.invalidate_property_verification_runs()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  affected_property_id text;
  affected_user_id uuid;
begin
  affected_property_id := case when tg_op = 'DELETE' then old.property_id else new.property_id end;
  if tg_table_name in ('property_documents', 'calculator_scenarios', 'property_tracking') then
    affected_user_id := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
    delete from public.property_verification_runs report
    where report.property_id = affected_property_id and report.user_id = affected_user_id;
  else
    delete from public.property_verification_runs report where report.property_id = affected_property_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists invalidate_verification_on_source_change on public.property_source_records;
create trigger invalidate_verification_on_source_change
  after insert or update or delete on public.property_source_records
  for each row execute function private.invalidate_property_verification_runs();
drop trigger if exists invalidate_verification_on_document_change on public.property_documents;
create trigger invalidate_verification_on_document_change
  after insert or update or delete on public.property_documents
  for each row execute function private.invalidate_property_verification_runs();
drop trigger if exists invalidate_verification_on_scenario_change on public.calculator_scenarios;
create trigger invalidate_verification_on_scenario_change
  after insert or update or delete on public.calculator_scenarios
  for each row execute function private.invalidate_property_verification_runs();
drop trigger if exists invalidate_verification_on_tracker_change on public.property_tracking;
create trigger invalidate_verification_on_tracker_change
  after insert or update or delete on public.property_tracking
  for each row execute function private.invalidate_property_verification_runs();

revoke all on function private.invalidate_property_verification_runs() from public, anon, authenticated;

-- Owner administrators use the same readiness trigger; these policies only
-- let them save their own scenario and workflow rows.
drop policy if exists "Admins add own scenarios" on public.calculator_scenarios;
create policy "Admins add own scenarios" on public.calculator_scenarios
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_admin());

drop policy if exists "Admins add own bid workflows" on public.bid_workflows;
create policy "Admins add own bid workflows" on public.bid_workflows
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_admin());

drop policy if exists "Admins update own bid workflows" on public.bid_workflows;
create policy "Admins update own bid workflows" on public.bid_workflows
  for update to authenticated
  using (user_id = (select auth.uid()) and private.is_admin())
  with check (user_id = (select auth.uid()) and private.is_admin());
