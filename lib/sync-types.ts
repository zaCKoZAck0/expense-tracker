export type SyncStatus = "online" | "offline" | "syncing" | "error";
export type EntitySyncStatus = "synced" | "pending" | "error";

export interface SyncContextValue {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: Date | null;
  isOnline: boolean;
  syncNow: () => Promise<void>;
  refreshFromServer: () => Promise<void>;
}
