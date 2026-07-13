create extension if not exists pgcrypto;

create table if not exists public.cuotly_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Cuotly',
  iva_rate numeric(6,2) not null default 21,
  irpf_rate numeric(6,2) not null default 15,
  payment_grace_days integer not null default 3,
  payment_grace_hours integer not null default 12,
  cancel_notice_workdays integer not null default 3,
  workdays integer[] not null default '{1,2,3,4,5,6}',
  created_at timestamptz not null default now()
);

create table if not exists public.cuotly_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('owner','admin','worker')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(workspace_id, email)
);

create table if not exists public.cuotly_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null check (role in ('admin','worker')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(workspace_id, email)
);

create table if not exists public.cuotly_restaurants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  notes text,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cuotly_services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  restaurant_id uuid not null references public.cuotly_restaurants(id) on delete cascade,
  plan_code text not null check (plan_code in ('presencia','impulso','premium','menu')),
  start_date date not null,
  commitment_months integer not null default 1 check (commitment_months in (1,3,6,9,12)),
  monthly_base numeric(12,2) not null,
  status text not null default 'active' check (status in ('active','late','suspended','cancelled')),
  auto_renew boolean not null default true,
  cancel_at_end boolean not null default false,
  assigned_user_id uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cuotly_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  restaurant_id uuid not null references public.cuotly_restaurants(id) on delete cascade,
  service_id uuid not null references public.cuotly_services(id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('small','medium','large','section','photos','calls','incidents','menu_update')),
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'requested' check (status in ('requested','assigned','in_progress','waiting','completed','cancelled')),
  priority text not null default 'normal' check (priority in ('normal','high')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.cuotly_payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  restaurant_id uuid not null references public.cuotly_restaurants(id) on delete cascade,
  service_id uuid not null references public.cuotly_services(id) on delete cascade,
  cycle_start date not null,
  cycle_end date not null,
  due_date date not null,
  base_amount numeric(12,2) not null default 0,
  iva_amount numeric(12,2) not null default 0,
  irpf_amount numeric(12,2) not null default 0,
  invoice_total numeric(12,2) not null default 0,
  received_amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','late','paid','suspended')),
  method text,
  notes text,
  paid_at timestamptz,
  sent_to_fiometra boolean not null default false,
  created_at timestamptz not null default now(),
  unique(service_id, cycle_start)
);

create table if not exists public.cuotly_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  restaurant_id uuid not null references public.cuotly_restaurants(id) on delete cascade,
  month text not null,
  status text not null default 'ready' check (status in ('draft','ready')),
  summary text,
  data jsonb not null default '{}'::jsonb,
  file_path text,
  generated_at timestamptz not null default now(),
  unique(restaurant_id, month)
);

create table if not exists public.cuotly_holidays (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  date date not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique(workspace_id, date)
);

create table if not exists public.cuotly_reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.cuotly_workspaces(id) on delete cascade,
  restaurant_id uuid references public.cuotly_restaurants(id) on delete cascade,
  service_id uuid references public.cuotly_services(id) on delete cascade,
  type text not null,
  due_at timestamptz,
  notes text,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cuotly_user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.cuotly_role(p_workspace_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $function$
  select m.role
  from public.cuotly_members m
  where m.workspace_id = p_workspace_id
    and m.user_id = auth.uid()
    and m.active = true
  order by case m.role when 'owner' then 1 when 'admin' then 2 else 3 end
  limit 1
$function$;

create or replace function public.cuotly_can_view_workspace(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $function$
  select exists (
    select 1
    from public.cuotly_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
      and m.active = true
  )
$function$;

create or replace function public.cuotly_can_manage_workspace(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $function$
  select public.cuotly_role(p_workspace_id) in ('owner','admin')
$function$;

create or replace function public.cuotly_can_access_service(p_service_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $function$
  select exists (
    select 1
    from public.cuotly_services s
    where s.id = p_service_id
      and (
        public.cuotly_can_manage_workspace(s.workspace_id)
        or s.assigned_user_id = auth.uid()
      )
  )
$function$;

create or replace function public.cuotly_bootstrap_workspace(p_name text default 'Cuotly')
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  workspace_id uuid;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select w.id into workspace_id
  from public.cuotly_workspaces w
  join public.cuotly_members m on m.workspace_id = w.id
  where m.user_id = auth.uid()
    and m.active = true
  order by w.created_at
  limit 1;

  if workspace_id is not null then
    return workspace_id;
  end if;

  insert into public.cuotly_workspaces(owner_id, name)
  values (auth.uid(), coalesce(nullif(p_name, ''), 'Cuotly'))
  returning id into workspace_id;

  select email into user_email from auth.users where id = auth.uid();

  insert into public.cuotly_members(workspace_id, user_id, email, name, role)
  values (workspace_id, auth.uid(), coalesce(user_email, ''), coalesce(user_email, 'Propietario'), 'owner');

  return workspace_id;
end
$function$;

create or replace function public.cuotly_claim_invitation()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  user_email text;
  invitation record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into user_email from auth.users where id = auth.uid();

  for invitation in
    select *
    from public.cuotly_invitations
    where lower(email) = lower(user_email)
      and accepted_at is null
  loop
    insert into public.cuotly_members(workspace_id, user_id, email, name, role)
    values (invitation.workspace_id, auth.uid(), invitation.email, coalesce(nullif(invitation.name, ''), invitation.email), invitation.role)
    on conflict (workspace_id, email) do update
      set user_id = excluded.user_id,
          role = excluded.role,
          active = true;

    update public.cuotly_invitations
    set accepted_at = now()
    where id = invitation.id;
  end loop;
end
$function$;

alter table public.cuotly_workspaces enable row level security;
alter table public.cuotly_members enable row level security;
alter table public.cuotly_invitations enable row level security;
alter table public.cuotly_restaurants enable row level security;
alter table public.cuotly_services enable row level security;
alter table public.cuotly_tasks enable row level security;
alter table public.cuotly_payments enable row level security;
alter table public.cuotly_reports enable row level security;
alter table public.cuotly_holidays enable row level security;
alter table public.cuotly_reminders enable row level security;
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

drop policy if exists cuotly_workspaces_select on public.cuotly_workspaces;
create policy cuotly_workspaces_select on public.cuotly_workspaces
for select using (public.cuotly_can_view_workspace(id));

drop policy if exists cuotly_workspaces_update on public.cuotly_workspaces;
create policy cuotly_workspaces_update on public.cuotly_workspaces
for update using (public.cuotly_can_manage_workspace(id))
with check (public.cuotly_can_manage_workspace(id));

drop policy if exists cuotly_members_select on public.cuotly_members;
create policy cuotly_members_select on public.cuotly_members
for select using (public.cuotly_can_view_workspace(workspace_id));

drop policy if exists cuotly_members_manage on public.cuotly_members;
create policy cuotly_members_manage on public.cuotly_members
for all using (public.cuotly_can_manage_workspace(workspace_id))
with check (public.cuotly_can_manage_workspace(workspace_id));

drop policy if exists cuotly_invitations_manage on public.cuotly_invitations;
create policy cuotly_invitations_manage on public.cuotly_invitations
for all using (public.cuotly_can_manage_workspace(workspace_id))
with check (public.cuotly_can_manage_workspace(workspace_id));

drop policy if exists cuotly_restaurants_select on public.cuotly_restaurants;
create policy cuotly_restaurants_select on public.cuotly_restaurants
for select using (
  public.cuotly_can_manage_workspace(workspace_id)
  or exists (
    select 1
    from public.cuotly_services s
    where s.restaurant_id = id
      and s.assigned_user_id = auth.uid()
  )
);

drop policy if exists cuotly_restaurants_manage on public.cuotly_restaurants;
create policy cuotly_restaurants_manage on public.cuotly_restaurants
for all using (public.cuotly_can_manage_workspace(workspace_id))
with check (public.cuotly_can_manage_workspace(workspace_id));

drop policy if exists cuotly_services_select on public.cuotly_services;
create policy cuotly_services_select on public.cuotly_services
for select using (public.cuotly_can_manage_workspace(workspace_id) or assigned_user_id = auth.uid());

drop policy if exists cuotly_services_manage on public.cuotly_services;
create policy cuotly_services_manage on public.cuotly_services
for all using (public.cuotly_can_manage_workspace(workspace_id))
with check (public.cuotly_can_manage_workspace(workspace_id));

drop policy if exists cuotly_tasks_select on public.cuotly_tasks;
create policy cuotly_tasks_select on public.cuotly_tasks
for select using (public.cuotly_can_manage_workspace(workspace_id) or public.cuotly_can_access_service(service_id));

drop policy if exists cuotly_tasks_insert on public.cuotly_tasks;
create policy cuotly_tasks_insert on public.cuotly_tasks
for insert with check (public.cuotly_can_manage_workspace(workspace_id) or public.cuotly_can_access_service(service_id));

drop policy if exists cuotly_tasks_update on public.cuotly_tasks;
create policy cuotly_tasks_update on public.cuotly_tasks
for update using (public.cuotly_can_manage_workspace(workspace_id) or assigned_user_id = auth.uid())
with check (public.cuotly_can_manage_workspace(workspace_id) or assigned_user_id = auth.uid());

drop policy if exists cuotly_tasks_delete on public.cuotly_tasks;
create policy cuotly_tasks_delete on public.cuotly_tasks
for delete using (public.cuotly_can_manage_workspace(workspace_id) or assigned_user_id = auth.uid());

drop policy if exists cuotly_payments_select on public.cuotly_payments;
create policy cuotly_payments_select on public.cuotly_payments
for select using (public.cuotly_can_manage_workspace(workspace_id));

drop policy if exists cuotly_payments_manage on public.cuotly_payments;
create policy cuotly_payments_manage on public.cuotly_payments
for all using (public.cuotly_can_manage_workspace(workspace_id))
with check (public.cuotly_can_manage_workspace(workspace_id));

drop policy if exists cuotly_reports_select on public.cuotly_reports;
create policy cuotly_reports_select on public.cuotly_reports
for select using (
  public.cuotly_can_manage_workspace(workspace_id)
  or exists (
    select 1
    from public.cuotly_services s
    where s.restaurant_id = cuotly_reports.restaurant_id
      and s.assigned_user_id = auth.uid()
  )
);

drop policy if exists cuotly_reports_manage on public.cuotly_reports;
create policy cuotly_reports_manage on public.cuotly_reports
for all using (public.cuotly_can_manage_workspace(workspace_id))
with check (public.cuotly_can_manage_workspace(workspace_id));

drop policy if exists cuotly_holidays_manage on public.cuotly_holidays;
create policy cuotly_holidays_manage on public.cuotly_holidays
for all using (public.cuotly_can_manage_workspace(workspace_id))
with check (public.cuotly_can_manage_workspace(workspace_id));

drop policy if exists cuotly_reminders_select on public.cuotly_reminders;
create policy cuotly_reminders_select on public.cuotly_reminders
for select using (public.cuotly_can_view_workspace(workspace_id));

drop policy if exists cuotly_reminders_manage on public.cuotly_reminders;
create policy cuotly_reminders_manage on public.cuotly_reminders
for all using (public.cuotly_can_manage_workspace(workspace_id))
with check (public.cuotly_can_manage_workspace(workspace_id));

create index if not exists cuotly_members_workspace_idx on public.cuotly_members(workspace_id, user_id);
create index if not exists cuotly_restaurants_workspace_idx on public.cuotly_restaurants(workspace_id, name);
create index if not exists cuotly_services_workspace_idx on public.cuotly_services(workspace_id, restaurant_id, assigned_user_id);
create index if not exists cuotly_tasks_service_idx on public.cuotly_tasks(workspace_id, service_id, status);
create index if not exists cuotly_payments_due_idx on public.cuotly_payments(workspace_id, due_date, status);
create index if not exists cuotly_reports_month_idx on public.cuotly_reports(workspace_id, month);
