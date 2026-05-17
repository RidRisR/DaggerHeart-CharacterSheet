import { beforeEach, describe, expect, it } from "vitest"
import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { useSheetStore } from "@/lib/sheet-store"

function seedStore(overrides: Parameters<typeof useSheetStore.setState>[0] extends infer _ ? Partial<typeof defaultSheetData> : never) {
  useSheetStore.setState({
    sheetData: {
      ...defaultSheetData,
      ...overrides,
    },
  })
}

function sheet() {
  return useSheetStore.getState().sheetData
}

describe("升级取消流程（page-two 集成）", () => {
  beforeEach(() => {
    useSheetStore.setState({ sheetData: { ...defaultSheetData } })
  })

  it("勾选闪避升级会直接记录升级选择，不打开确认气泡", async () => {
    const user = userEvent.setup()
    seedStore({
      evasion: "12",
      checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
      } as any,
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-5-0"))

    const after = sheet()
    expect((after.checkedUpgrades as any)["tier1-5-0"][5]).toBe(true)
    expect(after.automationSelections?.["upgrade:tier1-5-0"]).toEqual({
      selected: true,
      params: { target: "evasion" },
    })
    expect(screen.queryByText("闪避值 +1")).not.toBeInTheDocument()
  })

  it("反选属性升级时点击外部会保留原有升级选择", async () => {
    const user = userEvent.setup()
    seedStore({
      agility: { checked: true, value: "1", spellcasting: false },
      strength: { checked: true, value: "2", spellcasting: false },
      checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
        "tier1-0-0": { 0: true },
      } as any,
      automationSelections: {
        "upgrade:tier1-0-0": {
          selected: true,
          params: { attributes: ["agility", "strength"] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-0-0"))

    expect(screen.getByText("确定要取消升级吗？")).toBeInTheDocument()
    expect(screen.getByText("敏捷、力量")).toBeInTheDocument()

    await user.click(document.body)

    const after = sheet()
    expect(after.agility).toEqual({ checked: true, value: "1", spellcasting: false })
    expect(after.strength).toEqual({ checked: true, value: "2", spellcasting: false })
    expect((after.checkedUpgrades as any)["tier1-0-0"][0]).toBe(true)
    expect(after.automationSelections?.["upgrade:tier1-0-0"]).toEqual({
      selected: true,
      params: { attributes: ["agility", "strength"] },
    })
  })

  it("确认反选属性升级后才清除升级勾选与 selection 记录", async () => {
    const user = userEvent.setup()
    seedStore({
      agility: { checked: true, value: "1", spellcasting: false },
      strength: { checked: true, value: "2", spellcasting: false },
      checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
        "tier1-0-0": { 0: true },
      } as any,
      automationSelections: {
        "upgrade:tier1-0-0": {
          selected: true,
          params: { attributes: ["agility", "strength"] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-0-0"))
    await user.click(screen.getByRole("button", { name: "确定取消" }))

    const after = sheet()
    expect(after.agility).toEqual({ checked: true, value: "1", spellcasting: false })
    expect(after.strength).toEqual({ checked: true, value: "2", spellcasting: false })
    expect((after.checkedUpgrades as any)["tier1-0-0"][0]).toBe(false)
    expect(after.automationSelections?.["upgrade:tier1-0-0"]).toEqual({ selected: false })
  })

  it("反选经历加值升级时点击外部会保留原有升级选择，并显示最新经历文本", async () => {
    const user = userEvent.setup()
    seedStore({
      experience: ["老兵", "铁匠大师", "", "", ""],
      experienceValues: ["2", "3", "", "", ""],
      checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
        "tier1-3-0": { 3: true },
      } as any,
      automationSelections: {
        "upgrade:tier1-3-0": {
          selected: true,
          params: { experienceIndexes: [0, 1] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-3-0"))

    expect(screen.getByText("确定要取消升级吗？")).toBeInTheDocument()
    expect(screen.getByText("老兵")).toBeInTheDocument()
    expect(screen.getByText("铁匠大师")).toBeInTheDocument()

    await user.click(document.body)

    const after = sheet()
    expect(after.experienceValues).toEqual(["2", "3", "", "", ""])
    expect((after.checkedUpgrades as any)["tier1-3-0"][3]).toBe(true)
    expect(after.automationSelections?.["upgrade:tier1-3-0"]).toEqual({
      selected: true,
      params: { experienceIndexes: [0, 1] },
    })
  })

  it("确认反选经历加值升级后才清除升级勾选与 selection 记录，不直接回滚经历最终值", async () => {
    const user = userEvent.setup()
    seedStore({
      experience: ["军人", "铁匠", "", "", ""],
      experienceValues: ["2", "3", "", "", ""],
      checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
        "tier1-3-0": { 3: true },
      } as any,
      automationSelections: {
        "upgrade:tier1-3-0": {
          selected: true,
          params: { experienceIndexes: [0, 1] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    await user.click(getByTestId("checkbox-tier1-3-0"))
    await user.click(screen.getByRole("button", { name: "确定取消" }))

    const after = sheet()
    expect(after.experienceValues).toEqual(["2", "3", "", "", ""])
    expect((after.checkedUpgrades as any)["tier1-3-0"][3]).toBe(false)
    expect(after.automationSelections?.["upgrade:tier1-3-0"]).toEqual({ selected: false })
  })
})
