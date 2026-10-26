// Compares a linked Google Sheet with the guest list and says what a sync would change.
// The sheet is the source of truth for who is on the list and how many people come; the app never writes back to it,
// and nobody is ever deleted: guests missing from the sheet are only reported.
import { guestKey, parseGuestRows, type Cell, type ParsedRow } from "@/lib/importGuests";
import type { Guest, Invitation } from "@/lib/types";

export type GuestUpdate = {
  guest: Guest;
  patch: Partial<Pick<Guest, "name" | "headcount" | "side" | "grp" | "diet" | "notes">>;
  addEvents: string[];
  removeEvents: string[];
  keptEvents: string[]; // un-ticked in the sheet but already answered or sent, so left alone
  changes: string[];
};

export type SyncPlan = {
  adds: ParsedRow[];
  updates: GuestUpdate[];
  missing: Guest[];
  unchanged: number;
  skipped: ParsedRow[];
  problems: string[];
};

export function planSync(data: Cell[][], events: { id: string; name: string }[], guests: Guest[], invitations: Invitation[]): SyncPlan {
  const { rows, problems, columns } = parseGuestRows(data, events, []);
  return planFromRows(rows, columns, problems, events, guests, invitations, { removeUnticked: true });
}

// `columns` are the events the source actually has a column for. removeUnticked decides whether an event missing from
// the source takes the invitation away (back to undecided): true for everyone, "tagged" only for guests the source lists
// at least one event for (lists whose events are often left unmarked), false never.
export function planFromRows(
  rows: ParsedRow[], columns: string[], problems: string[],
  events: { id: string; name: string }[], guests: Guest[], invitations: Invitation[],
  opts: { removeUnticked: boolean | "tagged" },
): SyncPlan {
  const byKey = new Map<string, Guest>();
  for (const g of guests) if (!byKey.has(guestKey(g.name, g.phone))) byKey.set(guestKey(g.name, g.phone), g);
  const evName = new Map(events.map((e) => [e.id, e.name]));
  const inv = new Map<string, Map<string, Invitation>>();
  for (const i of invitations) {
    if (!inv.has(i.guest_id)) inv.set(i.guest_id, new Map());
    inv.get(i.guest_id)!.set(i.event_id, i);
  }

  const plan: SyncPlan = { adds: [], updates: [], missing: [], unchanged: 0, skipped: [], problems };
  const seen = new Set<string>();

  for (const r of rows) {
    if (r.status === "error" || r.status === "duplicate") { plan.skipped.push(r); continue; }
    const g = byKey.get(guestKey(r.name, r.phone));
    if (!g) { plan.adds.push(r); continue; }
    seen.add(g.id);

    const patch: GuestUpdate["patch"] = {};
    const changes: string[] = [];
    if (r.name !== g.name) { patch.name = r.name; changes.push(`name "${g.name}" → "${r.name}"`); }
    if (r.countGiven && r.headcount !== g.headcount) { patch.headcount = r.headcount; changes.push(`people ${g.headcount} → ${r.headcount}`); }
    if (r.sideGiven && r.side !== g.side) { patch.side = r.side; changes.push(`side ${g.side} → ${r.side}`); }
    for (const f of ["grp", "diet", "notes"] as const) {
      if (r[f] && r[f] !== g[f]) { patch[f] = r[f]; changes.push(`${f === "grp" ? "group" : f} → ${r[f]}`); }
    }

    const have = inv.get(g.id) ?? new Map<string, Invitation>();
    const want = new Set(r.eventIds);
    const addEvents = r.eventIds.filter((id) => !have.has(id));
    const dropped = [...have.keys()].filter((id) => columns.includes(id) && !want.has(id));
    const mayRemove = opts.removeUnticked === true || (opts.removeUnticked === "tagged" && r.eventIds.length > 0);
    const removeEvents = !mayRemove ? [] : dropped.filter((id) => have.get(id)!.rsvp === "pending" && !have.get(id)!.sent_at);
    const keptEvents = !mayRemove ? [] : dropped.filter((id) => !removeEvents.includes(id));
    for (const id of addEvents) changes.push(`invited to ${evName.get(id)}`);
    for (const id of removeEvents) changes.push(`no longer invited to ${evName.get(id)} (back to undecided)`);

    if (changes.length) plan.updates.push({ guest: g, patch, addEvents, removeEvents, keptEvents, changes });
    else plan.unchanged++;
  }
  plan.missing = guests.filter((g) => !seen.has(g.id));
  return plan;
}
