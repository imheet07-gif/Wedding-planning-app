"use client";
import { useState } from "react";
import { Check, MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/ui";
import { normalizePhone, timeAgo } from "@/lib/whatsapp";
import type { Guest, Rsvp } from "@/lib/types";

const RSVPS: { value: Rsvp; label: string; on: string }[] = [
  { value: "pending", label: "Pending", on: "border-gold-500 bg-gold-100 text-gold-600" },
  { value: "yes", label: "Coming", on: "border-green-700 bg-green-700 text-white" },
  { value: "no", label: "Not coming", on: "border-rose-600 bg-rose-600 text-white" },
];

export default function CallsPage() {
  const { guests, events, invitations, settings, canEdit, refresh } = useWedding();
  const notify = useToast();
  const [eventId, setEventId] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const cc = settings.country_code ?? "91";

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok = "Saved") {
    const { error } = await p;
    notify(error ? error.message : ok, error ? "error" : "ok");
    await refresh();
  }

  const mine = (g: Guest) => invitations.filter((i) => i.guest_id === g.id && (!eventId || i.event_id === eventId));
  const rows = guests
    .filter((g) => mine(g).length > 0 && (!onlyPending || mine(g).some((i) => i.rsvp === "pending")))
    .sort((a, b) => (a.last_called_at ?? "").localeCompare(b.last_called_at ?? "") || a.name.localeCompare(b.name));

  const stamp = (g: Guest) => canEdit && run(supabase().from("guests").update({ last_called_at: new Date().toISOString() }).eq("id", g.id), "Marked as called");
  const eventName = (id: string) => events.find((e) => e.id === id)?.name ?? "";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-lg border p-2.5" aria-label="Event">
          <option value="">All events</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Only guests who have not answered
        </label>
      </div>
      <p className="text-sm text-gray-500">
        {rows.length} {rows.length === 1 ? "guest" : "guests"} · least recently called first
      </p>

      {rows.length === 0 && (
        <div className="card">
          <EmptyState icon={<Check size={22} />} title={onlyPending ? "Everyone has answered" : "No one to show"}
            hint={onlyPending ? "No pending RSVPs for this view. Untick the box above to see everyone." : "Invite guests to an event on the Guests page first."} />
        </div>
      )}

      <div className="space-y-3">
        {rows.map((g) => {
          const phone = normalizePhone(g.phone, cc);
          return (
            <article key={g.id} className="card space-y-3 p-4" aria-label={g.name}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-sans text-base font-medium">{g.name}</h2>
                  <p className="text-sm text-gray-500">{g.headcount} {g.headcount === 1 ? "person" : "people"}{g.phone ? ` · ${g.phone}` : ""}</p>
                  <p className="text-xs text-gray-500">{timeAgo(g.last_called_at)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {phone ? (
                    <>
                      <a href={`tel:+${phone}`} onClick={() => stamp(g)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700">
                        <Phone size={16} aria-hidden />Call
                      </a>
                      <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" aria-label={`Open WhatsApp chat with ${g.name}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border bg-white text-green-700 hover:bg-green-50">
                        <MessageCircle size={18} aria-hidden />
                      </a>
                    </>
                  ) : (
                    <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500">No valid number</span>
                  )}
                </div>
              </div>

              {mine(g).map((i) => (
                <div key={i.event_id} className="space-y-1">
                  <p className="text-xs font-medium text-gray-600">{eventName(i.event_id)}</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={`RSVP for ${eventName(i.event_id)}`}>
                    {RSVPS.map((r) => (
                      <button key={r.value} disabled={!canEdit} aria-pressed={i.rsvp === r.value}
                        onClick={() => i.rsvp !== r.value && run(supabase().from("invitations").update({ rsvp: r.value }).match({ guest_id: g.id, event_id: i.event_id }))}
                        className={`min-h-9 rounded-full border px-3 text-xs font-medium ${i.rsvp === r.value ? r.on : "bg-white text-gray-600"}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <input aria-label={`Call note for ${g.name}`} placeholder="Note from the call" disabled={!canEdit} defaultValue={g.call_note ?? ""}
                  className="min-w-0 flex-1 rounded-lg border p-2 text-sm"
                  onBlur={(e) => e.target.value.trim() !== (g.call_note ?? "") && run(supabase().from("guests").update({ call_note: e.target.value.trim() || null }).eq("id", g.id), "Note saved")} />
                {canEdit && <button onClick={() => stamp(g)} className="shrink-0 text-sm text-rose-700 underline">Mark called</button>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
