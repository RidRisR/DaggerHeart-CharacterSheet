"use client"

import { useEffect } from "react"
import { getViewportMetaContent, isMobileViewportDevice } from "@/lib/mobile-viewport"

export function MobileViewportScaler() {
  useEffect(() => {
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!viewport) return

    const updateViewport = () => {
      viewport.setAttribute("content", getViewportMetaContent(isMobileViewportDevice(window)))
    }

    updateViewport()
    window.addEventListener("orientationchange", updateViewport)

    return () => {
      window.removeEventListener("orientationchange", updateViewport)
    }
  }, [])

  return null
}
