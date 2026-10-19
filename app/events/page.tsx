"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import type { Rsvp, WeddingEvent } from "@/lib/types";

function EventCard({ ev, open, onToggle }: { ev: WeddingEvent; open: boolean; onToggle: () => void }) {
  const { guests, invitations, canEdit, refresh } = useWedding();
  const notify = useToast();
  const [err, setErr] = useState("");
  const inv = invitations.filter((i) => i.event_id === ev.id);
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

function Events() {
  const { events } = useWedding();
  const initial = useSearchParams().get("id");
  const [openId, setOpenId] = useState<string | null>(initial);
  return (
    <div className="space-y-3">
      {events.map((ev) => (
        <EventCard key={ev.id} ev={ev} open={openId === ev.id} onToggle={() => setOpenId(openId === ev.id ? null : ev.id)} />
      ))}
    </div>
  );
}

export default function EventsPage() {
  return <Suspense><Events /></Suspense>;
}
