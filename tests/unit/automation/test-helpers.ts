import { defaultSheetData } from "@/lib/default-sheet-data"
import type { SheetData } from "@/lib/sheet-data"
import { useSheetStore } from "@/lib/sheet-store"

export function resetSheetStore(overrides: Partial<SheetData> = {}) {
  useSheetStore.setState({
    sheetData: {
      ...defaultSheetData,
      ...overrides,
    },
    attributeUpgradeHistory: {},
    experienceValuesSnapshot: undefined,
    evasionSnapshot: undefined,
  })
}

export function sheet() {
  return useSheetStore.getState().sheetData
}

export function store() {
  return useSheetStore.getState()
}

export function countChecked(values: unknown): number {
  return Array.isArray(values) ? values.filter(Boolean).length : 0
}
