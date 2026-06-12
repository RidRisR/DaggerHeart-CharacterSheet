"use client"

import { useState } from "react"
import { CircleHelp } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { IndexedSideTabs } from "@/components/ui/indexed-side-tabs"
import type { ModifierTargetId } from "@/automation/core/types"
import { useSheetStore } from "@/lib/sheet-store"
import { cn } from "@/lib/utils"
import { ModifierPopover } from "./modifier-popover"

const EXPERIENCE_TARGET_LABELS = ["经历一", "经历二", "经历三", "经历四", "经历五"]

interface ExperienceProviderAnchorProps {
  size?: "default" | "compact"
}

export function ExperienceProviderAnchor({ size = "default" }: ExperienceProviderAnchorProps) {
  const [open, setOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const sheetData = useSheetStore(state => state.sheetData)
  const compact = size === "compact"
  const selectedLabel = EXPERIENCE_TARGET_LABELS[selectedIndex] ?? `经历 ${selectedIndex + 1}`
  const selectedTarget = `experienceValues.${selectedIndex}` as ModifierTargetId

  return (
    <span className={cn("inline-flex print:hidden", compact && "align-middle")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="查看经历来源"
            className={cn(
              "inline-flex items-center justify-center rounded text-current opacity-70 transition-opacity hover:opacity-100",
              compact ? "h-3.5 w-3.5" : "h-5 w-5",
            )}
          >
            <CircleHelp className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          aria-label="经历来源"
          side="bottom"
          align="center"
          sideOffset={4}
          collisionPadding={8}
          className="w-[23rem] border-slate-300 bg-slate-50 p-0 shadow-xl print:hidden"
        >
          <div className="flex max-h-[min(28rem,80vh)]">
            <div className="min-w-0 flex-1 overflow-y-auto">
              <ModifierPopover sheetData={sheetData} target={selectedTarget} label={selectedLabel} />
            </div>
            <IndexedSideTabs
              ariaLabel="经历加值"
              value={selectedIndex}
              items={[0, 1, 2, 3, 4].map(index => ({
                value: index,
                label: String(index + 1),
                ariaLabel: `经历 ${index + 1}`,
              }))}
              onValueChange={setSelectedIndex}
            />
          </div>
        </PopoverContent>
      </Popover>
    </span>
  )
}
