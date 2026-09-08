"use client"

import { useEffect } from "react"

/** Keep the published worker URL reachable so existing installations can retire safely. */
export function ServiceWorkerLifecycle() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !["http:", "https:"].includes(window.location.protocol)) return

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    navigator.serviceWorker
      .register(`${basePath}/sw.js`, { updateViaCache: "none" })
      .catch((error) => {
        console.error("[ServiceWorkerLifecycle] Failed to retire legacy worker:", error)
      })
  }, [])

  return null
}
