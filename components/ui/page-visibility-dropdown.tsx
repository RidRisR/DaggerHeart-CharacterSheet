"use client"

import { Plus } from "lucide-react"
import { DEFAULT_PAGE_VISIBILITY, type OptionalPageKey } from '@/character/page-visibility'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getOptionalPageConfigs } from "@/data/list/pages"
import { useSheetStore } from "@/lib/sheet-store"

export function PageVisibilityDropdown() {
  const { sheetData, setSheetData } = useSheetStore()
  
  // 如果sheetData不存在，显示占位符按钮（不可交互）
  if (!sheetData) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-full w-full rounded-sm p-0"
        disabled
        aria-label="页面管理（加载中）"
      >
        <Plus aria-hidden="true" />
      </Button>
    )
  }
  
  const pageOptions = getOptionalPageConfigs().map(config => ({
    id: config.visibilityKey!,
    label: config.label,
    description: config.description,
    visible: sheetData.pageVisibility?.[config.visibilityKey!] || false
  }))

  const togglePageVisibility = (pageId: OptionalPageKey) => {
    setSheetData(current => ({
      pageVisibility: {
        ...DEFAULT_PAGE_VISIBILITY,
        ...current.pageVisibility,
        [pageId]: !current.pageVisibility?.[pageId]
      }
    }))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-full w-full rounded-sm p-0 text-muted-foreground hover:bg-background/70 hover:text-foreground data-[state=open]:bg-background data-[state=open]:text-foreground data-[state=open]:shadow-sm"
          aria-label="页面管理"
          title="页面管理"
        >
          <Plus aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="block">页面管理</span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            选择显示在角色卡顶部的页面
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {pageOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id as string}
            checked={option.visible}
            onCheckedChange={() => togglePageVisibility(option.id)}
            onSelect={(event) => event.preventDefault()}
            className="cursor-pointer py-2"
          >
            <div className="flex flex-col">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
