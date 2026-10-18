"use client";
import { useState } from "react";
import { useWedding } from "@/components/WeddingProvider";
import { formatDate } from "@/lib/whatsapp";

type Kind = "guests" | "stay" | "vendors";

export default function ListsPage() {
  const { events, guests, invitations, vendors, vendorEvents, properties, rooms, stays } = useWedding();
  const [kind, setKind] = useState<Kind>("guests");
  const [eventId, setEventId] = useState("");
  const [side, setSide] = useState("");
  const [cols, setCols] = useState({ phone: true, diet: true, rsvp: true });
  const [copied, setCopied] = useState(false);

  const eventName = (id: string) => events.find((e) => e.id === id)?.name ?? "";
  const guestById = new Map(guests.map((g) => [g.id, g]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const propName = (id: string | undefined) => properties.find((p) => p.id === id)?.name ?? "";

  let title = "";
  let head: string[] = [];
  let rows: string[][] = [];

  if (kind === "guests") {
    const chosen = eventId ? invitations.filter((i) => i.event_id === eventId) : [];
    const list = eventId
      ? chosen.map((i) => ({ g: guestById.get(i.guest_id), rsvp: i.rsvp })).filter((x) => x.g)
      : guests.map((g) => ({ g, rsvp: "" as string }));
    title = eventId ? `${eventName(eventId)} guest list` : "Full guest list";
    head = ["Name", "People", "Side", ...(cols.phone ? ["Phone"] : []), ...(cols.diet ? ["Diet"] : []), ...(eventId && cols.rsvp ? ["RSVP"] : [])];
    rows = list
      .filter((x) => x.g && (!side || x.g.side === side))
      .map((x) => [
        x.g!.name, String(x.g!.headcount), x.g!.side,
        ...(cols.phone ? [x.g!.phone ?? ""] : []), ...(cols.diet ? [x.g!.diet ?? ""] : []),
        ...(eventId && cols.rsvp ? [x.rsvp] : []),
      ]);
    rows.push(["Total people", String(rows.reduce((n, r) => n + +r[1], 0))]);
  } else if (kind === "stay") {
    title = "Accommodation";
    head = ["Name", "People", "Hotel", "Room", "Check in", "Check out"];
    rows = stays
      .map((s) => ({ s, r: s.room_id ? roomById.get(s.room_id) : undefined }))
      .sort((a, b) => propName(a.r?.property_id).localeCompare(propName(b.r?.property_id)) || (a.r?.name ?? "").localeCompare(b.r?.name ?? "", undefined, { numeric: true }))
      .map(({ s, r }) => [
        guestById.get(s.guest_id)?.name ?? "", String(s.people), propName(r?.property_id) || "Not placed", r?.name ?? "",
        formatDate(s.check_in), formatDate(s.check_out),
      ]);
  } else {
    title = "Vendor contacts";
    head = ["Vendor", "Category", "Phone", "Status", "Events"];
    rows = vendors.map((v) => [
      v.name, v.category, v.phone ?? "", v.status,
      vendorEvents.filter((x) => x.vendor_id === v.id).map((x) => eventName(x.event_id)).join(", "),
    ]);
  }

  const csv = [head, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const text = [title, ...rows.map((r) => r.join(" | "))].join("\n");

  function download() {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\W+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy. Use Download CSV instead.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border bg-white p-3 print:hidden">
        <div className="flex flex-wrap gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className="rounded border p-2">
            <option value="guests">Guest list</option>
            <option value="stay">Accommodation</option>
            <option value="vendors">Vendor contacts</option>
          </select>
          {kind === "guests" && (
            <>
              <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded border p-2">
                <option value="">All guests</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <select value={side} onChange={(e) => setSide(e.target.value)} className="rounded border p-2">
                <option value="">Both sides</option>
                <option value="bride">Bride</option>
                <option value="groom">Groom</option>
              </select>
            </>
          )}
        </div>
        {kind === "guests" && (
          <div className="flex flex-wrap gap-4 text-sm">
            {(["phone", "diet", "rsvp"] as const).map((k) => (
              <label key={k} className="flex items-center gap-1">
                <input type="checkbox" checked={cols[k]} onChange={(e) => setCols({ ...cols, [k]: e.target.checked })} /> {k}
              </label>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="rounded bg-rose-600 px-3 py-2 text-white">Print / save as PDF</button>
          <button onClick={copy} className="rounded border px-3 py-2">{copied ? "Copied" : "Copy as text"}</button>
          <button onClick={download} className="rounded border px-3 py-2">Download CSV</button>
        </div>
      </div>

      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="overflow-x-auto rounded-lg border bg-white print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500 print:bg-white">
            <tr>{head.map((h) => <th key={h} className="p-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {r.map((c, j) => <td key={j} className="p-2">{c}</td>)}
              </tr>
            ))}
            {!rows.length && <tr><td className="p-4 text-gray-500">Nothing to show.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
