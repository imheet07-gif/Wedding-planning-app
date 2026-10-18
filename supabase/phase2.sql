-- Phase 2: vendors, payments and budget. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Needs schema.sql (phase 1) to have been run first.

create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  contact_name text,
  phone text,
  email text,
  status text not null default 'shortlisted' check (status in ('shortlisted','booked','completed')),
  quote numeric(12,2) not null default 0 check (quote >= 0),
  notes text,
  created_at timestamptz not null default now()
);

-- Which events a vendor works on.
create table vendor_events (
  vendor_id uuid not null references vendors on delete cascade,
  event_id uuid not null references events on delete cascade,
  primary key (vendor_id, event_id)
);

-- One row per instalment. paid_on is null until it is paid.
create table payments (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  label text,
  due_on date,
  paid_on date
);

-- Planned amount per category (category names match the vendor categories).
create table budget_categories (
  category text primary key,
  planned numeric(12,2) not null default 0 check (planned >= 0)
);

-- Costs that are not tied to a vendor: outfits, gifts, shagun and so on.
create table expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  paid boolean not null default false,
  event_id uuid references events on delete set null,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['vendors','vendor_events','payments','budget_categories','expenses'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "read %1$s" on %1$I for select to authenticated using (true)', t);
    execute format('create policy "write %1$s" on %1$I for all to authenticated using (is_editor()) with check (is_editor())', t);
  end loop;
end $$;
