-- Phase 8: a Google Maps link for each event's venue.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run more than once.

alter table events add column if not exists map_url text;
