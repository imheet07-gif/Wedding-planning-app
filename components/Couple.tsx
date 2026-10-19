"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

// How much of the photo shows. Close-ups need Tall or Square so faces are not cropped.
export const SHAPES = {
  wide: { label: "Wide", phone: "aspect-[4/3]", hero: "lg:min-h-[19rem]", preview: "aspect-[31/10]" },
  square: { label: "Square", phone: "aspect-square", hero: "lg:min-h-[24rem]", preview: "aspect-[245/100]" },
  tall: { label: "Tall", phone: "aspect-[4/5]", hero: "lg:min-h-[29rem]", preview: "aspect-[2/1]" },
} as const;
export type Shape = keyof typeof SHAPES;
export const parseShape = (v: string | undefined): Shape => (v === "wide" || v === "tall" ? v : "square");

// Average colour of a strip of the photo, used to warm the wine panel next to it so the two feel like one piece.
// Reading pixels needs the image host to allow it; if it does not, there is simply no glow.
function sampleEdges(url: string): Promise<{ bottom: string; left: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 24;
        const x = c.getContext("2d", { willReadFrequently: true })!;
        x.drawImage(img, 0, 0, 24, 24);
        const avg = (x0: number, y0: number, w: number, h: number) => {
          const d = x.getImageData(x0, y0, w, h).data;
          let r = 0, g = 0, b = 0;
          for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
          const n = d.length / 4;
          return `rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)} / 0.42)`;
        };
        resolve({ bottom: avg(0, 18, 24, 6), left: avg(0, 0, 6, 24) });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

type Mode = "auto" | "stacked" | "wide";

// The couple photo with the wine text panel laid over its edge: on phones the panel rises over the bottom of
// the photo with a curved top, on laptops it curves over the photo's left side. The photo is never tinted.
// It drifts slowly, shifts a little as you scroll, glows into the panel, and opens full-size when tapped.
export function PhotoBanner({ url, focus, shape = "square", mode = "auto", interactive = true, caption, children }: {
  url: string; focus: [number, number]; shape?: Shape; mode?: Mode; interactive?: boolean; caption?: string; children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [glow, setGlow] = useState<{ bottom: string; left: string } | null>(null);
  const s = SHAPES[shape];

  useEffect(() => { sampleEdges(url).then(setGlow); }, [url]);

  // A gentle shift of the photo against the page as it scrolls.
  useEffect(() => {
    if (!interactive || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = ((r.top + r.height / 2) - window.innerHeight / 2) / window.innerHeight;
      el.style.setProperty("--py", String(Math.max(-1, Math.min(1, p))));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [interactive]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    const trigger = opener.current;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; trigger?.focus(); };
  }, [open]);

  const photoBox = {
    auto: `relative w-full shrink-0 ${s.phone} lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[62%]`,
    stacked: `relative w-full shrink-0 ${s.phone}`,
    wide: "absolute inset-y-0 right-0 w-[62%]",
  }[mode];
  const panel = {
    auto: "-mt-7 rounded-t-[1.75rem] lg:mt-0 lg:w-[46%] lg:rounded-l-none lg:rounded-r-[2.5rem] lg:self-stretch lg:justify-center",
    stacked: "-mt-4 rounded-t-[1.25rem]",
    wide: "w-[46%] rounded-r-[1.5rem] self-stretch justify-center",
  }[mode];
  const sizing = mode === "auto" ? s.hero : "";

  const photo = (
    <>
      <div className="pb-par absolute -inset-[5%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" decoding="async" onLoad={() => setLoaded(true)}
          className={`pb-zoom h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{ objectPosition: `${focus[0]}% ${focus[1]}%` }} />
      </div>
      {interactive && (
        <span aria-hidden className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur">
          <Maximize2 size={14} />
        </span>
      )}
    </>
  );

  return (
    <>
      <div ref={root} style={{ ["--py" as string]: 0 }}
        className={`relative flex flex-col overflow-hidden rounded-2xl bg-[#3b0d1b] text-white shadow-card ${mode === "wide" ? "flex-row" : "lg:flex-row"} ${sizing}`}>
        {interactive ? (
          <button ref={opener} type="button" onClick={() => setOpen(true)} aria-label="View the full photo" className={`${photoBox} cursor-zoom-in overflow-hidden`}>{photo}</button>
        ) : (
          <div className={`${photoBox} overflow-hidden`}>{photo}</div>
        )}
        <div className={`pb-panel relative z-10 flex flex-col ${panel}`}
          style={{ ["--glow-b" as string]: glow?.bottom ?? "transparent", ["--glow-l" as string]: glow?.left ?? "transparent" }}>
          {children}
        </div>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={caption ? `Photo of ${caption}` : "Our photo"} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm animate-fade-up" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={caption ?? "The couple"} className="max-h-[88dvh] max-w-full animate-pop rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button autoFocus type="button" onClick={() => setOpen(false)} aria-label="Close photo"
            className="absolute right-3 top-[calc(0.75rem+var(--safe-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}
