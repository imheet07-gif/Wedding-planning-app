"use client";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { BASE_HEADERS, parseCsv, parseGuestRows, templateRows, type Cell, type ParsedRow } from "@/lib/importGuests";
import { planSync, type SyncPlan } from "@/lib/sheetSync";
import { applySyncPlan, fetchNotionPlan, insertGuests, saveSetting } from "@/lib/syncApply";
import { sheetCsvUrl } from "@/lib/sheetLink";
import { notionDbId } from "@/lib/notionDb";

const MAX_ROWS = 2000;

export default function ImportPage() {
  const { events, guests, invitations, settings, canEdit, refresh } = useWedding();
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [err, setErr] = useState("");

  const eventNames = events.map((e) => e.name);
  const eventName = new Map(events.map((e) => [e.id, e.name]));

  async function downloadXlsx() {
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    const data = templateRows(eventNames).map((r, i) =>
      r.map((v) => (i === 0 ? { value: v, fontWeight: "bold" as const } : { value: v, type: String })),
    );
    await writeExcelFile(data as never).toFile("guest-list-template.xlsx");
  }

  function downloadCsv() {
    const csv = templateRows(eventNames).map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-list-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File) {
    setErr(""); setResult(""); setRows(null); setFileName(file.name);
    try {
      let data: Cell[][];
      if (/\.csv$/i.test(file.name)) {
        data = parseCsv(await file.text());
      } else if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        data = (await readSheet(file)) as Cell[][];
      } else {
        return setErr("Please choose an .xlsx or .csv file. If you have an older .xls file, open it and save as .xlsx first.");
      }
      if (data.length > MAX_ROWS + 1) return setErr(`That file has more than ${MAX_ROWS} rows. Split it into smaller files.`);
      const parsed = parseGuestRows(data, events, guests);
      setRows(parsed.rows);
      setProblems(parsed.problems);
    } catch {
      setErr("Could not read that file. Make sure it is a valid .xlsx or .csv.");
    }
  }

  const importable = rows?.filter((r) => r.status === "ok" || r.status === "warning") ?? [];
  const count = (s: ParsedRow["status"]) => rows?.filter((r) => r.status === s).length ?? 0;

  async function doImport() {
    setBusy(true); setErr(""); setResult("");
    let done = 0;
    try {
      await insertGuests(importable, (n) => (done = n));
      setResult(`Imported ${done} guests.`);
      setRows(null);
    } catch (e) {
      setErr(`${(e as Error).message} ${done} guests were imported before the error; check the Guests page before trying again.`);
    }
    await refresh();
    setBusy(false);
  }

  // ---- Live Google Sheet ----
  const savedLink = settings.guest_sheet_url ?? "";
  const [link, setLink] = useState<string | null>(null);
  const linkValue = link ?? savedLink;
  const [plan, setPlan] = useState<SyncPlan | null>(null);
  const [sheetMsg, setSheetMsg] = useState("");
  const [sheetErr, setSheetErr] = useState("");
  const [sheetBusy, setSheetBusy] = useState(false);
  const [planFrom, setPlanFrom] = useState<"sheet" | "notion">("sheet");

  // ---- Notion database ----
  const savedNotion = settings.notion_db_url ?? "";
  const [nLink, setNLink] = useState<string | null>(null);
  const nValue = nLink ?? savedNotion;
  const nSide = (settings.notion_side as ParsedRow["side"] | undefined) ?? "groom";
  const [nMsg, setNMsg] = useState("");
  const [nErr, setNErr] = useState("");

  async function saveNotionLink() {
    setNErr(""); setNMsg(""); setPlan(null);
    const v = nValue.trim();
    if (v && !notionDbId(v)) return setNErr("That is not a Notion database link. Open the database, tap Share, then Copy link.");
    try {
      await saveSetting("notion_db_url", v);
      await refresh();
      setNLink(null);
      setNMsg(v ? "Link saved." : "Link removed. Your guests stay as they are.");
    } catch (e) {
      setNErr((e as Error).message);
    }
  }

  async function checkNotion() {
    setSheetBusy(true); setNErr(""); setNMsg(""); setPlan(null);
    try {
      setPlan(await fetchNotionPlan(savedNotion, nSide, events, guests, invitations));
      setPlanFrom("notion");
    } catch (e) {
      setNErr((e as Error).message);
    }
    setSheetBusy(false);
  }

  async function saveLink() {
    setSheetErr(""); setSheetMsg(""); setPlan(null);
    const v = linkValue.trim();
    if (v && !sheetCsvUrl(v)) return setSheetErr("That is not a Google Sheets link. Copy the address from the sheet's browser tab.");
    try {
      await saveSetting("guest_sheet_url", v);
      await refresh();
      setLink(null);
      setSheetMsg(v ? "Link saved." : "Link removed. Your guests stay as they are.");
    } catch (e) {
      setSheetErr((e as Error).message);
    }
  }

  async function checkSheet() {
    setSheetBusy(true); setSheetErr(""); setSheetMsg(""); setPlan(null);
    try {
      const { data: s } = await supabase().auth.getSession();
      const res = await fetch("/api/sheet", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ url: savedLink }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not read the sheet.");
      const data = parseCsv(body.csv as string) as Cell[][];
      if (data.length > MAX_ROWS + 1) throw new Error(`The sheet has more than ${MAX_ROWS} rows.`);
      setPlanFrom("sheet");
      setPlan(planSync(data, events, guests, invitations));
    } catch (e) {
      setSheetErr((e as Error).message);
    }
    setSheetBusy(false);
  }

  async function applySync() {
    if (!plan) return;
    setSheetBusy(true); setSheetErr(""); setNErr(""); setSheetMsg(""); setNMsg("");
    try {
      const { added, updated } = await applySyncPlan(plan);
      await saveSetting(planFrom === "notion" ? "notion_synced_at" : "guest_sheet_synced_at", new Date().toISOString());
      (planFrom === "notion" ? setNMsg : setSheetMsg)(`Synced: ${added} added, ${updated} updated.`);
      setPlan(null);
    } catch (e) {
      (planFrom === "notion" ? setNErr : setSheetErr)(`${(e as Error).message} Some changes may already be applied; check again.`);
    }
    await refresh();
    setSheetBusy(false);
  }

  const changed = plan ? plan.adds.length + plan.updates.length : 0;
  const syncedAt = settings.guest_sheet_synced_at ? new Date(settings.guest_sheet_synced_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

  const tone: Record<ParsedRow["status"], string> = {
    ok: "text-green-700", warning: "text-amber-700", error: "text-red-600", duplicate: "text-gray-500",
  };

  return (
    <div className="space-y-5">
      <Link href="/guests" className="text-sm text-rose-600 underline">← Back to guests</Link>

      <section className="space-y-2 card p-4 text-sm">
        <h2 className="font-semibold">Link a Google Sheet (stays up to date)</h2>
        <p className="text-gray-600">
          Keep the guest list in a Google Sheet that family can edit, with the same columns as the template below. Whenever you want the app to catch up, tap
          &quot;Check the sheet&quot;: you see exactly what would change before anything happens. The app only reads the sheet; it never changes it, and it never deletes guests.
        </p>
        {canEdit ? (
          <>
            <label className="block space-y-1">
              <span className="font-medium">Sheet link</span>
              <input type="url" inputMode="url" value={linkValue} onChange={(e) => setLink(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…"
                className="w-full rounded-lg border p-2.5" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button onClick={saveLink} disabled={linkValue.trim() === savedLink} className="rounded-lg border px-3 py-2 disabled:opacity-40">{linkValue.trim() ? "Save link" : "Remove link"}</button>
              {savedLink && <button onClick={checkSheet} disabled={sheetBusy || linkValue.trim() !== savedLink} className="rounded-lg bg-rose-600 px-3 py-2 text-white disabled:opacity-40">{sheetBusy ? "Checking…" : "Check the sheet"}</button>}
            </div>
            <details className="text-gray-600">
              <summary className="min-h-8 cursor-pointer py-1 text-rose-700 underline">How to let the app read the sheet</summary>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>In Google Sheets tap <b>Share</b>, then under General access choose <b>Anyone with the link</b> and set it to <b>Viewer</b>. They can read it but not change it.</li>
                <li>Copy the address from the browser and paste it above. If the guests are on a second tab, open that tab first so the link ends in <code>gid=…</code>.</li>
                <li>Anyone with the link can read it, so share it only with family.</li>
              </ol>
            </details>
          </>
        ) : (
          <p className="text-gray-500">Only editors can link a sheet.</p>
        )}
        {syncedAt && <p className="text-xs text-gray-500">Last synced {syncedAt}</p>}
        {sheetErr && <p role="alert" className="text-red-600">{sheetErr}</p>}
        {sheetMsg && <p className="text-green-700">{sheetMsg}</p>}
      </section>

      <section className="space-y-2 card p-4 text-sm">
        <h2 className="font-semibold">Link a Notion database</h2>
        <p className="text-gray-600">
          Uses your Notion guest list: the title is the guest or family, plus <b>Guest Count</b>, <b>Contact</b>, <b>Group</b> and <b>Event</b>. Same as the sheet: you see a preview first, the app only reads Notion, and nobody is deleted.
          Notion decides each guest&apos;s events: add a tag to invite them, remove one (or all) to put them back to undecided, unless they already replied or were sent an invite. A guest with no events in Notion is undecided. Invitations you add only in the app are undone by the next sync, so tag those guests in Notion too.
        </p>
        {canEdit ? (
          <>
            <label className="block space-y-1">
              <span className="font-medium">Database link</span>
              <input type="url" inputMode="url" value={nValue} onChange={(e) => setNLink(e.target.value)} placeholder="https://www.notion.so/…"
                className="w-full rounded-lg border p-2.5" />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">New guests from this list are on the</span>
              <select value={nSide} onChange={(e) => saveSetting("notion_side", e.target.value).then(refresh)} className="w-full rounded-lg border p-2.5">
                <option value="groom">Groom&apos;s side</option>
                <option value="bride">Bride&apos;s side</option>
                <option value="both">Both sides</option>
              </select>
            </label>
            {savedNotion && (
              <label className="flex items-start gap-2">
                <input type="checkbox" className="mt-1" checked={settings.notion_auto === "1"} onChange={(e) => saveSetting("notion_auto", e.target.checked ? "1" : "0").then(refresh)} />
                <span>
                  <span className="font-medium">Keep the guest list updated automatically</span>
                  <span className="block text-xs text-gray-500">
                    Whenever an editor opens the app, at most every 10 minutes, it adds new guests from Notion and updates people, contact, group and events. Nobody is deleted.
                    Notion decides who is on the list, so to remove or rename someone, do it in Notion (a guest deleted only in the app comes back). It does not run while nobody has the app open. If a sync would change a large part of the list, it pauses and waits for you.
                  </span>
                </span>
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={saveNotionLink} disabled={nValue.trim() === savedNotion} className="rounded-lg border px-3 py-2 disabled:opacity-40">{nValue.trim() ? "Save link" : "Remove link"}</button>
              {savedNotion && <button onClick={checkNotion} disabled={sheetBusy || nValue.trim() !== savedNotion} className="rounded-lg bg-rose-600 px-3 py-2 text-white disabled:opacity-40">{sheetBusy ? "Checking…" : "Check Notion"}</button>}
            </div>
            <details className="text-gray-600">
              <summary className="min-h-8 cursor-pointer py-1 text-rose-700 underline">One-time setup</summary>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>At notion.so/profile/integrations create an <b>internal integration</b> and copy its secret.</li>
                <li>Open the guest database, tap <b>…</b> then <b>Connections</b>, and add that integration.</li>
                <li>In Vercel, open the project, Settings, Environment Variables, add <code>NOTION_TOKEN</code> with the secret, then redeploy. Never paste the secret into the app or into chat.</li>
              </ol>
            </details>
          </>
        ) : (
          <p className="text-gray-500">Only editors can link Notion.</p>
        )}
        {settings.notion_synced_at && <p className="text-xs text-gray-500">Last synced {new Date(settings.notion_synced_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>}
        {settings.notion_last_result && settings.notion_auto === "1" && <p className="text-xs text-gray-500">Last automatic change: {settings.notion_last_result}</p>}
        {settings.notion_last_error && settings.notion_auto === "1" && <p role="alert" className="text-amber-700">{settings.notion_last_error}</p>}
        {nErr && <p role="alert" className="text-red-600">{nErr}</p>}
        {nMsg && <p className="text-green-700">{nMsg}</p>}
      </section>

        {plan && (
          <section className="space-y-2 card p-4 text-sm">
            <p className="text-xs text-gray-500">From {planFrom === "notion" ? "Notion" : "the Google Sheet"}</p>
            <p className="font-medium">
              {changed ? `${plan.adds.length} new, ${plan.updates.length} to update` : "Everything is already up to date"}
              {` · ${plan.unchanged} unchanged`}
              {plan.skipped.length > 0 && ` · ${plan.skipped.length} rows skipped`}
            </p>
            {plan.problems.map((p) => <p key={p} className="text-amber-700">{p}</p>)}
            {plan.adds.length > 0 && (
              <div><p className="font-medium text-green-700">New guests</p><p className="text-gray-700">{plan.adds.map((r) => r.name).join(", ")}</p></div>
            )}
            {plan.updates.length > 0 && (
              <div>
                <p className="font-medium text-amber-700">Changes</p>
                <ul className="space-y-1">
                  {plan.updates.map((u) => (
                    <li key={u.guest.id}><b>{u.guest.name}</b>: {u.changes.join(", ")}
                      {u.keptEvents.length > 0 && <span className="block text-xs text-gray-500">Not removed from {u.keptEvents.map((id) => eventName.get(id)).join(", ")} because they already replied or were sent an invite.</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.missing.length > 0 && (
              <p className="text-gray-500">In the app but not in {planFrom === "notion" ? "Notion" : "the sheet"} (left as they are): {plan.missing.map((g) => g.name).join(", ")}. If you renamed someone there they show up here and as a new guest.</p>
            )}
            {plan.skipped.length > 0 && (
              <details className="text-gray-500"><summary className="cursor-pointer">Skipped rows</summary>
                {plan.skipped.map((r) => <p key={r.line}>Row {r.line}: {r.name || "(no name)"}: {r.messages.join(" ")}</p>)}
              </details>
            )}
            {changed > 0 && <button onClick={applySync} disabled={sheetBusy} className="rounded-lg bg-rose-600 px-4 py-2 text-white disabled:opacity-40">{sheetBusy ? "Applying…" : `Apply ${changed} changes`}</button>}
          </section>
        )}

      <section className="space-y-2 card p-4 text-sm">
        <p className="font-medium">Or import a file once: 1. Download the template and fill it in</p>
        <p className="text-gray-600">
          One row per guest or family. Columns: {BASE_HEADERS.join(", ")}, then one column per event ({eventNames.join(", ")}).
          Put <b>Y</b> under each event the guest is invited to. <b>People</b> is how many come in that row, e.g. 5 for a family.
          <b> Side</b> is bride, groom or both. Delete the two example rows or leave them, since they are skipped.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadXlsx} className="rounded-lg border px-3 py-2">Download Excel template (.xlsx)</button>
          <button onClick={downloadCsv} className="rounded-lg border px-3 py-2">Download CSV template</button>
        </div>
        <p className="text-gray-500">
          Google Sheets works too: File → Download → Microsoft Excel (.xlsx). Keep phone numbers as normal text or numbers; both are fine.
        </p>
      </section>

      <section className="space-y-2 card p-4 text-sm">
        <p className="font-medium">2. Upload it and check the preview</p>
        {canEdit ? (
          <input aria-label="Choose spreadsheet file" type="file" accept=".xlsx,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        ) : (
          <p className="text-gray-500">Only editors can import.</p>
        )}
        {err && <p className="text-red-600">{err}</p>}
        {result && <p className="text-green-700">{result} <Link href="/guests" className="underline">See the guest list</Link></p>}
      </section>

      {rows && (
        <section className="space-y-3">
          <div>
            <p className="font-medium">{fileName}</p>
            <p className="text-sm text-gray-600">
              {importable.length} will be imported
              {count("warning") > 0 && ` (${count("warning")} with a warning)`}
              {count("duplicate") > 0 && ` · ${count("duplicate")} duplicates skipped`}
              {count("error") > 0 && ` · ${count("error")} errors skipped`}
            </p>
            {problems.map((p) => <p key={p} className="text-sm text-amber-700">{p}</p>)}
          </div>
          <div className="max-h-[28rem] overflow-auto card">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-gray-500">
                <tr><th className="p-2">Row</th><th className="p-2">Name</th><th className="p-2">People</th><th className="p-2">Side</th><th className="p-2">Phone</th><th className="p-2">Events</th><th className="p-2">Status</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className="border-t align-top">
                    <td className="p-2 text-gray-500">{r.line}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.headcount}</td>
                    <td className="p-2">{r.side}</td>
                    <td className="p-2">{r.phone}</td>
                    <td className="p-2">{r.eventIds.map((id) => eventName.get(id)).join(", ")}</td>
                    <td className={`p-2 ${tone[r.status]}`}>{r.status}{r.messages.map((m) => <span key={m} className="block text-xs">{m}</span>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={doImport} disabled={busy || !importable.length} className="rounded-lg bg-rose-600 px-4 py-2 text-white disabled:opacity-40">
            {busy ? "Importing…" : `Import ${importable.length} guests`}
          </button>
        </section>
      )}
    </div>
  );
}
