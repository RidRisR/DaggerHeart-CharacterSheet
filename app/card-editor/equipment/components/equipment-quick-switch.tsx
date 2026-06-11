"use client";

import type React from "react";
import { Button } from "@/components/ui/button";

interface EquipmentQuickSwitchProps<TItem> {
  items: TItem[];
  selectedIndex: number;
  getTitle(item: TItem, index: number): string;
  getSubtitle(item: TItem): string;
  renderItem?(item: TItem, index: number): React.ReactNode;
  onSelect(index: number): void;
}

export function EquipmentQuickSwitch<TItem>({
  items,
  selectedIndex,
  getTitle,
  getSubtitle,
  renderItem,
  onSelect,
}: EquipmentQuickSwitchProps<TItem>) {
  return (
    <div className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto pr-1">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无条目</p>
      ) : null}
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        const layoutClass = renderItem
          ? "mx-auto w-fit justify-center"
          : "w-full justify-start";
        const stateClass = isSelected
          ? "border-gray-900 bg-gray-50 hover:bg-gray-100"
          : "";

        return (
          <Button
            key={index}
            type="button"
            variant="outline"
            className={`h-auto p-2 text-left text-foreground ${layoutClass} ${stateClass}`}
            onClick={() => onSelect(index)}
          >
            {renderItem ? (
              renderItem(item, index)
            ) : (
              <span className="grid gap-1">
                <span className="font-medium">{getTitle(item, index)}</span>
                <span className="text-xs opacity-80">{getSubtitle(item)}</span>
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
