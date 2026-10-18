-- Access control: new sign-ups can see nothing until an editor approves them.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Needs schema.sql and phase2.sql to have been run first. Existing editors and viewers keep their access.

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('editor','viewer','pending'));
alter table profiles alter column role set default 'pending';

-- First person to sign up is the editor; everyone after waits for approval.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email,
    case when exists (select 1 from profiles) then 'pending' else 'editor' end);
  return new;
end $$;

create function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('editor','viewer'))
$$;

-- Reads now need an approved role. Writes were already editor-only.
do $$
declare t text;
begin
  foreach t in array array[
    'events','guests','invitations',
    'vendors','vendor_events','payments','budget_categories','expenses'
  ] loop
    execute format('drop policy "read %s" on %I', t, t);
    execute format('create policy "read %s" on %I for select to authenticated using (is_member())', t, t);
  end loop;
end $$;

-- Everyone can read their own profile (to see they are waiting); approved members see all.
drop policy "read profiles" on profiles;
create policy "read profiles" on profiles for select to authenticated
  using (id = auth.uid() or is_member());
