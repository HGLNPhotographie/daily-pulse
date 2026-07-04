import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { AuthBootstrap } from "@/components/layout/AuthBootstrap";
import { CapacitorBootstrap } from "@/components/layout/CapacitorBootstrap";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminDashboardBar } from "@/components/layout/AdminDashboardBar";
import { AppProviders } from "@/components/layout/AppProviders";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${spaceGrotesk.variable} h-full`}>
      <body className="relative flex min-h-full flex-col overflow-x-hidden bg-white text-foreground">
        <AppProviders>
          <AdminDashboardBar />
          <main className="relative z-10 flex flex-1 flex-col pb-24">{children}</main>
        </AppProviders>
        <BottomNav />
        <Toaster theme="light" position="top-center" />
        <ServiceWorkerRegister />
        <AuthBootstrap />
        <CapacitorBootstrap />
      </body>
    </html>
  );
}
