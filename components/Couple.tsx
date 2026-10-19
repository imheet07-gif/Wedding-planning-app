"use client";
import { useState } from "react";

// How much of the photo shows. Close-ups need Tall or Square so faces are not cropped.
export const SHAPES = {
  wide: { label: "Wide", phone: "aspect-[4/3]", hero: "lg:min-h-[19rem]", preview: "aspect-[31/10]" },
  square: { label: "Square", phone: "aspect-square", hero: "lg:min-h-[24rem]", preview: "aspect-[245/100]" },
  tall: { label: "Tall", phone: "aspect-[4/5]", hero: "lg:min-h-[29rem]", preview: "aspect-[2/1]" },
} as const;
export type Shape = keyof typeof SHAPES;
export const parseShape = (v: string | undefined): Shape => (v === "wide" || v === "tall" ? v : "square");

// The couple photo beside the banner text, with no tint over it so nobody's face is hidden.
// Phone: the photo sits on top and the text on a wine panel below, softly blended at the seam.
// Laptop: the photo fills the right side and blends into the wine panel along its left edge.
export function HeroPhoto({ url, focus, shape = "square", mode = "auto" }: { url: string; focus: [number, number]; shape?: Shape; mode?: "auto" | "stacked" | "wide" }) {
  const [loaded, setLoaded] = useState(false);
  const s = SHAPES[shape];
  const layout = {
    auto: `relative w-full shrink-0 photo-mask ${s.phone} lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[62%]`,
    stacked: `relative w-full shrink-0 photo-mask-stacked ${s.phone}`,
    wide: "absolute inset-y-0 right-0 w-[62%] photo-mask-wide",
  }[mode];
  return (
    <div className={layout}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" decoding="async" onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ objectPosition: `${focus[0]}% ${focus[1]}%` }} />
    </div>
  );
}
