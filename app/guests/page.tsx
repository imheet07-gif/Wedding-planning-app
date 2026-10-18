"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/ui";
import { FileSpreadsheet, UsersRound } from "lucide-react";
import type { Side } from "@/lib/types";

const sideLabel: Record<Side, string> = { bride: "Bride", groom: "Groom", both: "Both" };

export default function GuestsPage() {
  const { guests, events, invitations, canEdit, refresh } = useWedding();
  const notify = useToast();
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [form, setForm] = useState({ name: "", side: "bride" as Side, grp: "", headcount: 1, phone: "", diet: "" });
  const [bulk, setBulk] = useState("");
  const [bulkSide, setBulkSide] = useState<Side>("bride");
  const [err, setErr] = useState("");

  const invited = useMemo(() => {
    const m = new Map<string, Set<string>>();
    invitations.forEach((i) => m.set(i.guest_id, (m.get(i.guest_id) ?? new Set()).add(i.event_id)));
    return m;
  }, [invitations]);

  const shown = guests.filter(
    (g) =>
      (!search || `${g.name} ${g.grp ?? ""}`.toLowerCase().includes(search.toLowerCase())) &&
      (!sideFilter || g.side === sideFilter) &&
      (!eventFilter || invited.get(g.id)?.has(eventFilter)),
  );
  const shownPeople = shown.reduce((n, g) => n + g.headcount, 0);

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setErr(error?.message ?? "");
    notify(error ? error.message : "Saved", error ? "error" : "ok");
    await refresh();
  }

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    await run(
      supabase().from("guests").insert({
        name: form.name.trim(),
        side: form.side,
        grp: form.grp.trim() || null,
        headcount: form.headcount,
        phone: form.phone.trim() || null,
        diet: form.diet.trim() || null,
      }),
    );
    setForm({ ...form, name: "", headcount: 1, phone: "", diet: "" });
  }

  // One entry per line. "Sharma family, 5" sets a headcount; the number is optional.
  async function addBulk() {
    const rows = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, count] = line.split(",").map((s) => s.trim());
        const n = parseInt(count, 10);
        return { name, side: bulkSide, headcount: n >= 1 ? n : 1 };
      });
    if (!rows.length) return;
    await run(supabase().from("guests").insert(rows));
    setBulk("");
  }

  function toggleEvent(guestId: string, eventId: string, on: boolean) {
    const t = supabase().from("invitations");
    return run(on ? t.insert({ guest_id: guestId, event_id: eventId }) : t.delete().match({ guest_id: guestId, event_id: eventId }));
  }

  function invitedToAll(eventId: string) {
    const rows = shown
      .filter((g) => !invited.get(g.id)?.has(eventId))
      .map((g) => ({ guest_id: g.id, event_id: eventId }));
    if (rows.length) return run(supabase().from("invitations").insert(rows));
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <p className="text-sm">
          Have a big list?{" "}
          <Link href="/import" className="text-rose-600 underline">Import guests from a spreadsheet</Link>
        </p>
      )}
      {canEdit && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <form onSubmit={addGuest} className="space-y-2 card p-4">
            <h2 className="font-semibold">Add guest or family</h2>
            <input required placeholder="Name (e.g. Sharma family)" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border p-2" />
            <div className="flex gap-2">
              <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value as Side })} className="rounded-lg border p-2">
                {Object.entries(sideLabel).map(([k, v]) => <option key={k} value={k}>{v} side</option>)}
              </select>
              <input type="number" min={1} value={form.headcount} title="Number of people"
                onChange={(e) => setForm({ ...form, headcount: Math.max(1, +e.target.value) })} className="w-20 rounded-lg border p-2" />
              <input placeholder="Group" value={form.grp}
                onChange={(e) => setForm({ ...form, grp: e.target.value })} className="min-w-0 flex-1 rounded-lg border p-2" />
            </div>
            <div className="flex gap-2">
              <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="min-w-0 flex-1 rounded-lg border p-2" />
              <input placeholder="Diet (Jain, veg…)" value={form.diet} onChange={(e) => setForm({ ...form, diet: e.target.value })} className="min-w-0 flex-1 rounded-lg border p-2" />
            </div>
            <button className="rounded-lg bg-rose-600 px-4 py-2 text-white">Add</button>
          </form>

          <div className="space-y-2 card p-4">
            <h2 className="font-semibold">Paste many</h2>
            <p className="text-sm text-gray-500">One per line. Add a count after a comma, e.g. “Sharma family, 5”.</p>
            <textarea rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} className="w-full rounded-lg border p-2" />
            <div className="flex gap-2">
              <select value={bulkSide} onChange={(e) => setBulkSide(e.target.value as Side)} className="rounded-lg border p-2">
                {Object.entries(sideLabel).map(([k, v]) => <option key={k} value={k}>{v} side</option>)}
              </select>
              <button onClick={addBulk} className="rounded-lg bg-rose-600 px-4 py-2 text-white">Add all</button>
            </div>
          </div>
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border p-2" />
        <select value={sideFilter} onChange={(e) => setSideFilter(e.target.value)} className="rounded-lg border p-2">
          <option value="">Both sides</option>
          <option value="bride">Bride</option>
          <option value="groom">Groom</option>
        </select>
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="rounded-lg border p-2">
          <option value="">All events</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <span className="text-sm text-gray-500">{shown.length} entries · {shownPeople} people</span>
      </div>

      <div className="overflow-x-auto card">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Side</th>
              <th className="p-2">People</th>
              {events.map((ev) => (
                <th key={ev.id} className="p-2 text-center">
                  {ev.name}
                  {canEdit && (
                    <button title="Invite everyone shown" onClick={() => invitedToAll(ev.id)} className="block w-full text-xs font-normal text-rose-600">all</button>
                  )}
                </th>
              ))}
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {shown.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-2">
                  {g.name}
                  <div className="text-xs text-gray-500">{[g.grp, g.phone, g.diet].filter(Boolean).join(" · ")}</div>
                </td>
                <td className="p-2">{sideLabel[g.side]}</td>
                <td className="p-2">
                  {canEdit ? (
                    <input type="number" min={1} defaultValue={g.headcount} className="w-16 rounded-lg border p-1"
                      onBlur={(e) => +e.target.value >= 1 && +e.target.value !== g.headcount &&
                        run(supabase().from("guests").update({ headcount: +e.target.value }).eq("id", g.id))} />
                  ) : g.headcount}
                </td>
                {events.map((ev) => (
                  <td key={ev.id} className="p-2 text-center">
                    <input type="checkbox" disabled={!canEdit} checked={invited.get(g.id)?.has(ev.id) ?? false}
                      onChange={(e) => toggleEvent(g.id, ev.id, e.target.checked)} />
                  </td>
                ))}
                {canEdit && (
                  <td className="p-2 text-right">
                    <button className="text-red-600" onClick={() => confirm(`Delete ${g.name}?`) && run(supabase().from("guests").delete().eq("id", g.id))}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {!shown.length && (
              <tr><td colSpan={events.length + 4}>
                <EmptyState icon={<UsersRound size={22} />} title={guests.length ? "No one matches" : "No guests yet"}
                  hint={guests.length ? "Try clearing the search or filters." : "Add a family above, paste a list of names, or import a whole spreadsheet."}>
                  {canEdit && !guests.length && (
                    <Link href="/import" className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700">
                      <FileSpreadsheet size={16} />Import a spreadsheet
                    </Link>
                  )}
                </EmptyState>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
