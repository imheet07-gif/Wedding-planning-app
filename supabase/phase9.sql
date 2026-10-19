-- Phase 9: optional Gujarati and Hindi spellings of each guest's name, used in invitations written in that language.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to run more than once.

alter table guests add column if not exists name_gu text;
alter table guests add column if not exists name_hi text;
