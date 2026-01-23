import React from "react";

interface StatTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valueLabel: string;
}

export function StatTile({ icon: Icon, label, valueLabel }: StatTileProps) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold">{valueLabel}</div>
    </div>
  );
}
