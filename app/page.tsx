"use client";
import Link from "next/link";
import { useWedding } from "@/components/WeddingProvider";

export default function Dashboard() {
  const { events, guests, invitations } = useWedding();
  const headcount = new Map(guests.map((g) => [g.id, g.headcount]));

  const rows = events.map((ev) => {
    const inv = invitations.filter((i) => i.event_id === ev.id);
    const sum = (list: typeof inv) => list.reduce((n, i) => n + (headcount.get(i.guest_id) ?? 0), 0);
    return {
      ev,
      invited: sum(inv),
      yes: sum(inv.filter((i) => i.rsvp === "yes")),
      no: sum(inv.filter((i) => i.rsvp === "no")),
      pending: sum(inv.filter((i) => i.rsvp === "pending")),
    };
  });
  const totalPeople = guests.reduce((n, g) => n + g.headcount, 0);

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        {guests.length} invitee entries · {totalPeople} people across all events
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ ev, invited, yes, no, pending }) => (
          <Link key={ev.id} href={`/events?id=${ev.id}`} className="rounded-lg border bg-white p-4 hover:shadow">
            <h2 className="font-semibold">{ev.name}</h2>
            <p className="text-sm text-gray-500">
              {[ev.event_date, ev.venue].filter(Boolean).join(" · ") || "Date and venue not set"}
            </p>
            <p className="mt-2 text-3xl font-semibold">{invited}</p>
            <p className="text-sm text-gray-500">people invited</p>
            <p className="mt-2 text-xs text-gray-600">
              {yes} yes · {no} no · {pending} pending
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
