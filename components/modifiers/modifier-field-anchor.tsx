"use client"

import { useState } from "react"
import { CircleHelp } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useSheetStore } from "@/lib/sheet-store"
import type { ModifierTargetId } from "@/automation/core/types"
import { ModifierPopover } from "./modifier-popover"

interface ModifierFieldAnchorProps {
  target: ModifierTargetId
  label: string
  size?: "default" | "compact"
}

export function ModifierFieldAnchor({ target, label, size = "default" }: ModifierFieldAnchorProps) {
  const [open, setOpen] = useState(false)
  const sheetData = useSheetStore(state => state.sheetData)
  const compact = size === "compact"

  return (
    <span className={cn("inline-flex print:hidden", compact && "align-middle")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`查看${label}来源`}
            className={cn(
              "inline-flex items-center justify-center rounded text-current opacity-70 transition-opacity hover:opacity-100",
              compact ? "h-3.5 w-3.5" : "h-5 w-5",
            )}
          >
            <CircleHelp className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          aria-label={`${label}来源`}
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className="w-80 p-0 print:hidden"
        >
          <ModifierPopover sheetData={sheetData} target={target} label={label} onClose={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </span>
  )
}
