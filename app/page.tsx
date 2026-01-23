import AnalyticsPage from "@/components/analytics-page";
import ProfilePage from "@/components/profile-page";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard-client";
import SavingsPage from "../components/savings-page";
import TransactionsPage from "@/components/transactions-page";
import { Suspense } from "react";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = params.page || "dashboard";

  const session = await auth();
  const isAuthed = !!session?.user?.email;

  if (page === "analytics") {
    if (!isAuthed) {
      redirect("/auth");
    }
    return (
      <Suspense
        fallback={
          <div className="p-6 text-muted-foreground">Loading analytics...</div>
        }
      >
        <AnalyticsPage />
      </Suspense>
    );
  }

  if (page === "savings") {
    if (!isAuthed) {
      redirect("/auth");
    }
    return (
      <Suspense
        fallback={
          <div className="p-6 text-muted-foreground">Loading savings...</div>
        }
      >
        <SavingsPage />
      </Suspense>
    );
  }

  if (page === "transactions") {
    if (!isAuthed) {
      redirect("/auth");
    }
    return (
      <Suspense
        fallback={
          <div className="p-6 text-muted-foreground">
            Loading transactions...
          </div>
        }
      >
        <TransactionsPage searchParams={params} />
      </Suspense>
    );
  }

  if (page === "profile") {
    return <ProfilePage />;
  }

  if (!isAuthed) {
    redirect("/auth");
  }

  // Dashboard now fetches data on client based on selected month
  return (
    <Suspense
      fallback={
        <div className="p-6 text-muted-foreground">Loading dashboard...</div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
