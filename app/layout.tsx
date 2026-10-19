import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { WeddingProvider } from "@/components/WeddingProvider";
import { ToastProvider } from "@/components/Toast";
import { Shell } from "@/components/Shell";
import { InstallListener } from "@/components/Install";

const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const heading = Playfair_Display({ subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: "Wedding Planner",
  description: "Guests, events and vendors for the wedding",
  appleWebApp: { capable: true, title: "Wedding", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#8a1d3c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved text size before first paint so larger text does not flash. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var s=localStorage.getItem('text-size');if(s)document.documentElement.style.fontSize=s}catch(e){}" }} />
      </head>
      <body className="antialiased">
        <InstallListener />
        <ToastProvider>
          <WeddingProvider>
            <Shell>{children}</Shell>
          </WeddingProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
