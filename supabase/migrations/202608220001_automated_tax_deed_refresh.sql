create or replace function public.sync_tax_deed_inventory(records jsonb, source_metadata jsonb)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  imported_count integer;
  removed_count integer;
begin
  if jsonb_typeof(records) <> 'array' or jsonb_array_length(records) < 100 then
    raise exception 'Inventory payload failed the minimum-count check';
  end if;

  insert into public.properties
  select *
  from jsonb_populate_recordset(null::public.properties, records)
  on conflict (id) do update set
    address = excluded.address,
    city = excluded.city,
    state = excluded.state,
    zip = excluded.zip,
    county = excluded.county,
    price = excluded.price,
    opening_bid = excluded.opening_bid,
    deposit_required = excluded.deposit_required,
    assessed_value = excluded.assessed_value,
    estimated_value = excluded.estimated_value,
    valuation_verified = excluded.valuation_verified,
    property_type = excluded.property_type,
    auction_type = excluded.auction_type,
    sale_type = excluded.sale_type,
    auction_date = excluded.auction_date,
    case_number = excluded.case_number,
    parcel_id = excluded.parcel_id,
    owner_name = excluded.owner_name,
    source = excluded.source,
    source_url = excluded.source_url,
    description = excluded.description,
    image_url = excluded.image_url,
    images = excluded.images,
    status = excluded.status,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    beds = excluded.beds,
    baths = excluded.baths,
    sqft = excluded.sqft,
    lot_size = excluded.lot_size,
    year_built = excluded.year_built,
    days_on_market = excluded.days_on_market,
    rehab_estimate = excluded.rehab_estimate,
    arv = excluded.arv,
    notes = excluded.notes,
    tax_amount = excluded.tax_amount,
    interest_rate = excluded.interest_rate,
    redemption_period = excluded.redemption_period,
    delinquent_years = excluded.delinquent_years,
    source_hash = excluded.source_hash,
    source_verified_at = coalesce(excluded.source_verified_at, public.properties.source_verified_at),
    updated_at = excluded.updated_at;

  get diagnostics imported_count = row_count;

  update public.properties property
  set status = 'Removed', updated_at = now()
  where property.sale_type = 'Tax Deed'
    and property.county in (
      select source_row.value->>'county'
      from jsonb_array_elements(source_metadata->'sources') as source_row(value)
      where source_row.value->>'status' = 'verified'
    )
    and not exists (
      select 1 from jsonb_array_elements(records) record
      where record->>'id' = property.id
    );

  get diagnostics removed_count = row_count;

  insert into public.source_health (
    source_id, county, status, record_count, last_attempt_at, last_success_at, error_message, updated_at
  )
  select
    lower(replace(source_row.value->>'county', ' ', '-')) || '-tax-deeds',
    source_row.value->>'county',
    case when source_row.value->>'status' = 'verified' then 'live' else 'stale' end,
    (source_row.value->>'count')::integer,
    now(),
    case when source_row.value->>'status' = 'verified' then now() else null end,
    case when source_row.value->>'status' = 'verified' then null
      else 'Retained last verified snapshot; the current auction vendor does not authorize automated commercial republication.'
    end,
    now()
  from jsonb_array_elements(source_metadata->'sources') as source_row(value)
  on conflict (source_id) do update set
    county = excluded.county,
    status = excluded.status,
    record_count = excluded.record_count,
    last_attempt_at = excluded.last_attempt_at,
    last_success_at = coalesce(excluded.last_success_at, public.source_health.last_success_at),
    error_message = excluded.error_message,
    updated_at = excluded.updated_at;

  delete from public.source_health where source_id in ('brevard', 'broward', 'gulf', 'suwannee');

  return jsonb_build_object('imported', imported_count, 'removed', removed_count);
end;
$$;

revoke all on function public.sync_tax_deed_inventory(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_tax_deed_inventory(jsonb, jsonb) to service_role;
