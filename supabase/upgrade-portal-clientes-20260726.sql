-- Cuotly: portales privados para restaurantes y solicitudes de mantenimiento.
-- Ejecuta este archivo UNA sola vez en Supabase > SQL Editor, despues de los upgrades anteriores.
-- Los datos se exponen exclusivamente a traves de las API de Cuotly con validacion de usuario.

create table if not exists public.cuotly_client_portals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  restaurant_id text not null,
  public_url text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'deleted')),
  allow_admin_access boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, restaurant_id)
);

create table if not exists public.cuotly_client_members (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.cuotly_client_portals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text not null default '',
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  active boolean not null default true,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(portal_id, email)
);

create table if not exists public.cuotly_client_invitations (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.cuotly_client_portals(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique(portal_id, email)
);

create table if not exists public.cuotly_client_requests (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.cuotly_client_portals(id) on delete cascade,
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  restaurant_id text not null,
  service_id text,
  task_id text,
  title text not null,
  description text not null default '',
  kind text not null default 'change' check (kind in ('change', 'incident', 'pause', 'cancellation', 'extra_package', 'restaurant_link')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'in_progress', 'waiting', 'completed', 'cancelled', 'rejected')),
  proposed_allocations jsonb not null default '[]'::jsonb,
  selected_allocations jsonb not null default '[]'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  credits_consumed boolean not null default false,
  rejection_reason text,
  requested_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.cuotly_client_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cuotly_client_requests(id) on delete cascade,
  side text not null check (side in ('restaurant', 'maintenance')),
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cuotly_client_activity (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.cuotly_client_portals(id) on delete cascade,
  request_id uuid references public.cuotly_client_requests(id) on delete cascade,
  event_type text not null,
  side text not null check (side in ('restaurant', 'maintenance', 'system')),
  detail jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cuotly_client_notifications (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.cuotly_client_portals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cuotly_client_link_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  source_portal_id uuid references public.cuotly_client_portals(id) on delete set null,
  target_portal_id uuid references public.cuotly_client_portals(id) on delete set null,
  workspace_id uuid references public.cuotly_workspaces(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists cuotly_client_portals_workspace_restaurant_idx
  on public.cuotly_client_portals(workspace_id, restaurant_id);
create index if not exists cuotly_client_members_user_active_idx
  on public.cuotly_client_members(user_id, active);
create index if not exists cuotly_client_requests_portal_status_idx
  on public.cuotly_client_requests(portal_id, status, requested_at desc);
create index if not exists cuotly_client_messages_request_created_idx
  on public.cuotly_client_messages(request_id, created_at);
create index if not exists cuotly_client_notifications_user_created_idx
  on public.cuotly_client_notifications(user_id, created_at desc);

alter table public.cuotly_client_portals enable row level security;
alter table public.cuotly_client_members enable row level security;
alter table public.cuotly_client_invitations enable row level security;
alter table public.cuotly_client_requests enable row level security;
alter table public.cuotly_client_messages enable row level security;
alter table public.cuotly_client_activity enable row level security;
alter table public.cuotly_client_notifications enable row level security;
alter table public.cuotly_client_link_requests enable row level security;

-- No se crean politicas de acceso directo: el navegador nunca consulta estas tablas.
-- Las API de Vercel usan la service role y comprueban cada membresia antes de responder.
