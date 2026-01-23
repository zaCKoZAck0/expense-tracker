"use client";

import React from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Theme picker using next-themes with a mounted check to avoid hydration mismatch.
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const current = theme ?? "system";
  const icon =
    resolvedTheme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(val) => setTheme(val)}
        >
          <DropdownMenuRadioItem value="light">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4" /> Light
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4" /> Dark
            </div>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <div className="flex items-center gap-2">
              <Laptop className="h-4 w-4" /> System
            </div>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
