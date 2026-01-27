"use client"

import React, { useState } from "react"
import * as Collapsible from "@radix-ui/react-collapsible"
import { ChevronDown, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalFilterBarProps {
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
  activeFilterCount?: number
  className?: string
}

export function ModalFilterBar({
  children, collapsible = false, defaultExpanded = true,
  activeFilterCount = 0, className,
}: ModalFilterBarProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded)

  if (!collapsible) {
    return (
      <div className={cn("p-4 border-b border-gray-200 flex flex-wrap gap-3", className)}>
        {children}
      </div>
    )
  }

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn("border-b border-gray-200", className)}>
        <Collapsible.Trigger className="w-full p-4 flex items-center justify-between hover:bg-gray-50 md:hidden">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">筛选</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </Collapsible.Trigger>
        <div className="hidden md:flex p-4 flex-wrap gap-3">{children}</div>
        <Collapsible.Content className="md:hidden">
          <div className="p-4 pt-0 flex flex-wrap gap-3">{children}</div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  )
}
