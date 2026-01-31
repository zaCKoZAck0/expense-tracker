"use client";

import { BarChart3, Home, PiggyBank, Users } from "lucide-react";
import Link from "next/link";
import { useNavigation, Page } from "@/components/navigation-provider";
import React from "react";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const { page: currentPage } = useNavigation();
  const pathname = usePathname();
  const [optimisticPage, setOptimisticPage] = React.useState(currentPage);

  React.useEffect(() => {
    setOptimisticPage(currentPage);
  }, [currentPage]);

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
    {
      page: "split",
      label: "Split",
      icon: Users,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-lg p-2 md:pb-6 z-50 safe-area-bottom">
      <nav className="flex justify-around items-center max-w-3xl mx-auto">
        {links.map(({ page, label, icon: Icon }) => {
          const isActive = optimisticPage === page;
          return (
            <Link
              key={page}
              href={`/?page=${page}`}
              onClick={() => setOptimisticPage(page)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive
                  ? "text-secondary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium hidden md:block">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
