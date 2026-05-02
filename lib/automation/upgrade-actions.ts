import type { SheetData } from "@/lib/sheet-data"
import { applyEffects, revertEffects } from "@/lib/modifiers/effect-executor"
import type { AutomationSelection, ModifierTargetId } from "@/lib/modifiers/types"

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
  | {
      kind: "setSheetData"
      updates: Partial<SheetData>
      message?: string
      warnings?: string[]
      selection?: AutomationSelection
    }
  | { kind: "rollback"; rollbackKind: UpgradeRollbackKind }

function addTargetResult(
  sheetData: SheetData,
  currentlyChecked: boolean,
  target: ModifierTargetId,
  messageLabel: string,
  min?: number,
  max?: number,
): UpgradeAutomationResult {
  const newCheckedState = !currentlyChecked
  const currentValue = target === "hpMax"
    ? sheetData.hpMax
    : target === "stressMax"
      ? sheetData.stressMax
      : undefined
  const effectSheetData = (target === "hpMax" || target === "stressMax")
    && (typeof currentValue !== "number" || !Number.isFinite(currentValue))
    ? { ...sheetData, [target]: 6 }
    : sheetData
  const effect = { operation: "add" as const, target, value: 1 }
  const result = newCheckedState
    ? applyEffects(effectSheetData, [effect])
    : revertEffects(effectSheetData, [effect])

  let updates = result.updates
  const nextValue = target === "hpMax"
    ? result.sheetData.hpMax
    : target === "stressMax"
      ? result.sheetData.stressMax
      : undefined

  const clampedValue = (target === "hpMax" || target === "stressMax") && typeof nextValue === "number"
    ? Math.min(max ?? 18, Math.max(min ?? 1, nextValue))
    : undefined

  if (clampedValue !== undefined) {
    updates = { ...updates, [target]: clampedValue }
  }

  return {
    kind: "setSheetData",
    updates,
    warnings: result.warnings,
    selection: {
      selected: newCheckedState,
      params: { target },
    },
    message: newCheckedState
      ? `${messageLabel} +1，当前为 ${clampedValue}`
      : `${messageLabel} -1，当前为 ${clampedValue}`,
  }
}

export function computeUpgradeAutomation(
  context: UpgradeAutomationContext,
): UpgradeAutomationResult {
  const { sheetData, option, currentlyChecked } = context
  const label = option.label
  const newCheckedState = !currentlyChecked

  if (label.includes("角色属性+1") && currentlyChecked) {
    return {
      kind: "setSheetData",
      updates: {},
      warnings: [],
      selection: { selected: false },
    }
  }

  if (label.includes("经历获得额外") && currentlyChecked) {
    return {
      kind: "setSheetData",
      updates: {},
      warnings: [],
      selection: { selected: false },
    }
  }

  if (label.includes("闪避值") && currentlyChecked) {
    return addTargetResult(sheetData, currentlyChecked, "evasion", "闪避值")
  }

  if (label.includes("生命槽")) {
    return addTargetResult(sheetData, currentlyChecked, "hpMax", "生命槽上限", 1, 18)
  }

  if (label.includes("压力槽")) {
    return addTargetResult(sheetData, currentlyChecked, "stressMax", "压力槽上限", 1, 18)
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
        warnings: [],
        selection: {
          selected: newCheckedState,
          params: { target: "proficiency" },
        },
        message: `熟练度 +1，当前为 ${currentCount + 1}/6`,
      }
    }

    if (!newCheckedState && currentCount > 0) {
      newProficiency[currentCount - 1] = false
      return {
        kind: "setSheetData",
        updates: { proficiency: newProficiency },
        warnings: [],
        selection: {
          selected: newCheckedState,
          params: { target: "proficiency" },
        },
        message: `熟练度 -1，当前为 ${currentCount - 1}/6`,
      }
    }
  }

  return { kind: "none" }
}
