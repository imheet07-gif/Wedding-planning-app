// Reads the guest spreadsheet template (xlsx or csv rows) into guests plus the events they are invited to.

export type Cell = string | number | boolean | Date | null | undefined;
type Side = "bride" | "groom" | "both";

export type ParsedRow = {
  line: number; // row number in the spreadsheet, so people can find it
  name: string;
  headcount: number;
  side: Side;
  grp: string | null;
  phone: string | null;
  diet: string | null;
  notes: string | null;
  eventIds: string[];
  sideGiven: boolean; // false when the Side cell was blank or unreadable, so a sync leaves the saved side alone
  countGiven: boolean;
  status: "ok" | "warning" | "error" | "duplicate";
  messages: string[];
};

export const BASE_HEADERS = ["Name", "People", "Side", "Group", "Phone", "Diet", "Notes"];

const ALIASES: Record<string, string[]> = {
  name: ["name", "guest", "guest name", "family", "invitee"],
  headcount: ["people", "headcount", "count", "pax", "no of people", "number of people"],
  side: ["side"],
  grp: ["group", "category", "relation"],
  phone: ["phone", "mobile", "whatsapp", "contact", "phone number", "mobile number"],
  diet: ["diet", "dietary", "food", "dietary needs"],
  notes: ["notes", "note", "remarks", "comments"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const TRUE_WORDS = new Set(["y", "yes", "1", "x", "true", "✓", "✔", "tick", "invited"]);

function text(c: Cell): string {
  if (c == null || c instanceof Date) return "";
  return String(c).trim();
}

export function templateRows(eventNames: string[]): string[][] {
  return [
    [...BASE_HEADERS, ...eventNames],
    ["Example: Sharma family", "5", "bride", "Family", "98765 43210", "Jain", "", ...eventNames.map((_, i) => (i % 2 === 0 ? "Y" : ""))],
    ["Example: Rahul Verma", "1", "groom", "Friends", "91234 56780", "", "", ...eventNames.map(() => "Y")],
  ];
}

// Minimal CSV reader: quoted fields, doubled quotes, CRLF, BOM, and comma or semicolon separators.
export function parseCsv(input: string): string[][] {
  const src = input.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = firstLine.includes(",") || !firstLine.includes(";") ? "," : ";";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export const guestKey = (name: string, phone: string | null) =>
  `${name.toLowerCase().replace(/\s+/g, " ").trim()}|${(phone ?? "").replace(/\D/g, "").slice(-10)}`;

export function parseGuestRows(
  data: Cell[][],
  events: { id: string; name: string }[],
  existing: { name: string; phone: string | null }[],
): { rows: ParsedRow[]; problems: string[]; columns: string[] } {
  const problems: string[] = [];
  const headerAt = data.findIndex((r) => r.some((c) => text(c)));
  if (headerAt < 0) return { rows: [], problems: ["The file is empty."], columns: [] };

  const headers = data[headerAt].map((c) => norm(text(c)));
  const col: Partial<Record<keyof typeof ALIASES, number>> = {};
  for (const [field, names] of Object.entries(ALIASES)) {
    const i = headers.findIndex((h) => names.includes(h));
    if (i >= 0) col[field as keyof typeof ALIASES] = i;
  }
  if (col.name === undefined) return { rows: [], problems: ['There is no "Name" column. Use the template from this page.'], columns: [] };

  const eventCols = events
    .map((ev) => ({ ev, i: headers.indexOf(norm(ev.name)) }))
    .filter((x) => x.i >= 0);
  const used = new Set([...Object.values(col), ...eventCols.map((x) => x.i)]);
  headers.forEach((h, i) => { if (h && !used.has(i)) problems.push(`Ignored column "${text(data[headerAt][i])}" (not in the template).`); });
  for (const ev of events) if (!eventCols.some((x) => x.ev.id === ev.id)) problems.push(`No column for "${ev.name}", so nobody is invited to it.`);

  const seen = new Set(existing.map((g) => guestKey(g.name, g.phone)));
  const rows: ParsedRow[] = [];

  data.slice(headerAt + 1).forEach((r, k) => {
    const line = headerAt + k + 2;
    const get = (f: keyof typeof ALIASES) => (col[f] === undefined ? "" : text(r[col[f]!]));
    const name = get("name");
    if (!r.some((c) => text(c))) return;
    if (/^example\b/i.test(name)) return;

    const messages: string[] = [];
    let status: ParsedRow["status"] = "ok";
    const warn = (m: string) => { messages.push(m); if (status === "ok") status = "warning"; };

    if (!name) { rows.push({ line, name: "", headcount: 1, side: "both", grp: null, phone: null, diet: null, notes: null, eventIds: [], sideGiven: false, countGiven: false, status: "error", messages: ["Name is missing."] }); return; }

    let headcount = 1;
    let countGiven = false;
    const rawCount = get("headcount");
    if (rawCount) {
      const n = Number(rawCount);
      if (Number.isInteger(n) && n >= 1 && n <= 500) { headcount = n; countGiven = true; }
      else warn(`People "${rawCount}" is not a whole number, set to 1.`);
    }

    let side: Side = "both";
    let sideGiven = true;
    const rawSide = norm(get("side"));
    if (["bride", "brides", "bride side", "bride s side"].includes(rawSide)) side = "bride";
    else if (["groom", "grooms", "groom side", "groom s side"].includes(rawSide)) side = "groom";
    else if (rawSide === "both") side = "both";
    else { sideGiven = false; warn(rawSide ? `Side "${get("side")}" not recognised, set to both.` : "Side is blank, set to both."); }

    const phone = get("phone") || null;
    const eventIds = eventCols.filter((x) => TRUE_WORDS.has(text(r[x.i]).toLowerCase())).map((x) => x.ev.id);

    const key = guestKey(name, phone);
    if (seen.has(key)) {
      rows.push({ line, name, headcount, side, grp: get("grp") || null, phone, diet: get("diet") || null, notes: get("notes") || null, eventIds, sideGiven, countGiven, status: "duplicate", messages: ["Already in the guest list (same name and phone)."] });
      return;
    }
    seen.add(key);
    if (!eventIds.length && eventCols.length) warn("Not invited to any event.");

    rows.push({ line, name, headcount, side, grp: get("grp") || null, phone, diet: get("diet") || null, notes: get("notes") || null, eventIds, sideGiven, countGiven, status, messages });
  });

  return { rows, problems, columns: eventCols.map((x) => x.ev.id) };
}
