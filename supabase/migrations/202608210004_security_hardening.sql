create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and account_status = 'active'
  );
$$;

create or replace function private.has_active_membership()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and account_status = 'active'
      and (
        role = 'admin'
        or manual_access_until > now()
        or exists (
          select 1
          from public.subscriptions
          where user_id = (select auth.uid())
            and status in ('active', 'trialing')
            and current_period_end is not null
            and current_period_end > now()
        )
      )
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email, updated_at = now();
  return new;
end;
$$;

revoke all on function private.is_admin() from public, anon;
revoke all on function private.has_active_membership() from public, anon;
revoke all on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.has_active_membership() to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute procedure private.handle_new_user();

drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Users or admins read profiles" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or private.is_admin());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()) and role = 'member');

drop policy if exists "Users read own subscription" on public.subscriptions;
drop policy if exists "Admins read all subscriptions" on public.subscriptions;
create policy "Users or admins read subscriptions" on public.subscriptions
for select to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

drop policy if exists "Users manage own preferences" on public.member_preferences;
create policy "Users manage own preferences" on public.member_preferences
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Active members read properties" on public.properties;
create policy "Active members read properties" on public.properties
for select to authenticated using (private.has_active_membership());

drop policy if exists "Members manage own favorites" on public.user_favorites;
create policy "Members manage own favorites" on public.user_favorites
for all to authenticated
using (user_id = (select auth.uid()) and private.has_active_membership())
with check (user_id = (select auth.uid()) and private.has_active_membership());

drop policy if exists "Members manage own alerts" on public.user_alerts;
create policy "Members manage own alerts" on public.user_alerts
for all to authenticated
using (user_id = (select auth.uid()) and private.has_active_membership())
with check (user_id = (select auth.uid()) and private.has_active_membership());

drop policy if exists "Members manage own scenarios" on public.calculator_scenarios;
create policy "Members manage own scenarios" on public.calculator_scenarios
for all to authenticated
using (user_id = (select auth.uid()) and private.has_active_membership())
with check (user_id = (select auth.uid()) and private.has_active_membership());

drop policy if exists "Admins read source health" on public.source_health;
create policy "Admins read source health" on public.source_health
for select to authenticated using (private.is_admin());

drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log" on public.admin_audit_log
for select to authenticated using (private.is_admin());

drop policy if exists "Members manage own bid workflows" on public.bid_workflows;
drop policy if exists "Admins read bid workflows" on public.bid_workflows;
create policy "Users or admins read bid workflows" on public.bid_workflows
for select to authenticated
using (
  (user_id = (select auth.uid()) and private.has_active_membership())
  or private.is_admin()
);
create policy "Members add own bid workflows" on public.bid_workflows
for insert to authenticated
with check (user_id = (select auth.uid()) and private.has_active_membership());
create policy "Members update own bid workflows" on public.bid_workflows
for update to authenticated
using (user_id = (select auth.uid()) and private.has_active_membership())
with check (user_id = (select auth.uid()) and private.has_active_membership());
create policy "Members delete own bid workflows" on public.bid_workflows
for delete to authenticated
using (user_id = (select auth.uid()) and private.has_active_membership());

alter view public.public_auction_calendar set (security_invoker = true);

drop policy if exists "Public reads auction calendar fields" on public.properties;
create policy "Public reads auction calendar fields" on public.properties
for select to anon
using (status = 'Active' and auction_date >= current_date);

revoke all on public.properties from anon;
grant select (county, auction_date, source, source_url, status, source_verified_at)
on public.properties to anon;

create index if not exists admin_audit_log_actor_user_idx
  on public.admin_audit_log (actor_user_id, created_at desc);
create index if not exists calculator_scenarios_user_idx
  on public.calculator_scenarios (user_id);
create index if not exists calculator_scenarios_property_idx
  on public.calculator_scenarios (property_id);
create index if not exists profiles_invited_by_idx
  on public.profiles (invited_by);
create index if not exists user_alerts_user_idx
  on public.user_alerts (user_id);
create index if not exists user_favorites_property_idx
  on public.user_favorites (property_id);

drop function if exists public.handle_new_user();
drop function if exists public.has_active_membership(uuid);
drop function if exists public.is_admin(uuid);
