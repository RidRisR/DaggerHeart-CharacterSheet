"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getTabPages, type PageDefinition } from "@/lib/page-registry"
import { useSheetStore } from "@/lib/sheet-store"

interface PageSelectorProps {
  value: string
  onValueChange: (value: string) => void
  label: string
  className?: string
}

export function PageSelector({ value, onValueChange, label, className }: PageSelectorProps) {
  const { sheetData } = useSheetStore()
  
  const availablePages = React.useMemo(() => {
    return getTabPages(sheetData)
  }, [sheetData])

  const selectedPage = availablePages.find(page => page.id === value)

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
        {label}:
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue>
            {selectedPage?.label || '选择页面'}
          </SelectValue>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </SelectTrigger>
        <SelectContent>
          {availablePages.map((page) => (
            <SelectItem key={page.id} value={page.id} className="text-xs">
              {page.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}