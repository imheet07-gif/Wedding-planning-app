"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "./WeddingProvider";
import { useToast } from "./Toast";

export const SIZES = [
  { value: "100%", name: "Normal" },
  { value: "118%", name: "Large" },
  { value: "135%", name: "Extra large" },
];
const KEY = "text-size";
const valid = (v: string | null | undefined): v is string => !!v && SIZES.some((s) => s.value === v);

function apply(v: string) {
  document.documentElement.style.fontSize = v;
  try { localStorage.setItem(KEY, v); } catch { /* private mode: still applies for this visit */ }
}

// Brings the saved size from the person's account onto this device after sign-in.
export function TextSizeSync() {
  const { session } = useWedding();
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data, error } = await supabase().from("user_settings").select("text_size").eq("user_id", uid).maybeSingle();
      if (error) return; // table not created yet, or offline: keep whatever this device has
      if (valid(data?.text_size)) { apply(data.text_size); window.dispatchEvent(new Event("text-size-changed")); return; }
      let local: string | null = null;
      try { local = localStorage.getItem(KEY); } catch { /* ignore */ }
      if (valid(local) && local !== "100%") await supabase().from("user_settings").upsert({ user_id: uid, text_size: local });
    })();
  }, [uid]);

  return null;
}

export function TextSize() {
  const { session } = useWedding();
  const notify = useToast();
  const [size, setSize] = useState("100%");

  useEffect(() => {
    const read = () => { try { setSize(localStorage.getItem(KEY) ?? "100%"); } catch { /* ignore */ } };
    read();
    window.addEventListener("text-size-changed", read);
    return () => window.removeEventListener("text-size-changed", read);
  }, []);

  async function pick(v: string) {
    setSize(v);
    apply(v);
    const uid = session?.user.id;
    if (!uid) return;
    const { error } = await supabase().from("user_settings").upsert({ user_id: uid, text_size: v, updated_at: new Date().toISOString() });
    notify(error ? "Saved on this device only" : "Text size saved to your account", error ? "error" : "ok");
  }

  return (
    <div role="group" aria-label="Text size" className="flex flex-wrap gap-2">
      {SIZES.map((s, i) => (
        <button key={s.value} onClick={() => pick(s.value)} aria-pressed={size === s.value}
          className={`min-h-11 rounded-lg border px-4 font-medium ${size === s.value ? "border-rose-600 bg-rose-600 text-white" : "bg-white text-gray-700"}`}
          style={{ fontSize: `${0.9 + i * 0.15}rem` }}>
          {s.name}
        </button>
      ))}
    </div>
  );
}
