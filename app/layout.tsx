import type { Metadata, Viewport } from "next";
import { Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { UserSettingsProvider } from "@/components/user-settings-provider";
import { NavigationProvider } from "@/components/navigation-provider";
import { SyncProvider } from "@/components/sync-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAProvider } from "@/components/pwa-provider";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Toaster } from "@/components/ui/sonner";

const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your expenses with style",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Expense Tracker",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sourceSans3.variable} antialiased`}>
        <ThemeProvider>
          <PWAProvider>
            <AuthSessionProvider>
              <UserSettingsProvider>
                <SyncProvider>
                  <Suspense fallback={null}>
                    <NavigationProvider>
                      <Navbar />
                      <main className="pt-16 pb-20 max-w-3xl m-auto mt-6 px-3">
                        {children}
                      </main>
                      <BottomNav />
                      <PWAInstallPrompt />
                    </NavigationProvider>
                  </Suspense>
                </SyncProvider>
              </UserSettingsProvider>
            </AuthSessionProvider>
          </PWAProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
