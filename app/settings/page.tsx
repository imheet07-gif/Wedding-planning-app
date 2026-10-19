"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { TextSize } from "@/components/TextSize";
import { ThemePicker } from "@/components/Theme";

export default function SettingsPage() {
  const { session, me, canEdit, settings, refresh } = useWedding();
  const notify = useToast();
  const [cc, setCc] = useState<string | null>(null);
  const code = cc ?? settings.country_code ?? "91";

  async function saveCode() {
    const v = code.replace(/\D/g, "");
    if (!v || v === settings.country_code) return;
    const { error } = await supabase().from("app_settings").upsert({ key: "country_code", value: v });
    notify(error ? error.message : "Country code saved", error ? "error" : "ok");
    await refresh();
  }

  return (
    <div className="max-w-xl space-y-4">
      <section className="card space-y-3 p-4">
        <h2 className="font-display text-lg">Appearance</h2>
        <p className="text-sm text-gray-600">By default the app follows your phone or laptop and switches to dark mode when your device does. Choose Light or Dark to override that on this device.</p>
        <ThemePicker />
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-display text-lg">Text size</h2>
        <p className="text-sm text-gray-600">Makes everything in the app bigger. It is saved to your account, so it follows you to any phone or laptop you sign in on.</p>
        <TextSize />
        <p className="rounded-lg bg-gray-50 p-3 text-gray-700">Sharma family · 5 people · Sangeet, 14 February</p>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-display text-lg">Phone numbers</h2>
        <p className="text-sm text-gray-600">
          Guest numbers saved without a country code use this one for WhatsApp and calls. 91 is India. This applies to everyone.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span>Default country code +</span>
          <input value={code} onChange={(e) => setCc(e.target.value)} onBlur={saveCode} disabled={!canEdit} inputMode="numeric" aria-label="Default country code"
            className="w-20 rounded-lg border p-2" />
        </label>
        {!canEdit && <p className="text-xs text-gray-500">Only editors can change this.</p>}
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-display text-lg">Your account</h2>
        <p className="text-sm text-gray-600">{session?.user.email} · {me?.role}</p>
        <button onClick={() => supabase().auth.signOut()} className="min-h-11 rounded-lg border bg-white px-4 text-rose-700">Sign out</button>
      </section>
    </div>
  );
}
