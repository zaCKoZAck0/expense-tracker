"use client";

import { BarChart3, Home, PiggyBank } from "lucide-react";
import Link from "next/link";
import { useNavigation, Page } from "@/components/navigation-provider";
import type React from "react";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const { page: currentPage } = useNavigation();
  const pathname = usePathname();

  if (pathname.startsWith("/auth")) return null;

  const links: {
    page: Page;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      page: "dashboard",
      label: "Home",
      icon: Home,
    },
    {
      page: "analytics",
      label: "Analytics",
      icon: BarChart3,
    },
    {
      page: "savings",
      label: "Savings",
      icon: PiggyBank,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg p-2 pb-6 z-50">
      <nav className="flex justify-around items-center max-w-3xl mx-auto">
        {links.map(({ page, label, icon: Icon }) => {
          const isActive = currentPage === page;
          return (
            <Link
              key={page}
              href={`/?page=${page}`}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
