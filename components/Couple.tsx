"use client";
import { useState } from "react";

// An arch-shaped portrait with a fine gold ring: it sits quietly on the dashboard banner instead of
// looking like a pasted rectangle. Without a photo nothing is drawn.
export function Arch({ url, focus, alt, className = "w-28 lg:w-40" }: { url: string; focus: [number, number]; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`${className} shrink-0 rounded-t-full rounded-b-3xl border border-gold-400/70 p-1 shadow-xl shadow-black/30`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-full rounded-b-[1.25rem] bg-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} width={600} height={800} decoding="async" onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{ objectPosition: `${focus[0]}% ${focus[1]}%` }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
      </div>
    </div>
  );
}
