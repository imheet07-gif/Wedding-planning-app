import { json, requireEditor } from "@/lib/serverAuth";
import { notionDbId, type NotionGuest } from "@/lib/notionDb";

export const runtime = "nodejs";

// NOTION_API_BASE only exists so tests can point this at a fake server.
const API = process.env.NOTION_API_BASE ?? "https://api.notion.com/v1";
const MAX_ROWS = 2000;

type Prop = { type: string; [k: string]: unknown };
const plain = (parts: unknown) => (Array.isArray(parts) ? parts.map((p) => (p as { plain_text?: string }).plain_text ?? "").join("") : "").trim();

function text(p: Prop | undefined): string {
  if (!p) return "";
  switch (p.type) {
    case "title": return plain(p.title);
    case "rich_text": return plain(p.rich_text);
    case "phone_number": return String(p.phone_number ?? "").trim();
    case "number": return p.number == null ? "" : String(p.number);
    case "select": return (p.select as { name?: string } | null)?.name ?? "";
    default: return "";
  }
}
const names = (p: Prop | undefined): string[] => {
  if (!p) return [];
  if (p.type === "multi_select") return (p.multi_select as { name: string }[]).map((o) => o.name);
  if (p.type === "select") return (p.select as { name?: string } | null)?.name ? [(p.select as { name: string }).name] : [];
  return [];
};

// Reads a Notion guest database on the server with the integration secret kept in NOTION_TOKEN (never sent to the browser).
export async function POST(req: Request) {
  const denied = await requireEditor(req);
  if (denied) return denied;

  const token = process.env.NOTION_TOKEN;
  if (!token) return json({ error: "Notion is not set up yet: the NOTION_TOKEN setting is missing in Vercel." }, 503);

  let link = "";
  try {
    link = String((await req.json()).url ?? "");
  } catch {
    /* handled below */
  }
  const id = notionDbId(link);
  if (!id) return json({ error: "That is not a Notion database link. Open the database in Notion, tap Share, then Copy link." }, 400);

  const headers = { authorization: `Bearer ${token}`, "notion-version": "2022-06-28", "content-type": "application/json" };
  const call = (path: string, init?: RequestInit) => fetch(`${API}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(20000) });

  try {
    const meta = await call(`/databases/${id}`);
    if (meta.status === 401) return json({ error: "Notion rejected the NOTION_TOKEN. Create the integration secret again and update it in Vercel." }, 502);
    if (meta.status === 404) return json({ error: "Notion cannot see that database. Open it, tap the … menu, then Connections, and add your integration." }, 422);
    if (!meta.ok) return json({ error: "Notion could not be read right now. Try again in a moment." }, 502);
    const props = ((await meta.json()).properties ?? {}) as Record<string, Prop>;

    const find = (types: string[], candidates: string[]) => Object.entries(props).find(([n, p]) => types.includes(p.type) && candidates.includes(n.toLowerCase().trim()))?.[0];
    const titleKey = Object.entries(props).find(([, p]) => p.type === "title")?.[0];
    const countKey = find(["number"], ["guest count", "guests", "count", "people", "headcount", "pax"]);
    const contactKey = find(["number", "phone_number", "rich_text"], ["contact", "phone", "mobile", "whatsapp", "contact number"]);
    const eventKey = find(["multi_select", "select"], ["event", "events"]);
    const groupKey = find(["multi_select", "select"], ["group", "groups", "category", "relation"]);
    if (!titleKey) return json({ error: "That Notion database has no title column." }, 422);

    const eventProp = eventKey ? (props[eventKey] as Prop) : undefined;
    const eventOptions = eventProp ? ((eventProp[eventProp.type] as { options?: { name: string }[] })?.options ?? []).map((o) => o.name) : [];

    const guests: NotionGuest[] = [];
    let cursor: string | undefined;
    do {
      const res = await call(`/databases/${id}/query`, { method: "POST", body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }) });
      if (!res.ok) return json({ error: "Notion could not be read right now. Try again in a moment." }, 502);
      const page = await res.json();
      for (const row of page.results as { properties: Record<string, Prop> }[]) {
        const pr = row.properties;
        const n = countKey ? (pr[countKey]?.number as number | null | undefined) ?? null : null;
        guests.push({
          name: text(pr[titleKey]),
          count: typeof n === "number" ? n : null,
          contact: contactKey ? text(pr[contactKey]) || null : null,
          groups: groupKey ? names(pr[groupKey]) : [],
          events: eventKey ? names(pr[eventKey]) : [],
        });
      }
      cursor = page.has_more ? (page.next_cursor as string) : undefined;
      if (guests.length > MAX_ROWS) return json({ error: `That database has more than ${MAX_ROWS} rows.` }, 413);
    } while (cursor);

    return json({ guests, eventOptions }, 200);
  } catch {
    return json({ error: "Could not reach Notion. Try again in a moment." }, 502);
  }
}
