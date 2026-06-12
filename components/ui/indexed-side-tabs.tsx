"use client"

import type { KeyboardEvent, ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface IndexedSideTabItem<TValue extends string | number> {
  value: TValue
  label: ReactNode
  ariaLabel: string
  disabled?: boolean
}

interface IndexedSideTabsProps<TValue extends string | number> {
  ariaLabel: string
  value: TValue
  items: Array<IndexedSideTabItem<TValue>>
  onValueChange: (value: TValue) => void
  className?: string
  buttonClassName?: string
}

export function IndexedSideTabs<TValue extends string | number>({
  ariaLabel,
  value,
  items,
  onValueChange,
  className,
  buttonClassName,
}: IndexedSideTabsProps<TValue>) {
  const moveSelection = (currentIndex: number, direction: 1 | -1) => {
    const enabledItems = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled)

    if (enabledItems.length === 0) return

    const enabledIndex = enabledItems.findIndex(({ index }) => index === currentIndex)
    const nextEnabledIndex = enabledIndex === -1
      ? 0
      : (enabledIndex + direction + enabledItems.length) % enabledItems.length

    onValueChange(enabledItems[nextEnabledIndex].item.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault()
      moveSelection(index, -1)
      return
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault()
      moveSelection(index, 1)
      return
    }

    if (event.key === "Home") {
      event.preventDefault()
      const firstEnabled = items.find(item => !item.disabled)
      if (firstEnabled) onValueChange(firstEnabled.value)
      return
    }

    if (event.key === "End") {
      event.preventDefault()
      const lastEnabled = [...items].reverse().find(item => !item.disabled)
      if (lastEnabled) onValueChange(lastEnabled.value)
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex w-11 shrink-0 self-stretch flex-col items-center gap-1 border-l border-slate-200 bg-slate-100/80 p-1.5",
        className,
      )}
    >
      {items.map((item, index) => {
        const selected = item.value === value

        return (
          <button
            key={String(item.value)}
            type="button"
            role="tab"
            aria-label={item.ariaLabel}
            aria-selected={selected}
            disabled={item.disabled}
            className={cn(
              "flex h-10 w-8 items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1",
              selected
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
              item.disabled && "cursor-not-allowed opacity-50 hover:border-slate-200 hover:bg-white hover:text-slate-600",
              buttonClassName,
            )}
            onClick={() => onValueChange(item.value)}
            onKeyDown={event => handleKeyDown(event, index)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
