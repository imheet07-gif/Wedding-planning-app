"use client";
import { useEffect, useState } from "react";

export const THEMES = [
  { value: "system", name: "Match my device" },
  { value: "light", name: "Light" },
  { value: "dark", name: "Dark" },
] as const;
type Choice = (typeof THEMES)[number]["value"];
const KEY = "theme";

function stored(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(choice: Choice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

// Mounted once: follows the phone switching between light and dark while "Match my device" is chosen.
export function ThemeListener() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => stored() === "system" && applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return null;
}

export function ThemePicker() {
  const [choice, setChoice] = useState<Choice>("system");
  useEffect(() => setChoice(stored()), []);

  function pick(v: Choice) {
    setChoice(v);
    try { if (v === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch { /* still applies for this visit */ }
    applyTheme(v);
  }

  return (
    <div role="group" aria-label="Appearance" className="flex flex-wrap gap-2">
      {THEMES.map((t) => (
        <button key={t.value} onClick={() => pick(t.value)} aria-pressed={choice === t.value}
          className={`min-h-11 rounded-lg border px-4 font-medium ${choice === t.value ? "border-rose-600 bg-rose-600 text-white" : "bg-white text-gray-700"}`}>
          {t.name}
        </button>
      ))}
    </div>
  );
}
