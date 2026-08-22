alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended')),
  add column if not exists manual_access_until timestamptz,
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_account_status_idx on public.profiles (account_status);

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
      and account_status = 'active'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

create or replace function public.has_active_membership(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and account_status = 'active'
      and (
        role = 'admin'
        or manual_access_until > now()
        or exists (
          select 1
          from public.subscriptions
          where user_id = check_user_id
            and status in ('active', 'trialing')
            and current_period_end is not null
            and current_period_end > now()
        )
      )
  );
$$;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in (
    'customer_invited',
    'customer_updated',
    'password_reset_sent',
    'customer_deleted'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_user_idx
  on public.admin_audit_log (target_user_id, created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
on public.profiles for select to authenticated
using (public.is_admin());

drop policy if exists "Admins read all subscriptions" on public.subscriptions;
create policy "Admins read all subscriptions"
on public.subscriptions for select to authenticated
using (public.is_admin());

drop policy if exists "Admins read source health" on public.source_health;
create policy "Admins read source health"
on public.source_health for select to authenticated
using (public.is_admin());

drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log"
on public.admin_audit_log for select to authenticated
using (public.is_admin());

revoke all on public.admin_audit_log from anon;
grant select on public.admin_audit_log to authenticated;
