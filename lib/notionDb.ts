// Reads a Notion guest database into the same shape the spreadsheet import uses.
// Expected properties (matched by name, any capitalisation): the title is the guest or family; "Guest Count" is a number;
// "Contact" is a phone number (number, phone or text); "Event" and "Group" are multi-select; "Stay" is ignored for now.
import type { ParsedRow } from "@/lib/importGuests";

export type NotionGuest = { name: string; count: number | null; contact: string | null; groups: string[]; events: string[] };
export type NotionPayload = { guests: NotionGuest[]; eventOptions: string[] };

export function notionDbId(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (!/(^|\.)notion\.(so|com|site)$/.test(u.hostname)) return null;
    const ids = u.pathname.replace(/-/g, "").match(/[0-9a-f]{32}/gi);
    return ids ? ids[ids.length - 1].toLowerCase() : null;
  } catch {
    return null;
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const SPELLINGS: Record<string, string> = { mehndi: "mehendi", mehandi: "mehendi", sangit: "sangeet", poojan: "poojan", pooja: "poojan" };
const canon = (s: string) => SPELLINGS[norm(s)] ?? norm(s);

// "Wedding" in Notion is the app's "Wedding Day"; spellings like Mehndi/Mehendi are treated as the same.
export function matchEvent(notionName: string, events: { id: string; name: string }[]): string | null {
  const n = canon(notionName);
  const exact = events.find((e) => canon(e.name) === n);
  if (exact) return exact.id;
  const loose = events.find((e) => canon(e.name).startsWith(`${n} `) || n.startsWith(`${canon(e.name)} `));
  return loose?.id ?? null;
}

export function rowsFromNotion(
  payload: NotionPayload,
  events: { id: string; name: string }[],
  side: ParsedRow["side"],
): { rows: ParsedRow[]; columns: string[]; problems: string[] } {
  const problems: string[] = [];
  const columns: string[] = [];
  for (const opt of payload.eventOptions) {
    const id = matchEvent(opt, events);
    if (!id) problems.push(`Notion has an event "${opt}" but the app has none that matches, so it is skipped. Add it on the Events page to include it.`);
    else if (!columns.includes(id)) columns.push(id);
  }
  const rows: ParsedRow[] = payload.guests.map((g, i) => {
    const eventIds = [...new Set(g.events.map((e) => matchEvent(e, events)).filter((x): x is string => !!x))];
    return {
      line: i + 1, name: g.name, headcount: g.count && g.count >= 1 ? Math.round(g.count) : 1, side,
      grp: g.groups.join(", ") || null, phone: g.contact, diet: null, notes: null, eventIds,
      sideGiven: false, countGiven: g.count != null && g.count >= 1, status: g.name ? "ok" : "error",
      messages: g.name ? [] : ["Name is missing."],
    };
  });
  // Same guest twice in the list: keep the first, like the spreadsheet import.
  const seen = new Set<string>();
  for (const r of rows) {
    const k = `${norm(r.name)}|${(r.phone ?? "").replace(/\D/g, "").slice(-10)}`;
    if (r.status === "ok" && seen.has(k)) { r.status = "duplicate"; r.messages = ["Listed twice in Notion."]; }
    seen.add(k);
  }
  return { rows, columns, problems };
}
