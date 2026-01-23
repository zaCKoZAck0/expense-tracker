import { getTransactions } from "@/app/actions";
import { TransactionsPageClient } from "@/components/transactions-page-client";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page =
    typeof searchParams.pageNumber === "string"
      ? parseInt(searchParams.pageNumber)
      : 1;
  const limit = 20; // Default limit for full page
  const sortBy =
    typeof searchParams.sortBy === "string"
      ? (searchParams.sortBy as "date" | "amount")
      : "date";
  const sortOrder =
    typeof searchParams.sortOrder === "string"
      ? (searchParams.sortOrder as "asc" | "desc")
      : "desc";
  const filterType =
    typeof searchParams.filterType === "string"
      ? (searchParams.filterType as "expense" | "income" | "all")
      : "all";
  const month =
    typeof searchParams.month === "string" ? searchParams.month : undefined;

  const startDate =
    typeof searchParams.startDate === "string" ? searchParams.startDate : undefined;
  const endDate =
    typeof searchParams.endDate === "string" ? searchParams.endDate : undefined;
  const minAmount =
    typeof searchParams.minAmount === "string"
      ? parseFloat(searchParams.minAmount)
      : undefined;
  const maxAmount =
    typeof searchParams.maxAmount === "string"
      ? parseFloat(searchParams.maxAmount)
      : undefined;

  const result = await getTransactions({
    page,
    limit,
    sortBy,
    sortOrder,
    filterType,
    month,
    startDate,
    endDate,
    minAmount,
    maxAmount,
  });

  return (
    <TransactionsPageClient
      initialTransactions={result.success ? result.data.transactions : []}
      totalCount={result.success ? result.data.totalCount : 0}
      totalPages={result.success ? result.data.totalPages : 1}
      currentPage={page}
      sortBy={sortBy}
      sortOrder={sortOrder}
      filterType={filterType}
      month={month}
    />
  );
}
