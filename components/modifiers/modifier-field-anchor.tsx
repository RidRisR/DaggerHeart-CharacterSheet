"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CircleHelp } from "lucide-react"
import { useSheetStore } from "@/lib/sheet-store"
import type { ModifierTargetId } from "@/lib/modifiers/types"
import { ModifierPopover } from "./modifier-popover"

interface ModifierFieldAnchorProps {
  target: ModifierTargetId
  label: string
}

interface FloatingPosition {
  top: number
  left: number
}

const POPOVER_WIDTH = 320
const VIEWPORT_MARGIN = 8
const TRIGGER_GAP = 6

export function ModifierFieldAnchor({ target, label }: ModifierFieldAnchorProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<FloatingPosition>({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLSpanElement>(null)
  const sheetData = useSheetStore(state => state.sheetData)

  useLayoutEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return

      const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN)
      setPosition({
        top: rect.bottom + TRIGGER_GAP,
        left: Math.min(Math.max(VIEWPORT_MARGIN, rect.right - POPOVER_WIDTH), maxLeft),
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node
      if (buttonRef.current?.contains(targetNode) || popoverRef.current?.contains(targetNode)) return
      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <span className="inline-flex print:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`查看${label}来源`}
        className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        onClick={() => setOpen(value => !value)}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>

      {open && createPortal(
        <span
          ref={popoverRef}
          className="fixed z-50 print:hidden"
          style={{ top: position.top, left: position.left }}
        >
          <ModifierPopover sheetData={sheetData} target={target} label={label} />
        </span>,
        document.body,
      )}
    </span>
  )
}
