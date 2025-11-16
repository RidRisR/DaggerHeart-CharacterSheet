import { describe, it, expect, beforeEach } from 'vitest'
import { useSheetStore } from '@/lib/sheet-store'
import { defaultSheetData } from '@/lib/default-sheet-data'

// Helper to get proficiency as boolean array
const getProficiency = () => useSheetStore.getState().sheetData.proficiency as boolean[]

describe('等级升级 - 熟练度提升逻辑', () => {
  beforeEach(() => {
    // 重置 store 状态，从空白角色开始（0个熟练度）
    useSheetStore.setState({
      sheetData: {
        ...defaultSheetData,
        level: "",
        proficiency: [false, false, false, false, false, false]
      }
    })
  })

  describe('跨越单个阈值', () => {
    it('4 → 5级应触发1次熟练度提升', () => {
      const store = useSheetStore.getState()
      store.setSheetData({ ...store.sheetData, level: "4" })

      store.updateLevel("5")

      // Get fresh state after update
      const count = getProficiency().filter(v => v).length
      expect(count).toBe(1)
    })

    it('1 → 2级应触发1次熟练度提升', () => {
      const store = useSheetStore.getState()
      store.setSheetData({ ...store.sheetData, level: "1" })

      store.updateLevel("2")

      const count = getProficiency().filter(v => v).length
      expect(count).toBe(1)
    })

    it('3 → 4级不应触发熟练度提升', () => {
      const store = useSheetStore.getState()
      store.setSheetData({ ...store.sheetData, level: "3" })

      store.updateLevel("4")

      const count = getProficiency().filter(v => v).length
      expect(count).toBe(0)
    })
  })

  describe('跨越多个阈值', () => {
    it('空 → 5级应触发2次熟练度提升', () => {
      const store = useSheetStore.getState()

      // 执行等级更新（空等级视为1级）
      store.updateLevel("5")

      // 验证熟练度
      const proficiency = getProficiency()
      const count = proficiency.filter(v => v === true).length

      expect(count).toBe(2)
      expect(proficiency[0]).toBe(true)  // 第1个
      expect(proficiency[1]).toBe(true)  // 第2个
      expect(proficiency[2]).toBe(false) // 其余为false
    })

    it('1 → 5级应触发2次熟练度提升', () => {
      const store = useSheetStore.getState()
      store.setSheetData({ ...store.sheetData, level: "1" })

      store.updateLevel("5")

      const count = getProficiency().filter(v => v).length
      expect(count).toBe(2)
    })

    it('1 → 8级应触发3次熟练度提升', () => {
      const store = useSheetStore.getState()
      store.setSheetData({ ...store.sheetData, level: "1" })

      store.updateLevel("8")

      const count = getProficiency().filter(v => v).length
      expect(count).toBe(3)
    })
  })

  describe('边界条件', () => {
    it('5 → 5级不应触发熟练度提升', () => {
      const store = useSheetStore.getState()
      store.setSheetData({ ...store.sheetData, level: "5" })

      store.updateLevel("5")

      const count = getProficiency().filter(v => v).length
      expect(count).toBe(0)
    })

    it('已有5个熟练度时，1→8只应增加1个（达到上限6）', () => {
      const store = useSheetStore.getState()
      const initialProficiency = [true, true, true, true, true, false]
      store.setSheetData({
        ...store.sheetData,
        level: "1",
        proficiency: initialProficiency
      })

      store.updateLevel("8")

      const proficiency = getProficiency()
      const count = proficiency.filter(v => v).length

      expect(count).toBe(6)  // 只增加到上限
      expect(proficiency[5]).toBe(true)  // 第6个被填充
    })

    it('空等级应视为1级', () => {
      const store = useSheetStore.getState()
      store.setSheetData({ ...store.sheetData, level: "" })

      store.updateLevel("2")

      const count = getProficiency().filter(v => v).length
      expect(count).toBe(1)  // 1→2 跨越2级阈值
    })

    it('无效等级应使用默认值', () => {
      const store = useSheetStore.getState()
      store.setSheetData({ ...store.sheetData, level: "abc" })

      // parseToNumber("abc", 1) 会返回1，所以 abc→5 等同于 1→5
      store.updateLevel("5")

      const count = getProficiency().filter(v => v).length
      expect(count).toBe(2)  // 1→5跨越2个阈值
    })

    it('降级场景不应触发熟练度变化', () => {
      const store = useSheetStore.getState()
      store.setSheetData({
        ...store.sheetData,
        level: "5",
        proficiency: [true, true, false, false, false, false]
      })

      store.updateLevel("3")

      const count = getProficiency().filter(v => v).length
      expect(count).toBe(2)  // 保持不变，不减少
    })
  })

  describe('空等级显示行为', () => {
    it('更新为空等级应保留空值', () => {
      const store = useSheetStore.getState()
      store.setSheetData({ level: "4" })

      // 更新为空
      store.updateLevel("")

      const freshState = useSheetStore.getState().sheetData
      expect(freshState.level).toBe("")  // 应保留空字符串
    })

    it('从非空变为空不应触发熟练度变化', () => {
      const store = useSheetStore.getState()
      store.setSheetData({
        level: "4",
        proficiency: [true, true, false, false, false, false]  // 已有2个
      })

      // 4 → 空（空视为1）
      store.updateLevel("", "4")

      const freshState = useSheetStore.getState().sheetData
      expect(freshState.level).toBe("")  // 显示为空

      const count = getProficiency().filter(v => v).length
      expect(count).toBe(2)  // 熟练度不变（降级不减少）
    })

    it('空等级不应触发伤害阈值计算', () => {
      const store = useSheetStore.getState()
      store.setSheetData({
        level: "5",
        armorThreshold: "3/6",
        minorThreshold: "8",   // 3 + 5
        majorThreshold: "11"   // 6 + 5
      })

      // 5 → 空
      store.updateLevel("")

      const freshState = useSheetStore.getState().sheetData
      expect(freshState.level).toBe("")
      // 因为 level === ""，在 updateLevel 第491-493行会提前返回
      // 不会重新计算伤害阈值，应保持原值
      expect(freshState.minorThreshold).toBe("8")
      expect(freshState.majorThreshold).toBe("11")
    })
  })

  describe('副作用验证', () => {
    it('熟练度提升时应清空所有属性的升级标记', () => {
      const store = useSheetStore.getState()
      store.setSheetData({
        ...store.sheetData,
        level: "1",
        agility: { value: "2", checked: true },
        strength: { value: "1", checked: true },
        finesse: { value: "0", checked: true }
      })

      store.updateLevel("5")

      const freshState = useSheetStore.getState().sheetData
      expect(freshState.agility?.checked).toBe(false)
      expect(freshState.strength?.checked).toBe(false)
      expect(freshState.finesse?.checked).toBe(false)
    })

    it('等级变化应自动更新伤害阈值', () => {
      const store = useSheetStore.getState()
      store.setSheetData({
        ...store.sheetData,
        level: "1",
        armorThreshold: "3/6"
      })

      store.updateLevel("5")

      const freshState = useSheetStore.getState().sheetData
      expect(freshState.minorThreshold).toBe("8")  // 3 + 5
      expect(freshState.majorThreshold).toBe("11") // 6 + 5
    })

    it('空护甲阈值不应计算伤害阈值', () => {
      const store = useSheetStore.getState()
      store.setSheetData({
        ...store.sheetData,
        level: "1",
        armorThreshold: "",
        minorThreshold: "3",
        majorThreshold: "6"
      })

      store.updateLevel("5")

      // 阈值应保持不变
      const freshState = useSheetStore.getState().sheetData
      expect(freshState.minorThreshold).toBe("3")
      expect(freshState.majorThreshold).toBe("6")
    })
  })
})
