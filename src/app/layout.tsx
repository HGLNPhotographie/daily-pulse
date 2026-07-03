import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { AuthBootstrap } from "@/components/layout/AuthBootstrap";
import { CapacitorBootstrap } from "@/components/layout/CapacitorBootstrap";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppProviders } from "@/components/layout/AppProviders";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Kitsh — Le Rendez-vous Quotidien",
  description:
    "Une question par jour, 5 minutes pour voter. Pour, Contre, Neutre — garde ta flamme allumée.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kitsh",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0612",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`dark ${spaceGrotesk.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col overflow-x-hidden bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] mix-blend-overlay" aria-hidden>
          <svg width="100%" height="100%">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
        </div>
        <AppProviders>
          <main className="relative z-10 flex flex-1 flex-col pb-24">{children}</main>
        </AppProviders>
        <BottomNav />
        <Toaster theme="dark" position="top-center" />
        <ServiceWorkerRegister />
        <AuthBootstrap />
        <CapacitorBootstrap />
      </body>
    </html>
  );
}
