-- Cuotly: planes de mantenimiento 2026-07-25
-- La app conserva su estado compartido en cuotly_user_states. Este ajuste mantiene
-- las tablas normalizadas preparadas para futuras consultas e integraciones.

alter table public.cuotly_services
  alter column commitment_months set default 3;

alter table public.cuotly_services
  drop constraint if exists cuotly_services_commitment_months_check;

alter table public.cuotly_services
  add constraint cuotly_services_commitment_months_check
  check (commitment_months >= 1);

alter table public.cuotly_services
  drop constraint if exists cuotly_services_status_check;

alter table public.cuotly_services
  add constraint cuotly_services_status_check
  check (status in ('pending','active','paused','late','suspended','cancelled'));

alter table public.cuotly_services
  add column if not exists initial_commitment_months integer not null default 3,
  add column if not exists commitment_start_date date,
  add column if not exists cycle_start_date date,
  add column if not exists cycle_end_date date,
  add column if not exists cycle_index integer not null default 1,
  add column if not exists paused_at timestamptz,
  add column if not exists pause_history jsonb not null default '[]'::jsonb,
  add column if not exists extra_credits jsonb not null default '[]'::jsonb,
  add column if not exists pending_plan_change jsonb,
  add column if not exists cancel_effective_at date,
  add column if not exists cancel_reason text;

alter table public.cuotly_tasks
  drop constraint if exists cuotly_tasks_type_check;

alter table public.cuotly_tasks
  add constraint cuotly_tasks_type_check
  check (type in ('small','medium','large','photos','external_incident','review','backup','seo','suggestion','incident','menu_update'));

alter table public.cuotly_tasks
  add column if not exists consumes_quota boolean not null default true,
  add column if not exists reserved_at timestamptz,
  add column if not exists menu_meta jsonb not null default '{}'::jsonb,
  add column if not exists auto_key text;

alter table public.cuotly_payments
  drop constraint if exists cuotly_payments_status_check;

alter table public.cuotly_payments
  add constraint cuotly_payments_status_check
  check (status in ('pending','late','paid','suspended','cancelled'));

alter table public.cuotly_payments
  add column if not exists kind text not null default 'subscription',
  add column if not exists extra_credit_id text;

create index if not exists cuotly_tasks_auto_key_idx
  on public.cuotly_tasks(workspace_id, service_id, auto_key);

