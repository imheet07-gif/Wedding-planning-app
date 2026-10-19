-- Phase 7: Gujarati and Hindi invitation messages.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run more than once.
-- The family sign-off names and the "send in" choice are kept in app_settings, which already exists.

alter table events
  add column if not exists invite_text_gu text,
  add column if not exists invite_text_hi text;
