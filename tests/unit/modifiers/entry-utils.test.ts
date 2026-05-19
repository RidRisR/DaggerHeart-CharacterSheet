import { describe, expect, it } from "vitest"
import {
  contributionToEntry,
  createModifierEntry,
  entryKind,
  entryLabel,
  entryTarget,
  entryValue,
} from "@/automation/core/entry-utils"
import type { ModifierContribution } from "@/automation/core/types"

describe("modifier entry utilities", () => {
  it("creates a structured runtime entry", () => {
    const entry = createModifierEntry({
      id: "level:base:proficiency",
      target: "proficiency",
      kind: "base",
      label: "基础熟练度",
      value: 1,
      sourceType: "level",
      sourceId: "level:base",
      priority: 100,
    })

    expect(entry).toEqual({
      id: "level:base:proficiency",
      definition: {
        target: "proficiency",
        kind: "base",
      },
      presentation: {
        label: "基础熟练度",
        value: 1,
      },
      source: {
        type: "level",
        id: "level:base",
      },
      priority: 100,
    })
  })

  it("reads entry fields from structured fields", () => {
    const entry = createModifierEntry({
      id: "level:base:proficiency",
      target: "proficiency",
      kind: "base",
      label: "基础熟练度",
      value: 1,
      sourceType: "level",
      sourceId: "level:base",
      priority: 100,
    })

    expect(entryTarget(entry)).toBe("proficiency")
    expect(entryKind(entry)).toBe("base")
    expect(entryLabel(entry)).toBe("基础熟练度")
    expect(entryValue(entry)).toBe(1)
  })

  it("converts a persisted contribution to a runtime entry with provider context", () => {
    const contribution: ModifierContribution = {
      id: "user:evasion-mod",
      definition: {
        target: "evasion",
        kind: "modifier",
      },
      editable: {
        label: "临时加值",
        value: 2,
      },
    }

    const entry = contributionToEntry(contribution, {
      sourceType: "user",
      sourceId: "user",
      priority: 10,
    })

    expect(entry).toEqual({
      id: "user:evasion-mod",
      definition: {
        target: "evasion",
        kind: "modifier",
      },
      presentation: {
        label: "临时加值",
        value: 2,
      },
      source: {
        type: "user",
        id: "user",
      },
      priority: 10,
    })
  })

  it("formats only the presentation label when converting a contribution", () => {
    const contribution: ModifierContribution = {
      id: "user:evasion-mod",
      definition: {
        target: "evasion",
        kind: "modifier",
      },
      editable: {
        label: "临时加值",
        value: 2,
      },
    }

    const entry = contributionToEntry(contribution, {
      sourceType: "user",
      sourceId: "user",
      priority: 10,
      formatLabel: (label) => `用户：${label}`,
    })

    expect(entry.presentation).toEqual({
      label: "用户：临时加值",
      value: 2,
    })
    expect(entry.definition).toEqual(contribution.definition)
  })
})
