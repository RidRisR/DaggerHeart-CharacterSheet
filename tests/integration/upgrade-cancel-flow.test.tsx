import { beforeEach, describe, expect, it } from "vitest"
import { fireEvent, render } from "@testing-library/react"
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

  it("取消属性升级会还原属性值、清除 checked 标志、清除升级勾选与 selection 记录", () => {
    seedStore({
      agility: { checked: true, value: "1", spellcasting: false },
      checkedUpgrades: {
        tier1: {},
        tier2: {},
        tier3: {},
        "tier1-0-0": { 0: true },
      } as any,
      automationSelections: {
        "upgrade:tier1-0-0": {
          selected: true,
          params: { attributes: ["agility"] },
        },
      },
    })

    const { getByTestId } = render(<CharacterSheetPageTwo />)
    fireEvent.click(getByTestId("checkbox-tier1-0-0"))

    const after = sheet()
    expect(after.agility).toEqual({ checked: false, value: "0", spellcasting: false })
    expect((after.checkedUpgrades as any)["tier1-0-0"][0]).toBe(false)
    expect(after.automationSelections?.["upgrade:tier1-0-0"]).toEqual({ selected: false })
  })

  it("取消经历加值升级会还原经历值、清除升级勾选与 selection 记录", () => {
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
    fireEvent.click(getByTestId("checkbox-tier1-3-0"))

    const after = sheet()
    expect(after.experienceValues).toEqual(["1", "2", "", "", ""])
    expect((after.checkedUpgrades as any)["tier1-3-0"][3]).toBe(false)
    expect(after.automationSelections?.["upgrade:tier1-3-0"]).toEqual({ selected: false })
  })
})
