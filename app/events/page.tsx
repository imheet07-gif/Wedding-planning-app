"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { cleanMapUrl, looksLikeGoogleMaps } from "@/lib/invites";
import { MapPin } from "lucide-react";
import type { Rsvp, WeddingEvent } from "@/lib/types";

function EventCard({ ev, open, onToggle }: { ev: WeddingEvent; open: boolean; onToggle: () => void }) {
  const { guests, invitations, canEdit, refresh } = useWedding();
  const notify = useToast();
  const [err, setErr] = useState("");
  const inv = invitations.filter((i) => i.event_id === ev.id);
  const [mapHint, setMapHint] = useState("");
  const people = inv.reduce((n, i) => n + (guests.find((g) => g.id === i.guest_id)?.headcount ?? 0), 0);

  async function save(patch: Partial<WeddingEvent>) {
    const { error } = await supabase().from("events").update(patch).eq("id", ev.id);
    setErr(error?.message ?? "");
    notify(error ? error.message : "Saved", error ? "error" : "ok");
    await refresh();
  }

  async function setRsvp(guestId: string, rsvp: Rsvp) {
    const { error } = await supabase().from("invitations").update({ rsvp }).match({ guest_id: guestId, event_id: ev.id });
    setErr(error?.message ?? "");
    notify(error ? error.message : "Saved", error ? "error" : "ok");
    await refresh();
  }

  const field = (key: "event_date" | "start_time" | "venue", label: string, type = "text") => (
    <label className="block text-sm">
      <span className="text-gray-500">{label}</span>
      <input type={type} disabled={!canEdit} defaultValue={ev[key] ?? ""}
        onBlur={(e) => e.target.value !== (ev[key] ?? "") && save({ [key]: e.target.value || null })}
        className="mt-1 w-full rounded-lg border p-2 disabled:bg-gray-50" />
    </label>
  );

  return (
    <section className="card p-4">
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <h2 className="font-semibold">{ev.name}</h2>
        <span className="text-sm text-gray-500">{people} people · {open ? "hide" : "show"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {field("event_date", "Date", "date")}
            {field("start_time", "Start time", "time")}
            {field("venue", "Venue")}
          </div>
          <div className="space-y-1">
            <label className="block text-sm">
              <span className="text-gray-500">Google Maps link for the venue</span>
              <input type="url" inputMode="url" disabled={!canEdit} defaultValue={ev.map_url ?? ""} placeholder="https://maps.app.goo.gl/…" aria-label="Google Maps link for the venue"
                className="mt-1 w-full rounded-lg border p-2 disabled:bg-gray-50"
                onBlur={(e) => {
                  const clean = cleanMapUrl(e.target.value);
                  if (clean === null) { setMapHint("That does not look like a web address. Copy the link from Google Maps (Share, then Copy link)."); return; }
                  setMapHint(clean && !looksLikeGoogleMaps(clean) ? "Saved, but this does not look like a Google Maps link." : "");
                  e.target.value = clean;
                  if (clean !== (ev.map_url ?? "")) save({ map_url: clean || null });
                }} />
            </label>
            {mapHint && <p role="status" className="text-xs text-amber-700">{mapHint}</p>}
            {ev.map_url ? (
              <a href={ev.map_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 text-sm text-rose-700 underline">
                <MapPin size={14} aria-hidden />Open in Google Maps
              </a>
            ) : (
              canEdit && <p className="text-xs text-gray-500">In Google Maps, find the venue, tap Share, then Copy link, and paste it here. It goes into the invitations automatically.</p>
            )}
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <table className="w-full text-sm">
            <tbody>
              {inv.map((i) => {
                const g = guests.find((x) => x.id === i.guest_id);
                if (!g) return null;
                return (
                  <tr key={i.guest_id} className="border-t">
                    <td className="py-1.5">{g.name}</td>
                    <td className="py-1.5 text-gray-500">{g.headcount}</td>
                    <td className="py-1.5 text-right">
                      <select aria-label={`RSVP for ${g.name}`} disabled={!canEdit} value={i.rsvp} onChange={(e) => setRsvp(g.id, e.target.value as Rsvp)} className="rounded-lg border p-1">
                        <option value="pending">Pending</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
              {!inv.length && <tr><td className="py-3 text-gray-500">Nobody invited yet. Tick this event on the Guests page.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AddEvent({ onAdded }: { onAdded: (id: string) => void }) {
  const { events, canEdit, refresh } = useWedding();
  const notify = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  if (!canEdit) return null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (events.some((ev) => ev.name.toLowerCase() === n.toLowerCase())) return notify(`There is already an event called ${n}.`, "error");
    setBusy(true);
    const sort_order = Math.max(0, ...events.map((ev) => ev.sort_order)) + 1;
    const { data, error } = await supabase().from("events").insert({ name: n, sort_order }).select("id").single();
    setBusy(false);
    notify(error ? error.message : `${n} added. Set its date and venue below.`, error ? "error" : "ok");
    if (error) return;
    setName("");
    await refresh();
    onAdded(data.id);
  }

  return (
    <form onSubmit={add} className="card flex flex-wrap items-end gap-2 p-4">
      <label className="min-w-0 flex-1 text-sm">
        <span className="text-gray-500">Add an event (e.g. Poojan)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name" className="mt-1 w-full rounded-lg border p-2.5" />
      </label>
      <button disabled={busy || !name.trim()} className="min-h-11 rounded-lg bg-rose-600 px-4 text-white disabled:opacity-40">Add event</button>
    </form>
  );
}

function Events() {
  const { events } = useWedding();
  const initial = useSearchParams().get("id");
  const [openId, setOpenId] = useState<string | null>(initial);
  return (
    <div className="space-y-3">
      {events.map((ev) => (
        <EventCard key={ev.id} ev={ev} open={openId === ev.id} onToggle={() => setOpenId(openId === ev.id ? null : ev.id)} />
      ))}
      <AddEvent onAdded={setOpenId} />
    </div>
  );
}

export default function EventsPage() {
  return <Suspense><Events /></Suspense>;
}
