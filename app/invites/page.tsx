"use client";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { normalizePhone, waLink } from "@/lib/whatsapp";
import { LANGS, LANG_LABEL, buildParts, joinParts, parseLangs, templateFor, type Lang } from "@/lib/invites";
import type { Guest, WeddingEvent } from "@/lib/types";

function InviteSender({ ev }: { ev: WeddingEvent }) {
  const { guests, invitations, settings, canEdit, refresh } = useWedding();
  const notify = useToast();
  const [texts, setTexts] = useState<Record<Lang, string>>({ gu: templateFor(ev, "gu"), hi: templateFor(ev, "hi"), en: templateFor(ev, "en") });
  const [editLang, setEditLang] = useState<Lang>("gu");
  const langs = parseLangs(settings.invite_languages);
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const cc = settings.country_code ?? "91";

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setErr(error?.message ?? "");
    notify(error ? error.message : "Saved", error ? "error" : "ok");
    await refresh();
  }

  const media = ev.invite_media_url;
  // One message per chosen language, each signed by the family on the guest's side.
  const parts = (g: { name: string; side: Guest["side"] }) => buildParts({ guest: g, event: ev, texts, langs, settings });
  const message = (g: Guest) => joinParts(parts(g), media);

  const rows = invitations
    .filter((i) => i.event_id === ev.id)
    .map((i) => ({ inv: i, g: guests.find((g) => g.id === i.guest_id) }))
    .filter((r): r is { inv: typeof r.inv; g: Guest } => !!r.g)
    .filter((r) => !onlyUnsent || !r.inv.sent_at);
  const sentCount = invitations.filter((i) => i.event_id === ev.id && i.sent_at).length;
  const total = invitations.filter((i) => i.event_id === ev.id).length;

  const setSent = (guestId: string, sent: boolean) =>
    run(supabase().from("invitations").update({ sent_at: sent ? new Date().toISOString() : null }).match({ guest_id: guestId, event_id: ev.id }));

  function send(g: Guest) {
    const phone = normalizePhone(g.phone, cc);
    if (!phone) return alert(`${g.name} has no valid phone number. Add one on the Guests page.`);
    window.open(waLink(phone, message(g)), "_blank");
    if (canEdit) setSent(g.id, true);
  }

  // Phones can attach a real file via the share sheet, but WhatsApp then asks you to pick the chat.
  async function shareFile(g: Guest) {
    if (!media) return;
    try {
      const blob = await (await fetch(media)).blob();
      const file = new File([blob], decodeURIComponent(media.split("/").pop() ?? "invite"), { type: blob.type });
      if (!navigator.canShare?.({ files: [file] })) return alert("File sharing is not supported on this device. Use the link in the message instead.");
      await navigator.share({ files: [file], text: joinParts(parts(g)) });
      if (canEdit) setSent(g.id, true);
    } catch (e) {
      if ((e as Error).name !== "AbortError") alert("Could not share the file.");
    }
  }

  async function upload(file: File) {
    setBusy(true);
    const path = `${ev.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error } = await supabase().storage.from("invites").upload(path, file, { contentType: file.type });
    if (error) {
      setErr(error.message);
    } else {
      const url = supabase().storage.from("invites").getPublicUrl(path).data.publicUrl;
      await run(supabase().from("events").update({ invite_media_url: url }).eq("id", ev.id));
    }
    setBusy(false);
  }

  const sample = rows[0]?.g ?? ({ name: "Patel family", side: "bride" } as Guest);

  return (
    <div className="space-y-4">
      <section className="space-y-2 card p-3">
        <h2 className="font-semibold">Message</h2>
        <p className="text-sm text-gray-500">
          Write it once per language. Use {"{name}"}, {"{event}"}, {"{date}"}, {"{time}"}, {"{venue}"}, {"{map}"} and {"{from}"}. They are filled in for each guest:
          {" "}{"{from}"} is the family on that guest&apos;s side, and the date and event name come out in the same language.
        </p>
        <div role="group" aria-label="Language to edit" className="flex gap-2">
          {LANGS.map((l) => (
            <button key={l} aria-pressed={editLang === l} onClick={() => setEditLang(l)} lang={l}
              className={`min-h-10 rounded-lg border px-3 text-sm font-medium ${editLang === l ? "border-rose-600 bg-rose-600 text-white" : "bg-white text-gray-700"}`}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
        <textarea aria-label={`Invite message in ${LANG_LABEL[editLang]}`} lang={editLang} rows={7} disabled={!canEdit} value={texts[editLang]}
          onChange={(e) => setTexts({ ...texts, [editLang]: e.target.value })} className="w-full rounded-lg border p-2" />
        {canEdit && !texts[editLang].includes("{map}") && (
          <button onClick={() => setTexts({ ...texts, [editLang]: `${texts[editLang].trimEnd()}\n\n📍 {map}` })} className="mr-3 text-sm text-rose-700 underline">
            Add the map link to this message
          </button>
        )}
        {canEdit && (
          <button onClick={() => run(supabase().from("events").update({ invite_text: texts.en, invite_text_gu: texts.gu, invite_text_hi: texts.hi }).eq("id", ev.id))}
            className="rounded-lg bg-rose-600 px-3 py-2 text-white">
            Save messages
          </button>
        )}
        {!ev.map_url && <p className="text-xs text-amber-700">No map link yet for this event, so the pin line is left out. Add it on the <Link href={`/events?id=${ev.id}`} className="underline">Events page</Link>.</p>}
        <p className="pt-1 text-xs text-gray-500">What {sample.name} will receive{rows[0] ? "" : " (example)"}, in {langs.map((l) => LANG_LABEL[l]).join(" + ")}:</p>
        <div className="space-y-2 rounded-lg bg-green-50 p-3 text-sm">
          {parts(sample).map((p, i) => (
            <p key={p.lang} lang={p.lang} className={`whitespace-pre-wrap ${i > 0 ? "border-t border-green-200 pt-2" : ""}`}>{p.text}</p>
          ))}
          {media && <p className="break-all text-xs text-gray-500">{media}</p>}
        </div>
      </section>

      <section className="space-y-2 card p-3 text-sm">
        <h2 className="font-semibold">Invite image or PDF</h2>
        {media ? (
          <p>
            <a href={media} target="_blank" rel="noreferrer" className="text-rose-600 underline">View uploaded file</a>
            {canEdit && <button className="ml-3 text-red-600" onClick={() => run(supabase().from("events").update({ invite_media_url: null }).eq("id", ev.id))}>Remove</button>}
          </p>
        ) : (
          <p className="text-gray-500">None. The message goes out as text only.</p>
        )}
        {canEdit && (
          <input aria-label="Upload invite image or PDF" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        )}
        <p className="text-gray-500">
          The file&apos;s link is added to the end of the message, and WhatsApp shows a preview. Max 10 MB. On a phone you can also use
          &quot;Share file&quot; to attach the actual file, but then you pick the chat yourself.
        </p>
      </section>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Guests · {sentCount} of {total} sent</h2>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={onlyUnsent} onChange={(e) => setOnlyUnsent(e.target.checked)} /> Not sent yet
          </label>
        </div>
        <div className="card">
          {rows.map(({ inv, g }) => {
            const phone = normalizePhone(g.phone, cc);
            return (
              <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm last:border-b-0">
                <span>
                  <span className="font-medium">{g.name}</span>
                  <span className="block text-xs text-gray-500">
                    {phone ? `+${phone}` : <span className="text-red-600">No valid phone</span>}
                    {inv.sent_at && ` · sent ${new Date(inv.sent_at).toLocaleDateString("en-IN")}`}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <button onClick={() => send(g)} disabled={!phone} className="rounded-lg bg-green-700 px-3 py-1.5 text-white disabled:opacity-40">
                    {inv.sent_at ? "Send again" : "Send on WhatsApp"}
                  </button>
                  {phone && <a href={`tel:+${phone}`} className="rounded-lg border px-3 py-1.5 text-sm" aria-label={`Call ${g.name}`}>Call</a>}
                  {media && <button onClick={() => shareFile(g)} className="rounded-lg border px-3 py-1.5">Share file</button>}
                  {canEdit && inv.sent_at && <button onClick={() => setSent(g.id, false)} className="text-gray-500 underline">Undo</button>}
                  {canEdit && !inv.sent_at && <button onClick={() => setSent(g.id, true)} className="text-gray-500 underline">Mark sent</button>}
                </span>
              </div>
            );
          })}
          {!rows.length && <p className="p-3 text-sm text-gray-500">Nobody to show. Invite guests to this event on the Guests page.</p>}
        </div>
      </section>
    </div>
  );
}

const SEND_MODES: { value: string; label: string }[] = [
  { value: "gu,hi", label: "ગુજરાતી + हिन्दी" },
  { value: "gu", label: "ગુજરાતી" },
  { value: "hi", label: "हिन्दी" },
  { value: "en", label: "English" },
  { value: "gu,hi,en", label: "All three" },
];

// Which languages go out, and the family each guest's invitation is signed by.
function SendSettings() {
  const { settings, canEdit, refresh } = useWedding();
  const notify = useToast();
  const mode = parseLangs(settings.invite_languages).join(",");

  async function save(key: string, value: string, ok = "Saved") {
    const { error } = await supabase().from("app_settings").upsert({ key, value });
    notify(error ? error.message : ok, error ? "error" : "ok");
    await refresh();
  }

  return (
    <section className="space-y-3 card p-3">
      <div>
        <h2 className="font-semibold">Send in</h2>
        <div role="group" aria-label="Languages to send in" className="mt-2 flex flex-wrap gap-2">
          {SEND_MODES.map((m) => (
            <button key={m.value} disabled={!canEdit} aria-pressed={mode === m.value} onClick={() => save("invite_languages", m.value, "Languages saved")}
              className={`min-h-10 rounded-lg border px-3 text-sm font-medium ${mode === m.value ? "border-rose-600 bg-rose-600 text-white" : "bg-white text-gray-700"}`}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">With more than one language, each goes in the same WhatsApp message, one below the other.</p>
      </div>
      <div>
        <h2 className="font-semibold">Signed by</h2>
        <p className="text-xs text-gray-500">Guests on the bride&apos;s side get the bride&apos;s family name, groom&apos;s side the groom&apos;s. Guests marked &quot;both&quot; get both. Leave a language blank to use the English name.</p>
        <div className="mt-2 space-y-3">
          {([["bride", "Bride's family"], ["groom", "Groom's family"]] as const).map(([who, label]) => (
            <fieldset key={who} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <legend className="mb-1 text-sm text-gray-600">{label}</legend>
              {([["", "English", "Shah family"], ["_gu", "ગુજરાતી", "શાહ પરિવાર"], ["_hi", "हिन्दी", "शाह परिवार"]] as const).map(([suffix, lang, example]) => (
                <input key={suffix} defaultValue={settings[`family_${who}${suffix}`] ?? ""} disabled={!canEdit} placeholder={example} lang={suffix ? suffix.slice(1) : "en"}
                  aria-label={`${label}, ${lang}`} className="min-w-0 rounded-lg border p-2"
                  onBlur={(e) => e.target.value.trim() !== (settings[`family_${who}${suffix}`] ?? "") && save(`family_${who}${suffix}`, e.target.value.trim(), "Name saved")} />
              ))}
            </fieldset>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function InvitesPage() {
  const { events, settings } = useWedding();
  const [eventId, setEventId] = useState("");
  const ev = events.find((e) => e.id === eventId);

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Each guest gets their own message. Tapping <b>Send on WhatsApp</b> opens WhatsApp with the message ready, and you press send there.
        The app cannot tell whether you actually sent it, so check before moving on.
      </p>
      <SendSettings />
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Event" value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-lg border bg-white p-2">
          <option value="">Choose an event…</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <p className="text-sm text-gray-600">
          Numbers without a country code use +{settings.country_code ?? "91"}. <Link href="/settings" className="text-rose-700 underline">Change in Settings</Link>
        </p>
      </div>
      {ev && <InviteSender key={ev.id} ev={ev} />}
    </div>
  );
}
