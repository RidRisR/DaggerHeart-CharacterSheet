import { isValidNumber, parseToNumber } from "@/lib/number-utils"
import type { SheetData } from "@/lib/sheet-data"
import type { ApplyEffectsResult, AutomationEffect, ModifierTargetId } from "./types"
import { readTargetValue, targetUpdate, writeTargetValue } from "./target-accessors"

function parseCurrentNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && isValidNumber(value)) return parseToNumber(value, 0)
  return undefined
}

function applySingleAdd(sheetData: SheetData, target: ModifierTargetId, delta: number): {
  sheetData: SheetData
  warning?: string
} {
  const current = parseCurrentNumber(readTargetValue(sheetData, target))
  if (current === undefined) {
    const sign = delta >= 0 ? `+${delta}` : String(delta)
    return {
      sheetData,
      warning: `${target} 当前值无法解析为数字，已跳过 ${sign}`,
    }
  }

  return {
    sheetData: writeTargetValue(sheetData, target, current + delta),
  }
}

export function applyEffects(sheetData: SheetData, effects: AutomationEffect[]): ApplyEffectsResult {
  let next = sheetData
  const updates: Partial<SheetData> = {}
  const warnings: string[] = []

  for (const effect of effects) {
    const before = next

    if (effect.operation === "add") {
      const result = applySingleAdd(next, effect.target, effect.value)
      next = result.sheetData
      if (result.warning) warnings.push(result.warning)
      Object.assign(updates, targetUpdate(next, before, effect.target))
      continue
    }

    if (effect.operation === "setBase" || effect.operation === "recalculate") {
      continue
    }
  }

  return { sheetData: next, updates, warnings }
}

export function revertEffects(sheetData: SheetData, effects: AutomationEffect[]): ApplyEffectsResult {
  const reversed = effects.map(effect => {
    if (effect.operation !== "add") return effect
    return { ...effect, value: -effect.value }
  })

  return applyEffects(sheetData, reversed)
}
