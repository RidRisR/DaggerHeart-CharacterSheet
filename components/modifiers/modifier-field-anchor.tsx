"use client"

import { useState } from "react"
import { CircleHelp } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSheetStore } from "@/lib/sheet-store"
import type { ModifierTargetId } from "@/lib/modifiers/types"
import { ModifierPopover } from "./modifier-popover"

interface ModifierFieldAnchorProps {
  target: ModifierTargetId
  label: string
}

export function ModifierFieldAnchor({ target, label }: ModifierFieldAnchorProps) {
  const [open, setOpen] = useState(false)
  const sheetData = useSheetStore(state => state.sheetData)

  return (
    <span className="inline-flex print:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`查看${label}来源`}
            className="inline-flex h-5 w-5 items-center justify-center rounded text-current opacity-70 transition-opacity hover:opacity-100"
          >
            <CircleHelp className="h-3.5 w-3.5" />
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
