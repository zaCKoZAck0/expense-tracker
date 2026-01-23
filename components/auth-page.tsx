"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function GitHubMark() {
  // Simple GitHub mark for the auth button.
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
      role="img"
    >
      <path d="M12 .5C5.65.5.5 5.64.5 12c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.57 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.36-1.29-1.72-1.29-1.72-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.19 1.78 1.19 1.03 1.77 2.71 1.26 3.37.97.1-.75.4-1.26.72-1.55-2.55-.29-5.23-1.27-5.23-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.14 1.17.91-.25 1.88-.37 2.84-.38.96 0 1.93.13 2.84.38 2.18-1.48 3.14-1.17 3.14-1.17.63 1.57.23 2.73.11 3.02.74.8 1.18 1.82 1.18 3.07 0 4.4-2.68 5.36-5.24 5.65.41.36.77 1.08.77 2.17 0 1.56-.02 2.82-.02 3.21 0 .31.21.68.79.56C20.21 21.42 23.5 17.1 23.5 12 23.5 5.64 18.35.5 12 .5Z" />
    </svg>
  );
}

export function AuthPage() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthed = !!session?.user;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold">
            {isAuthed ? "You're signed in" : "Sign in"}
          </CardTitle>
          <CardDescription>
            {isAuthed
              ? "Access your dashboard and stay synced across devices."
              : "Use your GitHub account to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {isAuthed ? (
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign out
            </Button>
          ) : (
            <Button
              size="lg"
              className="gap-2"
              disabled={isLoading}
              onClick={() => signIn("github", { callbackUrl: "/" })}
            >
              <GitHubMark />
              Continue with GitHub
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
