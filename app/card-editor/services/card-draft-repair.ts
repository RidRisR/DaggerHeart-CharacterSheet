import type { AncestryCard } from "@/card/ancestry-card/convert"
import type { SubClassCard } from "@/card/subclass-card/convert"
import type { CardPackageState } from "../types"
import { createDefaultCard } from "../utils/card-factory"

export type CardDraftRepair =
  | { kind: "ancestryPairCompleted"; group: string; ancestry: string; intro: string; createdCategory: 1 | 2 }
  | { kind: "subclassTripleCompleted"; group: string; className: string; subclass: string; level: "基石" | "专精" | "大师" }

export interface CardDraftRepairReport {
  repairs: CardDraftRepair[]
}

export interface CardDraftRepairResult {
  draft: CardPackageState
  report: CardDraftRepairReport
}

export function repairCardEditorDraft(draft: CardPackageState): CardDraftRepairResult {
  const report: CardDraftRepairReport = { repairs: [] }
  const working: CardPackageState = {
    ...draft,
    profession: copyArray(draft.profession),
    ancestry: copyArray(draft.ancestry),
    community: copyArray(draft.community),
    subclass: copyArray(draft.subclass),
    domain: copyArray(draft.domain),
    variant: copyArray(draft.variant),
  }

  working.ancestry = repairAncestryPairs(working, report)
  working.subclass = repairSubclassTriples(working, report)

  return { draft: working, report }
}

function copyArray<T>(value: T[] | unknown): T[] {
  return Array.isArray(value) ? [...value] : []
}

function blankAncestry(packageData: CardPackageState, reference: AncestryCard, category: 1 | 2): AncestryCard {
  const card = createDefaultCard("ancestry", packageData) as AncestryCard
  card.种族 = reference.种族 || "新种族"
  card.简介 = reference.简介 || ""
  card.类别 = category
  card.名称 = `${reference.种族 || "新种族"}能力${category}`
  card.效果 = `${category === 1 ? "基础" : "进阶"}能力效果`
  return card
}

function repairAncestryPairs(packageData: CardPackageState, report: CardDraftRepairReport): AncestryCard[] {
  const ancestryCards = packageData.ancestry ?? []
  const raceCounts = new Map<string, number>()
  for (const card of ancestryCards) {
    const race = String(card.种族 ?? "")
    raceCounts.set(race, (raceCounts.get(race) ?? 0) + 1)
  }

  const groups = new Map<string, { card1?: AncestryCard; card2?: AncestryCard; race: string; intro: string }>()
  for (const card of ancestryCards) {
    const race = String(card.种族 ?? "")
    const intro = String(card.简介 ?? "")
    const key = `${race}-${intro}`
    const group = groups.get(key) ?? { race, intro }
    if (card.类别 === 1) group.card1 = card
    if (card.类别 === 2) group.card2 = card
    groups.set(key, group)
  }

  const output: AncestryCard[] = []
  for (const group of groups.values()) {
    const groupName = raceCounts.get(group.race) === 1 ? group.race : `${group.race} / ${group.intro}`
    if (group.card1 && group.card2) {
      output.push(group.card1, group.card2)
      continue
    }
    if (group.card1) {
      output.push(group.card1, blankAncestry(packageData, group.card1, 2))
      report.repairs.push({
        kind: "ancestryPairCompleted",
        group: groupName,
        ancestry: group.race,
        intro: group.intro,
        createdCategory: 2,
      })
    } else if (group.card2) {
      output.push(blankAncestry(packageData, group.card2, 1), group.card2)
      report.repairs.push({
        kind: "ancestryPairCompleted",
        group: groupName,
        ancestry: group.race,
        intro: group.intro,
        createdCategory: 1,
      })
    }
  }
  return output
}

function blankSubclass(packageData: CardPackageState, reference: SubClassCard, level: "基石" | "专精" | "大师"): SubClassCard {
  const card = createDefaultCard("subclass", packageData) as SubClassCard
  card.子职业 = reference.子职业 || "新子职业"
  card.主职 = reference.主职 || reference.子职业 || "新主职"
  card.等级 = level
  card.名称 = `${reference.子职业 || "新子职业"}${level}`
  card.描述 = `${level}等级能力描述`
  card.施法 = reference.施法 || ""
  return card
}

function repairSubclassTriples(packageData: CardPackageState, report: CardDraftRepairReport): SubClassCard[] {
  const expected = ["基石", "专精", "大师"] as const
  const groups = new Map<string, {
    cards: Partial<Record<(typeof expected)[number], SubClassCard>>
    reference: SubClassCard
    className: string
    subclass: string
  }>()
  for (const card of packageData.subclass ?? []) {
    const className = String(card.主职 ?? "")
    const subclass = String(card.子职业 ?? "")
    const key = `${className}/${subclass}`
    const group = groups.get(key) ?? { cards: {}, reference: card, className, subclass }
    if (card.等级 === "基石" || card.等级 === "专精" || card.等级 === "大师") group.cards[card.等级] = card
    groups.set(key, group)
  }

  const output: SubClassCard[] = []
  for (const [groupName, group] of groups) {
    for (const level of expected) {
      const card = group.cards[level] ?? blankSubclass(packageData, group.reference, level)
      output.push(card)
      if (!group.cards[level]) {
        report.repairs.push({
          kind: "subclassTripleCompleted",
          group: groupName,
          className: group.className,
          subclass: group.subclass,
          level,
        })
      }
    }
  }
  return output
}
