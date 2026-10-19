"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/ui";
import { Check, FileSpreadsheet, Minus, Phone, Plus, Trash2, UsersRound, X } from "lucide-react";
import type { Guest, Side } from "@/lib/types";

const sideLabel: Record<Side, string> = { bride: "Bride", groom: "Groom", both: "Both" };

// Optional spellings used when an invitation is written in Gujarati or Hindi. Blank means the English name is used.
function NameLangs({ g, canEdit, save }: { g: Guest; canEdit: boolean; save: (patch: { name_gu?: string | null; name_hi?: string | null }) => void }) {
  const has = !!(g.name_gu || g.name_hi);
  if (!canEdit && !has) return null;
  const field = (key: "name_gu" | "name_hi", label: string, lang: string) => (
    <input aria-label={`${g.name} in ${label}`} lang={lang} placeholder={label} disabled={!canEdit} defaultValue={g[key] ?? ""}
      onBlur={(e) => e.target.value.trim() !== (g[key] ?? "") && save({ [key]: e.target.value.trim() || null })}
      className="min-w-0 flex-1 rounded-lg border p-2 text-sm" />
  );
  return (
    <details className="text-xs text-gray-500" open={has && !canEdit}>
      <summary className="min-h-8 cursor-pointer py-1 text-rose-700 underline">Name in Gujarati / Hindi{has ? " ✓" : ""}</summary>
      <div className="mt-1 flex gap-2">{field("name_gu", "ગુજરાતી", "gu")}{field("name_hi", "हिन्दी", "hi")}</div>
    </details>
  );
}

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
  const [adding, setAdding] = useState<boolean | null>(null);

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
  // On phones the add forms start closed once there are guests, so the list is the first thing you see.
  const showAdd = adding ?? guests.length === 0;

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
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setAdding(!showAdd)} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white md:hidden">
            {showAdd ? <X size={16} /> : <Plus size={16} />}{showAdd ? "Close" : "Add guests"}
          </button>
          <Link href="/import" className="inline-flex items-center gap-2 text-sm text-rose-700 underline">
            <FileSpreadsheet size={16} />Import from a spreadsheet
          </Link>
        </div>
      )}
      {canEdit && (
        <div className={`grid-cols-1 gap-4 md:grid md:grid-cols-2 ${showAdd ? "grid" : "hidden"}`}>
          <form onSubmit={addGuest} className="space-y-2 card p-4">
            <h2 className="font-semibold">Add guest or family</h2>
            <input aria-label="Name (e.g. Sharma family)" required placeholder="Name (e.g. Sharma family)" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border p-2" />
            <div className="flex gap-2">
              <select aria-label="Side" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value as Side })} className="rounded-lg border p-2">
                {Object.entries(sideLabel).map(([k, v]) => <option key={k} value={k}>{v} side</option>)}
              </select>
              <input aria-label="Number of people" type="number" min={1} value={form.headcount} title="Number of people"
                onChange={(e) => setForm({ ...form, headcount: Math.max(1, +e.target.value) })} className="w-20 rounded-lg border p-2" />
              <input aria-label="Group" placeholder="Group" value={form.grp}
                onChange={(e) => setForm({ ...form, grp: e.target.value })} className="min-w-0 flex-1 rounded-lg border p-2" />
            </div>
            <div className="flex gap-2">
              <input aria-label="Phone" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="min-w-0 flex-1 rounded-lg border p-2" />
              <input aria-label="Diet (Jain, veg…)" placeholder="Diet (Jain, veg…)" value={form.diet} onChange={(e) => setForm({ ...form, diet: e.target.value })} className="min-w-0 flex-1 rounded-lg border p-2" />
            </div>
            <button className="rounded-lg bg-rose-600 px-4 py-2 text-white">Add</button>
          </form>

          <div className="space-y-2 card p-4">
            <h2 className="font-semibold">Paste many</h2>
            <p className="text-sm text-gray-500">One per line. Add a count after a comma, e.g. “Sharma family, 5”.</p>
            <textarea aria-label="Guests to add, one per line" rows={4} value={bulk} onChange={(e) => setBulk(e.target.value)} className="w-full rounded-lg border p-2" />
            <div className="flex gap-2">
              <select aria-label="Side for pasted guests" value={bulkSide} onChange={(e) => setBulkSide(e.target.value as Side)} className="rounded-lg border p-2">
                {Object.entries(sideLabel).map(([k, v]) => <option key={k} value={k}>{v} side</option>)}
              </select>
              <button onClick={addBulk} className="rounded-lg bg-rose-600 px-4 py-2 text-white">Add all</button>
            </div>
          </div>
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="space-y-2">
        <input aria-label="Search guests" placeholder="Search guests" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border p-2.5" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select aria-label="Filter by side" value={sideFilter} onChange={(e) => setSideFilter(e.target.value)} className="rounded-lg border p-2.5">
            <option value="">Both sides</option>
            <option value="bride">Bride</option>
            <option value="groom">Groom</option>
          </select>
          <select aria-label="Filter by event" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="rounded-lg border p-2.5">
            <option value="">All events</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
        <p className="text-sm text-gray-500">{shown.length} entries · {shownPeople} people</p>
        {canEdit && shown.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 md:hidden">
            <span className="text-xs text-gray-500">Invite everyone shown to:</span>
            {events.map((ev) => (
              <button key={ev.id} onClick={() => invitedToAll(ev.id)} className="rounded-full border bg-white px-3 py-1 text-xs text-rose-700">{ev.name}</button>
            ))}
          </div>
        )}
      </div>

      {shown.length === 0 && (
        <div className="card">
          <EmptyState icon={<UsersRound size={22} />} title={guests.length ? "No one matches" : "No guests yet"}
            hint={guests.length ? "Try clearing the search or filters." : "Add a family above, paste a list of names, or import a whole spreadsheet."}>
            {canEdit && !guests.length && (
              <Link href="/import" className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm text-white hover:bg-rose-700">
                <FileSpreadsheet size={16} />Import a spreadsheet
              </Link>
            )}
          </EmptyState>
        </div>
      )}

      {/* Phones: one card per guest, with a tap-to-invite chip for every event. */}
      <div className="space-y-3 md:hidden">
        {shown.map((g) => (
          <div key={g.id} className="card space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-gray-500">{[sideLabel[g.side] + " side", g.grp, g.diet].filter(Boolean).join(" · ")}</p>
                {g.phone && (
                  <a href={`tel:${g.phone.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs text-rose-700 underline">
                    <Phone size={12} aria-hidden />{g.phone}
                  </a>
                )}
              </div>
              {canEdit && (
                <button aria-label={`Delete ${g.name}`} className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => confirm(`Delete ${g.name}?`) && run(supabase().from("guests").delete().eq("id", g.id))}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <NameLangs g={g} canEdit={canEdit} save={(patch) => run(supabase().from("guests").update(patch).eq("id", g.id))} />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">People</span>
              {canEdit ? (
                <span className="flex items-center gap-3">
                  <button aria-label="Fewer people" disabled={g.headcount <= 1} className="flex h-8 w-8 items-center justify-center rounded-full border bg-white disabled:opacity-40"
                    onClick={() => run(supabase().from("guests").update({ headcount: g.headcount - 1 }).eq("id", g.id))}><Minus size={14} /></button>
                  <span className="w-5 text-center font-medium">{g.headcount}</span>
                  <button aria-label="More people" className="flex h-8 w-8 items-center justify-center rounded-full border bg-white"
                    onClick={() => run(supabase().from("guests").update({ headcount: g.headcount + 1 }).eq("id", g.id))}><Plus size={14} /></button>
                </span>
              ) : <span className="font-medium">{g.headcount}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {events.map((ev) => {
                const on = invited.get(g.id)?.has(ev.id) ?? false;
                return (
                  <button key={ev.id} disabled={!canEdit} onClick={() => toggleEvent(g.id, ev.id, !on)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-rose-600 bg-rose-600 text-white" : "bg-white text-gray-600"}`}>
                    {on && <Check size={12} className="mr-1 inline" />}{ev.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Laptops: a table with a checkbox per event. */}
      {shown.length > 0 && (
        <div className="card hidden overflow-x-auto md:block">
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
                {canEdit && <th><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((g) => (
                <tr key={g.id} className="border-t">
                  <td className="p-2">
                    {g.name}
                    <div className="text-xs text-gray-500">{[g.grp, g.phone, g.diet].filter(Boolean).join(" · ")}</div>
                    <NameLangs g={g} canEdit={canEdit} save={(patch) => run(supabase().from("guests").update(patch).eq("id", g.id))} />
                  </td>
                  <td className="p-2">{sideLabel[g.side]}</td>
                  <td className="p-2">
                    {canEdit ? (
                      <input aria-label={`People in ${g.name}`} type="number" min={1} defaultValue={g.headcount} className="w-16 rounded-lg border p-1"
                        onBlur={(e) => +e.target.value >= 1 && +e.target.value !== g.headcount &&
                          run(supabase().from("guests").update({ headcount: +e.target.value }).eq("id", g.id))} />
                    ) : g.headcount}
                  </td>
                  {events.map((ev) => (
                    <td key={ev.id} className="p-2 text-center">
                      <input aria-label={`${g.name} invited to ${ev.name}`} type="checkbox" disabled={!canEdit} checked={invited.get(g.id)?.has(ev.id) ?? false}
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
