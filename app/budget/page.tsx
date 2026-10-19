"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { CATEGORIES, inr } from "@/lib/constants";

export default function BudgetPage() {
  const { vendors, payments, budget, expenses, events, canEdit, refresh } = useWedding();
  const notify = useToast();
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ category: CATEGORIES[0], description: "", amount: "", event_id: "" });

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setErr(error?.message ?? "");
    notify(error ? error.message : "Saved", error ? "error" : "ok");
    await refresh();
  }

  const rows = CATEGORIES.map((category) => {
    const vs = vendors.filter((v) => v.category === category && v.status !== "shortlisted");
    const ids = new Set(vs.map((v) => v.id));
    const ex = expenses.filter((x) => x.category === category);
    const planned = budget.find((b) => b.category === category)?.planned ?? 0;
    const committed = vs.reduce((n, v) => n + v.quote, 0) + ex.reduce((n, x) => n + x.amount, 0);
    const paid =
      payments.filter((p) => ids.has(p.vendor_id) && p.paid_on).reduce((n, p) => n + p.amount, 0) +
      ex.filter((x) => x.paid).reduce((n, x) => n + x.amount, 0);
    return { category, planned, committed, paid };
  });
  const sum = (k: "planned" | "committed" | "paid") => rows.reduce((n, r) => n + r[k], 0);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    await run(
      supabase().from("expenses").insert({
        category: form.category, description: form.description.trim(), amount: +form.amount,
        event_id: form.event_id || null,
      }),
    );
    setForm({ ...form, description: "", amount: "" });
  }

  const tiles: [string, number][] = [
    ["Planned", sum("planned")],
    ["Committed", sum("committed")],
    ["Paid", sum("paid")],
    ["Left to commit", sum("planned") - sum("committed")],
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Committed = quotes of booked vendors (not shortlisted) plus other expenses. Set a planned amount per category.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([label, n]) => (
          <div key={label} className="card p-3">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-xl font-semibold ${n < 0 ? "text-red-600" : ""}`}>{inr(n)}</p>
          </div>
        ))}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="overflow-x-auto card">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr><th className="p-1.5 sm:p-2">Category</th><th className="p-1.5 sm:p-2">Planned ₹</th><th className="p-1.5 sm:p-2">Committed</th><th className="p-1.5 sm:p-2">Paid</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category} className="border-t">
                <td className="p-1.5 sm:p-2">{r.category}</td>
                <td className="p-1.5 sm:p-2">
                  {canEdit ? (
                    <input type="number" min={0} defaultValue={r.planned || ""} className="w-20 rounded-lg border p-1 sm:w-28"
                      onBlur={(e) => (+e.target.value || 0) !== r.planned &&
                        run(supabase().from("budget_categories").upsert({ category: r.category, planned: +e.target.value || 0 }))} />
                  ) : inr(r.planned)}
                </td>
                <td className={`p-1.5 sm:p-2 ${r.planned && r.committed > r.planned ? "font-medium text-red-600" : ""}`}>
                  {inr(r.committed)}{r.planned && r.committed > r.planned ? " (over)" : ""}
                </td>
                <td className="p-1.5 sm:p-2">{inr(r.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Other expenses</h2>
        {canEdit && (
          <form onSubmit={addExpense} className="grid grid-cols-1 gap-2 card p-4 sm:grid-cols-5">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border p-2">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input required placeholder="What (bride lehenga…)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border p-2 sm:col-span-2" />
            <input required type="number" min={0} placeholder="Amount ₹" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="rounded-lg border p-2" />
            <button className="rounded-lg bg-rose-600 p-2 text-white">Add</button>
            <select value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })} className="rounded-lg border p-2 sm:col-span-2">
              <option value="">No specific event</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </form>
        )}
        <div className="card">
          {expenses.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm last:border-b-0">
              <span>
                {x.description} <span className="text-gray-500">· {x.category}{x.event_id ? ` · ${events.find((e) => e.id === x.event_id)?.name ?? ""}` : ""}</span>
              </span>
              <span className="flex items-center gap-3">
                {inr(x.amount)}
                <label className="flex items-center gap-1 text-gray-600">
                  <input type="checkbox" disabled={!canEdit} checked={x.paid} onChange={(e) => run(supabase().from("expenses").update({ paid: e.target.checked }).eq("id", x.id))} /> paid
                </label>
                {canEdit && <button className="text-red-600" onClick={() => run(supabase().from("expenses").delete().eq("id", x.id))}>Delete</button>}
              </span>
            </div>
          ))}
          {!expenses.length && <p className="p-3 text-sm text-gray-500">None yet.</p>}
        </div>
      </section>
    </div>
  );
}
