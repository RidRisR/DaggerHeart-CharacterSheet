"use client"

import React from "react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface SingleSelectFilterProps<T extends string = string> {
  label?: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  placeholder?: string
  allOption?: { value: T; label: string }
  disabled?: boolean
  className?: string
}

export function SingleSelectFilter<T extends string = string>({
  label, options, value, onChange,
  placeholder = "选择...", allOption,
  disabled = false, className,
}: SingleSelectFilterProps<T>) {
  const allOptions = allOption ? [allOption, ...options] : options

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn("w-[180px]", className)}>
        {label && <span className="text-muted-foreground mr-1">{label}:</span>}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
