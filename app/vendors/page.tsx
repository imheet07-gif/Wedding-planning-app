"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { CATEGORIES, inr } from "@/lib/constants";
import type { Vendor, VendorStatus } from "@/lib/types";

const statusLabel: Record<VendorStatus, string> = {
  shortlisted: "Shortlisted", booked: "Booked", completed: "Completed",
};

function VendorCard({ v, run }: { v: Vendor; run: (p: PromiseLike<{ error: { message: string } | null }>) => Promise<void> }) {
  const { events, vendorEvents, payments, canEdit } = useWedding();
  const [open, setOpen] = useState(false);
  const [pay, setPay] = useState({ amount: "", label: "", due_on: "" });

  const mine = payments.filter((p) => p.vendor_id === v.id);
  const paid = mine.filter((p) => p.paid_on).reduce((n, p) => n + p.amount, 0);
  const covered = new Set(vendorEvents.filter((x) => x.vendor_id === v.id).map((x) => x.event_id));
  const today = new Date().toISOString().slice(0, 10);

  const patch = (fields: Partial<Vendor>) => run(supabase().from("vendors").update(fields).eq("id", v.id));

  function toggleEvent(eventId: string, on: boolean) {
    const t = supabase().from("vendor_events");
    return run(on ? t.insert({ vendor_id: v.id, event_id: eventId }) : t.delete().match({ vendor_id: v.id, event_id: eventId }));
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    await run(
      supabase().from("payments").insert({
        vendor_id: v.id, amount: +pay.amount, label: pay.label.trim() || null, due_on: pay.due_on || null,
      }),
    );
    setPay({ amount: "", label: "", due_on: "" });
  }

  return (
    <div className="rounded-lg border bg-white p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
        <span>
          <span className="font-medium">{v.name}</span>
          <span className="ml-2 text-xs text-gray-500">{statusLabel[v.status]}</span>
        </span>
        <span className="text-sm text-gray-600">
          {inr(v.quote)} · paid {inr(paid)} · due {inr(Math.max(v.quote - paid, 0))}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-3">
            <label>
              <span className="text-gray-500">Status</span>
              <select disabled={!canEdit} value={v.status} onChange={(e) => patch({ status: e.target.value as VendorStatus })} className="mt-1 w-full rounded border p-2">
                {Object.entries(statusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label>
              <span className="text-gray-500">Quote (₹)</span>
              <input type="number" min={0} disabled={!canEdit} defaultValue={v.quote} className="mt-1 w-full rounded border p-2"
                onBlur={(e) => +e.target.value !== v.quote && +e.target.value >= 0 && patch({ quote: +e.target.value })} />
            </label>
            <label>
              <span className="text-gray-500">Phone</span>
              <input disabled={!canEdit} defaultValue={v.phone ?? ""} className="mt-1 w-full rounded border p-2"
                onBlur={(e) => e.target.value !== (v.phone ?? "") && patch({ phone: e.target.value.trim() || null })} />
            </label>
          </div>
          <label className="block">
            <span className="text-gray-500">Notes</span>
            <textarea disabled={!canEdit} defaultValue={v.notes ?? ""} rows={2} className="mt-1 w-full rounded border p-2"
              onBlur={(e) => e.target.value !== (v.notes ?? "") && patch({ notes: e.target.value.trim() || null })} />
          </label>

          <div>
            <span className="text-gray-500">Works on</span>
            <div className="mt-1 flex flex-wrap gap-3">
              {events.map((ev) => (
                <label key={ev.id} className="flex items-center gap-1">
                  <input type="checkbox" disabled={!canEdit} checked={covered.has(ev.id)} onChange={(e) => toggleEvent(ev.id, e.target.checked)} />
                  {ev.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className="text-gray-500">Payments</span>
            <table className="mt-1 w-full">
              <tbody>
                {mine.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-1.5">{p.label || "Payment"}</td>
                    <td className="py-1.5">{inr(p.amount)}</td>
                    <td className="py-1.5 text-gray-500">{p.paid_on ? `paid ${p.paid_on}` : p.due_on ? `due ${p.due_on}` : "no date"}</td>
                    {canEdit && (
                      <td className="py-1.5 text-right">
                        <button className="mr-3 text-rose-600"
                          onClick={() => run(supabase().from("payments").update({ paid_on: p.paid_on ? null : today }).eq("id", p.id))}>
                          {p.paid_on ? "Undo" : "Mark paid"}
                        </button>
                        <button className="text-red-600" onClick={() => run(supabase().from("payments").delete().eq("id", p.id))}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {canEdit && (
              <form onSubmit={addPayment} className="mt-2 flex flex-wrap gap-2">
                <input required type="number" min={1} placeholder="Amount" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className="w-28 rounded border p-2" />
                <input placeholder="Label (advance…)" value={pay.label} onChange={(e) => setPay({ ...pay, label: e.target.value })} className="min-w-0 flex-1 rounded border p-2" />
                <input type="date" value={pay.due_on} onChange={(e) => setPay({ ...pay, due_on: e.target.value })} className="rounded border p-2" />
                <button className="rounded bg-rose-600 px-3 py-2 text-white">Add</button>
              </form>
            )}
          </div>

          {canEdit && (
            <button className="text-red-600" onClick={() => confirm(`Delete ${v.name} and its payments?`) && run(supabase().from("vendors").delete().eq("id", v.id))}>
              Delete vendor
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function VendorsPage() {
  const { vendors, payments, canEdit, refresh } = useWedding();
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0], phone: "", quote: "", status: "shortlisted" as VendorStatus });
  const [filter, setFilter] = useState("");

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setErr(error?.message ?? "");
    await refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await run(
      supabase().from("vendors").insert({
        name: form.name.trim(), category: form.category, phone: form.phone.trim() || null,
        quote: +form.quote || 0, status: form.status,
      }),
    );
    setForm({ ...form, name: "", phone: "", quote: "" });
  }

  const shown = vendors.filter((v) => !filter || v.category === filter);
  const quoted = vendors.filter((v) => v.status !== "shortlisted").reduce((n, v) => n + v.quote, 0);
  const paid = payments.filter((p) => p.paid_on).reduce((n, p) => n + p.amount, 0);
  const categories = CATEGORIES.filter((c) => shown.some((v) => v.category === c));

  return (
    <div className="space-y-5">
      <p className="text-gray-600">
        {vendors.length} vendors · booked {inr(quoted)} · paid {inr(paid)} · balance {inr(Math.max(quoted - paid, 0))}
      </p>

      {canEdit && (
        <form onSubmit={add} className="grid gap-2 rounded-lg border bg-white p-4 sm:grid-cols-6">
          <input required placeholder="Vendor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded border p-2 sm:col-span-2" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded border p-2">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded border p-2" />
          <input type="number" min={0} placeholder="Quote ₹" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} className="rounded border p-2" />
          <button className="rounded bg-rose-600 p-2 text-white">Add vendor</button>
        </form>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded border bg-white p-2">
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>

      {categories.map((c) => (
        <section key={c} className="space-y-2">
          <h2 className="font-semibold">{c}</h2>
          {shown.filter((v) => v.category === c).map((v) => <VendorCard key={v.id} v={v} run={run} />)}
        </section>
      ))}
      {!shown.length && <p className="text-gray-500">No vendors yet.</p>}
    </div>
  );
}
