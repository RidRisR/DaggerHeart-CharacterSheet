import type { CardPackageState } from "../types"

export type CardEditorLocalAuthoringDiagnostic =
  | {
      severity: "error"
      code: "EDITOR_ANCESTRY_PAIR_INCOMPLETE"
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
  | {
      severity: "error"
      code: "EDITOR_SUBCLASS_TRIPLE_INCOMPLETE"
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }

const expectedAncestryCategories = [1, 2] as const
const expectedSubclassLevels = ["基石", "专精", "大师"] as const

export function createEditorLocalCardAuthoringDiagnostics(
  draft: CardPackageState,
): CardEditorLocalAuthoringDiagnostic[] {
  return [
    ...createIncompleteAncestryPairDiagnostics(draft),
    ...createIncompleteSubclassTripleDiagnostics(draft),
  ]
}

function createIncompleteAncestryPairDiagnostics(
  draft: CardPackageState,
): CardEditorLocalAuthoringDiagnostic[] {
  const groups = new Map<string, { paths: string[]; categories: Set<number> }>()

  ;(draft.ancestry ?? []).forEach((card, index) => {
    const key = String(card.种族 ?? "")
    const group = groups.get(key) ?? { paths: [], categories: new Set<number>() }

    group.paths.push(`/ancestry/${index}`)
    if (typeof card.类别 === "number") {
      group.categories.add(card.类别)
    }
    groups.set(key, group)
  })

  const diagnostics: CardEditorLocalAuthoringDiagnostic[] = []
  for (const [ancestry, group] of groups.entries()) {
    const hasExpectedCategories = expectedAncestryCategories.every((category) =>
      group.categories.has(category),
    )

    if (group.paths.length !== expectedAncestryCategories.length || !hasExpectedCategories) {
      diagnostics.push({
        severity: "error",
        code: "EDITOR_ANCESTRY_PAIR_INCOMPLETE",
        path: group.paths[0] ?? "/ancestry",
        message: "Editor draft ancestry cards should include category 1 and category 2.",
        value: ancestry,
        relatedPaths: group.paths.slice(1),
      })
    }
  }

  return diagnostics
}

function createIncompleteSubclassTripleDiagnostics(
  draft: CardPackageState,
): CardEditorLocalAuthoringDiagnostic[] {
  const groups = new Map<string, { paths: string[]; levels: Set<string> }>()

  ;(draft.subclass ?? []).forEach((card, index) => {
    const key = `${card.主职 ?? ""}/${card.子职业 ?? ""}`
    const group = groups.get(key) ?? { paths: [], levels: new Set<string>() }

    group.paths.push(`/subclass/${index}`)
    if (typeof card.等级 === "string") {
      group.levels.add(card.等级)
    }
    groups.set(key, group)
  })

  const diagnostics: CardEditorLocalAuthoringDiagnostic[] = []
  for (const [subclass, group] of groups.entries()) {
    const hasExpectedLevels = expectedSubclassLevels.every((level) => group.levels.has(level))

    if (group.paths.length !== expectedSubclassLevels.length || !hasExpectedLevels) {
      diagnostics.push({
        severity: "error",
        code: "EDITOR_SUBCLASS_TRIPLE_INCOMPLETE",
        path: group.paths[0] ?? "/subclass",
        message:
          "Editor draft subclass cards should include foundation, specialization, and mastery cards.",
        value: subclass,
        relatedPaths: group.paths.slice(1),
      })
    }
  }

  return diagnostics
}
