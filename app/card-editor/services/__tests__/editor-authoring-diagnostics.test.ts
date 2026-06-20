import { describe, expect, it } from "vitest"
import { createEditorLocalCardAuthoringDiagnostics } from "../editor-authoring-diagnostics"
import type { CardPackageState } from "../../types"

const draft: CardPackageState = {
  name: "草稿",
  customFieldDefinitions: {
    professions: [],
    ancestries: [],
    communities: [],
    domains: [],
    variants: [],
  },
  profession: [],
  community: [],
  domain: [],
  variant: [],
  ancestry: [{ id: "human-1", 名称: "人类一", 种族: "人类", 简介: "", 效果: "", 类别: 1 }],
  subclass: [
    {
      id: "warrior-sub-1",
      名称: "战士基石",
      主职: "战士",
      子职业: "战士",
      等级: "基石",
      施法: "力量",
      描述: "",
    },
  ],
}

describe("editor-local card authoring diagnostics", () => {
  it("reports blank package names as editor-local authoring errors", () => {
    const diagnostics = createEditorLocalCardAuthoringDiagnostics({
      ...draft,
      name: "   ",
      ancestry: [],
      subclass: [],
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "EDITOR_PACKAGE_NAME_REQUIRED",
        path: "/name",
      }),
    ])
  })

  it("reports incomplete ancestry pair and subclass triple", () => {
    const diagnostics = createEditorLocalCardAuthoringDiagnostics(draft)

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "EDITOR_ANCESTRY_PAIR_INCOMPLETE",
        path: "/ancestry/0",
      }),
    )
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "EDITOR_SUBCLASS_TRIPLE_INCOMPLETE",
        path: "/subclass/0",
      }),
    )
  })

  it("does not report complete ancestry pair and subclass triple", () => {
    const complete: CardPackageState = {
      ...draft,
      ancestry: [
        draft.ancestry![0],
        { id: "human-2", 名称: "人类二", 种族: "人类", 简介: "", 效果: "", 类别: 2 },
      ],
      subclass: [
        draft.subclass![0],
        { ...draft.subclass![0], id: "warrior-sub-2", 名称: "战士专精", 等级: "专精" },
        { ...draft.subclass![0], id: "warrior-sub-3", 名称: "战士大师", 等级: "大师" },
      ],
    }

    expect(createEditorLocalCardAuthoringDiagnostics(complete)).toEqual([])
  })

  it("groups ancestry authoring checks by ancestry and intro", () => {
    const repeatedAncestryName: CardPackageState = {
      ...draft,
      ancestry: [
        { id: "human-a-1", 名称: "人类甲一", 种族: "人类", 简介: "甲", 效果: "", 类别: 1 },
        { id: "human-a-2", 名称: "人类甲二", 种族: "人类", 简介: "甲", 效果: "", 类别: 2 },
        { id: "human-b-1", 名称: "人类乙一", 种族: "人类", 简介: "乙", 效果: "", 类别: 1 },
        { id: "human-b-2", 名称: "人类乙二", 种族: "人类", 简介: "乙", 效果: "", 类别: 2 },
      ],
      subclass: [],
    }

    expect(createEditorLocalCardAuthoringDiagnostics(repeatedAncestryName)).toEqual([])
  })

  it("reports groups with duplicate categories or duplicate subclass levels", () => {
    const duplicateRegularity: CardPackageState = {
      ...draft,
      ancestry: [
        draft.ancestry![0],
        { ...draft.ancestry![0], id: "human-2", 名称: "人类又一", 类别: 1 },
      ],
      subclass: [
        draft.subclass![0],
        { ...draft.subclass![0], id: "warrior-sub-2", 名称: "战士另一个基石", 等级: "基石" },
        { ...draft.subclass![0], id: "warrior-sub-3", 名称: "战士专精", 等级: "专精" },
      ],
    }

    expect(createEditorLocalCardAuthoringDiagnostics(duplicateRegularity)).toEqual([
      expect.objectContaining({
        code: "EDITOR_ANCESTRY_PAIR_INCOMPLETE",
        path: "/ancestry/0",
      }),
      expect.objectContaining({
        code: "EDITOR_SUBCLASS_TRIPLE_INCOMPLETE",
        path: "/subclass/0",
      }),
    ])
  })
})
