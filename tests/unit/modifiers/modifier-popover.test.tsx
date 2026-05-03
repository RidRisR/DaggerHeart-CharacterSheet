import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import { resetSheetStore } from "../automation/test-helpers"

describe("ModifierFieldAnchor", () => {
  it("shows base, modifier, and unattributed delta", async () => {
    resetSheetStore({
      evasion: "15",
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "手动基础闪避",
              value: 12,
              sourceType: "user",
              priority: 10,
            }, {
              id: "user:evasion-mod",
              sourceId: "user:evasion-mod",
              target: "evasion",
              kind: "modifier",
              label: "临时加值",
              value: 1,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("手动基础闪避")).toBeInTheDocument()
    expect(screen.getByText("临时加值")).toBeInTheDocument()
    expect(screen.getByText("未归因差额 +2")).toBeInTheDocument()
  })

  it("shows unknown base when no base exists", async () => {
    resetSheetStore({ evasion: "13" })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("未知基础值")).toBeInTheDocument()
    expect(screen.queryByText(/未归因差额/)).not.toBeInTheDocument()
  })

  it("hides disabled modifiers from active addends", async () => {
    resetSheetStore({
      evasion: "15",
      modifierState: {
        byTarget: {
          evasion: {
            activeBaseId: "user:evasion-base",
            disabledEntryIds: ["user:evasion-disabled"],
            userEntries: [{
              id: "user:evasion-base",
              sourceId: "user:evasion-base",
              target: "evasion",
              kind: "base",
              label: "手动基础闪避",
              value: 12,
              sourceType: "user",
              priority: 10,
            }, {
              id: "user:evasion-enabled",
              sourceId: "user:evasion-enabled",
              target: "evasion",
              kind: "modifier",
              label: "启用加值",
              value: 1,
              sourceType: "user",
              priority: 10,
            }, {
              id: "user:evasion-disabled",
              sourceId: "user:evasion-disabled",
              target: "evasion",
              kind: "modifier",
              label: "停用加值",
              value: 2,
              sourceType: "user",
              priority: 10,
            }],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))

    expect(screen.getByText("启用加值")).toBeInTheDocument()
    expect(screen.queryByText("停用加值")).not.toBeInTheDocument()
    expect(screen.getByText("13")).toBeInTheDocument()
    expect(screen.getByText("未归因差额 +2")).toBeInTheDocument()
  })
})
