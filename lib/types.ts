export type Expense = {
  id: string;
  amount: number;
  category: string;
  date: Date;
  notes?: string | null;
  userId?: string;
  createdAt?: Date;
};
