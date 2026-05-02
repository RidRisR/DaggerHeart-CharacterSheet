"use client"

import { useState } from "react"
import { CircleHelp } from "lucide-react"
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
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`查看${label}来源`}
        className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        onClick={() => setOpen(value => !value)}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>

      {open && (
        <span className="absolute right-0 top-6 z-50">
          <ModifierPopover sheetData={sheetData} target={target} label={label} />
        </span>
      )}
    </span>
  )
}
