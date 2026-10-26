// Shared by the Import page and the automatic Notion sync: read Notion into a plan, and write a plan to the database.
import { supabase } from "@/lib/supabase";
import { rowsFromNotion, type NotionPayload } from "@/lib/notionDb";
import { planFromRows, type SyncPlan } from "@/lib/sheetSync";
import type { ParsedRow } from "@/lib/importGuests";
import type { Guest, Invitation } from "@/lib/types";

const chunk = <T,>(a: T[], n = 200) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// Adds guests and their event invitations in batches; calls onDone with the running count.
export async function insertGuests(list: ParsedRow[], onDone?: (n: number) => void) {
  const db = supabase();
  let done = 0;
  for (const part of chunk(list)) {
    const { data, error } = await db
      .from("guests")
      .insert(part.map((r) => ({ name: r.name, side: r.side, grp: r.grp, headcount: r.headcount, phone: r.phone, diet: r.diet, notes: r.notes })))
      .select("id");
    if (error || !data) throw new Error(error?.message ?? "Import failed.");
    const inv = part.flatMap((r, i) => r.eventIds.map((event_id) => ({ guest_id: data[i].id, event_id })));
    for (const invPart of chunk(inv, 500)) {
      const { error: e2 } = await db.from("invitations").insert(invPart);
      if (e2) throw new Error(e2.message);
    }
    done += part.length;
    onDone?.(done);
  }
  return done;
}

export async function applySyncPlan(plan: SyncPlan) {
  const db = supabase();
  const added = await insertGuests(plan.adds);
  for (const u of plan.updates) {
    if (Object.keys(u.patch).length) {
      const { error } = await db.from("guests").update(u.patch).eq("id", u.guest.id);
      if (error) throw new Error(error.message);
    }
    if (u.addEvents.length) {
      const { error } = await db.from("invitations").insert(u.addEvents.map((event_id) => ({ guest_id: u.guest.id, event_id })));
      if (error) throw new Error(error.message);
    }
    for (const event_id of u.removeEvents) {
      const { error } = await db.from("invitations").delete().match({ guest_id: u.guest.id, event_id });
      if (error) throw new Error(error.message);
    }
  }
  return { added, updated: plan.updates.length };
}

// Notion lists are often left unmarked: a guest with events tagged in Notion gets exactly those (an event dropped in Notion
// goes back to undecided if they have not replied or been sent an invite), while a guest with no events tagged keeps
// whatever was set in the app.
export async function fetchNotionPlan(
  url: string, side: ParsedRow["side"],
  events: { id: string; name: string }[], guests: Guest[], invitations: Invitation[],
): Promise<SyncPlan> {
  const { data: s } = await supabase().auth.getSession();
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
    body: JSON.stringify({ url }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Could not read Notion.");
  const { rows, columns, problems } = rowsFromNotion(body as NotionPayload, events, side);
  const plan = planFromRows(rows.filter((r) => r.status === "ok"), columns, problems, events, guests, invitations, { removeUnticked: "tagged" });
  plan.skipped = rows.filter((r) => r.status !== "ok");
  return plan;
}

export async function saveSetting(key: string, value: string) {
  const { error } = await supabase().from("app_settings").upsert({ key, value });
  if (error) throw new Error(error.message);
}
