"use client";
import Link from "next/link";
import { useWedding } from "@/components/WeddingProvider";
import { inr } from "@/lib/constants";
import { formatDate } from "@/lib/whatsapp";

export default function Dashboard() {
  const { events, guests, invitations, vendors, payments, tasks } = useWedding();
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

  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));
  const upcoming = payments
    .filter((p) => !p.paid_on && p.due_on)
    .sort((a, b) => a.due_on!.localeCompare(b.due_on!))
    .slice(0, 5);

  const openTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"))
    .slice(0, 5);
  const openCount = tasks.filter((t) => !t.done).length;

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
      {upcoming.length > 0 && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-semibold">Next payments due</h2>
          {upcoming.map((p) => (
            <div key={p.id} className="flex justify-between border-t py-1.5 text-sm first:border-t-0">
              <span>{vendorName.get(p.vendor_id)}{p.label ? ` · ${p.label}` : ""}</span>
              <span>{inr(p.amount)} · {p.due_on}</span>
            </div>
          ))}
        </section>
      )}
      {openTasks.length > 0 && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 font-semibold">To do ({openCount} open)</h2>
          {openTasks.map((t) => (
            <div key={t.id} className="flex justify-between gap-3 border-t py-1.5 text-sm first:border-t-0">
              <span>{t.title}</span>
              <span className="shrink-0 text-gray-500">{t.due_on ? formatDate(t.due_on) : ""}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
