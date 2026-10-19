-- Phase 4: remember when each guest was last called, and a short note from the call.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Needs schema.sql to have been run. Existing access rules already cover these columns.

alter table guests add column last_called_at timestamptz, add column call_note text;
