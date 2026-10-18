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
