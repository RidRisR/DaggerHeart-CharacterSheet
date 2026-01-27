"use client"

import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchFilter({
  value, onChange, placeholder = "搜索...",
  debounceMs = 300, className,
}: SearchFilterProps) {
  const [localValue, setLocalValue] = useState(value)
  const debouncedValue = useDebounce(localValue, debounceMs)

  useEffect(() => { setLocalValue(value) }, [value])

  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue)
    }
  }, [debouncedValue, onChange, value])

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {localValue && (
        <button
          onClick={() => { setLocalValue(""); onChange("") }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
