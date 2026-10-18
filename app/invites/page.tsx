"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { DEFAULT_INVITE, fillTemplate, formatDate, normalizePhone, waLink } from "@/lib/whatsapp";
import type { Guest, WeddingEvent } from "@/lib/types";

function InviteSender({ ev }: { ev: WeddingEvent }) {
  const { guests, invitations, settings, canEdit, refresh } = useWedding();
  const notify = useToast();
  const [template, setTemplate] = useState(ev.invite_text ?? DEFAULT_INVITE);
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
  const message = (g: Guest) =>
    fillTemplate(template, {
      name: g.name,
      event: ev.name,
      date: formatDate(ev.event_date) || "[date to be announced]",
      time: ev.start_time ?? "",
      venue: ev.venue ?? "[venue to be announced]",
    }) + (media ? `\n\n${media}` : "");

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
      await navigator.share({ files: [file], text: fillTemplate(template, { name: g.name, event: ev.name, date: formatDate(ev.event_date), time: ev.start_time ?? "", venue: ev.venue ?? "" }) });
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

  const sample = rows[0]?.g ?? { name: "Sharma family" } as Guest;

  return (
    <div className="space-y-4">
      <section className="space-y-2 card p-3">
        <h2 className="font-semibold">Message</h2>
        <p className="text-sm text-gray-500">
          Use {"{name}"}, {"{event}"}, {"{date}"}, {"{time}"} and {"{venue}"}. They are filled in for each guest.
        </p>
        <textarea rows={6} disabled={!canEdit} value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full rounded-lg border p-2" />
        {canEdit && (
          <button onClick={() => run(supabase().from("events").update({ invite_text: template }).eq("id", ev.id))} className="rounded-lg bg-rose-600 px-3 py-2 text-white">
            Save message
          </button>
        )}
        <div className="whitespace-pre-wrap rounded-lg bg-green-50 p-3 text-sm">{message(sample)}</div>
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
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy}
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
                  <button onClick={() => send(g)} disabled={!phone} className="rounded-lg bg-green-600 px-3 py-1.5 text-white disabled:opacity-40">
                    {inv.sent_at ? "Send again" : "Send on WhatsApp"}
                  </button>
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

export default function InvitesPage() {
  const { events, settings, canEdit, refresh } = useWedding();
  const [eventId, setEventId] = useState("");
  const ev = events.find((e) => e.id === eventId);

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Each guest gets their own message. Tapping <b>Send on WhatsApp</b> opens WhatsApp with the message ready, and you press send there.
        The app cannot tell whether you actually sent it, so check before moving on.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="rounded-lg border bg-white p-2">
          <option value="">Choose an event…</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <label className="text-sm text-gray-600">
          Default country code +
          <input disabled={!canEdit} defaultValue={settings.country_code ?? "91"} className="ml-1 w-14 rounded-lg border p-1"
            onBlur={async (e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (v && v !== settings.country_code) {
                await supabase().from("app_settings").upsert({ key: "country_code", value: v });
                await refresh();
              }
            }} />
        </label>
      </div>
      {ev && <InviteSender key={ev.id} ev={ev} />}
    </div>
  );
}
