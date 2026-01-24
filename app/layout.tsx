import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { UserSettingsProvider } from "@/components/user-settings-provider";
import { NavigationProvider } from "@/components/navigation-provider";
import { BottomNav } from "@/components/bottom-nav";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";

const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
      <body className={`${sourceSans3.variable} antialiased`}>
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
