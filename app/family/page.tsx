"use client";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import type { Role } from "@/lib/types";

export default function FamilyPage() {
  const { profiles, me, canEdit, refresh } = useWedding();

  async function setRole(id: string, role: Role) {
    await supabase().from("profiles").update({ role }).eq("id", id);
    await refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-600">
        Share the site link with family. They sign in with their email, then show up here as viewers until you make them editors.
      </p>
      <div className="rounded-lg border bg-white">
        {profiles.map((p) => (
          <div key={p.id} className="flex items-center justify-between border-b p-3 last:border-b-0">
            <span>{p.email}{p.id === me?.id && " (you)"}</span>
            <select disabled={!canEdit || p.id === me?.id} value={p.role} onChange={(e) => setRole(p.id, e.target.value as Role)} className="rounded border p-1">
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
