import AnalyticsPage from "@/components/analytics-page";
import ProfilePage from "@/components/profile-page";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard-client";
import SavingsPage from "../components/savings-page";
import TransactionsPage from "@/components/transactions-page";

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
      redirect("/?page=profile");
    }
    return <AnalyticsPage />;
  }

  if (page === "savings") {
    if (!isAuthed) {
      redirect("/?page=profile");
    }
    return <SavingsPage />;
  }

  if (page === "transactions") {
    if (!isAuthed) {
      redirect("/?page=profile");
    }
    return <TransactionsPage searchParams={params} />;
  }

  if (page === "profile") {
    return <ProfilePage />;
  }

  if (!isAuthed) {
    redirect("/?page=profile");
  }

  // Dashboard now fetches data on client based on selected month
  return <DashboardClient />;
}
