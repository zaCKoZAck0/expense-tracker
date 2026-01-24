"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  localDb,
  getPendingSyncOperations,
  removeSyncOperation,
  updateSyncMetadata,
  getSyncMetadata,
  getPendingCount,
  type SyncOperation,
  type LocalExpense,
  type LocalBudget,
  type LocalSavingsBucket,
  type LocalSavingsEntry,
} from "@/lib/offline-db";
import type { SyncStatus, SyncContextValue } from "@/lib/sync-types";
import {
  addExpense,
  updateExpense,
  deleteExpense,
  setBudget,
} from "@/app/actions";

// ============================================
// Context Definition
// ============================================

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
}

// ============================================
// Sync Provider Component
// ============================================

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const [status, setStatus] = useState<SyncStatus>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const isSyncing = useRef(false);

  // ============================================
  // Network Status Detection
  // ============================================

  // Note: syncPendingOperations is defined later, so we use a ref pattern
  const syncOnReconnect = useRef<() => void>(() => {});

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);
    setStatus(navigator.onLine ? "online" : "offline");

    const handleOnline = () => {
      setIsOnline(true);
      setStatus("online");
      // Trigger sync when coming back online
      syncOnReconnect.current();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ============================================
  // Load Initial State
  // ============================================

  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const metadata = await getSyncMetadata();
        if (metadata?.lastSyncedAt) {
          setLastSyncedAt(metadata.lastSyncedAt);
        }
        const count = await getPendingCount();
        setPendingCount(count);
      } catch (error) {
        console.error("Failed to load sync metadata:", error);
      }
    };
    loadInitialState();
  }, []);

  // ============================================
  // Process Single Sync Operation
  // ============================================

  const processSyncOperation = async (
    operation: SyncOperation
  ): Promise<boolean> => {
    try {
      switch (operation.entity) {
        case "expense": {
          const data = operation.data as LocalExpense;
          if (operation.operationType === "create") {
            const result = await addExpense({
              amount: data.amount,
              category: data.category,
              date: data.date,
              notes: data.notes ?? undefined,
              type: data.type,
            });
            // If successful, delete the local record (server data will be fetched on refresh)
            if (result.success) {
              await localDb.expenses.delete(operation.entityId);
            }
          } else if (operation.operationType === "update") {
            await updateExpense(operation.entityId, {
              amount: data.amount,
              category: data.category,
              date: data.date,
              notes: data.notes ?? undefined,
              type: data.type,
            });
          } else if (operation.operationType === "delete") {
            await deleteExpense(operation.entityId);
          }
          break;
        }
        case "budget": {
          const data = operation.data as LocalBudget;
          if (
            operation.operationType === "create" ||
            operation.operationType === "update"
          ) {
            const result = await setBudget(data.amount, data.month);
            // If successful, delete the local record (server data will be fetched on refresh)
            if (result.success && operation.operationType === "create") {
              await localDb.budgets.delete(operation.entityId);
            }
          }
          break;
        }
        case "savingsBucket": {
          const data = operation.data as LocalSavingsBucket;
          // Call savings bucket API
          if (operation.operationType === "create") {
            await fetch("/api/savings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: data.name,
                color: data.color,
                goalAmount: data.goalAmount,
                interestYearlyPercent: data.interestYearlyPercent,
              }),
            });
          } else if (operation.operationType === "update") {
            await fetch(`/api/savings/${operation.entityId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: data.name,
                color: data.color,
                goalAmount: data.goalAmount,
                interestYearlyPercent: data.interestYearlyPercent,
              }),
            });
          } else if (operation.operationType === "delete") {
            await fetch(`/api/savings/${operation.entityId}`, {
              method: "DELETE",
            });
          }
          break;
        }
        case "savingsEntry": {
          const data = operation.data as LocalSavingsEntry;
          if (operation.operationType === "create") {
            await fetch(`/api/savings/${data.bucketId}/entries`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: data.amount,
                date: data.date,
                entryType: data.entryType,
                notes: data.notes,
              }),
            });
          } else if (operation.operationType === "update") {
            await fetch(`/api/savings/entries/${operation.entityId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: data.amount,
                date: data.date,
                entryType: data.entryType,
                notes: data.notes,
              }),
            });
          } else if (operation.operationType === "delete") {
            await fetch(`/api/savings/entries/${operation.entityId}`, {
              method: "DELETE",
            });
          }
          break;
        }
      }
      return true;
    } catch (error) {
      console.error("Failed to process sync operation:", error);
      return false;
    }
  };

  // ============================================
  // Sync Pending Operations to Server
  // ============================================

  const syncPendingOperations = useCallback(async () => {
    if (!navigator.onLine || isSyncing.current) return;

    isSyncing.current = true;
    setStatus("syncing");

    try {
      const operations = await getPendingSyncOperations();

      for (const operation of operations) {
        const success = await processSyncOperation(operation);
        if (success && operation.id) {
          await removeSyncOperation(operation.id);
          // Update local entity sync status
          await updateLocalEntityStatus(operation.entity, operation.entityId, "synced");
        }
      }

      const count = await getPendingCount();
      setPendingCount(count);

      if (count === 0) {
        const now = new Date();
        const metadata = await getSyncMetadata();
        if (metadata?.userId) {
          await updateSyncMetadata(metadata.userId, now);
        }
        setLastSyncedAt(now);
        setStatus("online");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setStatus("error");
    } finally {
      isSyncing.current = false;
    }
  }, []);

  // Keep the ref updated for the network status handler
  useEffect(() => {
    syncOnReconnect.current = syncPendingOperations;
  }, [syncPendingOperations]);

  // ============================================
  // Update Local Entity Sync Status
  // ============================================

  const updateLocalEntityStatus = async (
    entity: string,
    entityId: string,
    syncStatus: "synced" | "pending" | "error"
  ) => {
    try {
      switch (entity) {
        case "expense":
          await localDb.expenses.update(entityId, { syncStatus });
          break;
        case "budget":
          await localDb.budgets.update(entityId, { syncStatus });
          break;
        case "savingsBucket":
          await localDb.savingsBuckets.update(entityId, { syncStatus });
          break;
        case "savingsEntry":
          await localDb.savingsEntries.update(entityId, { syncStatus });
          break;
      }
    } catch (error) {
      console.error("Failed to update local entity status:", error);
    }
  };

  // ============================================
  // Refresh Data from Server
  // ============================================

  const refreshFromServer = useCallback(async () => {
    if (!navigator.onLine) return;

    setStatus("syncing");
    try {
      // Fetch ALL data from server (full sync)
      const response = await fetch(
        `/api/sync?full=true`
      );

      if (response.ok) {
        const data = await response.json();

        // Store user
        if (data.user) {
          await localDb.users.put({
            ...data.user,
            createdAt: new Date(data.user.createdAt),
            syncStatus: "synced",
          });
          await updateSyncMetadata(data.user.id, new Date());
        }

        // Store expenses - replace all synced expenses with server data
        // Keep pending local expenses that haven't been synced yet
        if (data.expenses) {
          await localDb.transaction("rw", localDb.expenses, async () => {
            // Get pending local expenses (not yet synced)
            const pendingExpenses = await localDb.expenses
              .where("syncStatus")
              .equals("pending")
              .toArray();
            
            // Clear all expenses and re-add synced ones plus pending
            await localDb.expenses.clear();
            
            // Add all server expenses as synced
            for (const expense of data.expenses) {
              await localDb.expenses.put({
                ...expense,
                date: new Date(expense.date),
                createdAt: new Date(expense.createdAt),
                syncStatus: "synced",
              });
            }
            
            // Re-add pending expenses that aren't duplicates
            const serverIds = new Set(data.expenses.map((e: { id: string }) => e.id));
            for (const pending of pendingExpenses) {
              if (!serverIds.has(pending.id)) {
                await localDb.expenses.put(pending);
              }
            }
          });
        }

        // Store budgets - same approach
        if (data.budgets) {
          await localDb.transaction("rw", localDb.budgets, async () => {
            const pendingBudgets = await localDb.budgets
              .where("syncStatus")
              .equals("pending")
              .toArray();
            
            await localDb.budgets.clear();
            
            for (const budget of data.budgets) {
              await localDb.budgets.put({
                ...budget,
                createdAt: new Date(budget.createdAt),
                syncStatus: "synced",
              });
            }
            
            // Re-add pending budgets for months not on server
            const serverMonths = new Set(data.budgets.map((b: { month: string }) => b.month));
            for (const pending of pendingBudgets) {
              if (!serverMonths.has(pending.month)) {
                await localDb.budgets.put(pending);
              }
            }
          });
        }

        // Store savings buckets
        if (data.savingsBuckets) {
          await localDb.transaction("rw", localDb.savingsBuckets, async () => {
            for (const bucket of data.savingsBuckets) {
              await localDb.savingsBuckets.put({
                ...bucket,
                createdAt: new Date(bucket.createdAt),
                syncStatus: "synced",
              });
            }
          });
        }

        // Store savings entries
        if (data.savingsEntries) {
          await localDb.transaction("rw", localDb.savingsEntries, async () => {
            for (const entry of data.savingsEntries) {
              await localDb.savingsEntries.put({
                ...entry,
                date: new Date(entry.date),
                createdAt: new Date(entry.createdAt),
                syncStatus: "synced",
              });
            }
          });
        }

        setLastSyncedAt(new Date());
      }

      setStatus("online");
    } catch (error) {
      console.error("Failed to refresh from server:", error);
      setStatus("error");
    }
  }, []);

  // ============================================
  // Manual Sync Trigger
  // ============================================

  const syncNow = useCallback(async () => {
    await syncPendingOperations();
    await refreshFromServer();
  }, [syncPendingOperations, refreshFromServer]);

  // ============================================
  // Auto-sync on Mount if Online
  // ============================================

  useEffect(() => {
    if (navigator.onLine) {
      // Delay initial sync slightly to let app render
      const timer = setTimeout(() => {
        syncPendingOperations();
        refreshFromServer();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [syncPendingOperations, refreshFromServer]);

  // ============================================
  // Update Pending Count Periodically
  // ============================================

  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingCount();
      setPendingCount(count);
    };

    // Update every 5 seconds
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const value: SyncContextValue = {
    status,
    pendingCount,
    lastSyncedAt,
    isOnline,
    syncNow,
    refreshFromServer,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
