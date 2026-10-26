"use client";
import Link from "next/link";
import { ArrowRight, CalendarHeart, HelpCircle, ListChecks, MapPin, Send, UsersRound, Wallet, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { Bar, CountUp } from "@/components/ui";
import { PhotoBanner, parseShape } from "@/components/Couple";
import { parseFocus } from "@/lib/image";
import { InstallCard } from "@/components/Install";
import { inr } from "@/lib/constants";
import { formatDate } from "@/lib/whatsapp";

const DAY = 86400000;
const daysUntil = (d: string) => Math.round((new Date(`${d}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / DAY);
const when = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : n > 1 ? `in ${n} days` : `${-n} days ago`);

function Tile({ href, icon: Icon, label, value, sub, pct, delay }: {
  href: string; icon: LucideIcon; label: string; value: React.ReactNode; sub: string; pct?: number; delay: number;
}) {
  return (
    <Link href={href} style={{ animationDelay: `${delay}ms` }} className="card card-hover animate-fade-up space-y-2 p-4">
      <div className="flex items-center justify-between text-gray-500">
        <span className="text-sm">{label}</span>
        <Icon size={18} className="text-rose-500" />
      </div>
      <p className="font-display text-3xl">{value}</p>
      {pct !== undefined && <Bar parts={[{ pct, className: "bg-rose-500" }]} />}
      <p className="text-xs text-gray-500">{sub}</p>
    </Link>
  );
}

export default function Dashboard() {
  const { events, guests, invitations, skips, vendors, payments, budget, expenses, tasks, settings, canEdit, refresh } = useWedding();
  const notify = useToast();

  const headcount = new Map(guests.map((g) => [g.id, g.headcount]));
  const people = guests.reduce((n, g) => n + g.headcount, 0);

  const photo = settings.couple_photo_url || "";
  const names = settings.couple_names || "";
  const wedding = events.find((e) => /wedding/i.test(e.name)) ?? events[events.length - 1];
  const weddingDays = wedding?.event_date ? daysUntil(wedding.event_date) : null;

  const sent = invitations.filter((i) => i.sent_at).length;
  const planned = budget.reduce((n, b) => n + b.planned, 0);
  const committed =
    vendors.filter((v) => v.status !== "shortlisted").reduce((n, v) => n + v.quote, 0) + expenses.reduce((n, x) => n + x.amount, 0);
  const doneTasks = tasks.filter((t) => t.done).length;

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

  // Guests on the list who still have no yes/no decision for an event. Kept apart from the event cards, which only count invited people.
  const decidedKeys = new Set([...invitations.map((i) => `${i.guest_id}|${i.event_id}`), ...skips.map((k) => `${k.guest_id}|${k.event_id}`)]);
  const undecidedFor = (guestId: string) => events.filter((ev) => !decidedKeys.has(`${guestId}|${ev.id}`));
  const someUndecided = guests.filter((g) => undecidedFor(g.id).length > 0);
  const noneDecided = events.length ? guests.filter((g) => undecidedFor(g.id).length === events.length) : [];
  const headcountOf = (list: typeof guests) => list.reduce((n, g) => n + g.headcount, 0);
  const undecidedByEvent = events.map((ev) => ({ ev, n: guests.filter((g) => !decidedKeys.has(`${g.id}|${ev.id}`)).length })).filter((x) => x.n > 0);

  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));
  const upcoming = payments
    .filter((p) => !p.paid_on && p.due_on)
    .sort((a, b) => a.due_on!.localeCompare(b.due_on!))
    .slice(0, 5);
  const todo = tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"))
    .slice(0, 5);
  const today = new Date().toISOString().slice(0, 10);

  async function tick(id: string) {
    const { error } = await supabase().from("tasks").update({ done: true }).eq("id", id);
    notify(error ? error.message : "Task done", error ? "error" : "ok");
    await refresh();
  }

  return (
    <div className="space-y-6">
      {photo ? (
        <div className="animate-fade-up">
          <PhotoBanner url={photo} focus={parseFocus(settings.couple_photo_focus)} shape={parseShape(settings.couple_photo_shape)} caption={names}>
            <div className="px-6 pb-6 pt-6 lg:p-8">
        <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-widest text-[#f0cf75]">{wedding?.name ?? "The big day"}</p>
                  {names && <h2 className="mt-1 font-display text-2xl leading-tight lg:text-3xl">{names}</h2>}
                  {weddingDays === null ? (
                    <>
                      <p className="mt-2 font-display text-3xl">Set the date to start the countdown</p>
                      {wedding && canEdit && (
                        <Link href={`/events?id=${wedding.id}`} className="mt-3 inline-flex items-center gap-1 text-sm text-[#fde8ec] underline">
                          Add the date <ArrowRight size={14} />
                        </Link>
                      )}
                    </>
                  ) : weddingDays >= 0 ? (
                    <>
                      <p className="mt-1 font-display text-6xl leading-none lg:text-7xl"><CountUp value={weddingDays} /></p>
                      <p className="mt-2 text-[#fde8ec]">{weddingDays === 0 ? "It is today. Congratulations!" : `days to go · ${formatDate(wedding!.event_date)}`}</p>
                    </>
                  ) : (
                    <p className="mt-2 font-display text-3xl">Congratulations!</p>
                  )}
                </div>
              </div>
              <div className="relative mt-5 flex flex-wrap items-center gap-2">
                <Link href="/guests" className="rounded-lg bg-white/15 px-3 py-2 text-sm backdrop-blur hover:bg-white/25">Guests</Link>
                <Link href="/invites" className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50">Send invites</Link>
                {canEdit && !photo && <Link href="/settings" className="px-2 py-2 text-xs text-[#f9ccd6] underline">Add your photo</Link>}
              </div>
            </div>
          </PhotoBanner>
        </div>
      ) : (
        <section className="hero animate-fade-up relative overflow-hidden rounded-2xl p-6 text-white shadow-card lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-widest text-[#f0cf75]">{wedding?.name ?? "The big day"}</p>
            {names && <h2 className="mt-1 font-display text-2xl leading-tight lg:text-3xl">{names}</h2>}
            {weddingDays === null ? (
              <>
                <p className="mt-2 font-display text-3xl">Set the date to start the countdown</p>
                {wedding && canEdit && (
                  <Link href={`/events?id=${wedding.id}`} className="mt-3 inline-flex items-center gap-1 text-sm text-[#fde8ec] underline">
                    Add the date <ArrowRight size={14} />
                  </Link>
                )}
              </>
            ) : weddingDays >= 0 ? (
              <>
                <p className="mt-1 font-display text-6xl leading-none lg:text-7xl"><CountUp value={weddingDays} /></p>
                <p className="mt-2 text-[#fde8ec]">{weddingDays === 0 ? "It is today. Congratulations!" : `days to go · ${formatDate(wedding!.event_date)}`}</p>
              </>
            ) : (
              <p className="mt-2 font-display text-3xl">Congratulations!</p>
            )}
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          <Link href="/guests" className="rounded-lg bg-white/15 px-3 py-2 text-sm backdrop-blur hover:bg-white/25">Guests</Link>
          <Link href="/invites" className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50">Send invites</Link>
          {canEdit && !photo && <Link href="/settings" className="px-2 py-2 text-xs text-[#f9ccd6] underline">Add your photo</Link>}
        </div>
        </section>
      )}

      <InstallCard />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile href="/guests" icon={UsersRound} label="People invited" delay={60}
          value={<CountUp value={people} />} sub={`${guests.length} guest entries`} />
        <Tile href="/invites" icon={Send} label="Invites sent" delay={120}
          value={<><CountUp value={sent} /><span className="text-lg text-gray-400"> / {invitations.length}</span></>}
          sub={invitations.length ? "on WhatsApp" : "No invitations yet"} pct={invitations.length ? (sent / invitations.length) * 100 : 0} />
        <Tile href="/budget" icon={Wallet} label="Budget committed" delay={180}
          value={<CountUp value={committed} format={inr} />}
          sub={planned ? `of ${inr(planned)} planned` : "Set a planned budget"} pct={planned ? (committed / planned) * 100 : 0} />
        <Tile href="/tasks" icon={ListChecks} label="Tasks done" delay={240}
          value={<><CountUp value={doneTasks} /><span className="text-lg text-gray-400"> / {tasks.length}</span></>}
          sub={tasks.length ? `${tasks.length - doneTasks} still open` : "No tasks yet"} pct={tasks.length ? (doneTasks / tasks.length) * 100 : 0} />
      </div>

      {someUndecided.length > 0 && (
        <section className="card space-y-3 p-4">
          <h2 className="flex items-center gap-2 font-display text-xl"><HelpCircle size={20} className="text-gold-600" />Undecided guests</h2>
          <p className="text-sm text-gray-600">
            Guests on your list you have not yet decided on (invite or not) for one or more events. They are not counted in the event cards below, which only count invited people.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/guests?event=__none" className="card card-hover block p-3">
              <p className="font-display text-3xl">{noneDecided.length}<span className="ml-1 font-sans text-sm text-gray-500">{noneDecided.length === 1 ? "guest" : "guests"}</span></p>
              <p className="text-sm text-gray-600">not decided for any event yet · {headcountOf(noneDecided)} people</p>
            </Link>
            <Link href="/guests?event=__undecided" className="card card-hover block p-3">
              <p className="font-display text-3xl">{someUndecided.length}<span className="ml-1 font-sans text-sm text-gray-500">{someUndecided.length === 1 ? "guest" : "guests"}</span></p>
              <p className="text-sm text-gray-600">undecided for at least one event · {headcountOf(someUndecided)} people</p>
            </Link>
          </div>
          <p className="text-xs text-gray-500">Undecided for a particular event:</p>
          <div className="flex flex-wrap gap-2">
            {undecidedByEvent.map(({ ev, n }) => (
              <Link key={ev.id} href={`/guests?event=${ev.id}&status=undecided`} className="inline-flex min-h-10 items-center rounded-full border bg-white px-3 text-sm text-amber-700">
                {ev.name} · {n}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-xl"><CalendarHeart size={20} className="text-rose-500" />Events</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ ev, invited, yes, no, pending }, i) => {
            const d = ev.event_date ? daysUntil(ev.event_date) : null;
            return (
              <div key={ev.id} style={{ animationDelay: `${300 + i * 50}ms` }} className="card card-hover animate-fade-up relative space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg"><Link href={`/events?id=${ev.id}`} className="after:absolute after:inset-0 after:content-['']">{ev.name}</Link></h3>
                    <p className="text-sm text-gray-500">{[ev.event_date && formatDate(ev.event_date), ev.venue].filter(Boolean).join(" · ") || "Date and venue not set"}</p>
                    {ev.map_url && (
                      <a href={ev.map_url} target="_blank" rel="noreferrer" className="relative z-10 mt-1 inline-flex min-h-10 items-center gap-1 text-sm text-rose-700 underline">
                        <MapPin size={14} aria-hidden />Open in Maps<span className="sr-only"> for {ev.name} (opens in a new tab)</span>
                      </a>
                    )}
                  </div>
                  {d !== null && d >= 0 && <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-600">{when(d)}</span>}
                </div>
                <div>
                  <p className="font-display text-3xl">{invited}<span className="ml-1 font-sans text-sm text-gray-500">people invited</span></p>
                </div>
                <Bar parts={[
                  { pct: invited ? (yes / invited) * 100 : 0, className: "bg-green-500", label: `${yes} yes` },
                  { pct: invited ? (no / invited) * 100 : 0, className: "bg-rose-400", label: `${no} no` },
                  { pct: invited ? (pending / invited) * 100 : 0, className: "bg-gold-400", label: `${pending} pending` },
                ]} />
                <p className="flex gap-3 text-xs text-gray-600">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />{yes} yes</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />{no} no</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-gold-400" />{pending} pending</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card animate-fade-up p-4" style={{ animationDelay: "500ms" }}>
          <h2 className="mb-2 font-display text-lg">Next payments due</h2>
          {upcoming.length === 0 && <p className="py-3 text-sm text-gray-500">Nothing due. Add payments on a vendor to see them here.</p>}
          {upcoming.map((p) => (
            <div key={p.id} className="flex justify-between gap-3 border-t py-2 text-sm first:border-t-0">
              <span>{vendorName.get(p.vendor_id)}{p.label ? <span className="text-gray-500"> · {p.label}</span> : ""}</span>
              <span className={`shrink-0 ${p.due_on! < today ? "font-medium text-red-600" : "text-gray-600"}`}>{inr(p.amount)} · {formatDate(p.due_on)}</span>
            </div>
          ))}
        </section>

        <section className="card animate-fade-up p-4" style={{ animationDelay: "560ms" }}>
          <h2 className="mb-2 font-display text-lg">To do</h2>
          {todo.length === 0 && <p className="py-3 text-sm text-gray-500">Nothing open. Add tasks on the Tasks page.</p>}
          {todo.map((t) => (
            <label key={t.id} className="flex items-center gap-3 border-t py-2 text-sm first:border-t-0">
              <input type="checkbox" disabled={!canEdit} checked={false} onChange={() => tick(t.id)} />
              <span className="flex-1">{t.title}</span>
              {t.due_on && <span className={`shrink-0 text-xs ${t.due_on < today ? "font-medium text-red-600" : "text-gray-500"}`}>{formatDate(t.due_on)}</span>}
            </label>
          ))}
        </section>
      </div>
    </div>
  );
}
