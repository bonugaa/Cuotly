-- Cuotly: espacios de trabajo, miembros recuperables y sincronizacion compartida.
-- Ejecuta este archivo una sola vez en Supabase > SQL Editor.

alter table public.cuotly_workspaces
  add column if not exists state jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.cuotly_members
  add column if not exists removed_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists rejoin_after timestamptz;

create index if not exists cuotly_members_workspace_email_idx
  on public.cuotly_members(workspace_id, lower(email));

create index if not exists cuotly_members_rejoin_after_idx
  on public.cuotly_members(workspace_id, rejoin_after)
  where rejoin_after is not null;
