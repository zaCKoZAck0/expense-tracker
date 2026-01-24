export type Expense = {
  id: string;
  amount: number;
  category: string;
  date: Date;
  notes?: string | null;
  type?: "expense" | "income";
  userId?: string;
  createdAt?: Date;
};
