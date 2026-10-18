import type { Metadata } from "next";
import "./globals.css";
import { WeddingProvider } from "@/components/WeddingProvider";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Wedding Planner",
  description: "Guests, events and vendors for the wedding",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <WeddingProvider>
          <Shell>{children}</Shell>
        </WeddingProvider>
      </body>
    </html>
  );
}
