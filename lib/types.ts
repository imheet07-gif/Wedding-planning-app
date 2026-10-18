export type Role = "editor" | "viewer";
export type Side = "bride" | "groom" | "both";
export type Rsvp = "pending" | "yes" | "no";

export type WeddingEvent = {
  id: string;
  name: string;
  event_date: string | null;
  start_time: string | null;
  venue: string | null;
  notes: string | null;
  sort_order: number;
};

export type Guest = {
  id: string;
  name: string;
  side: Side;
  grp: string | null;
  headcount: number;
  phone: string | null;
  diet: string | null;
  notes: string | null;
};

export type Invitation = { guest_id: string; event_id: string; rsvp: Rsvp };
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
