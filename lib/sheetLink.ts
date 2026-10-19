// Turns a Google Sheets link into the address that returns the sheet as CSV. Only docs.google.com sheets are accepted,
// so the server never fetches anything else. Two kinds of link work:
//  - a normal sheet link, if the sheet is shared as "Anyone with the link: Viewer"
//  - a "Publish to the web" link (File > Share > Publish to web > CSV)
export function sheetCsvUrl(input: string): string | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "docs.google.com") return null;
  const gid = (u.searchParams.get("gid") ?? u.hash.match(/gid=(\d+)/)?.[1] ?? "").replace(/\D/g, "");
  const pub = u.pathname.match(/^\/spreadsheets\/d\/e\/([\w-]{20,})\/pub/);
  if (pub) return `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?output=csv${gid ? `&gid=${gid}` : ""}`;
  const m = u.pathname.match(/^\/spreadsheets\/d\/([\w-]{20,})/);
  if (!m) return null;
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
}
