"use client";
import { useState } from "react";

// The couple photo beside the banner text, with no tint over it so nobody's face is hidden.
// Phone: the photo sits on top and the text on a wine panel below, softly blended at the seam.
// Laptop: the photo fills the right side and blends into the wine panel along its left edge.
const LAYOUT = {
  auto: "relative h-60 shrink-0 photo-mask lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[62%]",
  stacked: "relative h-28 shrink-0 photo-mask-stacked",
  wide: "absolute inset-y-0 right-0 w-[62%] photo-mask-wide",
} as const;

export function HeroPhoto({ url, focus, mode = "auto" }: { url: string; focus: [number, number]; mode?: keyof typeof LAYOUT }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={LAYOUT[mode]}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" decoding="async" onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ objectPosition: `${focus[0]}% ${focus[1]}%` }} />
    </div>
  );
}
