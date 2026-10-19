import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wedding Planner",
    short_name: "Wedding",
    description: "Guests, events, vendors and budget for the wedding",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f2",
    theme_color: "#8a1d3c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon for these.
    shortcuts: [
      { name: "Follow-up calls", url: "/calls", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Send invites", url: "/invites", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Guests", url: "/guests", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Tasks", url: "/tasks", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
