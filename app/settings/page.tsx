"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { TextSize } from "@/components/TextSize";
import { ThemePicker } from "@/components/Theme";
import { HeroPhoto, SHAPES, parseShape, type Shape } from "@/components/Couple";
import { parseFocus, shrinkImage } from "@/lib/image";

export default function SettingsPage() {
  const { session, me, canEdit, settings, refresh } = useWedding();
  const notify = useToast();
  const [cc, setCc] = useState<string | null>(null);
  const code = cc ?? settings.country_code ?? "91";
  const photo = settings.couple_photo_url || "";
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const crop = focus ?? parseFocus(settings.couple_photo_focus);
  const [busy, setBusy] = useState(false);
  const shape = parseShape(settings.couple_photo_shape);

  async function save(key: string, value: string, ok = "Saved") {
    const { error } = await supabase().from("app_settings").upsert({ key, value });
    notify(error ? error.message : ok, error ? "error" : "ok");
    await refresh();
    return !error;
  }

  // Storage path of a photo we uploaded earlier, so replacing or removing it does not leave files behind.
  const pathOf = (url: string) => url.split("/object/public/couple/")[1];
  async function dropOld(url: string) {
    const p = pathOf(url);
    if (p) await supabase().storage.from("couple").remove([decodeURIComponent(p)]);
  }

  async function upload(file: File) {
    setBusy(true);
    try {
      const blob = await shrinkImage(file);
      const path = `photo-${Date.now()}.jpg`;
      const { error } = await supabase().storage.from("couple").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw new Error(error.message);
      const url = supabase().storage.from("couple").getPublicUrl(path).data.publicUrl;
      const old = photo;
      if (await save("couple_photo_url", url, "Photo updated") && old) await dropOld(old);
    } catch (e) {
      notify((e as Error).message || "Could not upload that photo.", "error");
    }
    setBusy(false);
  }

  async function remove() {
    const old = photo;
    if (await save("couple_photo_url", "", "Photo removed") && old) await dropOld(old);
  }

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
        <h2 className="font-display text-lg">Our photo</h2>
        <p className="text-sm text-gray-600">Appears on the dashboard banner for everyone in the family. {canEdit ? "It sits beside the banner text, clear and untinted. Use the sliders so both of your faces stay in view." : "Only editors can change it."}</p>
        <label className="block text-sm">
          <span className="text-gray-600">Names on the banner</span>
          <input defaultValue={settings.couple_names ?? ""} disabled={!canEdit} placeholder="Aanya & Rohan" maxLength={60} aria-label="Names on the banner"
            className="mt-1 w-full rounded-lg border p-2.5" onBlur={(e) => e.target.value.trim() !== (settings.couple_names ?? "") && save("couple_names", e.target.value.trim(), "Names saved")} />
        </label>
        <div className="space-y-3">
          {([["Phone", "w-44", "stacked"], ["Laptop", `${SHAPES[shape].preview} w-full max-w-sm`, "wide"]] as const).map(([label, size, mode]) => (
            <div key={label}>
              <p className="mb-1 text-xs text-gray-500">{label}</p>
              <div className={`hero relative overflow-hidden rounded-2xl text-white shadow-card ${size} ${mode === "stacked" ? "flex flex-col" : "flex flex-col justify-center"}`}>
                {photo && <HeroPhoto url={photo} focus={crop} shape={shape} mode={mode} />}
                <div className={`relative ${mode === "stacked" ? "-mt-1 px-3 pb-3" : "max-w-[44%] px-4"}`}>
                  <p className="text-[9px] uppercase tracking-widest text-[#f0cf75]">Wedding day</p>
                  <p className="font-display text-sm leading-tight">{settings.couple_names || "Aanya & Rohan"}</p>
                  <p className="font-display text-xl leading-none">121 <span className="font-sans text-[9px]">days to go</span></p>
                </div>
              </div>
            </div>
          ))}
          {canEdit && (
            <div className="space-y-3 text-sm">
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-label={photo ? "Choose a different photo" : "Choose a photo"}
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="w-full" />
              {busy && <p className="text-gray-500">Uploading…</p>}
              {photo && (
                <>
                  <div role="group" aria-label="Photo shape">
                    <p className="mb-1 text-gray-600">How much of the photo shows</p>
                    <div className="flex gap-2">
                      {(Object.keys(SHAPES) as Shape[]).map((k) => (
                        <button key={k} aria-pressed={shape === k} onClick={() => save("couple_photo_shape", k, "Shape saved")}
                          className={`min-h-11 flex-1 rounded-lg border px-3 font-medium ${shape === k ? "border-rose-600 bg-rose-600 text-white" : "bg-white text-gray-700"}`}>
                          {SHAPES[k].label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Close-up photos need Square or Tall. Then move the sliders until both previews show your faces.</p>
                  </div>
                  {(["Left to right", "Top to bottom"] as const).map((label, i) => (
                    <label key={label} className="block">
                      <span className="text-gray-600">{label}</span>
                      <input type="range" min={0} max={100} value={crop[i]} aria-label={`Photo position, ${label.toLowerCase()}`} className="w-full"
                        onChange={(e) => setFocus(i === 0 ? [+e.target.value, crop[1]] : [crop[0], +e.target.value])}
                        onPointerUp={() => save("couple_photo_focus", crop.join(","), "Position saved")}
                        onKeyUp={() => save("couple_photo_focus", crop.join(","), "Position saved")} />
                    </label>
                  ))}
                  <button onClick={remove} className="text-red-600 underline">Remove photo</button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

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
