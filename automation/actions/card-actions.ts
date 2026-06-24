import type { StandardCard } from "@/card/card-types"
import { createEmptyCard, isEmptyCard } from "@/card/card-types"
import {
  projectCardAutomationSetupDraft,
  projectCardAutomationSetupRequirements,
} from "@/card/automation/setup-projection"
import type { CardAbilityIR, CardAutomationIR, CardChoiceValues } from "@/card/automation/ir-types"
import type { SheetData } from "@/lib/sheet-data"
import { applyAutoCalculationForTargets } from "@/automation/core/target-sync"

export type CardAutomationActionEffect = {
  kind: "cardAutomationSetupAvailable"
  cardInstanceId: string
}

export type CardAutomationActionResult =
  | {
      kind: "success"
      sheetData: SheetData
      cardInstanceId?: string
      effects: CardAutomationActionEffect[]
    }
  | { kind: "failure"; sheetData: SheetData; message: string }

export type CardZone = "loadout" | "vault"

export type CreateCardInstanceId = () => string

export interface InstantiateCardTemplateOptions {
  now?: Date
  createInstanceId?: CreateCardInstanceId
}

const DEFAULT_CARD_ZONE_SIZE = 20
const PROTECTED_LOADOUT_SLOT_COUNT = 5

export function createRandomCardInstanceId(): string {
  return `cardinst_${crypto.randomUUID()}`
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function cloneAutomation(automation: CardAutomationIR | undefined): CardAutomationIR | undefined {
  return automation ? cloneSerializable(automation) : undefined
}

function cloneChoiceValues(choiceValues: CardChoiceValues): CardChoiceValues {
  return cloneSerializable(choiceValues)
}

export function instantiateCardTemplate(
  template: StandardCard,
  now = new Date(),
  createInstanceId: CreateCardInstanceId = createRandomCardInstanceId,
): StandardCard {
  const instanceId = createInstanceId()
  const automation = cloneAutomation(template.automation)

  return {
    ...template,
    instanceId,
    automation,
    automationSource: automation
      ? {
          templateId: template.id,
          packId: (template as { batchId?: string }).batchId,
          templateAutomationRevision: automation.revision,
          copiedAt: now.toISOString(),
        }
      : undefined,
    automationState: automation ? { version: 1, abilities: {} } : undefined,
  }
}

function cardArrayForZone(sheetData: SheetData, zone: CardZone): StandardCard[] {
  return zone === "loadout" ? sheetData.cards ?? [] : sheetData.inventory_cards ?? []
}

function sheetDataWithZone(sheetData: SheetData, zone: CardZone, cards: StandardCard[]): SheetData {
  return zone === "loadout"
    ? { ...sheetData, cards }
    : { ...sheetData, inventory_cards: cards }
}

function ensureCardArray(cards: StandardCard[], index?: number): StandardCard[] {
  const next = cards.map(card => card ?? createEmptyCard())
  const minLength = Math.max(DEFAULT_CARD_ZONE_SIZE, (index ?? -1) + 1)
  while (next.length < minLength) {
    next.push(createEmptyCard())
  }
  return next
}

function fail(sheetData: SheetData, message: string): CardAutomationActionResult {
  return { kind: "failure", sheetData, message }
}

function success(
  nextSheetData: SheetData,
  options: { cardInstanceId?: string; promptForSetup?: boolean } = {},
): CardAutomationActionResult {
  const sheetData = applyAutoCalculationForTargets(nextSheetData)
  const effects: CardAutomationActionEffect[] = []

  if (
    options.promptForSetup &&
    options.cardInstanceId &&
    projectCardAutomationSetupRequirements(
      sheetData,
      { cardInstanceId: options.cardInstanceId },
    ).length > 0
  ) {
    effects.push({
      kind: "cardAutomationSetupAvailable",
      cardInstanceId: options.cardInstanceId,
    })
  }

  return {
    kind: "success",
    sheetData,
    cardInstanceId: options.cardInstanceId,
    effects,
  }
}

function isProtectedLoadoutSlot(zone: CardZone, index: number): boolean {
  return zone === "loadout" && index < PROTECTED_LOADOUT_SLOT_COUNT
}

export function selectCardIntoSlot(
  sheetData: SheetData,
  zone: CardZone,
  index: number,
  template: StandardCard,
  options: InstantiateCardTemplateOptions = {},
): CardAutomationActionResult {
  if (isProtectedLoadoutSlot(zone, index)) {
    return fail(sheetData, "Protected loadout slots cannot be selected through card automation actions.")
  }

  const cards = ensureCardArray(cardArrayForZone(sheetData, zone), index)
  const instance = instantiateCardTemplate(
    template,
    options.now,
    options.createInstanceId,
  )
  cards[index] = instance

  return success(sheetDataWithZone(sheetData, zone, cards), {
    cardInstanceId: instance.instanceId,
    promptForSetup: true,
  })
}

export function setProtectedLoadoutCardInstance(
  sheetData: SheetData,
  index: number,
  template: StandardCard | undefined,
  options: InstantiateCardTemplateOptions = {},
): CardAutomationActionResult {
  if (index >= PROTECTED_LOADOUT_SLOT_COUNT) {
    return fail(sheetData, "Protected loadout card action requires a protected slot index.")
  }

  const cards = ensureCardArray(cardArrayForZone(sheetData, "loadout"), index)
  if (template && !isEmptyCard(template)) {
    const instance = instantiateCardTemplate(
      template,
      options.now,
      options.createInstanceId,
    )
    cards[index] = instance

    return success(sheetDataWithZone(sheetData, "loadout", cards), {
      cardInstanceId: instance.instanceId,
      promptForSetup: true,
    })
  }

  cards[index] = createEmptyCard()
  return success(sheetDataWithZone(sheetData, "loadout", cards))
}

export function deleteCardInstance(
  sheetData: SheetData,
  zone: CardZone,
  index: number,
): CardAutomationActionResult {
  if (isProtectedLoadoutSlot(zone, index)) {
    return fail(sheetData, "Protected loadout slots cannot be deleted.")
  }

  const cards = ensureCardArray(cardArrayForZone(sheetData, zone), index)
  const card = cards[index]
  if (!card || isEmptyCard(card)) {
    return fail(sheetData, "No card instance exists in the selected slot.")
  }

  cards[index] = createEmptyCard()
  return success(sheetDataWithZone(sheetData, zone, cards))
}

export function moveCardInstance(
  sheetData: SheetData,
  fromZone: CardZone,
  fromIndex: number,
  toZone: CardZone,
): CardAutomationActionResult {
  if (fromZone === toZone) {
    return fail(sheetData, "Card source and target zones are the same.")
  }
  if (fromZone === "loadout" && toZone === "vault" && fromIndex < PROTECTED_LOADOUT_SLOT_COUNT) {
    return fail(sheetData, "Protected loadout slots cannot be moved to the vault.")
  }

  const loadoutCards = ensureCardArray(sheetData.cards ?? [], fromZone === "loadout" ? fromIndex : undefined)
  const vaultCards = ensureCardArray(sheetData.inventory_cards ?? [], fromZone === "vault" ? fromIndex : undefined)
  const sourceCards = fromZone === "loadout" ? loadoutCards : vaultCards
  const targetCards = toZone === "loadout" ? loadoutCards : vaultCards
  const cardToMove = sourceCards[fromIndex]

  if (!cardToMove || isEmptyCard(cardToMove)) {
    return fail(sheetData, "No card instance exists in the selected slot.")
  }

  const targetStartIndex = toZone === "loadout" ? PROTECTED_LOADOUT_SLOT_COUNT : 0
  const targetIndex = targetCards.findIndex((card, index) => index >= targetStartIndex && isEmptyCard(card))
  if (targetIndex === -1) {
    return fail(sheetData, "No empty target slot is available.")
  }

  sourceCards[fromIndex] = createEmptyCard()
  targetCards[targetIndex] = cardToMove

  return success({
    ...sheetData,
    cards: loadoutCards,
    inventory_cards: vaultCards,
  })
}

export function replaceCardInstance(
  sheetData: SheetData,
  zone: CardZone,
  index: number,
  template: StandardCard,
  options: InstantiateCardTemplateOptions = {},
): CardAutomationActionResult {
  if (isProtectedLoadoutSlot(zone, index)) {
    return fail(sheetData, "Protected loadout slots cannot be replaced through card automation actions.")
  }

  const cards = ensureCardArray(cardArrayForZone(sheetData, zone), index)
  const current = cards[index]
  if (!current || isEmptyCard(current)) {
    return selectCardIntoSlot(sheetData, zone, index, template, options)
  }

  const instance = instantiateCardTemplate(
    template,
    options.now,
    options.createInstanceId,
  )
  cards[index] = instance

  return success(sheetDataWithZone(sheetData, zone, cards), {
    cardInstanceId: instance.instanceId,
    promptForSetup: true,
  })
}

type CardInstanceLocation = {
  zone: CardZone
  index: number
  card: StandardCard
}

function findCardInstance(sheetData: SheetData, cardInstanceId: string): CardInstanceLocation | undefined {
  const loadoutIndex = (sheetData.cards ?? []).findIndex(card => card?.instanceId === cardInstanceId)
  if (loadoutIndex >= 0) {
    return { zone: "loadout", index: loadoutIndex, card: sheetData.cards[loadoutIndex] }
  }

  const vaultIndex = (sheetData.inventory_cards ?? []).findIndex(card => card?.instanceId === cardInstanceId)
  if (vaultIndex >= 0) {
    return { zone: "vault", index: vaultIndex, card: (sheetData.inventory_cards ?? [])[vaultIndex] }
  }

  return undefined
}

function findAbility(card: StandardCard, abilityId: string): CardAbilityIR | undefined {
  return card.automation?.abilities.find(ability => ability.id === abilityId)
}

export function setCardAbilityChoiceValues(
  sheetData: SheetData,
  cardInstanceId: string,
  abilityId: string,
  choiceValues: CardChoiceValues,
): CardAutomationActionResult {
  const location = findCardInstance(sheetData, cardInstanceId)
  if (!location) {
    return fail(sheetData, "Card instance was not found.")
  }

  const ability = findAbility(location.card, abilityId)
  if (!ability) {
    return fail(sheetData, "Card ability was not found on the current instance IR.")
  }

  const projection = projectCardAutomationSetupDraft(sheetData, {
    cardInstanceId,
    abilityId,
    draftChoiceValues: choiceValues,
  })

  if (!projection.canSaveAbility || projection.discardedChoiceIds.length > 0) {
    return fail(sheetData, "Card ability choice values are invalid.")
  }

  const nextChoiceValues = cloneChoiceValues(projection.savableChoiceValues)
  const cards = ensureCardArray(cardArrayForZone(sheetData, location.zone), location.index)
  const currentAbilities = location.card.automationState?.abilities ?? {}
  cards[location.index] = {
    ...location.card,
    automationState: {
      version: 1,
      abilities: {
        ...currentAbilities,
        [abilityId]: { choiceValues: nextChoiceValues },
      },
    },
  }

  return success(sheetDataWithZone(sheetData, location.zone, cards))
}
