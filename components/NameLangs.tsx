"use client";
import { useState } from "react";
import { transliterate } from "@/lib/translit";
import type { Guest } from "@/lib/types";

type Patch = { name_gu?: string | null; name_hi?: string | null };

// Gujarati and Hindi spellings of a guest's name, used in invitations written in those languages.
// "Suggest" fills the empty ones with a best guess to correct; blank means the English name is used.
export function NameLangs({ g, canEdit, save }: { g: Guest; canEdit: boolean; save: (patch: Patch) => void }) {
  const [rev, setRev] = useState(0); // remounts the inputs after a suggestion so they show the saved values
  const has = !!(g.name_gu || g.name_hi);
  if (!canEdit && !has) return null;
  const field = (key: "name_gu" | "name_hi", label: string, lang: string) => (
    <input key={`${key}${rev}`} aria-label={`${g.name} in ${label}`} lang={lang} placeholder={label} disabled={!canEdit} defaultValue={g[key] ?? ""}
      onBlur={(e) => e.target.value.trim() !== (g[key] ?? "") && save({ [key]: e.target.value.trim() || null })}
      className="min-w-0 flex-1 rounded-lg border p-2 text-sm" />
  );
  const missing = !g.name_gu || !g.name_hi;
  return (
    <details className="text-xs text-gray-500" open={has && !canEdit}>
      <summary className="min-h-8 cursor-pointer py-1 text-rose-700 underline">Name in Gujarati / Hindi{has ? " ✓" : ""}</summary>
      <div className="mt-1 flex gap-2">{field("name_gu", "ગુજરાતી", "gu")}{field("name_hi", "हिन्दी", "hi")}</div>
      {canEdit && missing && (
        <button type="button" className="mt-1 min-h-8 text-rose-700 underline"
          onClick={() => {
            save({ ...(g.name_gu ? {} : { name_gu: transliterate(g.name, "gu") }), ...(g.name_hi ? {} : { name_hi: transliterate(g.name, "hi") }) });
            setRev((r) => r + 1);
          }}>
          Suggest from the English name
        </button>
      )}
      {canEdit && <p className="mt-1">Suggestions are a best guess. Please check the spelling.</p>}
    </details>
  );
}
