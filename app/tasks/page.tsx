"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/ui";
import { ListChecks } from "lucide-react";
import { formatDate } from "@/lib/whatsapp";

const STARTER = [
  "Fix the wedding dates", "Set the overall budget", "Draft the guest list", "Book the venue",
  "Book photographer and videographer", "Book caterer", "Book decorator", "Book makeup artist and mehendi artist",
  "Finalise outfits", "Design and send invites", "Book guest accommodation", "Plan the sangeet performances",
  "Arrange transport for guests", "Confirm final headcount with caterer", "Pay all vendor balances",
];

export default function TasksPage() {
  const { tasks, canEdit, refresh } = useWedding();
  const notify = useToast();
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [form, setForm] = useState({ title: "", due_on: "", assignee: "" });
  const today = new Date().toISOString().slice(0, 10);

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setErr(error?.message ?? "");
    notify(error ? error.message : "Saved", error ? "error" : "ok");
    await refresh();
  }

  const shown = tasks
    .filter((t) => filter === "all" || (filter === "done") === t.done)
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"));
  const open = tasks.filter((t) => !t.done).length;

  return (
    <div className="space-y-4">
      <p className="text-gray-600">{open} open · {tasks.length - open} done</p>

      {canEdit && (
        <form className="grid grid-cols-1 gap-2 card p-3 sm:grid-cols-5" onSubmit={(e) => {
          e.preventDefault();
          run(supabase().from("tasks").insert({
            title: form.title.trim(), due_on: form.due_on || null, assignee: form.assignee.trim() || null,
          }));
          setForm({ title: "", due_on: "", assignee: "" });
        }}>
          <input required placeholder="What needs doing" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border p-2 sm:col-span-2" />
          <input type="date" aria-label="Due date" value={form.due_on} onChange={(e) => setForm({ ...form, due_on: e.target.value })} className="rounded-lg border p-2" />
          <input placeholder="Who" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} className="rounded-lg border p-2" />
          <button className="rounded-lg bg-rose-600 p-2 text-white">Add</button>
        </form>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div className="flex gap-2 text-sm">
        {(["open", "done", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1 ${filter === f ? "bg-rose-600 text-white" : "border bg-white"}`}>{f}</button>
        ))}
      </div>

      <div className="card">
        {shown.map((t) => (
          <div key={t.id} className="flex items-start gap-3 border-b p-3 last:border-b-0">
            <input type="checkbox" className="mt-1" disabled={!canEdit} checked={t.done}
              onChange={(e) => run(supabase().from("tasks").update({ done: e.target.checked }).eq("id", t.id))} />
            <div className="min-w-0 flex-1">
              <p className={t.done ? "text-gray-400 line-through" : ""}>{t.title}</p>
              <p className="text-xs text-gray-500">
                {t.due_on && (
                  <span className={!t.done && t.due_on < today ? "font-medium text-red-600" : ""}>
                    {!t.done && t.due_on < today ? "Overdue · " : "Due "}{formatDate(t.due_on)}
                  </span>
                )}
                {t.due_on && t.assignee && " · "}{t.assignee}
              </p>
            </div>
            {canEdit && <button className="text-sm text-red-600" onClick={() => run(supabase().from("tasks").delete().eq("id", t.id))}>Delete</button>}
          </div>
        ))}
        {!shown.length && (
          <EmptyState icon={<ListChecks size={22} />} title={tasks.length ? "All clear" : "No tasks yet"}
            hint={tasks.length ? "Nothing in this view." : "Start with our checklist of common wedding tasks, or add your own above."}>
            {canEdit && !tasks.length && (
              <button className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white" onClick={() => run(supabase().from("tasks").insert(STARTER.map((title) => ({ title }))))}>
                Add a starter checklist
              </button>
            )}
          </EmptyState>
        )}
      </div>
    </div>
  );
}
