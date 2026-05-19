import { act, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"

function AutoResizeInput({ text }: { text: string }) {
  const { getElementProps } = useAutoResizeFont()

  return (
    <input
      aria-label="auto resize field"
      readOnly
      value={text}
      {...getElementProps(text, "auto-resize-field")}
    />
  )
}

describe("useAutoResizeFont", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("does not schedule another overflow check when the overflow state is unchanged", () => {
    vi.useFakeTimers()

    render(<AutoResizeInput text="" />)

    expect(vi.getTimerCount()).toBe(1)

    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(vi.getTimerCount()).toBe(0)
  })
})
