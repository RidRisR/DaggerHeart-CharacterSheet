import { describe, expect, it } from "vitest"
import type { CardPackageState } from "../../types"
import { repairCardEditorDraft } from "../card-draft-repair"

function baseDraft(partial: Partial<CardPackageState>): CardPackageState {
  return {
    name: "Pack",
    version: "1.0.0",
    description: "",
    author: "Author",
    customFieldDefinitions: {
      professions: [],
      ancestries: [],
      communities: [],
      domains: [],
      variants: [],
    },
    profession: [],
    ancestry: [],
    community: [],
    subclass: [],
    domain: [],
    variant: [],
    ...partial,
  }
}

describe("repairCardEditorDraft", () => {
  it("fills missing ancestry pair cards and reports the repair", () => {
    const result = repairCardEditorDraft(
      baseDraft({
        ancestry: [{ id: "anc-1", 名称: "Human 1", 种族: "Human", 简介: "People", 类别: 1, 效果: "A" } as any],
      }),
    )

    expect(result.draft.ancestry).toHaveLength(2)
    expect(result.report.repairs).toContainEqual(
      expect.objectContaining({ kind: "ancestryPairCompleted", group: "Human", ancestry: "Human", intro: "People" }),
    )
  })

  it("preserves legacy ancestry grouping by ancestry and intro", () => {
    const result = repairCardEditorDraft(
      baseDraft({
        ancestry: [
          { id: "anc-1", 名称: "Elf 1", 种族: "Elf", 简介: "Forest", 类别: 1, 效果: "A" } as any,
          { id: "anc-2", 名称: "Elf 2", 种族: "Elf", 简介: "Moon", 类别: 2, 效果: "B" } as any,
        ],
      }),
    )

    expect(result.draft.ancestry).toHaveLength(4)
    expect(result.draft.ancestry.filter((card) => card.简介 === "Forest")).toHaveLength(2)
    expect(result.draft.ancestry.filter((card) => card.简介 === "Moon")).toHaveLength(2)
    expect(result.report.repairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "ancestryPairCompleted",
          group: "Elf / Forest",
          ancestry: "Elf",
          intro: "Forest",
          createdCategory: 2,
        }),
        expect.objectContaining({
          kind: "ancestryPairCompleted",
          group: "Elf / Moon",
          ancestry: "Elf",
          intro: "Moon",
          createdCategory: 1,
        }),
      ]),
    )
  })

  it("coerces malformed non-array card fields to empty arrays", () => {
    const result = repairCardEditorDraft(
      baseDraft({
        profession: {} as any,
        ancestry: {} as any,
        community: {} as any,
        subclass: {} as any,
        domain: {} as any,
        variant: {} as any,
      }),
    )

    expect(result.draft.profession).toEqual([])
    expect(result.draft.ancestry).toEqual([])
    expect(result.draft.community).toEqual([])
    expect(result.draft.subclass).toEqual([])
    expect(result.draft.domain).toEqual([])
    expect(result.draft.variant).toEqual([])
    expect(result.report.repairs).toEqual([])
  })

  it("fills missing subclass triple cards and reports each created level", () => {
    const result = repairCardEditorDraft(
      baseDraft({
        subclass: [{ id: "sub-1", 名称: "Blade 基石", 主职: "Warrior", 子职业: "Blade", 等级: "基石", 描述: "A", 施法: "" } as any],
      }),
    )

    expect(result.draft.subclass).toHaveLength(3)
    expect(result.report.repairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "subclassTripleCompleted", group: "Warrior/Blade", level: "专精" }),
        expect.objectContaining({
          kind: "subclassTripleCompleted",
          group: "Warrior/Blade",
          className: "Warrior",
          subclass: "Blade",
          level: "大师",
        }),
      ]),
    )
  })

  it("does not mutate the input draft", () => {
    const input = baseDraft({
      ancestry: [{ id: "anc-1", 名称: "Human 1", 种族: "Human", 简介: "People", 类别: 1, 效果: "A" } as any],
    })

    repairCardEditorDraft(input)

    expect(input.ancestry).toHaveLength(1)
  })
})
