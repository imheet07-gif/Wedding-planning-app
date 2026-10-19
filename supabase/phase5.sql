-- Phase 5: per-person settings (text size follows you to any device you sign in on).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Needs schema.sql and access.sql to have been run first.

create table user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  text_size text not null default '100%' check (text_size in ('100%', '118%', '135%')),
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;

-- Each person can read and change only their own row.
create policy "read own settings" on user_settings for select to authenticated
  using (user_id = auth.uid());
create policy "insert own settings" on user_settings for insert to authenticated
  with check (user_id = auth.uid() and is_member());
create policy "update own settings" on user_settings for update to authenticated
  using (user_id = auth.uid() and is_member()) with check (user_id = auth.uid() and is_member());
