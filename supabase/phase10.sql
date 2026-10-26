-- Phase 10: "Not inviting". A guest with no row for an event is undecided about it; a row in event_skips means
-- you decided not to invite them to it; a row in invitations means they are invited.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run more than once.

create table if not exists event_skips (
  guest_id uuid not null references guests on delete cascade,
  event_id uuid not null references events on delete cascade,
  primary key (guest_id, event_id)
);

alter table event_skips enable row level security;

drop policy if exists "read event_skips" on event_skips;
create policy "read event_skips" on event_skips for select to authenticated using (is_member());
drop policy if exists "write event_skips" on event_skips;
create policy "write event_skips" on event_skips for all to authenticated
  using (is_editor()) with check (is_editor());

-- Inviting someone clears any earlier "not inviting", whichever screen or sync did the inviting.
create or replace function clear_skip_on_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from event_skips where guest_id = new.guest_id and event_id = new.event_id;
  return new;
end $$;

drop trigger if exists clear_skip_on_invite on invitations;
create trigger clear_skip_on_invite after insert on invitations
  for each row execute function clear_skip_on_invite();
