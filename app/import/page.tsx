"use client";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { BASE_HEADERS, parseCsv, parseGuestRows, templateRows, type Cell, type ParsedRow } from "@/lib/importGuests";

const MAX_ROWS = 2000;
const chunk = <T,>(a: T[], n = 200) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export default function ImportPage() {
  const { events, guests, canEdit, refresh } = useWedding();
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
    const db = supabase();
    let done = 0;
    try {
      for (const part of chunk(importable)) {
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
      }
      setResult(`Imported ${done} guests.`);
      setRows(null);
    } catch (e) {
      setErr(`${(e as Error).message} ${done} guests were imported before the error; check the Guests page before trying again.`);
    }
    await refresh();
    setBusy(false);
  }

  const tone: Record<ParsedRow["status"], string> = {
    ok: "text-green-700", warning: "text-amber-700", error: "text-red-600", duplicate: "text-gray-500",
  };

  return (
    <div className="space-y-5">
      <Link href="/guests" className="text-sm text-rose-600 underline">← Back to guests</Link>

      <section className="space-y-2 card p-4 text-sm">
        <p className="font-medium">1. Download the template and fill it in</p>
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
