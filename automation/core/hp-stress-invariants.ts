import type { SheetData } from "@/lib/sheet-data"
import type { ModifierTargetId } from "./types"

export function applyHpStressMaxInvariant(sheetData: SheetData, target: ModifierTargetId): SheetData {
  if (target !== "hpMax" && target !== "stressMax") return sheetData

  const field = target === "hpMax" ? "hp" : "stress"
  const max = sheetData[target]
  if (typeof max !== "number") return sheetData

  const current = sheetData[field]
  if (!Array.isArray(current) || current.every((checked, index) => !checked || index < max)) return sheetData

  return {
    ...sheetData,
    [field]: current.map((checked, index) => checked && index < max),
  }
}
