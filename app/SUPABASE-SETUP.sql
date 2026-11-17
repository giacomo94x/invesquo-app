-- Finholdra 10.1.0 cloud storage per authenticated user.
-- Execute once in Supabase SQL Editor. Never expose a service_role key to browser.
create table if not exists public.finholdra_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint finholdra_payload_size check (pg_column_size(payload) < 26214400)
);

alter table public.finholdra_backups enable row level security;
revoke all on public.finholdra_backups from anon;
grant select, insert, update, delete on public.finholdra_backups to authenticated;

create policy "Read own Finholdra backup" on public.finholdra_backups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own Finholdra backup" on public.finholdra_backups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own Finholdra backup" on public.finholdra_backups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Delete own Finholdra backup" on public.finholdra_backups
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Security boundary: every operation is restricted to its auth.uid() by RLS.
-- Database compare-and-swap is achieved by the client's conditional UPDATE
-- WHERE user_id=auth.uid() AND revision=<last observed revision>.
