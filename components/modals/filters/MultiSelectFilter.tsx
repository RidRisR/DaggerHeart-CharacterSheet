"use client"

import React, { useState, useMemo } from "react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MultiSelectFilterProps<T extends string = string> {
  label: string
  options: Array<{ value: T; label: string }>
  selected: T[]
  onChange: (selected: T[]) => void
  placeholder?: string
  allSelectedText?: string
  countSuffix?: string
  showSelectAll?: boolean
  showSearch?: boolean
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelectFilter<T extends string = string>({
  label, options, selected, onChange,
  placeholder = "未选", allSelectedText = "全部",
  countSuffix = "项已选", showSelectAll = true,
  showSearch = false, searchPlaceholder = "搜索...",
  disabled = false, className,
}: MultiSelectFilterProps<T>) {
  const [searchTerm, setSearchTerm] = useState("")

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options
    const term = searchTerm.toLowerCase()
    return options.filter(opt => opt.label.toLowerCase().includes(term))
  }, [options, searchTerm])

  const isAllSelected = selected.length === options.length && options.length > 0
  const isNoneSelected = selected.length === 0

  const displayText = isNoneSelected ? placeholder
    : isAllSelected ? allSelectedText
    : `${selected.length} ${countSuffix}`

  const toggleOption = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const toggleAll = () => {
    onChange(isAllSelected ? [] : options.map((o) => o.value))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="outline" className={cn("min-w-[120px] justify-between", className)}>
          <span className="truncate">{label}: {displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {showSearch && options.length > 10 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-8"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
        {showSelectAll && options.length > 0 && (
          <div className="px-2 py-1.5 border-b">
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={toggleAll}>
              {isAllSelected ? "取消全选" : "全选"}
            </Button>
          </div>
        )}
        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {filteredOptions.length === 0 && searchTerm && (
              <p className="text-sm text-muted-foreground text-center py-2">无匹配结果</p>
            )}
            {filteredOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => toggleOption(option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
