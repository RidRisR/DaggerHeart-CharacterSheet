import { describe, expect, it } from "vitest"
import { A4_VIEWPORT_WIDTH, getViewportMetaContent } from "@/lib/mobile-viewport"
import { viewport } from "@/app/layout"

describe("mobile viewport scaling", () => {
  it("uses an A4-width viewport on mobile so overlays share the same scale", () => {
    expect(getViewportMetaContent(true)).toBe(
      `width=${A4_VIEWPORT_WIDTH}, maximum-scale=5, user-scalable=yes`,
    )
  })

  it("keeps the normal responsive viewport on desktop", () => {
    expect(getViewportMetaContent(false)).toBe(
      "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes",
    )
  })

  it("does not lock browser pinch zoom", () => {
    expect(viewport.userScalable).toBe(true)
    expect(viewport.maximumScale ?? 5).toBeGreaterThan(1)
  })
})
