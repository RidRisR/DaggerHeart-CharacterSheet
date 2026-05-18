import { describe, it, expect, beforeEach } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { useSheetStore } from "@/lib/sheet-store"

const emptyProficiency = [false, false, false, false, false, false]

const sheet = () => useSheetStore.getState().sheetData
const store = () => useSheetStore.getState()

const equipmentWithArmorThresholds = (minor: number | null, major: number | null) => ({
  ...defaultSheetData.equipment,
  armorSlot: {
    ...defaultSheetData.equipment.armorSlot,
    baseThresholds: { minor, major },
  },
})

const resetSheetStore = (overrides = {}) => {
  useSheetStore.setState({
    sheetData: {
      ...defaultSheetData,
      level: "",
      proficiency: emptyProficiency,
      ...overrides,
    },
  })
}

describe("等级升级 - 熟练度提升逻辑", () => {
  beforeEach(() => {
    resetSheetStore()
  })

  describe("手动模式", () => {
    it("等级变化只更新等级，不直接改熟练度或阈值，进入 5 级会重置属性升级标记", () => {
      resetSheetStore({
        level: "1",
        proficiency: [true, false, false, false, false, false],
        minorThreshold: "manual-minor",
        majorThreshold: "manual-major",
        equipment: equipmentWithArmorThresholds(3, 6),
        agility: { value: "2", checked: true, spellcasting: false },
        strength: { value: "1", checked: true, spellcasting: false },
        finesse: { value: "0", checked: true, spellcasting: false },
        modifierState: {
          targetStates: {
            proficiency: { autoCalculation: false },
            minorThreshold: { autoCalculation: false },
            majorThreshold: { autoCalculation: false },
          },
          entryStates: {},
        },
      })

      store().updateLevel("5")

      expect(sheet().level).toBe("5")
      expect(sheet().proficiency).toEqual([true, false, false, false, false, false])
      expect(sheet().minorThreshold).toBe("manual-minor")
      expect(sheet().majorThreshold).toBe("manual-major")
      expect(sheet().agility?.checked).toBe(false)
      expect(sheet().strength?.checked).toBe(false)
      expect(sheet().finesse?.checked).toBe(false)
    })

    it("降级不直接改手动模式的熟练度", () => {
      resetSheetStore({
        level: "5",
        proficiency: [true, true, false, false, false, false],
      })

      store().updateLevel("3")

      expect(sheet().level).toBe("3")
      expect(sheet().proficiency).toEqual([true, true, false, false, false, false])
    })
  })

  describe("自动计算熟练度同步", () => {
    it.each([
      ["2", [true, true, false, false, false, false]],
      ["5", [true, true, true, false, false, false]],
      ["8", [true, true, true, true, false, false]],
    ])("启用 level:base:proficiency 后，等级 %s 同步到计算值", (level, expected) => {
      resetSheetStore({
        level: "1",
        proficiency: emptyProficiency,
        modifierState: {
          targetStates: {
            proficiency: {
              activeBaseId: "level:base:proficiency",
              autoCalculation: true,
            },
          },
          entryStates: {},
        },
      })

      store().updateLevel(level)

      expect(sheet().level).toBe(level)
      expect(sheet().proficiency).toEqual(expected)
    })
  })

  describe("自动计算伤害阈值同步", () => {
    it("护甲基础阈值为活动基础且阈值自动计算时，等级变化同步护甲基础值加等级修正", () => {
      resetSheetStore({
        level: "1",
        equipment: equipmentWithArmorThresholds(3, 6),
        minorThreshold: "",
        majorThreshold: "",
        modifierState: {
          targetStates: {
            minorThreshold: {
              activeBaseId: "equipment:armor:current:minorThreshold",
              autoCalculation: true,
            },
            majorThreshold: {
              activeBaseId: "equipment:armor:current:majorThreshold",
              autoCalculation: true,
            },
          },
          entryStates: {},
        },
      })

      store().updateLevel("5")

      expect(sheet().level).toBe("5")
      expect(sheet().minorThreshold).toBe("8")
      expect(sheet().majorThreshold).toBe("11")
    })

    it("护甲基础阈值为空时，自动计算保留现有非数字阈值", () => {
      resetSheetStore({
        level: "1",
        equipment: equipmentWithArmorThresholds(null, null),
        minorThreshold: "manual-minor",
        majorThreshold: "manual-major",
        modifierState: {
          targetStates: {
            minorThreshold: {
              activeBaseId: "equipment:armor:current:minorThreshold",
              autoCalculation: true,
            },
            majorThreshold: {
              activeBaseId: "equipment:armor:current:majorThreshold",
              autoCalculation: true,
            },
          },
          entryStates: {},
        },
      })

      store().updateLevel("5")

      expect(sheet().minorThreshold).toBe("manual-minor")
      expect(sheet().majorThreshold).toBe("manual-major")
    })
  })

  describe("空等级和无效等级", () => {
    it.each(["", "abc"])("手动模式更新为 %s 只写入等级来源", (level) => {
      resetSheetStore({
        level: "5",
        proficiency: [true, true, false, false, false, false],
        minorThreshold: "8",
        majorThreshold: "11",
        equipment: equipmentWithArmorThresholds(3, 6),
        modifierState: {
          targetStates: {
            proficiency: { autoCalculation: false },
            minorThreshold: { autoCalculation: false },
            majorThreshold: { autoCalculation: false },
          },
          entryStates: {},
        },
      })

      store().updateLevel(level)

      expect(sheet().level).toBe(level)
      expect(sheet().proficiency).toEqual([true, true, false, false, false, false])
      expect(sheet().minorThreshold).toBe("8")
      expect(sheet().majorThreshold).toBe("11")
    })

    it.each(["", "abc"])("自动计算模式更新为 %s 时，未产生等级熟练度但阈值按活动护甲基础回退", (level) => {
      resetSheetStore({
        level: "5",
        proficiency: [true, true, true, false, false, false],
        equipment: equipmentWithArmorThresholds(3, 6),
        minorThreshold: "8",
        majorThreshold: "11",
        modifierState: {
          targetStates: {
            proficiency: {
              activeBaseId: "level:base:proficiency",
              autoCalculation: true,
            },
            minorThreshold: {
              activeBaseId: "equipment:armor:current:minorThreshold",
              autoCalculation: true,
            },
            majorThreshold: {
              activeBaseId: "equipment:armor:current:majorThreshold",
              autoCalculation: true,
            },
          },
          entryStates: {},
        },
      })

      store().updateLevel(level)

      expect(sheet().level).toBe(level)
      expect(sheet().proficiency).toEqual([true, true, true, false, false, false])
      expect(sheet().minorThreshold).toBe("3")
      expect(sheet().majorThreshold).toBe("6")
    })
  })
})
