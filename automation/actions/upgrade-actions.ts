import type { SheetData } from "@/lib/sheet-data"
import type { FixedUpgradeTargetId, UpgradeAutomationMetadata, UpgradeState } from "@/automation/core/types"

export interface UpgradeOptionLike {
  label: string
  doubleBox?: boolean
  boxCount?: number
  automation?: UpgradeAutomationMetadata
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
      upgradeState?: UpgradeState
    }

function upgradeTargetResult(
  currentlyChecked: boolean,
  target: FixedUpgradeTargetId,
  messageLabel: string,
): UpgradeAutomationResult {
  const selected = !currentlyChecked

  return {
    kind: "setSheetData",
    updates: {},
    warnings: [],
    upgradeState: selected
      ? { checked: true, params: { target } }
      : { checked: false },
    message: selected
      ? `${messageLabel}升级已记录`
      : `${messageLabel}升级已取消`,
  }
}

const FIXED_TARGET_MESSAGE_LABELS: Record<FixedUpgradeTargetId, string> = {
  evasion: "闪避值",
  hpMax: "生命槽上限",
  stressMax: "压力槽上限",
  proficiency: "熟练度",
}

export function computeUpgradeAutomation(
  context: UpgradeAutomationContext,
): UpgradeAutomationResult {
  const { option, currentlyChecked } = context
  const automation = option.automation

  if (!automation || automation.kind === "none") {
    return { kind: "none" }
  }

  if (automation.kind === "attributeSelection" && currentlyChecked) {
    return {
      kind: "setSheetData",
      updates: {},
      warnings: [],
      upgradeState: { checked: false },
    }
  }

  if (automation.kind === "experienceSelection" && currentlyChecked) {
    return {
      kind: "setSheetData",
      updates: {},
      warnings: [],
      upgradeState: { checked: false },
    }
  }

  if (automation.kind === "fixedTarget") {
    return upgradeTargetResult(
      currentlyChecked,
      automation.target,
      FIXED_TARGET_MESSAGE_LABELS[automation.target],
    )
  }

  return { kind: "none" }
}
