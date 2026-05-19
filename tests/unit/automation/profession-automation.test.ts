import { beforeEach, describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { resetSheetStore, sheet, store } from "./test-helpers"

function professionCard(evasion: number, hp: number): StandardCard {
  return {
    id: "profession-ranger",
    name: "游侠",
    type: "profession",
    class: "游侠",
    domains: ["骨骼", "贤者"],
    description: "",
    professionSpecial: {
      起始闪避: evasion,
      起始生命: hp,
    },
  } as unknown as StandardCard
}

describe("职业自动化基线", () => {
  beforeEach(() => resetSheetStore())

  it("1级选择职业时不再直接写入手动模式的闪避和生命上限", () => {
    resetSheetStore({
      level: "1",
      evasion: "",
      hpMax: 6,
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
          hpMax: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard(12, 7),
    )

    expect(sheet().evasion).toBe("")
    expect(sheet().hpMax).toBe(6)
  })

  it("空等级选择职业时不再直接写入手动模式的闪避和生命上限", () => {
    resetSheetStore({
      level: "",
      evasion: "",
      hpMax: 6,
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
          hpMax: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard(13, 8),
    )

    expect(sheet().evasion).toBe("")
    expect(sheet().hpMax).toBe(6)
  })

  it("非1级选择职业不会覆盖现有闪避和生命上限", () => {
    resetSheetStore({
      level: "2",
      evasion: "15",
      hpMax: 9,
      modifierState: {
        targetStates: {
          evasion: { autoCalculation: false },
          hpMax: { autoCalculation: false },
        },
        entryStates: {},
      },
    })

    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard(12, 7),
    )

    expect(sheet().evasion).toBe("15")
    expect(sheet().hpMax).toBe(9)
  })

  it("1级清空职业后无 base target 写为空", () => {
    resetSheetStore({ level: "1", evasion: "12", hpMax: 7 })

    store().handleProfessionChange(undefined, undefined)

    expect(sheet().evasion).toBe("")
    expect(sheet().hpMax).toBe("")
  })

  it("非1级清空职业后无 base target 写为空", () => {
    resetSheetStore({ level: "3", evasion: "14", hpMax: 8 })

    store().handleProfessionChange(undefined, undefined)

    expect(sheet().evasion).toBe("")
    expect(sheet().hpMax).toBe("")
  })
})
