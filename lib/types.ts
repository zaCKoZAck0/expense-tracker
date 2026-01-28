export type Expense = {
  id: string;
  amount: number;
  category: string;
  date: Date;
  notes?: string | null;
  type?: "expense" | "income";
  userId?: string;
  createdAt?: Date;
  isSplit?: boolean;
  splits?: ExpenseSplit[];
};

// Contact - people you split expenses with
export type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  userId?: string;
  createdAt?: Date;
};

// Split types for the UI
export type SplitType = "equal" | "percentage" | "exact";

// ExpenseSplit - how an expense is divided
export type ExpenseSplit = {
  id: string;
  expenseId: string;
  contactId?: string | null;
  contact?: Contact | null;
  amount: number;
  percentage?: number | null;
  isPaid: boolean;
  isYourShare: boolean;
  paidByYou: boolean;
  createdAt?: Date;
};

// Input type for creating/updating splits
export type SplitInput = {
  contactId?: string | null; // null for "You"
  contactName?: string; // For display purposes
  amount: number;
  percentage?: number;
  isYourShare: boolean;
};

// Contact input for creating new contacts inline
export type ContactInput = {
  name: string;
  email?: string;
  phone?: string;};