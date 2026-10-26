import { json, requireEditor } from "@/lib/serverAuth";
import { sheetCsvUrl } from "@/lib/sheetLink";

export const runtime = "nodejs";

const MAX_BYTES = 5_000_000;

// Reads a linked Google Sheet as CSV on the server (browsers are not allowed to read it directly).
// Only signed-in editors can call it, and it can only ever fetch a docs.google.com spreadsheet.
export async function POST(req: Request) {
  const denied = await requireEditor(req);
  if (denied) return denied;

  let link = "";
  try {
    link = String((await req.json()).url ?? "");
  } catch {
    /* handled below */
  }
  const target = sheetCsvUrl(link);
  if (!target) return json({ error: "That is not a Google Sheets link. Copy the address from the sheet's browser tab." }, 400);

  try {
    const res = await fetch(target, { redirect: "follow", signal: AbortSignal.timeout(15000), cache: "no-store" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.includes("csv")) {
      return json({ error: "Google would not share that sheet. In Google Sheets choose Share, then General access: Anyone with the link (Viewer), and try again." }, 422);
    }
    const text = await res.text();
    if (text.length > MAX_BYTES) return json({ error: "That sheet is too large to sync." }, 413);
    return json({ csv: text }, 200);
  } catch {
    return json({ error: "Could not reach Google Sheets. Try again in a moment." }, 502);
  }
}
