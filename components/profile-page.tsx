"use client";

import React from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Sun, Moon, Laptop } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserSettings } from "@/components/user-settings-provider";
import { formatCurrency } from "@/lib/utils";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", symbol: "$", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
] as const;

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const { currency, setCurrency, loading } = useUserSettings();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const initials = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();
  const selectedCurrency = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  return (
    <div className="pt-6">
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={user?.image ?? undefined}
                alt={user?.name ?? "User"}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-lg font-semibold">
                {user?.name ?? "Guest"}
              </span>
              <span className="text-sm text-muted-foreground">
                {user?.email ?? "Not signed in"}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Theme</span>
              {mounted && (
                <Tabs value={theme ?? "system"} onValueChange={setTheme}>
                  <TabsList>
                    <TabsTrigger value="light" aria-label="Light theme">
                      <Sun className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="dark" aria-label="Dark theme">
                      <Moon className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="system" aria-label="System theme">
                      <Laptop className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Currency</span>
                <Select
                  value={loading ? undefined : currency}
                  onValueChange={setCurrency}
                >
                  <SelectTrigger className="w-auto" aria-label="Select currency">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <span className="text-base">{selectedCurrency.flag}</span>
                        <span className="font-medium">{selectedCurrency.code}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        <span className="flex items-center gap-3">
                          <span className="text-base">{curr.flag}</span>
                          <span className="font-medium">{curr.code}</span>
                          <span className="text-muted-foreground">{curr.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground text-right">
                Preview: <span className="font-medium text-foreground">{formatCurrency(1234.56, loading ? "USD" : currency)}</span>
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {status === "loading" ? null : user ? (
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign out
            </Button>
          ) : (
            <Button onClick={() => signIn("github")}>
              Sign in with GitHub
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
