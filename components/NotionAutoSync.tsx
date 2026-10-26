"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "@/components/WeddingProvider";
import { useToast } from "@/components/Toast";
import { applySyncPlan, fetchNotionPlan, saveSetting } from "@/lib/syncApply";
import type { Guest, Invitation } from "@/lib/types";

const EVERY_MS = 10 * 60 * 1000;
const LAST_KEY = "notion-auto-last";

// When "keep updated automatically" is on, an editor opening (or coming back to) the app brings the guest list up to date
// with Notion, at most every 10 minutes. It only adds and updates, and it stops and asks for a look if a sync would
// change a large share of the list (for example after a mass rename in Notion).
export function NotionAutoSync() {
  const { settings, events, canEdit, ready, refresh } = useWedding();
  const notify = useToast();
  const busy = useRef(false);
  const latest = useRef({ settings, events });
  latest.current = { settings, events };
  const me = useRef(`${Math.random().toString(36).slice(2)}`);

  const on = canEdit && ready && settings.notion_auto === "1" && !!settings.notion_db_url;

  useEffect(() => {
    if (!on) return;
    async function run() {
      const { settings: st, events: ev } = latest.current;
      if (busy.current || document.visibilityState !== "visible") return;
      try {
        if (Date.now() - Number(localStorage.getItem(LAST_KEY) ?? 0) < EVERY_MS) return;
        localStorage.setItem(LAST_KEY, String(Date.now()));
      } catch { /* private mode: just run */ }
      busy.current = true;
      const db = supabase();
      try {
        // One device at a time: claim the turn, give a simultaneous claimer a moment to overwrite it, then check it is still ours.
        const claim = (await db.from("app_settings").select("value").eq("key", "notion_sync_claim").maybeSingle()).data?.value as string | undefined;
        const [who, at] = (claim ?? "").split("|");
        if (who && who !== me.current && Date.now() - Number(at) < 2 * 60 * 1000) return;
        await saveSetting("notion_sync_claim", `${me.current}|${Date.now()}`);
        await new Promise((r) => setTimeout(r, 1200));
        const check = (await db.from("app_settings").select("value").eq("key", "notion_sync_claim").maybeSingle()).data?.value as string | undefined;
        if (!check?.startsWith(`${me.current}|`)) return;

        // Plan against the database as it is right now, not the copy on screen.
        const [g, i] = await Promise.all([db.from("guests").select("*"), db.from("invitations").select("*")]);
        if (g.error || i.error) throw new Error((g.error ?? i.error)!.message);
        const guests = g.data as Guest[];
        const plan = await fetchNotionPlan(st.notion_db_url, (st.notion_side as "groom" | "bride" | "both" | undefined) ?? "groom", ev, guests, i.data as Invitation[]);
        const changes = plan.adds.length + plan.updates.length;
        if (changes > 20 && changes > guests.length / 2) {
          await saveSetting("notion_last_error", `Automatic sync paused: it would change ${changes} guests at once. Open Import, check Notion, and apply it yourself.`);
        } else {
          const { added, updated } = changes ? await applySyncPlan(plan) : { added: 0, updated: 0 };
          await saveSetting("notion_synced_at", new Date().toISOString());
          await saveSetting("notion_last_error", "");
          if (added || updated) {
            await saveSetting("notion_last_result", `${added} added, ${updated} updated`);
            notify(`Notion: ${added} added, ${updated} updated`);
          }
        }
        await refresh();
      } catch (e) {
        await saveSetting("notion_last_error", `Automatic sync failed: ${(e as Error).message}`).catch(() => {});
      } finally {
        busy.current = false;
      }
    }
    run();
    const onVisible = () => document.visibilityState === "visible" && run();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(run, EVERY_MS + 5000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(timer); };
  }, [on, notify, refresh]);

  return null;
}
