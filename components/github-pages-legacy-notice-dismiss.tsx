"use client"

import { createContext, type ReactNode, useContext, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"

const LegacyNoticeDismissContext = createContext<(() => void) | null>(null)

export function GithubPagesLegacyNoticeDismiss({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) {
    return null
  }

  return (
    <LegacyNoticeDismissContext.Provider value={() => setIsVisible(false)}>
      {children}
    </LegacyNoticeDismissContext.Provider>
  )
}

export function GithubPagesLegacyNoticeDismissButton() {
  const dismiss = useContext(LegacyNoticeDismissContext)

  return (
    <Button
      type="button"
      variant="outline"
      className="border-amber-300 bg-white/60 text-amber-950 hover:bg-amber-100"
      onClick={dismiss ?? undefined}
    >
      关闭提示
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>
  )
}
