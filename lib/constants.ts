import { WalletIcon, Utensils, Film, ShoppingCart, HeartPulse, Home, Car, Zap, Briefcase, DollarSign, TrendingUp, Gift, MoreHorizontal, RotateCcw, LucideIcon } from "lucide-react";

export const categories = [
  "Dining",
  "Entertainment",
  "Groceries",
  "Healthcare",
  "Housing",
  "Transportation",
  "Utilities",
] as const;

export const incomeCategories = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Money back",
  "Other",
] as const;

export const categoryIcons: Record<string, LucideIcon> = {
  Dining: Utensils,
  Entertainment: Film,
  Groceries: ShoppingCart,
  Healthcare: HeartPulse,
  Housing: Home,
  Transportation: Car,
  Utilities: Zap,
};

export const incomeCategoryIcons: Record<string, LucideIcon> = {
  Salary: Briefcase,
  Freelance: DollarSign,
  Investment: TrendingUp,
  Gift: Gift,
  "Money back": RotateCcw,
  Other: MoreHorizontal,
};

export const defaultCategoryIcon = WalletIcon;
