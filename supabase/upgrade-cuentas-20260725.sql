-- Cuotly: cuentas personales, invitaciones aceptadas y avatares.
-- Ejecuta este archivo UNA vez en Supabase > SQL Editor.

alter table public.cuotly_invitations
  add column if not exists status text not null default 'pending',
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists responded_at timestamptz,
  add column if not exists rejected_at timestamptz;

alter table public.cuotly_invitations
  drop constraint if exists cuotly_invitations_status_check;
alter table public.cuotly_invitations
  add constraint cuotly_invitations_status_check check (status in ('pending', 'accepted', 'rejected', 'cancelled'));

-- Las invitaciones antiguas que ya se aceptaron conservan su estado correcto.
update public.cuotly_invitations
set status = case when accepted_at is not null then 'accepted' else 'pending' end
where status is null or status not in ('pending', 'accepted', 'rejected', 'cancelled');

create index if not exists cuotly_invitations_email_status_idx
  on public.cuotly_invitations(lower(email), status, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cuotly-avatars', 'cuotly-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists cuotly_avatars_upload_own on storage.objects;
create policy cuotly_avatars_upload_own on storage.objects
for insert to authenticated
with check (bucket_id = 'cuotly-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cuotly_avatars_update_own on storage.objects;
create policy cuotly_avatars_update_own on storage.objects
for update to authenticated
using (bucket_id = 'cuotly-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'cuotly-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cuotly_avatars_delete_own on storage.objects;
create policy cuotly_avatars_delete_own on storage.objects
for delete to authenticated
using (bucket_id = 'cuotly-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cuotly_avatars_read_public on storage.objects;
create policy cuotly_avatars_read_public on storage.objects
for select to public using (bucket_id = 'cuotly-avatars');
