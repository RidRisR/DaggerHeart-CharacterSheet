import type { StandardCard } from "@/card/card-types"
import { createEmptyCard, isEmptyCard } from "@/card/card-types"
import type { SheetData, SheetCardReference } from "@/lib/sheet-data"
import { applyAutoCalculationForTargets } from "@/automation/core/target-sync"
import {
  instantiateCardTemplate,
  type CardAutomationActionResult,
  type CardZone,
  type InstantiateCardTemplateOptions,
} from "./card-actions"

export type CharacterChoiceCardKind =
  | "profession"
  | "subclass"
  | "ancestry1"
  | "ancestry2"
  | "community"

export type CardInstanceAuditReason =
  | "CARD_CONTENT_DRIFT"
  | "MISSING_INSTANCE_ID"
  | "MISSING_INSTANCE_AUTOMATION"
  | "MISSING_AUTOMATION_STATE"
  | "AUTOMATION_REVISION_DRIFT"
  | "CHARACTER_CHOICE_REF_MISMATCH"

export type CardInstanceAuditItem = {
  id: string
  zone: CardZone
  index: number
  sourceCardId: string
  sourceInstanceId?: string
  templateId: string
  cardName: string
  reasons: CardInstanceAuditReason[]
  updatable: boolean
  willClearAutomationSettings?: boolean
  sourceCard?: StandardCard
  template?: StandardCard
  characterChoiceKind?: CharacterChoiceCardKind
}

export type CardInstanceAuditReport = {
  items: CardInstanceAuditItem[]
}

export const STALE_CARD_AUDIT_ITEM_MESSAGE =
  "Selected card audit item no longer matches the current slot."

const CARD_UPDATE_AUDIT_REASONS: CardInstanceAuditReason[] = [
  "CARD_CONTENT_DRIFT",
  "MISSING_INSTANCE_ID",
  "MISSING_INSTANCE_AUTOMATION",
  "AUTOMATION_REVISION_DRIFT",
]

type CharacterChoiceSlot = {
  kind: CharacterChoiceCardKind
  refField: keyof Pick<
    SheetData,
    "professionRef" | "subclassRef" | "ancestry1Ref" | "ancestry2Ref" | "communityRef"
  >
}

const CHARACTER_CHOICE_SLOTS: Record<number, CharacterChoiceSlot> = {
  0: { kind: "profession", refField: "professionRef" },
  1: { kind: "subclass", refField: "subclassRef" },
  2: { kind: "ancestry1", refField: "ancestry1Ref" },
  3: { kind: "ancestry2", refField: "ancestry2Ref" },
  4: { kind: "community", refField: "communityRef" },
}

const DEFAULT_CARD_ZONE_SIZE = 20

function cardArrayForZone(sheetData: SheetData, zone: CardZone): StandardCard[] {
  return zone === "loadout" ? sheetData.cards ?? [] : sheetData.inventory_cards ?? []
}

function sheetDataWithZone(sheetData: SheetData, zone: CardZone, cards: StandardCard[]): SheetData {
  return zone === "loadout"
    ? { ...sheetData, cards }
    : { ...sheetData, inventory_cards: cards }
}

function ensureCardArray(cards: StandardCard[], index: number): StandardCard[] {
  const next = cards.map(card => card ?? createEmptyCard())
  const minLength = Math.max(DEFAULT_CARD_ZONE_SIZE, index + 1)
  while (next.length < minLength) {
    next.push(createEmptyCard())
  }
  return next
}

function characterChoiceRef(sheetData: SheetData, slot: CharacterChoiceSlot): SheetCardReference | undefined {
  return sheetData[slot.refField]
}

function expectedTemplateId(card: StandardCard, ref: SheetCardReference | undefined): string {
  return ref?.id || card.id
}

function cardContentDiffersFromTemplate(card: StandardCard, template: StandardCard): boolean {
  return stableContentString(card) !== stableContentString(template)
}

function stableContentString(card: StandardCard): string {
  const {
    instanceId: _instanceId,
    automation: _automation,
    automationSource: _automationSource,
    automationState: _automationState,
    source: _source,
    batchId: _batchId,
    batchName: _batchName,
    ...content
  } = card as StandardCard & {
    source?: unknown
    batchId?: unknown
    batchName?: unknown
  }

  return JSON.stringify(sortRecord(content))
}

function sortRecord(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortRecord)
  }
  if (!value || typeof value !== "object") {
    return value
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortRecord(nested)]),
  )
}

function hasFilledAutomationSettings(card: StandardCard): boolean {
  const abilities = card.automationState?.abilities

  if (!abilities) {
    return false
  }

  return Object.values(abilities).some(abilityState =>
    Object.values(abilityState.choiceValues ?? {}).some(values => values.length > 0),
  )
}

function auditCard(
  sheetData: SheetData,
  zone: CardZone,
  index: number,
  card: StandardCard,
  lookupTemplate: (templateId: string) => StandardCard | undefined,
): CardInstanceAuditItem | undefined {
  const slot = zone === "loadout" ? CHARACTER_CHOICE_SLOTS[index] : undefined
  const ref = slot ? characterChoiceRef(sheetData, slot) : undefined
  const templateId = expectedTemplateId(card, ref)
  const template = lookupTemplate(templateId)
  const reasons: CardInstanceAuditReason[] = []

  if (!template) {
    return undefined
  }

  if (cardContentDiffersFromTemplate(card, template)) {
    reasons.push("CARD_CONTENT_DRIFT")
  }
  if (!card.instanceId) {
    reasons.push("MISSING_INSTANCE_ID")
  }
  if (template.automation && !card.automation) {
    reasons.push("MISSING_INSTANCE_AUTOMATION")
  }
  if (card.automation && !card.automationState) {
    reasons.push("MISSING_AUTOMATION_STATE")
  }
  if (
    card.automation?.revision &&
    template.automation?.revision &&
    card.automation.revision !== template.automation.revision
  ) {
    reasons.push("AUTOMATION_REVISION_DRIFT")
  }
  if (ref?.id && ref.id !== card.id) {
    reasons.push("CHARACTER_CHOICE_REF_MISMATCH")
  }

  if (reasons.length === 0) {
    return undefined
  }

  const willClearAutomationSettings = hasFilledAutomationSettings(card)

  return {
    id: `${zone}:${index}:${templateId}`,
    zone,
    index,
    sourceCardId: card.id,
    sourceInstanceId: card.instanceId,
    templateId,
    cardName: card.name,
    reasons,
    updatable: true,
    ...(willClearAutomationSettings ? { willClearAutomationSettings } : {}),
    sourceCard: card,
    template,
    characterChoiceKind: slot?.kind,
  }
}

export function isCardUpdateAuditItem(item: CardInstanceAuditItem): boolean {
  if (item.reasons.includes("CHARACTER_CHOICE_REF_MISMATCH")) {
    return false
  }

  return item.reasons.some(reason => CARD_UPDATE_AUDIT_REASONS.includes(reason))
}

export function auditCardInstancesOnLoad(
  sheetData: SheetData,
  lookupTemplate: (templateId: string) => StandardCard | undefined,
): CardInstanceAuditReport {
  const items: CardInstanceAuditItem[] = []

  for (const zone of ["loadout", "vault"] as const) {
    cardArrayForZone(sheetData, zone).forEach((card, index) => {
      if (!card || isEmptyCard(card)) {
        return
      }

      const item = auditCard(sheetData, zone, index, card, lookupTemplate)
      if (item) {
        items.push(item)
      }
    })
  }

  return { items }
}

function currentSlotMatchesAuditItem(sheetData: SheetData, item: CardInstanceAuditItem): boolean {
  const current = cardArrayForZone(sheetData, item.zone)[item.index]

  if (!current || isEmptyCard(current)) {
    return false
  }

  if (current.id !== item.sourceCardId) {
    return false
  }

  if (item.sourceInstanceId) {
    return current.instanceId === item.sourceInstanceId
  }

  return !current.instanceId
}

export function overwriteCardInstancesFromAudit(
  sheetData: SheetData,
  auditItems: CardInstanceAuditItem[],
  options: InstantiateCardTemplateOptions = {},
): CardAutomationActionResult {
  const updatableItems = auditItems.filter(item => item.updatable)

  if (updatableItems.length === 0) {
    return {
      kind: "failure",
      sheetData,
      message: "No updatable card audit items were selected.",
    }
  }

  if (updatableItems.some(item => !item.template)) {
    return {
      kind: "failure",
      sheetData,
      message: "Selected card audit item is missing a current template.",
    }
  }

  if (updatableItems.some(item => !currentSlotMatchesAuditItem(sheetData, item))) {
    return {
      kind: "failure",
      sheetData,
      message: STALE_CARD_AUDIT_ITEM_MESSAGE,
    }
  }

  const nextCardsByZone: Partial<Record<CardZone, StandardCard[]>> = {}

  for (const item of updatableItems) {
    const template = item.template
    if (!template) {
      return {
        kind: "failure",
        sheetData,
        message: "Selected card audit item is missing a current template.",
      }
    }

    const cards = nextCardsByZone[item.zone] ?? ensureCardArray(cardArrayForZone(sheetData, item.zone), item.index)
    cards[item.index] = instantiateCardTemplate(
      template,
      options.now,
      options.createInstanceId,
    )
    nextCardsByZone[item.zone] = cards
  }

  let nextSheetData = sheetData
  if (nextCardsByZone.loadout) {
    nextSheetData = sheetDataWithZone(nextSheetData, "loadout", nextCardsByZone.loadout)
  }
  if (nextCardsByZone.vault) {
    nextSheetData = sheetDataWithZone(nextSheetData, "vault", nextCardsByZone.vault)
  }

  return {
    kind: "success",
    sheetData: applyAutoCalculationForTargets(nextSheetData),
    effects: [],
  }
}
