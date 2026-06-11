"use client"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ChevronDown, X } from "lucide-react"

export interface EquipmentFilterOption<T extends string = string> {
  value: T
  label: string
}

export interface ActiveEquipmentFilter {
  key: string
  label: string
  title: string
  clear: () => void
}

export function toggleSelectedValue<T extends string>(selected: T[], value: T): T[] {
  return selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
}

export function summarizeSelectedLabels(labels: string[]): string {
  if (labels.length <= 2) return labels.join("、")
  return `${labels.slice(0, 2).join("、")} +${labels.length - 2}`
}

export function createActiveFilter<T extends string>(input: {
  key: string
  label: string
  selected: T[]
  options: Array<EquipmentFilterOption<T>>
  clear: () => void
}): ActiveEquipmentFilter | null {
  if (input.selected.length === 0) return null

  const labelByValue = new Map(input.options.map((option) => [option.value, option.label]))
  const labels = input.selected.map((value) => labelByValue.get(value) ?? value)
  const title = `${input.label}：${labels.join("、")}`

  return {
    key: input.key,
    label: `${input.label}：${summarizeSelectedLabels(labels)}`,
    title,
    clear: input.clear,
  }
}

export function MultiSelectDropdownFilter<T extends string>({
  label,
  selected,
  options,
  onChange,
  className,
  variant = "header",
}: {
  label: string
  selected: T[]
  options: Array<EquipmentFilterOption<T>>
  onChange: (selected: T[]) => void
  className?: string
  variant?: "header" | "field"
}) {
  const hasSelection = selected.length > 0
  const labelByValue = new Map(options.map((option) => [option.value, option.label]))
  const selectedLabels = selected.map((value) => labelByValue.get(value) ?? value)
  const triggerLabel =
    variant === "field"
      ? `${label}(${hasSelection ? summarizeSelectedLabels(selectedLabels) : "全部"})`
      : label

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            variant === "header"
              ? "inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
              : "inline-flex h-10 w-full items-center justify-between gap-2 rounded border border-gray-300 bg-white px-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500",
            variant === "header" && hasSelection && "bg-white/15 text-blue-100",
            variant === "field" && hasSelection && "border-blue-400 text-blue-700",
            className,
          )}
          aria-label={`${label}筛选`}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>{label}筛选</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => onChange(toggleSelectedValue(selected, option.value))}
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">暂无可选{label}</div>}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={selected.length === 0}
          onSelect={(event) => {
            event.preventDefault()
            onChange([])
          }}
        >
          清除此字段筛选
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ActiveFilterChips({ filters }: { filters: ActiveEquipmentFilter[] }) {
  if (filters.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500">已筛选</span>
      {filters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-700"
          title={filter.title}
        >
          {filter.label}
          <button
            type="button"
            aria-label={`移除${filter.label}`}
            className="rounded-full text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
            onClick={filter.clear}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  )
}
