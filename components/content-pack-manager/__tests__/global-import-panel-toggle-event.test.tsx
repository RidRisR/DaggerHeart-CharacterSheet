import "@testing-library/jest-dom/vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

describe("GlobalImportPanel diagnostic toggle events", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    vi.doUnmock("react")
  })

  it("does not read the toggle event inside a deferred state updater", async () => {
    vi.useFakeTimers()

    vi.doMock("react", async () => {
      const actual = await vi.importActual<typeof import("react")>("react")

      return {
        ...actual,
        useState<T>(initialState: T | (() => T)) {
          const [value, setValue] = actual.useState(initialState)
          const setValueAfterEvent = (nextValue: T | ((current: T) => T)) => {
            if (typeof nextValue === "function") {
              window.setTimeout(() => {
                setValue(nextValue as (current: T) => T)
              }, 0)
              return
            }

            setValue(nextValue)
          }

          return [value, setValueAfterEvent] as const
        },
      }
    })

    const { GlobalImportPanel } = await import("../global-import-panel")
    const { act } = await import("react")

    render(
      <GlobalImportPanel
        importing={false}
        onImportFiles={vi.fn()}
        results={[
          {
            fileName: "duplicate-card-pack.json",
            kind: "card",
            success: false,
            summary: "同名卡牌包已存在",
            diagnostics: [
              {
                severity: "error",
                code: "DUPLICATE_CARD_PACK",
                path: "/name",
                message: "同名卡牌包已存在",
              },
            ],
          },
        ]}
      />,
    )

    await act(async () => {
      fireEvent.click(screen.getByText(/查看详细信息/))
      await vi.runOnlyPendingTimersAsync()
    })

    expect(screen.getByText("DUPLICATE_CARD_PACK")).toBeInTheDocument()
  })
})
