"use client";
import { useEffect, useState } from "react";

const SIZES = [
  { label: "A", value: "100%", name: "Normal text" },
  { label: "A", value: "118%", name: "Large text" },
  { label: "A", value: "135%", name: "Extra large text" },
];
const KEY = "text-size";

export function TextSize() {
  const [size, setSize] = useState("100%");

  useEffect(() => {
    try { setSize(localStorage.getItem(KEY) ?? "100%"); } catch { /* ignore */ }
  }, []);

  function pick(v: string) {
    setSize(v);
    document.documentElement.style.fontSize = v;
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  }

  return (
    <div role="group" aria-label="Text size" className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Text size</span>
      {SIZES.map((s, i) => (
        <button key={s.value} onClick={() => pick(s.value)} aria-pressed={size === s.value} aria-label={s.name}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border font-medium ${size === s.value ? "border-rose-600 bg-rose-600 text-white" : "bg-white text-gray-700"}`}
          style={{ fontSize: `${0.85 + i * 0.2}rem` }}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
