create table if not exists public.cuotly_user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.cuotly_user_states enable row level security;

drop policy if exists cuotly_user_states_select_own on public.cuotly_user_states;
create policy cuotly_user_states_select_own on public.cuotly_user_states
for select using (user_id = auth.uid());

drop policy if exists cuotly_user_states_insert_own on public.cuotly_user_states;
create policy cuotly_user_states_insert_own on public.cuotly_user_states
for insert with check (user_id = auth.uid());

drop policy if exists cuotly_user_states_update_own on public.cuotly_user_states;
create policy cuotly_user_states_update_own on public.cuotly_user_states
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists cuotly_user_states_delete_own on public.cuotly_user_states;
create policy cuotly_user_states_delete_own on public.cuotly_user_states
for delete using (user_id = auth.uid());
