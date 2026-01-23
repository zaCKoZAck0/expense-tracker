"use client"

import React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Wrapper around `next-themes` ThemeProvider to enable class-based dark mode
// and respect the user's OS preference by default. Kept intentionally small
// so it can be imported from server components (like `app/layout.tsx`).
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem enableColorScheme>
      {children}
    </NextThemesProvider>
  )
}

export default ThemeProvider
