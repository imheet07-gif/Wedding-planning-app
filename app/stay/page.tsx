"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import type { Room, Stay } from "@/lib/types";

type Run = (p: PromiseLike<{ error: { message: string } | null }>) => Promise<void>;

const overlap = (a: Stay, b: Stay) =>
  !a.check_in || !a.check_out || !b.check_in || !b.check_out || (a.check_in <= b.check_out && b.check_in <= a.check_out);

export default function StayPage() {
  const { guests, events, invitations, properties, rooms, stays, canEdit, refresh } = useWedding();
  const [err, setErr] = useState("");
  const [pick, setPick] = useState("");
  const [pickEvent, setPickEvent] = useState("");
  const [bulkDates, setBulkDates] = useState({ check_in: "", check_out: "" });
  const [propForm, setPropForm] = useState({ name: "", address: "" });
  const [roomForm, setRoomForm] = useState<Record<string, { count: string; capacity: string }>>({});

  const run: Run = async (p) => {
    const { error } = await p;
    setErr(error?.message ?? "");
    await refresh();
  };

  const guestById = new Map(guests.map((g) => [g.id, g]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const staying = new Set(stays.map((s) => s.guest_id));
  const needing = guests.filter((g) => !staying.has(g.id));

  // People in a room whose dates overlap this stay (including this stay).
  const load = (s: Stay) =>
    s.room_id ? stays.filter((o) => o.room_id === s.room_id && overlap(o, s)).reduce((n, o) => n + o.people, 0) : 0;

  const totalPeople = stays.reduce((n, s) => n + s.people, 0);
  const placed = stays.filter((s) => s.room_id).reduce((n, s) => n + s.people, 0);
  const capacity = rooms.reduce((n, r) => n + r.capacity, 0);

  const patch = (id: string, fields: Partial<Stay>) => run(supabase().from("stays").update(fields).eq("id", id));

  function addGuest() {
    const g = guestById.get(pick);
    if (!g) return;
    setPick("");
    return run(supabase().from("stays").insert({ guest_id: g.id, people: g.headcount }));
  }

  function addEventGuests() {
    const ids = new Set(invitations.filter((i) => i.event_id === pickEvent).map((i) => i.guest_id));
    const rows = needing.filter((g) => ids.has(g.id)).map((g) => ({ guest_id: g.id, people: g.headcount }));
    setPickEvent("");
    if (rows.length) return run(supabase().from("stays").insert(rows));
  }

  function applyDates() {
    if (!bulkDates.check_in || !bulkDates.check_out) return setErr("Enter both dates.");
    return run(
      supabase().from("stays").update({ check_in: bulkDates.check_in, check_out: bulkDates.check_out }).is("check_in", null),
    );
  }

  function addRooms(propertyId: string) {
    const f = roomForm[propertyId] ?? { count: "", capacity: "2" };
    const n = +f.count;
    if (!(n >= 1 && n <= 100)) return;
    const existing = rooms.filter((r) => r.property_id === propertyId).length;
    const rows = Array.from({ length: n }, (_, i) => ({
      property_id: propertyId, name: `Room ${existing + i + 1}`, capacity: Math.max(1, +f.capacity || 2),
    }));
    setRoomForm({ ...roomForm, [propertyId]: { count: "", capacity: f.capacity } });
    return run(supabase().from("rooms").insert(rows));
  }

  const roomOption = (r: Room) => `${r.name} (sleeps ${r.capacity})`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Need rooms", `${totalPeople} people`],
          ["Placed", `${placed} people`],
          ["Not placed", `${totalPeople - placed} people`],
          ["Beds in rooms", String(capacity)],
        ].map(([label, v]) => (
          <div key={label} className="rounded-lg border bg-white p-3">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="space-y-2">
        <h2 className="font-semibold">Who needs a place to stay</h2>
        {canEdit && (
          <div className="space-y-2 rounded-lg border bg-white p-3">
            <div className="flex flex-wrap gap-2">
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded border p-2">
                <option value="">Add a guest…</option>
                {needing.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.headcount})</option>)}
              </select>
              <button onClick={addGuest} className="rounded bg-rose-600 px-3 py-2 text-white">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={pickEvent} onChange={(e) => setPickEvent(e.target.value)} className="min-w-0 flex-1 rounded border p-2">
                <option value="">Add everyone invited to…</option>
                {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <button onClick={addEventGuests} className="rounded border px-3 py-2">Add all</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-500">Set dates for everyone without dates:</span>
              <input type="date" value={bulkDates.check_in} onChange={(e) => setBulkDates({ ...bulkDates, check_in: e.target.value })} className="rounded border p-1" />
              <input type="date" value={bulkDates.check_out} onChange={(e) => setBulkDates({ ...bulkDates, check_out: e.target.value })} className="rounded border p-1" />
              <button onClick={applyDates} className="rounded border px-3 py-1">Apply</button>
            </div>
          </div>
        )}

        {stays.map((s) => {
          const g = guestById.get(s.guest_id);
          const over = s.room_id ? load(s) > (roomById.get(s.room_id)?.capacity ?? 0) : false;
          return (
            <div key={s.id} className="rounded-lg border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{g?.name}</span>
                {canEdit && <button className="text-red-600" onClick={() => run(supabase().from("stays").delete().eq("id", s.id))}>Remove</button>}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-5">
                <label>
                  <span className="text-gray-500">People</span>
                  <input type="number" min={1} disabled={!canEdit} defaultValue={s.people} className="mt-1 w-full rounded border p-2"
                    onBlur={(e) => +e.target.value >= 1 && +e.target.value !== s.people && patch(s.id, { people: +e.target.value })} />
                </label>
                <label>
                  <span className="text-gray-500">Check in</span>
                  <input type="date" disabled={!canEdit} defaultValue={s.check_in ?? ""} className="mt-1 w-full rounded border p-2"
                    onBlur={(e) => e.target.value !== (s.check_in ?? "") && patch(s.id, { check_in: e.target.value || null })} />
                </label>
                <label>
                  <span className="text-gray-500">Check out</span>
                  <input type="date" disabled={!canEdit} defaultValue={s.check_out ?? ""} className="mt-1 w-full rounded border p-2"
                    onBlur={(e) => e.target.value !== (s.check_out ?? "") && patch(s.id, { check_out: e.target.value || null })} />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-gray-500">Room</span>
                  <select disabled={!canEdit} value={s.room_id ?? ""} onChange={(e) => patch(s.id, { room_id: e.target.value || null })} className="mt-1 w-full rounded border p-2">
                    <option value="">Not placed yet</option>
                    {properties.map((p) => (
                      <optgroup key={p.id} label={p.name}>
                        {rooms.filter((r) => r.property_id === p.id).map((r) => <option key={r.id} value={r.id}>{roomOption(r)}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </div>
              {over && <p className="mt-1 text-red-600">More people than beds in this room for these dates.</p>}
            </div>
          );
        })}
        {!stays.length && <p className="text-sm text-gray-500">Nobody added yet.</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Hotels and rooms</h2>
        {canEdit && (
          <form className="flex flex-wrap gap-2" onSubmit={(e) => {
            e.preventDefault();
            run(supabase().from("properties").insert({ name: propForm.name.trim(), address: propForm.address.trim() || null }));
            setPropForm({ name: "", address: "" });
          }}>
            <input required placeholder="Hotel or guesthouse name" value={propForm.name} onChange={(e) => setPropForm({ ...propForm, name: e.target.value })} className="min-w-0 flex-1 rounded border p-2" />
            <input placeholder="Address (optional)" value={propForm.address} onChange={(e) => setPropForm({ ...propForm, address: e.target.value })} className="min-w-0 flex-1 rounded border p-2" />
            <button className="rounded bg-rose-600 px-3 py-2 text-white">Add</button>
          </form>
        )}
        {properties.map((p) => {
          const mine = rooms.filter((r) => r.property_id === p.id);
          const f = roomForm[p.id] ?? { count: "", capacity: "2" };
          return (
            <div key={p.id} className="rounded-lg border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.name}{p.address ? ` · ${p.address}` : ""}</span>
                {canEdit && <button className="text-red-600" onClick={() => confirm(`Delete ${p.name} and its rooms?`) && run(supabase().from("properties").delete().eq("id", p.id))}>Delete</button>}
              </div>
              <div className="mt-2 divide-y">
                {mine.map((r) => {
                  const who = stays.filter((s) => s.room_id === r.id).map((s) => guestById.get(s.guest_id)?.name).filter(Boolean);
                  return (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span>{r.name} <span className="text-gray-500">· sleeps {r.capacity}</span></span>
                      <span className="text-gray-600">{who.join(", ") || "empty"}</span>
                      {canEdit && <button className="text-red-600" onClick={() => run(supabase().from("rooms").delete().eq("id", r.id))}>Delete</button>}
                    </div>
                  );
                })}
              </div>
              {canEdit && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="number" min={1} placeholder="How many rooms" value={f.count} onChange={(e) => setRoomForm({ ...roomForm, [p.id]: { ...f, count: e.target.value } })} className="w-32 rounded border p-2" />
                  <input type="number" min={1} placeholder="Sleeps" value={f.capacity} onChange={(e) => setRoomForm({ ...roomForm, [p.id]: { ...f, capacity: e.target.value } })} className="w-24 rounded border p-2" />
                  <button onClick={() => addRooms(p.id)} className="rounded border px-3 py-2">Add rooms</button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
