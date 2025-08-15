"use client"

import * as React from "react"
import { Check, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useSheetStore } from "@/lib/sheet-store"
import { getOptionalPageConfigs } from "@/data/list/pages"

export function PageVisibilityDropdown() {
  const { sheetData, setSheetData } = useSheetStore()
  
  // 如果sheetData不存在，显示占位符按钮（不可交互）
  if (!sheetData) {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
          "h-10 min-w-[40px] opacity-50 cursor-not-allowed"
        )}
        disabled
        title="加载中..."
      >
        <Plus className="h-4 w-4" />
      </button>
    )
  }
  
  const pageOptions = getOptionalPageConfigs().map(config => ({
    id: config.visibilityKey!,
    label: config.label,
    description: config.description,
    visible: sheetData.pageVisibility?.[config.visibilityKey!] || false
  }))

  const togglePageVisibility = (pageId: 'rangerCompanion' | 'armorTemplate' | 'adventureNotes') => {
    const currentValue = sheetData.pageVisibility?.[pageId]
    setSheetData({
      pageVisibility: {
        rangerCompanion: pageId === 'rangerCompanion' ? !currentValue : (sheetData.pageVisibility?.rangerCompanion ?? false),
        armorTemplate: pageId === 'armorTemplate' ? !currentValue : (sheetData.pageVisibility?.armorTemplate ?? false),
        adventureNotes: pageId === 'adventureNotes' ? !currentValue : (sheetData.pageVisibility?.adventureNotes ?? false)
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
            "hover:bg-muted-foreground/10",
            "h-10 min-w-[40px]"
          )}
          title="管理页面显示"
        >
          <Plus className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {pageOptions.map((option) => (
          <DropdownMenuItem
            key={option.id as string}
            onClick={() => togglePageVisibility(option.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
            <div className="flex items-center justify-center w-4 h-4">
              {option.visible && <Check className="h-3 w-3" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}