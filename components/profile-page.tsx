"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserSettings } from "@/components/user-settings-provider";
import { formatCurrency } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const { currency, setCurrency, loading } = useUserSettings();

  const initials = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();

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

          <div className="mt-6 space-y-2">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium">Currency</span>
              <div className="flex items-center gap-2">
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={loading ? "" : currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                  }}
                  aria-label="Select currency"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="CHF">CHF</option>
                  <option value="CNY">CNY</option>
                  <option value="INR">INR</option>
                </select>
                <span className="text-sm text-muted-foreground">
                  Example: {formatCurrency(1234.56, loading ? "USD" : currency)}
                </span>
              </div>
            </label>
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
