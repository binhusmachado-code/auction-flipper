create table if not exists public.bid_workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null,
  property_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'researching' check (status in (
    'researching', 'ready', 'official_bid_submitted', 'won', 'lost', 'payment_due', 'paid', 'closed'
  )),
  max_bid numeric,
  estimated_deposit numeric,
  completed_steps jsonb not null default '{}'::jsonb,
  official_bid_reference text,
  payment_deadline timestamptz,
  payment_confirmation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create index if not exists bid_workflows_user_updated_idx
  on public.bid_workflows (user_id, updated_at desc);

alter table public.bid_workflows enable row level security;

drop policy if exists "Members manage own bid workflows" on public.bid_workflows;
create policy "Members manage own bid workflows" on public.bid_workflows
for all to authenticated
using (user_id = auth.uid() and public.has_active_membership())
with check (user_id = auth.uid() and public.has_active_membership());

drop policy if exists "Admins read bid workflows" on public.bid_workflows;
create policy "Admins read bid workflows" on public.bid_workflows
for select to authenticated using (public.is_admin());

revoke all on public.bid_workflows from anon;
grant select, insert, update, delete on public.bid_workflows to authenticated;
