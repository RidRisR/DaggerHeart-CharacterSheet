import type { CardPackageState } from "../types"

export type CardEditorLocalAuthoringDiagnostic =
  | {
      severity: "error"
      code: "EDITOR_PACKAGE_NAME_REQUIRED"
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
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

type AncestryAuthoringGroup = {
  paths: string[]
  categories: Set<number>
  ancestry: string
  intro: string
}

export function createEditorLocalCardAuthoringDiagnostics(
  draft: CardPackageState,
): CardEditorLocalAuthoringDiagnostic[] {
  return [
    ...createRequiredMetadataDiagnostics(draft),
    ...createIncompleteAncestryPairDiagnostics(draft),
    ...createIncompleteSubclassTripleDiagnostics(draft),
  ]
}

function createRequiredMetadataDiagnostics(
  draft: CardPackageState,
): CardEditorLocalAuthoringDiagnostic[] {
  if (typeof draft.name === "string" && draft.name.trim().length > 0) {
    return []
  }

  return [
    {
      severity: "error",
      code: "EDITOR_PACKAGE_NAME_REQUIRED",
      path: "/name",
      message: "Editor draft package name is required.",
      value: draft.name,
    },
  ]
}

function createIncompleteAncestryPairDiagnostics(
  draft: CardPackageState,
): CardEditorLocalAuthoringDiagnostic[] {
  const groups = new Map<string, AncestryAuthoringGroup>()
  const raceCounts = new Map<string, number>()

  for (const card of draft.ancestry ?? []) {
    const race = String(card.种族 ?? "")
    raceCounts.set(race, (raceCounts.get(race) ?? 0) + 1)
  }

  ;(draft.ancestry ?? []).forEach((card, index) => {
    const race = String(card.种族 ?? "")
    const intro = String(card.简介 ?? "")
    const key = JSON.stringify([race, intro])
    const group = groups.get(key) ?? {
      paths: [],
      categories: new Set<number>(),
      ancestry: race,
      intro,
    }

    group.paths.push(`/ancestry/${index}`)
    if (typeof card.类别 === "number") {
      group.categories.add(card.类别)
    }
    groups.set(key, group)
  })

  const diagnostics: CardEditorLocalAuthoringDiagnostic[] = []
  for (const group of groups.values()) {
    const groupName =
      raceCounts.get(group.ancestry) === 1 ? group.ancestry : `${group.ancestry} / ${group.intro}`
    const hasExpectedCategories = expectedAncestryCategories.every((category) =>
      group.categories.has(category),
    )

    if (group.paths.length !== expectedAncestryCategories.length || !hasExpectedCategories) {
      diagnostics.push({
        severity: "error",
        code: "EDITOR_ANCESTRY_PAIR_INCOMPLETE",
        path: group.paths[0] ?? "/ancestry",
        message: "Editor draft ancestry cards should include category 1 and category 2.",
        value: groupName,
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
