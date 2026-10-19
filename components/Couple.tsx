"use client";
import { useState } from "react";

// The couple photo as the banner's backdrop. A wine-coloured fade sits over it so text stays readable:
// on phones it rises from the bottom (text at the bottom, photo showing above), on laptops it runs from
// the left (text on the left, photo showing on the right).
export function HeroBackdrop({ url, focus, mode = "auto", alt = "" }: { url: string; focus: [number, number]; mode?: "auto" | "stacked" | "wide"; alt?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} decoding="async" onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ objectPosition: `${focus[0]}% ${focus[1]}%` }} />
      <div aria-hidden className={`absolute inset-0 ${mode === "wide" ? "hidden" : mode === "stacked" ? "" : "lg:hidden"} scrim-stacked`} />
      <div aria-hidden className={`absolute inset-0 ${mode === "stacked" ? "hidden" : mode === "wide" ? "" : "hidden lg:block"} scrim-wide`} />
    </>
  );
}
