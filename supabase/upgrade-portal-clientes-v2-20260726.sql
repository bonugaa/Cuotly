-- Cuotly: archivos privados y auditoria de analisis con IA.
-- Ejecuta este archivo despues de upgrade-portal-clientes-20260726.sql.

create table if not exists public.cuotly_ai_usage (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.cuotly_workspaces(id) on delete cascade,
  portal_id uuid references public.cuotly_client_portals(id) on delete cascade,
  restaurant_id text,
  service_id text,
  user_id uuid references auth.users(id) on delete set null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  requested_at timestamptz not null default now()
);

create index if not exists cuotly_ai_usage_workspace_requested_idx
  on public.cuotly_ai_usage(workspace_id, requested_at desc);

alter table public.cuotly_ai_usage enable row level security;

-- Los ficheros se almacenan privados. Solo las API de Vercel crean URLs temporales
-- despues de comprobar que el usuario pertenece al restaurante o a su mantenimiento.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cuotly-client-files',
  'cuotly-client-files',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

