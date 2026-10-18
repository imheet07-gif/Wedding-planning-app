-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('editor','viewer'))
);

-- First person to sign up becomes an editor; everyone after is a viewer until promoted.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email,
    case when exists (select 1 from profiles) then 'viewer' else 'editor' end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create function is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'editor')
$$;

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  start_time text,
  venue text,
  notes text,
  sort_order int not null default 0
);

-- One row = one invitee entry. A family can be a single row with headcount 5,
-- and a rough placeholder ("Bride's college friends, approx") works too.
create table guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  side text not null default 'bride' check (side in ('bride','groom','both')),
  grp text,
  headcount int not null default 1 check (headcount >= 1),
  phone text,
  diet text,
  notes text,
  created_at timestamptz not null default now()
);

-- Row present = invited to that event.
create table invitations (
  guest_id uuid not null references guests on delete cascade,
  event_id uuid not null references events on delete cascade,
  rsvp text not null default 'pending' check (rsvp in ('pending','yes','no')),
  primary key (guest_id, event_id)
);

alter table profiles enable row level security;
alter table events enable row level security;
alter table guests enable row level security;
alter table invitations enable row level security;

create policy "read profiles" on profiles for select to authenticated using (true);
create policy "editors change roles" on profiles for update to authenticated
  using (is_editor()) with check (is_editor());

create policy "read events" on events for select to authenticated using (true);
create policy "write events" on events for all to authenticated
  using (is_editor()) with check (is_editor());
create policy "read guests" on guests for select to authenticated using (true);
create policy "write guests" on guests for all to authenticated
  using (is_editor()) with check (is_editor());
create policy "read invitations" on invitations for select to authenticated using (true);
create policy "write invitations" on invitations for all to authenticated
  using (is_editor()) with check (is_editor());

insert into events (name, sort_order) values
  ('Haldi', 1), ('Mehendi', 2), ('Sangeet', 3), ('Mameru', 4), ('Wedding Day', 5);
