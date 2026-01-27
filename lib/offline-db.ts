import Dexie, { type EntityTable } from "dexie";

// ============================================
// Sync Status Types
// ============================================

export type SyncStatus = "online" | "offline" | "syncing" | "error";
export type EntitySyncStatus = "synced" | "pending" | "error";

export interface SyncOperation {
  id?: number;
  operationType: "create" | "update" | "delete";
  entity: "expense" | "budget" | "savingsBucket" | "savingsEntry" | "user";
  entityId: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

// ============================================
// Local Entity Types (mirror Prisma models)
// ============================================

export interface LocalUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  currency: string;
  createdAt: Date;
  syncStatus: EntitySyncStatus;
}

export interface LocalExpense {
  id: string;
  amount: number;
  category: string;
  date: Date;
  notes: string | null;
  type: "expense" | "income";
  createdAt: Date;
  userId: string;
  syncStatus: EntitySyncStatus;
}

export interface LocalBudget {
  id: string;
  amount: number;
  month: string;
  createdAt: Date;
  syncStatus: EntitySyncStatus;
}

export interface LocalSavingsBucket {
  id: string;
  name: string;
  color: string;
  goalAmount: number | null;
  interestYearlyPercent: number | null;
  createdAt: Date;
  userId: string;
  syncStatus: EntitySyncStatus;
}

export interface LocalSavingsEntry {
  id: string;
  amount: number;
  date: Date;
  entryType: string;
  notes: string | null;
  createdAt: Date;
  bucketId: string;
  userId: string;
  syncStatus: EntitySyncStatus;
}

export interface SyncMetadata {
  id: string;
  lastSyncedAt: Date | null;
  userId: string | null;
}

// ============================================
// Dexie Database Definition
// ============================================

export class ExpenseTrackerDB extends Dexie {
  users!: EntityTable<LocalUser, "id">;
  expenses!: EntityTable<LocalExpense, "id">;
  budgets!: EntityTable<LocalBudget, "id">;
  savingsBuckets!: EntityTable<LocalSavingsBucket, "id">;
  savingsEntries!: EntityTable<LocalSavingsEntry, "id">;
  syncQueue!: EntityTable<SyncOperation, "id">;
  syncMetadata!: EntityTable<SyncMetadata, "id">;

  constructor() {
    super("ExpenseTrackerDB");

    this.version(1).stores({
      users: "id, email, syncStatus",
      expenses: "id, userId, date, type, category, syncStatus, [userId+date]",
      budgets: "id, month, syncStatus",
      savingsBuckets: "id, userId, syncStatus",
      savingsEntries: "id, bucketId, userId, date, syncStatus",
      syncQueue: "++id, entity, entityId, timestamp",
      syncMetadata: "id",
    });

    // Version 2: simplified (removed tags)
    this.version(2).stores({
      users: "id, email, syncStatus",
      expenses: "id, userId, date, type, category, syncStatus, [userId+date]",
      budgets: "id, month, syncStatus",
      savingsBuckets: "id, userId, syncStatus",
      savingsEntries: "id, bucketId, userId, date, syncStatus",
      syncQueue: "++id, entity, entityId, timestamp",
      syncMetadata: "id",
    });
  }
}

// Singleton instance
export const localDb = new ExpenseTrackerDB();

// ============================================
// Helper Functions
// ============================================

export async function clearLocalData() {
  await localDb.transaction(
    "rw",
    [
      localDb.users,
      localDb.expenses,
      localDb.budgets,
      localDb.savingsBuckets,
      localDb.savingsEntries,
      localDb.syncQueue,
      localDb.syncMetadata,
    ],
    async () => {
      await localDb.users.clear();
      await localDb.expenses.clear();
      await localDb.budgets.clear();
      await localDb.savingsBuckets.clear();
      await localDb.savingsEntries.clear();
      await localDb.syncQueue.clear();
      await localDb.syncMetadata.clear();
    }
  );
}

export async function getSyncMetadata(): Promise<SyncMetadata | undefined> {
  return localDb.syncMetadata.get("main");
}

export async function updateSyncMetadata(
  userId: string,
  lastSyncedAt: Date
): Promise<void> {
  await localDb.syncMetadata.put({
    id: "main",
    userId,
    lastSyncedAt,
  });
}

// ============================================
// Sync Queue Operations
// ============================================

export async function addToSyncQueue(
  operation: Omit<SyncOperation, "id" | "timestamp" | "retryCount">
): Promise<void> {
  await localDb.syncQueue.add({
    ...operation,
    timestamp: Date.now(),
    retryCount: 0,
  });
}

export async function getPendingSyncOperations(): Promise<SyncOperation[]> {
  return localDb.syncQueue.orderBy("timestamp").toArray();
}

export async function removeSyncOperation(id: number): Promise<void> {
  await localDb.syncQueue.delete(id);
}

export async function incrementRetryCount(id: number): Promise<void> {
  await localDb.syncQueue.update(id, {
    retryCount: (await localDb.syncQueue.get(id))?.retryCount ?? 0 + 1,
  });
}

export async function getPendingCount(): Promise<number> {
  return localDb.syncQueue.count();
}
