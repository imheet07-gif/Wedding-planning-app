"use client";
import { useEffect, useState } from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded-xl bg-gray-200 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-40" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

export function EmptyState({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">{icon}</div>
      <p className="font-display text-lg">{title}</p>
      {hint && <p className="max-w-xs text-sm text-gray-500">{hint}</p>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

// Bar that grows from zero on first paint.
export function Bar({ parts }: { parts: { pct: number; className: string; label?: string }[] }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
      {parts.map((p, i) => (
        <div key={i} title={p.label} className={`h-full transition-[width] duration-700 ease-out ${p.className}`} style={{ width: on ? `${Math.max(0, Math.min(100, p.pct))}%` : "0%" }} />
      ))}
    </div>
  );
}

export function CountUp({ value, format = (n: number) => String(n) }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); return; }
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}
