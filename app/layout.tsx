import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { UserSettingsProvider } from "@/components/user-settings-provider";
import { NavigationProvider } from "@/components/navigation-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your expenses with style",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} antialiased`}>
        <ThemeProvider>
          <AuthSessionProvider>
            <UserSettingsProvider>
              <Suspense fallback={null}>
                <NavigationProvider>
                  <Navbar />
                  <main className="pt-16 pb-20 max-w-3xl m-auto mt-6 px-3">
                    {children}
                  </main>
                  <BottomNav />
                </NavigationProvider>
              </Suspense>
            </UserSettingsProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
