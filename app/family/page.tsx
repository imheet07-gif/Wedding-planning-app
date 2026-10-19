"use client";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import type { Role } from "@/lib/types";

export default function FamilyPage() {
  const { profiles, me, canEdit, refresh } = useWedding();
  const notify = useToast();

  async function setRole(id: string, role: Role) {
    const { error } = await supabase().from("profiles").update({ role }).eq("id", id);
    notify(error ? error.message : role === "pending" ? "Access removed" : "Access updated", error ? "error" : "ok");
    await refresh();
  }

  const waiting = profiles.filter((p) => p.role === "pending");

  return (
    <div className="space-y-3">
      <p className="text-gray-600">
        Share the site link with family. They sign in with Google or an email link, then wait here until you approve them.
        Viewers can only look; editors can change things.
      </p>
      {waiting.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <h2 className="mb-2 font-semibold">Waiting for approval</h2>
          {waiting.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-1">
              <span>{p.email}</span>
              {canEdit && (
                <span className="flex gap-2">
                  <button onClick={() => setRole(p.id, "viewer")} className="rounded-lg bg-rose-600 px-3 py-1 text-white">Approve as viewer</button>
                  <button onClick={() => setRole(p.id, "editor")} className="rounded-lg border bg-white px-3 py-1">Editor</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="card">
        {profiles.filter((p) => p.role !== "pending").map((p) => (
          <div key={p.id} className="flex items-center justify-between border-b p-3 last:border-b-0">
            <span>{p.email}{p.id === me?.id && " (you)"}</span>
            <select disabled={!canEdit || p.id === me?.id} value={p.role} onChange={(e) => setRole(p.id, e.target.value as Role)} className="rounded-lg border p-1">
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="pending">Remove access</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
