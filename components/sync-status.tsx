"use client";

import { useSyncContext } from "@/components/sync-provider";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncStatus() {
  const { status, isOnline, syncNow } = useSyncContext();

  const isSyncing = status === "syncing";
  const isError = status === "error";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-9 w-9 rounded-full transition-colors",
        isError && "text-destructive hover:text-destructive/90",
        !isError && !isSyncing && "text-primary hover:text-primary/90"
      )}
      onClick={() => syncNow()}
      disabled={!isOnline || isSyncing}
      title={
        isError
          ? "Sync failed - click to retry"
          : isSyncing
            ? "Syncing..."
            : "Click to sync"
      }
    >
      <RefreshCw
        className={cn("h-5 w-5", isSyncing && "animate-spin")}
      />
      <span className="sr-only">Sync status</span>
    </Button>
  );
}

