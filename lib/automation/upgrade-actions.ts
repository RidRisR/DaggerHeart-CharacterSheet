import type { SheetData } from "@/lib/sheet-data"

export interface UpgradeOptionLike {
  label: string
  doubleBox?: boolean
  boxCount?: number
}

export interface UpgradeAutomationContext {
  sheetData: SheetData
  option: UpgradeOptionLike
  currentlyChecked: boolean
}

export type UpgradeRollbackKind = "attribute" | "experience" | "evasion"

export type UpgradeAutomationResult =
  | { kind: "none" }
  | { kind: "setSheetData"; updates: Partial<SheetData>; message?: string }
  | { kind: "rollback"; rollbackKind: UpgradeRollbackKind }

export function computeUpgradeAutomation(
  context: UpgradeAutomationContext,
): UpgradeAutomationResult {
  const { sheetData, option, currentlyChecked } = context
  const label = option.label
  const newCheckedState = !currentlyChecked

  if (label.includes("角色属性+1") && currentlyChecked) {
    return { kind: "rollback", rollbackKind: "attribute" }
  }

  if (label.includes("经历获得额外") && currentlyChecked) {
    return { kind: "rollback", rollbackKind: "experience" }
  }

  if (label.includes("闪避值") && currentlyChecked) {
    return { kind: "rollback", rollbackKind: "evasion" }
  }

  if (label.includes("生命槽")) {
    const currentHP = sheetData.hpMax || 6
    const hpMax = newCheckedState
      ? Math.min(currentHP + 1, 18)
      : Math.max(currentHP - 1, 1)

    return {
      kind: "setSheetData",
      updates: { hpMax },
      message: newCheckedState
        ? `生命槽上限 +1，当前为 ${hpMax}`
        : `生命槽上限 -1，当前为 ${hpMax}`,
    }
  }

  if (label.includes("压力槽")) {
    const currentStress = sheetData.stressMax || 6
    const stressMax = newCheckedState
      ? Math.min(currentStress + 1, 18)
      : Math.max(currentStress - 1, 1)

    return {
      kind: "setSheetData",
      updates: { stressMax },
      message: newCheckedState
        ? `压力槽上限 +1，当前为 ${stressMax}`
        : `压力槽上限 -1，当前为 ${stressMax}`,
    }
  }

  if (label.includes("熟练度+1")) {
    const currentProficiency = Array.isArray(sheetData.proficiency)
      ? sheetData.proficiency
      : Array(6).fill(false)
    const currentCount = currentProficiency.filter(v => v === true).length
    const newProficiency = [...currentProficiency]

    if (newCheckedState && currentCount < 6) {
      newProficiency[currentCount] = true
      return {
        kind: "setSheetData",
        updates: { proficiency: newProficiency },
        message: `熟练度 +1，当前为 ${currentCount + 1}/6`,
      }
    }

    if (!newCheckedState && currentCount > 0) {
      newProficiency[currentCount - 1] = false
      return {
        kind: "setSheetData",
        updates: { proficiency: newProficiency },
        message: `熟练度 -1，当前为 ${currentCount - 1}/6`,
      }
    }
  }

  return { kind: "none" }
}
