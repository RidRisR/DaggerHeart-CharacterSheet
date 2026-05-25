import { describe, expect, it } from "vitest"
import { calculateFloatingPreviewPosition } from "@/hooks/use-card-preview"

const rect = (
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  x: left,
  y: top,
  toJSON: () => ({}),
})

describe("calculateFloatingPreviewPosition", () => {
  it("places image previews on the left when the 520px preview does not fit on the right", () => {
    const position = calculateFloatingPreviewPosition({
      triggerRect: rect(720, 120, 80, 28),
      previewSize: { width: 520, height: 450 },
      viewportSize: { width: 900, height: 700 },
    })

    expect(position).toMatchObject({
      position: "fixed",
      right: "190px",
      top: "10px",
    })
    expect(position.left).toBeUndefined()
  })

  it("keeps compact text previews on the right when the 300px preview fits", () => {
    const position = calculateFloatingPreviewPosition({
      triggerRect: rect(500, 120, 80, 28),
      previewSize: { width: 300, height: 400 },
      viewportSize: { width: 900, height: 700 },
    })

    expect(position).toMatchObject({
      position: "fixed",
      left: "590px",
      top: "10px",
    })
    expect(position.right).toBeUndefined()
  })
})
