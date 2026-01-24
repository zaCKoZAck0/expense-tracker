"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  localDb,
  addToSyncQueue,
  type LocalSavingsBucket,
  type LocalSavingsEntry,
} from "@/lib/offline-db";
import { useSyncContext } from "@/components/sync-provider";
import type { SavingsBucket, SavingsEntry } from "@/components/savings/types";

// ============================================
// Helper: Convert Local to UI types
// ============================================

function localBucketToUI(
  bucket: LocalSavingsBucket,
  entries: LocalSavingsEntry[]
): SavingsBucket {
  return {
    id: bucket.id,
    name: bucket.name,
    color: bucket.color,
    goalAmount: bucket.goalAmount ?? undefined,
    interestYearlyPercent: bucket.interestYearlyPercent ?? undefined,
    createdAt: bucket.createdAt.toISOString(),
    userId: bucket.userId,
    entries: entries
      .filter((e) => e.bucketId === bucket.id)
      .map((e) => ({
        id: e.id,
        amount: e.amount,
        date: e.date.toISOString().split("T")[0],
        entryType: e.entryType as "deposit" | "withdrawal",
        notes: e.notes ?? undefined,
        createdAt: e.createdAt.toISOString(),
        bucketId: e.bucketId,
        userId: e.userId,
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
      ),
  };
}

// ============================================
// Savings Data Hook
// ============================================

export function useSavingsData() {
  const { isOnline } = useSyncContext();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasFetchedFromServer, setHasFetchedFromServer] = useState(false);

  // Live query for buckets
  const localBuckets = useLiveQuery(
    () => localDb.savingsBuckets.toArray(),
    [],
    []
  );

  // Live query for entries
  const localEntries = useLiveQuery(
    () => localDb.savingsEntries.toArray(),
    [],
    []
  );

  // Convert to UI format
  const buckets: SavingsBucket[] =
    localBuckets && localEntries
      ? localBuckets
          .map((b) => localBucketToUI(b, localEntries))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
      : [];

  // Initial load from server
  useEffect(() => {
    const loadFromServer = async () => {
      if (!isOnline || hasFetchedFromServer) return;

      setIsLoading(true);
      try {
        const res = await fetch("/api/savings", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { buckets: SavingsBucket[] };
          const serverBuckets = data.buckets ?? [];

          // Sync server data to local DB
          await localDb.transaction(
            "rw",
            [localDb.savingsBuckets, localDb.savingsEntries],
            async () => {
              for (const bucket of serverBuckets) {
                // Upsert bucket
                await localDb.savingsBuckets.put({
                  id: bucket.id,
                  name: bucket.name,
                  color: bucket.color,
                  goalAmount: bucket.goalAmount ?? null,
                  interestYearlyPercent: bucket.interestYearlyPercent ?? null,
                  createdAt: new Date(bucket.createdAt),
                  userId: bucket.userId ?? "",
                  syncStatus: "synced",
                });

                // Upsert entries
                for (const entry of bucket.entries) {
                  await localDb.savingsEntries.put({
                    id: entry.id,
                    amount: entry.amount,
                    date: new Date(entry.date),
                    entryType: entry.entryType,
                    notes: entry.notes ?? null,
                    createdAt: new Date(entry.createdAt ?? new Date()),
                    bucketId: bucket.id,
                    userId: entry.userId ?? bucket.userId ?? "",
                    syncStatus: "synced",
                  });
                }
              }
            }
          );
          setHasFetchedFromServer(true);
        }
      } catch (err) {
        console.error("Failed to load savings from server:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to load savings")
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadFromServer();
  }, [isOnline, hasFetchedFromServer]);

  // Set loading to false once we have local data
  useEffect(() => {
    if (localBuckets !== undefined) {
      setIsLoading(false);
    }
  }, [localBuckets]);

  return {
    buckets,
    isLoading: isLoading && buckets.length === 0,
    error,
    refetch: () => setHasFetchedFromServer(false),
  };
}

// ============================================
// Add Bucket Hook
// ============================================

interface BucketInput {
  name: string;
  color: string;
  goalAmount?: number;
  interestYearlyPercent?: number;
}

export function useAddBucket() {
  const { isOnline } = useSyncContext();

  return useCallback(
    async (input: BucketInput, userId: string): Promise<string> => {
      const id = crypto.randomUUID();
      const now = new Date();

      const bucket: LocalSavingsBucket = {
        id,
        name: input.name,
        color: input.color,
        goalAmount: input.goalAmount ?? null,
        interestYearlyPercent: input.interestYearlyPercent ?? null,
        createdAt: now,
        userId,
        syncStatus: "pending",
      };

      // Save to local DB
      await localDb.savingsBuckets.add(bucket);

      // Queue for sync
      await addToSyncQueue({
        operationType: "create",
        entity: "savingsBucket",
        entityId: id,
        data: bucket,
      });

      // Try to sync immediately if online
      if (isOnline) {
        try {
          const res = await fetch("/api/savings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (res.ok) {
            const data = (await res.json()) as { bucket: SavingsBucket };
            // Update local with server response (in case of ID changes, etc.)
            await localDb.savingsBuckets.update(id, {
              syncStatus: "synced",
            });
            // Remove from sync queue since it's synced
            const ops = await localDb.syncQueue
              .where("entityId")
              .equals(id)
              .toArray();
            for (const op of ops) {
              if (op.id) await localDb.syncQueue.delete(op.id);
            }
          }
        } catch (err) {
          console.warn("Failed to sync bucket creation, queued for later:", err);
        }
      }

      return id;
    },
    [isOnline]
  );
}

// ============================================
// Update Bucket Hook
// ============================================

export function useUpdateBucket() {
  const { isOnline } = useSyncContext();

  return useCallback(
    async (bucketId: string, input: BucketInput): Promise<void> => {
      const existing = await localDb.savingsBuckets.get(bucketId);
      if (!existing) throw new Error("Bucket not found");

      const updated: LocalSavingsBucket = {
        ...existing,
        name: input.name,
        color: input.color,
        goalAmount: input.goalAmount ?? null,
        interestYearlyPercent: input.interestYearlyPercent ?? null,
        syncStatus: "pending",
      };

      // Update local DB
      await localDb.savingsBuckets.put(updated);

      // Queue for sync
      await addToSyncQueue({
        operationType: "update",
        entity: "savingsBucket",
        entityId: bucketId,
        data: updated,
      });

      // Try to sync immediately if online
      if (isOnline) {
        try {
          const res = await fetch(`/api/savings/${bucketId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (res.ok) {
            await localDb.savingsBuckets.update(bucketId, {
              syncStatus: "synced",
            });
            // Remove from sync queue
            const ops = await localDb.syncQueue
              .where("entityId")
              .equals(bucketId)
              .toArray();
            for (const op of ops) {
              if (op.id) await localDb.syncQueue.delete(op.id);
            }
          }
        } catch (err) {
          console.warn("Failed to sync bucket update, queued for later:", err);
        }
      }
    },
    [isOnline]
  );
}

// ============================================
// Delete Bucket Hook
// ============================================

export function useDeleteBucket() {
  const { isOnline } = useSyncContext();

  return useCallback(
    async (bucketId: string): Promise<void> => {
      const existing = await localDb.savingsBuckets.get(bucketId);
      if (!existing) return;

      // Delete entries first
      await localDb.savingsEntries.where("bucketId").equals(bucketId).delete();

      // Delete bucket
      await localDb.savingsBuckets.delete(bucketId);

      // Queue for sync only if it was previously synced
      if (existing.syncStatus === "synced") {
        await addToSyncQueue({
          operationType: "delete",
          entity: "savingsBucket",
          entityId: bucketId,
          data: { id: bucketId },
        });
      }

      // Try to sync immediately if online
      if (isOnline && existing.syncStatus === "synced") {
        try {
          const res = await fetch(`/api/savings/${bucketId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            // Remove from sync queue
            const ops = await localDb.syncQueue
              .where("entityId")
              .equals(bucketId)
              .toArray();
            for (const op of ops) {
              if (op.id) await localDb.syncQueue.delete(op.id);
            }
          }
        } catch (err) {
          console.warn("Failed to sync bucket deletion, queued for later:", err);
        }
      }
    },
    [isOnline]
  );
}

// ============================================
// Add Entry Hook
// ============================================

interface EntryInput {
  amount: number;
  date: string;
  notes?: string;
}

export function useAddEntry() {
  const { isOnline } = useSyncContext();

  return useCallback(
    async (
      bucketId: string,
      input: EntryInput,
      entryType: "deposit" | "withdrawal",
      userId: string
    ): Promise<string> => {
      const id = crypto.randomUUID();
      const now = new Date();

      const entry: LocalSavingsEntry = {
        id,
        amount: input.amount,
        date: new Date(input.date),
        entryType,
        notes: input.notes ?? null,
        createdAt: now,
        bucketId,
        userId,
        syncStatus: "pending",
      };

      // Save to local DB
      await localDb.savingsEntries.add(entry);

      // Queue for sync
      await addToSyncQueue({
        operationType: "create",
        entity: "savingsEntry",
        entityId: id,
        data: entry,
      });

      // Try to sync immediately if online
      if (isOnline) {
        try {
          const res = await fetch(`/api/savings/${bucketId}/entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...input, type: entryType }),
          });
          if (res.ok) {
            await localDb.savingsEntries.update(id, {
              syncStatus: "synced",
            });
            // Remove from sync queue
            const ops = await localDb.syncQueue
              .where("entityId")
              .equals(id)
              .toArray();
            for (const op of ops) {
              if (op.id) await localDb.syncQueue.delete(op.id);
            }
          }
        } catch (err) {
          console.warn("Failed to sync entry creation, queued for later:", err);
        }
      }

      return id;
    },
    [isOnline]
  );
}

// ============================================
// Update Entry Hook
// ============================================

export function useUpdateEntry() {
  const { isOnline } = useSyncContext();

  return useCallback(
    async (
      bucketId: string,
      entryId: string,
      input: EntryInput
    ): Promise<void> => {
      const existing = await localDb.savingsEntries.get(entryId);
      if (!existing) throw new Error("Entry not found");

      const updated: LocalSavingsEntry = {
        ...existing,
        amount: input.amount,
        date: new Date(input.date),
        notes: input.notes ?? null,
        syncStatus: "pending",
      };

      // Update local DB
      await localDb.savingsEntries.put(updated);

      // Queue for sync
      await addToSyncQueue({
        operationType: "update",
        entity: "savingsEntry",
        entityId: entryId,
        data: updated,
      });

      // Try to sync immediately if online
      if (isOnline) {
        try {
          const res = await fetch(`/api/savings/entries/${entryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bucketId, ...input }),
          });
          if (res.ok) {
            await localDb.savingsEntries.update(entryId, {
              syncStatus: "synced",
            });
            // Remove from sync queue
            const ops = await localDb.syncQueue
              .where("entityId")
              .equals(entryId)
              .toArray();
            for (const op of ops) {
              if (op.id) await localDb.syncQueue.delete(op.id);
            }
          }
        } catch (err) {
          console.warn("Failed to sync entry update, queued for later:", err);
        }
      }
    },
    [isOnline]
  );
}

// ============================================
// Delete Entry Hook
// ============================================

export function useDeleteEntry() {
  const { isOnline } = useSyncContext();

  return useCallback(
    async (bucketId: string, entryId: string): Promise<void> => {
      const existing = await localDb.savingsEntries.get(entryId);
      if (!existing) return;

      // Delete from local DB
      await localDb.savingsEntries.delete(entryId);

      // Queue for sync only if it was previously synced
      if (existing.syncStatus === "synced") {
        await addToSyncQueue({
          operationType: "delete",
          entity: "savingsEntry",
          entityId: entryId,
          data: { id: entryId, bucketId },
        });
      }

      // Try to sync immediately if online
      if (isOnline && existing.syncStatus === "synced") {
        try {
          const res = await fetch(`/api/savings/entries/${entryId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            // Remove from sync queue
            const ops = await localDb.syncQueue
              .where("entityId")
              .equals(entryId)
              .toArray();
            for (const op of ops) {
              if (op.id) await localDb.syncQueue.delete(op.id);
            }
          }
        } catch (err) {
          console.warn("Failed to sync entry deletion, queued for later:", err);
        }
      }
    },
    [isOnline]
  );
}

// ============================================
// Get User ID Helper
// ============================================

export async function getLocalUserId(): Promise<string> {
  const users = await localDb.users.toArray();
  if (users.length > 0) {
    return users[0].id;
  }
  return "local-user";
}
