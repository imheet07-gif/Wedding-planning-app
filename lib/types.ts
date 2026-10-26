export type Role = "editor" | "viewer" | "pending";
export type Side = "bride" | "groom" | "both";
export type Rsvp = "pending" | "yes" | "no";

export type WeddingEvent = {
  id: string;
  name: string;
  event_date: string | null;
  start_time: string | null;
  venue: string | null;
  map_url: string | null;
  notes: string | null;
  sort_order: number;
  invite_text: string | null;
  invite_text_gu: string | null;
  invite_text_hi: string | null;
  invite_media_url: string | null;
};

export type Guest = {
  id: string;
  name: string;
  name_gu: string | null;
  name_hi: string | null;
  side: Side;
  grp: string | null;
  headcount: number;
  phone: string | null;
  diet: string | null;
  notes: string | null;
  last_called_at: string | null;
  call_note: string | null;
};

export type EventSkip = { guest_id: string; event_id: string }; // decided not to invite
export type Invitation = { guest_id: string; event_id: string; rsvp: Rsvp; sent_at: string | null };
export type Profile = { id: string; email: string; role: Role };

export type VendorStatus = "shortlisted" | "booked" | "completed";

export type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  status: VendorStatus;
  quote: number;
  notes: string | null;
};

export type VendorEvent = { vendor_id: string; event_id: string };

export type Payment = {
  id: string;
  vendor_id: string;
  amount: number;
  label: string | null;
  due_on: string | null;
  paid_on: string | null;
};

export type BudgetCategory = { category: string; planned: number };

export type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  paid: boolean;
  event_id: string | null;
};

export type Property = { id: string; name: string; address: string | null; notes: string | null };
export type Room = { id: string; property_id: string; name: string; capacity: number; notes: string | null };
export type Stay = {
  id: string;
  guest_id: string;
  room_id: string | null;
  people: number;
  check_in: string | null;
  check_out: string | null;
  notes: string | null;
};
export type Task = {
  id: string;
  title: string;
  due_on: string | null;
  done: boolean;
  assignee: string | null;
  notes: string | null;
};
