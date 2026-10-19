"use client";
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global { interface Window { __installPrompt?: PromptEvent } }

// Mounted once in the layout so the browser's install event is not missed before the dashboard renders.
export function InstallListener() {
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); window.__installPrompt = e as PromptEvent; window.dispatchEvent(new Event("install-ready")); };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  return null;
}

const KEY = "install-card-dismissed";

export function InstallCard() {
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === "1"; } catch { /* private mode: just show it */ }
    if (standalone || dismissed) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const update = () => setMode(window.__installPrompt ? "prompt" : ios ? "ios" : "hidden");
    update();
    window.addEventListener("install-ready", update);
    return () => window.removeEventListener("install-ready", update);
  }, []);

  if (mode === "hidden") return null;

  const close = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } setMode("hidden"); };

  return (
    <section className="card flex items-start gap-3 p-4" aria-label="Install the app">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Download size={18} aria-hidden /></span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">Keep it on your home screen</p>
        {mode === "prompt" ? (
          <>
            <p className="text-gray-600">Opens full screen like an app. Press and hold the icon for shortcuts to calls, invites and tasks.</p>
            <button onClick={async () => { await window.__installPrompt?.prompt(); close(); }} className="mt-2 min-h-10 rounded-lg bg-rose-600 px-4 text-white">Install app</button>
          </>
        ) : (
          <p className="text-gray-600">
            In Safari tap <Share size={14} className="mx-0.5 inline" aria-label="Share" /> Share, then <b>Add to Home Screen</b>. It opens full screen like an app.
          </p>
        )}
      </div>
      <button onClick={close} aria-label="Dismiss" className="-m-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X size={16} /></button>
    </section>
  );
}
