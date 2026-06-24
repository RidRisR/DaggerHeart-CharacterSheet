import { applyAutoCalculationForTargets } from "@/automation/core/target-sync"
import type { CardAutomationIR } from "@/card/automation/ir-types"
import { makeSheet } from "@/card/automation/__tests__/helpers"
import type { StandardCard } from "@/card/card-types"
import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  auditCardInstancesOnLoad,
  overwriteCardInstancesFromAudit,
  STALE_CARD_AUDIT_ITEM_MESSAGE,
  type CardInstanceAuditItem,
} from "../card-instance-audit"

vi.mock("@/automation/core/target-sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/automation/core/target-sync")>()
  return {
    ...actual,
    applyAutoCalculationForTargets: vi.fn((sheetData) =>
      actual.applyAutoCalculationForTargets(sheetData),
    ),
  }
})

const syncSpy = vi.mocked(applyAutoCalculationForTargets)

const fixedNow = new Date("2026-06-22T00:00:00.000Z")

const ancestryAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:ancestry",
  abilities: [
    {
      id: "nimble",
      label: "Nimble",
      lifetime: { kind: "whileInLoadout" },
      effects: [{ id: "base", kind: "emitBase", target: "evasion", value: 12 }],
    },
  ],
}

const updatedAncestryAutomation: CardAutomationIR = {
  ...ancestryAutomation,
  revision: "stable32:ancestry-updated",
  abilities: [
    {
      id: "nimble-updated",
      label: "Nimble Updated",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "bonus",
          kind: "selectMany",
          cardinality: { min: 1, max: 1, unique: true },
          domain: {
            kind: "staticOptions",
            options: [{ id: "evasion", label: "Evasion" }],
          },
        },
      ],
      effects: [{ id: "base", kind: "emitBase", target: "evasion", value: 13 }],
    },
  ],
}

function makeCard(overrides: Partial<StandardCard> = {}): StandardCard {
  return {
    standarized: true,
    id: "template-card",
    name: "Template Card",
    type: "domain",
    class: "Blade",
    cardSelectDisplay: {},
    ...overrides,
  }
}

describe("card instance load-time audit actions", () => {
  beforeEach(() => {
    syncSpy.mockClear()
  })

  it("reports a same-id loadout ancestry card that lacks instance automation without mutating sheet data", () => {
    const savedCard = makeCard({
      id: "ancestry:nimble",
      name: "Nimble",
      type: "ancestry",
      instanceId: "cardinst_ancestry",
    })
    const currentTemplate = makeCard({
      id: "ancestry:nimble",
      name: "Nimble",
      type: "ancestry",
      automation: ancestryAutomation,
    })
    const sheet = makeSheet({
      cards: [undefined, undefined, savedCard] as unknown as StandardCard[],
      ancestry1Ref: { id: "ancestry:nimble", name: "Nimble" },
    })
    const before = structuredClone(sheet)

    const report = auditCardInstancesOnLoad(sheet, templateId =>
      templateId === currentTemplate.id ? currentTemplate : undefined,
    )

    expect(report.items).toEqual([
      {
        id: "loadout:2:ancestry:nimble",
        zone: "loadout",
        index: 2,
        sourceCardId: "ancestry:nimble",
        sourceInstanceId: "cardinst_ancestry",
        templateId: "ancestry:nimble",
        cardName: "Nimble",
        reasons: ["MISSING_INSTANCE_AUTOMATION"],
        updatable: true,
        sourceCard: savedCard,
        template: currentTemplate,
        characterChoiceKind: "ancestry1",
      },
    ])
    expect(sheet).toEqual(before)
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("reports revision drift but keeps existing instance authority until update is accepted", () => {
    const savedCard = makeCard({
      id: "ancestry:nimble",
      name: "Nimble",
      type: "ancestry",
      instanceId: "cardinst_ancestry",
      automation: ancestryAutomation,
      automationState: {
        version: 1,
        abilities: { nimble: { choiceValues: { bonus: ["old"] } } },
      },
    })
    const currentTemplate = makeCard({
      id: "ancestry:nimble",
      name: "Nimble",
      type: "ancestry",
      automation: updatedAncestryAutomation,
    })
    const sheet = makeSheet({
      cards: [undefined, undefined, savedCard] as unknown as StandardCard[],
      ancestry1Ref: { id: "ancestry:nimble", name: "Nimble" },
    })

    const report = auditCardInstancesOnLoad(sheet, templateId =>
      templateId === currentTemplate.id ? currentTemplate : undefined,
    )

    expect(report.items).toEqual([
      expect.objectContaining({
        zone: "loadout",
        index: 2,
        templateId: "ancestry:nimble",
        reasons: ["AUTOMATION_REVISION_DRIFT"],
        willClearAutomationSettings: true,
        updatable: true,
        template: currentTemplate,
      }),
    ])
    expect(sheet.cards[2]).toEqual(savedCard)
    expect(sheet.cards[2].automation).toBe(ancestryAutomation)
    expect(sheet.cards[2].automationState?.abilities).toEqual({
      nimble: { choiceValues: { bonus: ["old"] } },
    })
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("reports visible card content drift separately from automation drift", () => {
    const savedCard = makeCard({
      id: "domain:blade",
      name: "Old Blade",
      type: "domain",
      class: "Blade",
      level: 1,
      description: "Old text",
      instanceId: "cardinst_blade",
      automation: ancestryAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const currentTemplate = makeCard({
      id: "domain:blade",
      name: "New Blade",
      type: "domain",
      class: "Blade",
      level: 1,
      description: "New text",
      automation: ancestryAutomation,
    })
    const sheet = makeSheet({ inventory_cards: [savedCard] })

    const report = auditCardInstancesOnLoad(sheet, templateId =>
      templateId === currentTemplate.id ? currentTemplate : undefined,
    )

    expect(report.items).toEqual([
      expect.objectContaining({
        zone: "vault",
        index: 0,
        templateId: "domain:blade",
        reasons: ["CARD_CONTENT_DRIFT"],
        updatable: true,
        template: currentTemplate,
      }),
    ])
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("reports runtime template field drift that can affect sheet calculations", () => {
    const savedCard = makeCard({
      id: "class:warrior",
      name: "Warrior",
      type: "profession",
      class: "Warrior",
      instanceId: "cardinst_warrior",
      cardSelectDisplay: { item1: "Blade", item2: "Valor" },
      professionSpecial: {
        "起始生命": 6,
        "起始闪避": 10,
        "起始物品": "Sword",
        "希望特性": "Hope",
      },
    })
    const currentTemplate = makeCard({
      id: "class:warrior",
      name: "Warrior",
      type: "profession",
      class: "Warrior",
      cardSelectDisplay: { item1: "Blade", item2: "Valor" },
      professionSpecial: {
        "起始生命": 7,
        "起始闪避": 11,
        "起始物品": "Sword",
        "希望特性": "Hope",
      },
    })
    const sheet = makeSheet({ cards: [savedCard] })

    const report = auditCardInstancesOnLoad(sheet, templateId =>
      templateId === currentTemplate.id ? currentTemplate : undefined,
    )

    expect(report.items).toEqual([
      expect.objectContaining({
        zone: "loadout",
        index: 0,
        templateId: "class:warrior",
        reasons: ["CARD_CONTENT_DRIFT"],
        updatable: true,
        template: currentTemplate,
      }),
    ])
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("does not report cards when the current template is unavailable", () => {
    const savedCard = makeCard({
      id: "vault:missing",
      name: "Missing Vault Card",
      type: "domain",
      instanceId: "cardinst_missing",
    })
    const sheet = makeSheet({ inventory_cards: [savedCard] })

    const report = auditCardInstancesOnLoad(sheet, () => undefined)

    expect(report.items).toEqual([])
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("reports missing instance id and missing automation state reasons", () => {
    const missingInstanceIdCard = makeCard({
      id: "domain:missing-instance",
      name: "Missing Instance",
      type: "domain",
    })
    const missingAutomationStateCard = makeCard({
      id: "domain:missing-state",
      name: "Missing State",
      type: "domain",
      instanceId: "cardinst_missing_state",
      automation: ancestryAutomation,
    })
    const missingInstanceTemplate = makeCard({
      id: "domain:missing-instance",
      name: "Missing Instance",
      type: "domain",
    })
    const missingStateTemplate = makeCard({
      id: "domain:missing-state",
      name: "Missing State",
      type: "domain",
      automation: ancestryAutomation,
    })
    const templates = new Map([
      [missingInstanceTemplate.id, missingInstanceTemplate],
      [missingStateTemplate.id, missingStateTemplate],
    ])
    const sheet = makeSheet({
      inventory_cards: [missingInstanceIdCard, missingAutomationStateCard],
    })

    const report = auditCardInstancesOnLoad(sheet, templateId => templates.get(templateId))

    expect(report.items).toEqual([
      expect.objectContaining({
        zone: "vault",
        index: 0,
        templateId: "domain:missing-instance",
        reasons: ["MISSING_INSTANCE_ID"],
        updatable: true,
      }),
      expect.objectContaining({
        zone: "vault",
        index: 1,
        templateId: "domain:missing-state",
        reasons: ["MISSING_AUTOMATION_STATE"],
        updatable: true,
      }),
    ])
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("reports character choice ref mismatch using the ref as the expected template", () => {
    const savedCard = makeCard({
      id: "ancestry:old",
      name: "Old Ancestry",
      type: "ancestry",
      instanceId: "cardinst_old_ancestry",
      automation: ancestryAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const currentTemplate = makeCard({
      id: "ancestry:current",
      name: "Current Ancestry",
      type: "ancestry",
      automation: ancestryAutomation,
    })
    const sheet = makeSheet({
      cards: [undefined, undefined, savedCard] as unknown as StandardCard[],
      ancestry1Ref: { id: "ancestry:current", name: "Current Ancestry" },
    })

    const report = auditCardInstancesOnLoad(sheet, templateId =>
      templateId === currentTemplate.id ? currentTemplate : undefined,
    )

    expect(report.items).toEqual([
      expect.objectContaining({
        zone: "loadout",
        index: 2,
        templateId: "ancestry:current",
        reasons: ["CARD_CONTENT_DRIFT", "CHARACTER_CHOICE_REF_MISMATCH"],
        updatable: true,
        template: currentTemplate,
        characterChoiceKind: "ancestry1",
      }),
    ])
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("does not report an item when a card instance has no audit reasons", () => {
    const cleanCard = makeCard({
      id: "domain:clean",
      name: "Clean",
      type: "domain",
      instanceId: "cardinst_clean",
      automation: ancestryAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const currentTemplate = makeCard({
      id: "domain:clean",
      name: "Clean",
      type: "domain",
      automation: ancestryAutomation,
    })
    const sheet = makeSheet({ inventory_cards: [cleanCard] })

    const report = auditCardInstancesOnLoad(sheet, templateId =>
      templateId === currentTemplate.id ? currentTemplate : undefined,
    )

    expect(report.items).toEqual([])
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("overwrites selected audit items from current templates and clears previous automation choices", () => {
    const staleLoadoutCard = makeCard({
      id: "ancestry:nimble",
      name: "Nimble",
      type: "ancestry",
      instanceId: "cardinst_stale_loadout",
      automation: ancestryAutomation,
      automationState: {
        version: 1,
        abilities: { nimble: { choiceValues: { bonus: ["old"] } } },
      },
    })
    const staleVaultCard = makeCard({
      id: "domain:blade",
      name: "Blade",
      type: "domain",
      instanceId: "cardinst_stale_vault",
      automation: ancestryAutomation,
      automationState: {
        version: 1,
        abilities: { nimble: { choiceValues: { bonus: ["old"] } } },
      },
    })
    const loadoutTemplate = makeCard({
      id: "ancestry:nimble",
      name: "Nimble Updated",
      type: "ancestry",
      automation: updatedAncestryAutomation,
    })
    const vaultTemplate = makeCard({
      id: "domain:blade",
      name: "Blade Updated",
      type: "domain",
      automation: updatedAncestryAutomation,
    })
    const sheet = makeSheet({
      cards: [undefined, undefined, staleLoadoutCard] as unknown as StandardCard[],
      inventory_cards: [staleVaultCard],
      ancestry1Ref: { id: "ancestry:nimble", name: "Nimble" },
    })
    const auditItems: CardInstanceAuditItem[] = [
      {
        id: "loadout:2:ancestry:nimble",
        zone: "loadout",
        index: 2,
        sourceCardId: "ancestry:nimble",
        sourceInstanceId: "cardinst_stale_loadout",
        templateId: "ancestry:nimble",
        cardName: "Nimble",
        reasons: ["AUTOMATION_REVISION_DRIFT"],
        updatable: true,
        template: loadoutTemplate,
        characterChoiceKind: "ancestry1",
      },
      {
        id: "vault:0:domain:blade",
        zone: "vault",
        index: 0,
        sourceCardId: "domain:blade",
        sourceInstanceId: "cardinst_stale_vault",
        templateId: "domain:blade",
        cardName: "Blade",
        reasons: ["AUTOMATION_REVISION_DRIFT"],
        updatable: true,
        template: vaultTemplate,
      },
    ]

    const result = overwriteCardInstancesFromAudit(sheet, auditItems, {
      now: fixedNow,
      createInstanceId: vi
        .fn()
        .mockReturnValueOnce("cardinst_fresh_loadout")
        .mockReturnValueOnce("cardinst_fresh_vault"),
    })

    expect(result.kind).toBe("success")
    expect(syncSpy).toHaveBeenCalledTimes(1)
    expect(result.sheetData.cards[2]).toEqual(
      expect.objectContaining({
        id: "ancestry:nimble",
        name: "Nimble Updated",
        instanceId: "cardinst_fresh_loadout",
        automation: updatedAncestryAutomation,
        automationSource: {
          templateId: "ancestry:nimble",
          packId: undefined,
          templateAutomationRevision: "stable32:ancestry-updated",
          copiedAt: fixedNow.toISOString(),
        },
        automationState: { version: 1, abilities: {} },
      }),
    )
    expect(result.sheetData.inventory_cards?.[0]).toEqual(
      expect.objectContaining({
        id: "domain:blade",
        name: "Blade Updated",
        instanceId: "cardinst_fresh_vault",
        automationState: { version: 1, abilities: {} },
      }),
    )
    expect(sheet.cards[2]).toEqual(staleLoadoutCard)
    expect(sheet.inventory_cards?.[0]).toEqual(staleVaultCard)
  })

  it("fast-fails atomically when a selected audit item no longer matches the current slot", () => {
    const staleAuditedCard = makeCard({
      id: "ancestry:nimble",
      name: "Nimble",
      type: "ancestry",
      instanceId: "cardinst_stale_loadout",
      automation: ancestryAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const currentTemplate = makeCard({
      id: "ancestry:nimble",
      name: "Nimble Updated",
      type: "ancestry",
      automation: updatedAncestryAutomation,
    })
    const staleVaultCard = makeCard({
      id: "domain:blade",
      name: "Blade",
      type: "domain",
      instanceId: "cardinst_stale_vault",
      automation: ancestryAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const vaultTemplate = makeCard({
      id: "domain:blade",
      name: "Blade Updated",
      type: "domain",
      automation: updatedAncestryAutomation,
    })
    const auditedSheet = makeSheet({
      cards: [undefined, undefined, staleAuditedCard] as unknown as StandardCard[],
      inventory_cards: [staleVaultCard],
      ancestry1Ref: { id: "ancestry:nimble", name: "Nimble" },
    })
    const templates = new Map([
      [currentTemplate.id, currentTemplate],
      [vaultTemplate.id, vaultTemplate],
    ])
    const report = auditCardInstancesOnLoad(auditedSheet, templateId =>
      templates.get(templateId),
    )
    const replacedCard = makeCard({
      id: "ancestry:replaced",
      name: "Replaced",
      type: "ancestry",
      instanceId: "cardinst_replaced",
      automation: ancestryAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const currentSheet = makeSheet({
      cards: [undefined, undefined, replacedCard] as unknown as StandardCard[],
      inventory_cards: [staleVaultCard],
      ancestry1Ref: { id: "ancestry:replaced", name: "Replaced" },
    })
    const createInstanceId = vi.fn(() => "cardinst_should_not_write")

    const result = overwriteCardInstancesFromAudit(currentSheet, report.items, {
      now: fixedNow,
      createInstanceId,
    })

    expect(result).toEqual({
      kind: "failure",
      sheetData: currentSheet,
      message: STALE_CARD_AUDIT_ITEM_MESSAGE,
    })
    expect(result.sheetData.cards[2]).toBe(replacedCard)
    expect(result.sheetData.inventory_cards?.[0]).toBe(staleVaultCard)
    expect(createInstanceId).not.toHaveBeenCalled()
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("returns failure and leaves sheet unchanged when selected audit item has no template or no updatable items", () => {
    const sheet = makeSheet({ cards: [makeCard({ id: "domain:blade", name: "Blade" })] })
    const missingTemplateItem: CardInstanceAuditItem = {
      id: "loadout:0:domain:blade",
      zone: "loadout",
      index: 0,
      sourceCardId: "domain:blade",
      templateId: "domain:blade",
      cardName: "Blade",
      reasons: ["AUTOMATION_REVISION_DRIFT"],
      updatable: true,
    }
    const nonUpdatableItem: CardInstanceAuditItem = {
      ...missingTemplateItem,
      updatable: false,
      reasons: ["AUTOMATION_REVISION_DRIFT"],
    }

    const missingTemplateResult = overwriteCardInstancesFromAudit(sheet, [missingTemplateItem])
    const noUpdatableResult = overwriteCardInstancesFromAudit(sheet, [nonUpdatableItem])

    expect(missingTemplateResult.kind).toBe("failure")
    expect(missingTemplateResult.sheetData).toBe(sheet)
    expect(noUpdatableResult.kind).toBe("failure")
    expect(noUpdatableResult.sheetData).toBe(sheet)
    expect(syncSpy).not.toHaveBeenCalled()
  })
})
