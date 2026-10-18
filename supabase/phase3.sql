-- Phase 3: accommodation, tasks, printable lists and WhatsApp invites.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Needs schema.sql, phase2.sql and access.sql to have been run first.

-- WhatsApp invites: message and optional image/PDF per event, and a "sent" mark per guest.
alter table events add column invite_text text, add column invite_media_url text;
alter table invitations add column sent_at timestamptz;

create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  notes text
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties on delete cascade,
  name text not null,
  capacity int not null default 2 check (capacity >= 1),
  notes text
);

-- One row per guest entry (a family counts as one) that needs accommodation.
create table stays (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique references guests on delete cascade,
  room_id uuid references rooms on delete set null,
  people int not null default 1 check (people >= 1),
  check_in date,
  check_out date,
  notes text,
  check (check_out is null or check_in is null or check_out >= check_in)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_on date,
  done boolean not null default false,
  assignee text,
  notes text,
  created_at timestamptz not null default now()
);

create table app_settings (
  key text primary key,
  value text not null
);
insert into app_settings (key, value) values ('country_code', '91');

do $$
declare t text;
begin
  foreach t in array array['properties','rooms','stays','tasks','app_settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "read %s" on %I for select to authenticated using (is_member())', t, t);
    execute format('create policy "write %s" on %I for all to authenticated using (is_editor()) with check (is_editor())', t, t);
  end loop;
end $$;

-- Invite images and PDFs. The bucket is public so the link in a WhatsApp message opens for guests.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invites', 'invites', true, 10485760,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy "invites read" on storage.objects for select using (bucket_id = 'invites');
create policy "invites upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'invites' and is_editor());
create policy "invites update" on storage.objects for update to authenticated
  using (bucket_id = 'invites' and is_editor()) with check (bucket_id = 'invites' and is_editor());
create policy "invites delete" on storage.objects for delete to authenticated
  using (bucket_id = 'invites' and is_editor());
