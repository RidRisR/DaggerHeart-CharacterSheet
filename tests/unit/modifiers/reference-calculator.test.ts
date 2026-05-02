import { describe, expect, it } from "vitest"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { calculateReferenceSummary } from "@/lib/modifiers/reference-calculator"
import type { ModifierEntry, ModifierState } from "@/lib/modifiers/types"

const entries: ModifierEntry[] = [
  {
    id: "system:profession:evasion",
    sourceId: "profession:warrior",
    target: "evasion",
    kind: "base",
    label: "职业基础闪避",
    value: 12,
    sourceType: "profession",
    priority: 100,
  },
  {
    id: "upgrade:evasion",
    sourceId: "upgrade:tier1-5-0",
    target: "evasion",
    kind: "modifier",
    label: "升级：闪避 +1",
    value: 1,
    sourceType: "upgrade",
    priority: 200,
  },
]

describe("reference calculator", () => {
  it("computes reference total and unattributed delta", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "15" },
      target: "evasion",
      entries,
      targetState: {},
    })

    expect(result.activeBase?.id).toBe("system:profession:evasion")
    expect(result.enabledModifiers.map(entry => entry.id)).toEqual(["upgrade:evasion"])
    expect(result.referenceTotal).toBe(13)
    expect(result.unattributedDelta).toBe(2)
    expect(result.unknownBase).toBe(false)
  })

  it("uses saved active base when it still exists", () => {
    const userBase: ModifierEntry = {
      id: "user:evasion-base",
      sourceId: "user:evasion-base",
      target: "evasion",
      kind: "base",
      label: "手动基础闪避",
      value: 14,
      sourceType: "user",
      priority: 10,
    }

    const state: ModifierState["byTarget"]["evasion"] = {
      activeBaseId: "user:evasion-base",
    }

    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "15" },
      target: "evasion",
      entries: [...entries, userBase],
      targetState: state,
    })

    expect(result.activeBase?.id).toBe("user:evasion-base")
    expect(result.referenceTotal).toBe(15)
    expect(result.unattributedDelta).toBe(0)
  })

  it("falls back to the next stable base when active base disappears", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "13" },
      target: "evasion",
      entries,
      targetState: { activeBaseId: "missing:base" },
    })

    expect(result.activeBase?.id).toBe("system:profession:evasion")
    expect(result.activeBaseChanged).toBe(true)
  })

  it("does not calculate total or delta when no base exists", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "13" },
      target: "evasion",
      entries: entries.filter(entry => entry.kind !== "base"),
      targetState: {},
    })

    expect(result.activeBase).toBeUndefined()
    expect(result.unknownBase).toBe(true)
    expect(result.referenceTotal).toBeUndefined()
    expect(result.unattributedDelta).toBeUndefined()
  })

  it("does not calculate delta when final value is not numeric", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "12+敏捷" },
      target: "evasion",
      entries,
      targetState: {},
    })

    expect(result.referenceTotal).toBe(13)
    expect(result.unattributedDelta).toBeUndefined()
  })

  it("removes disabled modifier entries from the enabled total", () => {
    const result = calculateReferenceSummary({
      sheetData: { ...defaultSheetData, evasion: "13" },
      target: "evasion",
      entries,
      targetState: { disabledEntryIds: ["upgrade:evasion"] },
    })

    expect(result.enabledModifiers).toEqual([])
    expect(result.disabledEntries.map(entry => entry.id)).toEqual(["upgrade:evasion"])
    expect(result.referenceTotal).toBe(12)
    expect(result.unattributedDelta).toBe(1)
  })
})
