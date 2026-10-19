-- Phase 6: storage for the couple photo shown on the dashboard.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Needs schema.sql and access.sql (for is_editor) to have been run first.
-- The names and crop are kept in app_settings, which already exists.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couple', 'couple', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "couple read" on storage.objects for select using (bucket_id = 'couple');
create policy "couple upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'couple' and is_editor());
create policy "couple update" on storage.objects for update to authenticated
  using (bucket_id = 'couple' and is_editor()) with check (bucket_id = 'couple' and is_editor());
create policy "couple delete" on storage.objects for delete to authenticated
  using (bucket_id = 'couple' and is_editor());
