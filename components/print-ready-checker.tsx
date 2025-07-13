"use client"

import React, { useEffect } from "react"
import { usePrintContext } from "@/contexts/print-context"

interface PrintReadyCheckerProps {
  onPrintReady?: () => void
  children?: React.ReactNode
}

export function PrintReadyChecker({ onPrintReady, children }: PrintReadyCheckerProps) {
  const { allImagesLoaded } = usePrintContext()

  useEffect(() => {
    if (allImagesLoaded) {
      onPrintReady?.()
    }
  }, [allImagesLoaded, onPrintReady])

  return (
    <>
      {children}
      {!allImagesLoaded && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg">正在加载图片，请稍候...</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}