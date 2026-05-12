import type { SheetData } from "@/lib/sheet-data"
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

export type UpgradeAutomationResult =
  | { kind: "none" }
  | {
      kind: "setSheetData"
      updates: Partial<SheetData>
      message?: string
      warnings?: string[]
      selection?: AutomationSelection
    }

function selectionOnlyTargetResult(
  currentlyChecked: boolean,
  target: ModifierTargetId,
  messageLabel: string,
): UpgradeAutomationResult {
  const selected = !currentlyChecked

  return {
    kind: "setSheetData",
    updates: {},
    warnings: [],
    selection: {
      selected,
      params: { target },
    },
    message: selected
      ? `${messageLabel}升级已记录`
      : `${messageLabel}升级已取消`,
  }
}

export function computeUpgradeAutomation(
  context: UpgradeAutomationContext,
): UpgradeAutomationResult {
  const { option, currentlyChecked } = context
  const label = option.label

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

  if (label.includes("闪避值")) {
    return selectionOnlyTargetResult(currentlyChecked, "evasion", "闪避值")
  }

  if (label.includes("生命槽")) {
    return selectionOnlyTargetResult(currentlyChecked, "hpMax", "生命槽上限")
  }

  if (label.includes("压力槽")) {
    return selectionOnlyTargetResult(currentlyChecked, "stressMax", "压力槽上限")
  }

  if (label.includes("熟练度+1")) {
    return selectionOnlyTargetResult(currentlyChecked, "proficiency", "熟练度")
  }

  return { kind: "none" }
}
