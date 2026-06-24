# Card Interaction Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make card template selection, Character Choice Card updates, and load-time card instance audit explicit modifier-aware behaviors.

**Architecture:** Add a pure card-instance audit/action module under `automation/actions`, expose semantic sheet-store actions for Character Choice Cards and audit overwrite updates, then make `CharacterSheet` trigger those actions instead of inferring protected slot writes from refs. Load-time audit is read-only and UI-confirmed; accepted audit updates overwrite selected card instances from current templates and clear previous automation choices only when those instances already have filled automation settings.

**Tech Stack:** Next.js, React, Zustand, TypeScript, Vitest, Testing Library.

---

## Source References

- Spec: `docs/superpowers/specs/2026-06-23-card-interaction-semantics-design.md`
- Domain context: `docs/contexts/modifiers/CONTEXT.md`
- Existing card actions: `automation/actions/card-actions.ts`
- Sheet store: `lib/sheet-store.ts`
- Character sheet UI: `components/character-sheet.tsx`
- Existing store tests: `tests/unit/modifiers/store-actions.test.ts`
- Existing sheet UI tests: `tests/unit/character-sheet-equipment.test.tsx`

## File Structure

- Create `automation/actions/card-instance-audit.ts`
  - Owns pure load-time audit and overwrite-update behavior for card instances.
  - Reports current-template drift in player-facing categories: card text content, automation script, missing automation script, missing automation state, and character-choice mismatch.
  - Ignores cards whose current runtime template cannot be found.
  - Depends on `SheetData`, `StandardCard`, and existing card action helpers.
  - Does not import React, Zustand, or the runtime card store.
- Create `automation/actions/__tests__/card-instance-audit.test.ts`
  - Covers audit item detection and overwrite behavior without mounting React.
- Modify `automation/actions/card-actions.ts`
  - Export reusable `PROTECTED_LOADOUT_SLOT_COUNT` only if needed by the audit module.
  - Keep existing template instantiation semantics unchanged.
- Modify `lib/sheet-store.ts`
  - Add `CharacterChoiceCardKind`, `selectCharacterChoiceCard`, `clearCharacterChoiceCard`, `auditCardInstancesOnLoad`, and `overwriteCardInstancesFromAudit`.
  - Keep `handleProfessionChange` as a compatibility facade delegating to `selectCharacterChoiceCard`.
- Modify `tests/unit/modifiers/store-actions.test.ts`
  - Add store-level tests for Character Choice Card semantic actions and audit overwrite update.
- Create `components/card-instance-audit-dialog.tsx`
  - Card-pack update dialog with default-selected update items, per-item checkboxes, card preview buttons, update, and dismiss.
  - Shows only issues solved by overwriting selected cards from current card-pack templates.
  - Uses user-facing per-card reasons and only says an update will clear filled automation settings for cards where that is true.
- Modify `components/character-sheet.tsx`
  - Remove normal user-selection dependence on `syncSpecialCardsWithCharacterChoices`.
  - Route profession, subclass, ancestry, and community selection through semantic store actions.
  - Run load-time audit once after runtime cards are queryable without opening the dialog.
  - Add a compact card deck header entry that refreshes audit whenever opened; it shows a help icon by default and a warning icon when pending items exist.
- Modify `tests/unit/character-sheet-equipment.test.tsx`
  - Update the old auto-repair expectation to the card instance audit dialog.
  - Add a UI test that accepting the audit update instantiates `灵活` / ancestry automation.

## Task 1: Pure Load-Time Audit And Overwrite Update

**Files:**
- Create: `automation/actions/card-instance-audit.ts`
- Create: `automation/actions/__tests__/card-instance-audit.test.ts`
- Modify: `automation/actions/card-actions.ts`

- [ ] **Step 1: Export protected slot count if needed**

In `automation/actions/card-actions.ts`, change:

```ts
const PROTECTED_LOADOUT_SLOT_COUNT = 5
```

to:

```ts
export const PROTECTED_LOADOUT_SLOT_COUNT = 5
```

- [ ] **Step 2: Write failing audit tests**

Create `automation/actions/__tests__/card-instance-audit.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest"
import { applyAutoCalculationForTargets } from "@/automation/core/target-sync"
import type { StandardCard } from "@/card/card-types"
import { createEmptyCard } from "@/card/card-types"
import type { CardAutomationIR, CardInstanceAutomationState } from "@/card/automation/ir-types"
import { makeSheet } from "@/card/automation/__tests__/helpers"
import {
  auditCardInstancesOnLoad,
  overwriteCardInstancesFromAudit,
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
const fixedNow = new Date("2026-06-23T00:00:00.000Z")

const nimbleAutomation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:nimble",
  abilities: [
    {
      id: "nimble",
      label: "灵活",
      lifetime: { kind: "whileInLoadout" },
      effects: [{ id: "nimble-evasion", kind: "emitModifier", target: "evasion", value: 1 }],
    },
  ],
}

const olderAutomation: CardAutomationIR = {
  ...nimbleAutomation,
  revision: "stable32:nimble-old",
}

function card(overrides: Partial<StandardCard> = {}): StandardCard {
  return {
    ...createEmptyCard("ancestry"),
    standarized: true,
    id: "Simiah-Nimble",
    name: "灵活",
    type: "ancestry",
    class: "猿族",
    cardSelectDisplay: {},
    ...overrides,
  }
}

describe("load-time card instance audit", () => {
  beforeEach(() => {
    syncSpy.mockClear()
  })

  it("reports a same-id loadout card that lacks instance automation without mutating sheet data", () => {
    const stale = card()
    const template = card({ automation: nimbleAutomation })
    const sheet = makeSheet({
      cards: [undefined, undefined, stale] as unknown as StandardCard[],
      ancestry1Ref: { id: "Simiah-Nimble", name: "灵活" },
    })

    const report = auditCardInstancesOnLoad(sheet, id => id === template.id ? template : undefined)

    expect(report.items).toEqual([
      expect.objectContaining({
        id: "loadout:2:Simiah-Nimble",
        zone: "loadout",
        index: 2,
        templateId: "Simiah-Nimble",
        cardName: "灵活",
        updatable: true,
        reasons: expect.arrayContaining(["MISSING_INSTANCE_ID", "MISSING_INSTANCE_AUTOMATION"]),
      }),
    ])
    expect(sheet.cards[2]).toBe(stale)
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("reports revision drift but keeps the existing instance authority until update is accepted", () => {
    const instanceState: CardInstanceAutomationState = {
      version: 1,
      abilities: { old: { choiceValues: { selected: ["value"] } } },
    }
    const instance = card({
      instanceId: "cardinst_old",
      automation: olderAutomation,
      automationState: instanceState,
      automationSource: {
        templateId: "Simiah-Nimble",
        templateAutomationRevision: olderAutomation.revision,
      },
    })
    const template = card({ automation: nimbleAutomation })
    const sheet = makeSheet({ cards: [undefined, undefined, instance] as unknown as StandardCard[] })

    const report = auditCardInstancesOnLoad(sheet, id => id === template.id ? template : undefined)

    expect(report.items).toEqual([
      expect.objectContaining({
        reasons: ["AUTOMATION_REVISION_DRIFT"],
        updatable: true,
      }),
    ])
    expect(sheet.cards[2].automationState).toBe(instanceState)
    expect(syncSpy).not.toHaveBeenCalled()
  })

  it("does not report cards whose templates are unavailable", () => {
    const instance = card({
      instanceId: "cardinst_missing_template",
      automation: nimbleAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const sheet = makeSheet({ cards: [undefined, undefined, instance] as unknown as StandardCard[] })

    const report = auditCardInstancesOnLoad(sheet, () => undefined)

    expect(report.items).toEqual([])
  })

  it("overwrites selected audit items from current templates and clears previous automation choices", () => {
    const oldState: CardInstanceAutomationState = {
      version: 1,
      abilities: { old: { choiceValues: { stale: ["value"] } } },
    }
    const instance = card({
      instanceId: "cardinst_old",
      automation: olderAutomation,
      automationState: oldState,
    })
    const template = card({ automation: nimbleAutomation })
    const sheet = makeSheet({
      evasion: "10",
      cards: [undefined, undefined, instance] as unknown as StandardCard[],
    })
    const report = auditCardInstancesOnLoad(sheet, id => id === template.id ? template : undefined)

    const result = overwriteCardInstancesFromAudit(sheet, report.items, {
      now: fixedNow,
      createInstanceId: () => "cardinst_updated",
    })

    expect(result.kind).toBe("success")
    expect(syncSpy).toHaveBeenCalledTimes(1)
    expect(result.sheetData.cards[2]).toEqual(expect.objectContaining({
      id: "Simiah-Nimble",
      instanceId: "cardinst_updated",
      automation: nimbleAutomation,
      automationState: { version: 1, abilities: {} },
    }))
    expect(result.sheetData.evasion).toBe("11")
  })

  it("returns failure and leaves sheet unchanged when selected audit item has no template", () => {
    const instance = card({
      instanceId: "cardinst_missing_template",
      automation: nimbleAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const sheet = makeSheet({ cards: [undefined, undefined, instance] as unknown as StandardCard[] })
    const report = auditCardInstancesOnLoad(sheet, () => undefined)

    const result = overwriteCardInstancesFromAudit(sheet, report.items)

    expect(result.kind).toBe("failure")
    expect(result.sheetData).toBe(sheet)
    expect(syncSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the failing audit tests**

Run:

```bash
pnpm test:run automation/actions/__tests__/card-instance-audit.test.ts
```

Expected: FAIL because `automation/actions/card-instance-audit.ts` does not exist.

- [ ] **Step 4: Implement audit and overwrite update**

Create `automation/actions/card-instance-audit.ts`:

```ts
import type { StandardCard } from "@/card/card-types"
import { createEmptyCard, isEmptyCard } from "@/card/card-types"
import type { SheetData, SheetCardReference } from "@/lib/sheet-data"
import {
  instantiateCardTemplate,
  type CardAutomationActionResult,
  type CardZone,
  type InstantiateCardTemplateOptions,
} from "./card-actions"
import { applyAutoCalculationForTargets } from "@/automation/core/target-sync"

export type CharacterChoiceCardKind =
  | "profession"
  | "subclass"
  | "ancestry1"
  | "ancestry2"
  | "community"

export type CardInstanceAuditReason =
  | "MISSING_INSTANCE_ID"
  | "MISSING_INSTANCE_AUTOMATION"
  | "MISSING_AUTOMATION_STATE"
  | "AUTOMATION_REVISION_DRIFT"
  | "CHARACTER_CHOICE_REF_MISMATCH"

export type CardInstanceAuditItem = {
  id: string
  zone: CardZone
  index: number
  templateId: string
  cardName: string
  reasons: CardInstanceAuditReason[]
  updatable: boolean
  template?: StandardCard
  characterChoiceKind?: CharacterChoiceCardKind
}

export type CardInstanceAuditReport = {
  items: CardInstanceAuditItem[]
}

const CHARACTER_CHOICE_SLOTS: Record<CharacterChoiceCardKind, {
  index: number
  refField: keyof Pick<SheetData, "professionRef" | "subclassRef" | "ancestry1Ref" | "ancestry2Ref" | "communityRef">
}> = {
  profession: { index: 0, refField: "professionRef" },
  subclass: { index: 1, refField: "subclassRef" },
  ancestry1: { index: 2, refField: "ancestry1Ref" },
  ancestry2: { index: 3, refField: "ancestry2Ref" },
  community: { index: 4, refField: "communityRef" },
}

function nonEmptyCards(cards: StandardCard[] | undefined): Array<{ card: StandardCard; index: number }> {
  return (cards ?? [])
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card && !isEmptyCard(card))
}

function refAt(sheetData: SheetData, kind: CharacterChoiceCardKind): SheetCardReference | undefined {
  return sheetData[CHARACTER_CHOICE_SLOTS[kind].refField] as SheetCardReference | undefined
}

function choiceKindForLoadoutIndex(index: number): CharacterChoiceCardKind | undefined {
  return (Object.keys(CHARACTER_CHOICE_SLOTS) as CharacterChoiceCardKind[])
    .find(kind => CHARACTER_CHOICE_SLOTS[kind].index === index)
}

function auditOne(input: {
  sheetData: SheetData
  zone: CardZone
  index: number
  card: StandardCard
  lookupTemplate: (templateId: string) => StandardCard | undefined
}): CardInstanceAuditItem | undefined {
  const characterChoiceKind = input.zone === "loadout"
    ? choiceKindForLoadoutIndex(input.index)
    : undefined
  const ref = characterChoiceKind ? refAt(input.sheetData, characterChoiceKind) : undefined
  const expectedTemplateId = ref?.id || input.card.id
  const template = input.lookupTemplate(expectedTemplateId)
  const reasons: CardInstanceAuditReason[] = []

  if (!template) return undefined

  if (!input.card.instanceId) reasons.push("MISSING_INSTANCE_ID")
  if (template.automation && !input.card.automation) reasons.push("MISSING_INSTANCE_AUTOMATION")
  if (input.card.automation && !input.card.automationState) reasons.push("MISSING_AUTOMATION_STATE")
  if (input.card.automation?.revision && template.automation?.revision && input.card.automation.revision !== template.automation.revision) {
    reasons.push("AUTOMATION_REVISION_DRIFT")
  }
  if (ref?.id && ref.id !== input.card.id) {
    reasons.push("CHARACTER_CHOICE_REF_MISMATCH")
  }

  if (reasons.length === 0) return undefined

  return {
    id: `${input.zone}:${input.index}:${expectedTemplateId}`,
    zone: input.zone,
    index: input.index,
    templateId: expectedTemplateId,
    cardName: input.card.name || template?.name || expectedTemplateId,
    reasons,
    updatable: Boolean(template),
    template,
    characterChoiceKind,
  }
}

export function auditCardInstancesOnLoad(
  sheetData: SheetData,
  lookupTemplate: (templateId: string) => StandardCard | undefined,
): CardInstanceAuditReport {
  const items: CardInstanceAuditItem[] = []

  nonEmptyCards(sheetData.cards).forEach(({ card, index }) => {
    const item = auditOne({ sheetData, zone: "loadout", index, card, lookupTemplate })
    if (item) items.push(item)
  })

  nonEmptyCards(sheetData.inventory_cards).forEach(({ card, index }) => {
    const item = auditOne({ sheetData, zone: "vault", index, card, lookupTemplate })
    if (item) items.push(item)
  })

  return { items }
}

function ensureCards(cards: StandardCard[] | undefined, index: number): StandardCard[] {
  const next = (cards ?? []).map(card => card ?? createEmptyCard())
  while (next.length <= index) next.push(createEmptyCard())
  return next
}

export function overwriteCardInstancesFromAudit(
  sheetData: SheetData,
  auditItems: CardInstanceAuditItem[],
  options: InstantiateCardTemplateOptions = {},
): CardAutomationActionResult {
  const selected = auditItems.filter(item => item.updatable)
  if (selected.length === 0) {
    return { kind: "failure", sheetData, message: "No updatable card audit items were selected." }
  }

  let nextSheetData = sheetData
  let loadoutCards = ensureCards(sheetData.cards, Math.max(0, ...selected.filter(item => item.zone === "loadout").map(item => item.index)))
  let vaultCards = ensureCards(sheetData.inventory_cards, Math.max(0, ...selected.filter(item => item.zone === "vault").map(item => item.index)))

  for (const item of selected) {
    if (!item.template) {
      return { kind: "failure", sheetData, message: `Card template "${item.templateId}" is unavailable.` }
    }
    const instance = instantiateCardTemplate(item.template, options.now, options.createInstanceId)
    if (item.zone === "loadout") {
      loadoutCards[item.index] = instance
    } else {
      vaultCards[item.index] = instance
    }
  }

  nextSheetData = {
    ...nextSheetData,
    cards: loadoutCards,
    inventory_cards: vaultCards,
  }

  return {
    kind: "success",
    sheetData: applyAutoCalculationForTargets(nextSheetData),
  }
}
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
pnpm test:run automation/actions/__tests__/card-instance-audit.test.ts
```

Expected: PASS.

Commit:

```bash
git add automation/actions/card-actions.ts automation/actions/card-instance-audit.ts automation/actions/__tests__/card-instance-audit.test.ts
git commit -m "feat: add card instance load-time audit actions"
```

## Task 2: Sheet Store Semantic Actions

**Files:**
- Modify: `lib/sheet-store.ts`
- Modify: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Write failing store tests**

Append these tests near existing card-action tests in `tests/unit/modifiers/store-actions.test.ts`:

```ts
it("selectCharacterChoiceCard instantiates an ancestry Character Choice Card", () => {
  resetSheetStore({ cards: defaultSheetData.cards, stressMax: 6 })

  store().selectCharacterChoiceCard("ancestry1", { id: "ancestry:automated", name: "Automated Ancestry" }, {
    ...createEmptyCard("ancestry"),
    id: "ancestry:automated",
    name: "Automated Ancestry",
    type: "ancestry",
    automation: testCardAutomation,
  })

  expect(sheet().ancestry1).toBe("ancestry:automated")
  expect(sheet().ancestry1Ref).toEqual({ id: "ancestry:automated", name: "Automated Ancestry" })
  expect(sheet().cards[2]).toEqual(expect.objectContaining({
    id: "ancestry:automated",
    instanceId: expect.stringMatching(/^cardinst_/),
    automation: testCardAutomation,
    automationState: { version: 1, abilities: {} },
  }))
})

it("selectCharacterChoiceCard replaces the same id with a fresh instance", () => {
  resetSheetStore({
    cards: [
      ...defaultSheetData.cards.slice(0, 2),
      {
        ...createEmptyCard("ancestry"),
        id: "ancestry:automated",
        name: "Old Automated Ancestry",
        type: "ancestry",
        instanceId: "cardinst_old",
        automation: testCardAutomation,
        automationState: { version: 1, abilities: { old: { choiceValues: { stale: ["value"] } } } },
      },
      ...defaultSheetData.cards.slice(3),
    ],
    ancestry1: "ancestry:automated",
    ancestry1Ref: { id: "ancestry:automated", name: "Old Automated Ancestry" },
  })

  store().selectCharacterChoiceCard("ancestry1", { id: "ancestry:automated", name: "Automated Ancestry" }, {
    ...createEmptyCard("ancestry"),
    id: "ancestry:automated",
    name: "Automated Ancestry",
    type: "ancestry",
    automation: testCardAutomation,
  })

  expect(sheet().cards[2].instanceId).toMatch(/^cardinst_/)
  expect(sheet().cards[2].instanceId).not.toBe("cardinst_old")
  expect(sheet().cards[2].automationState).toEqual({ version: 1, abilities: {} })
})

it("clearCharacterChoiceCard clears both ref and protected slot", () => {
  resetSheetStore({
    cards: [
      ...defaultSheetData.cards.slice(0, 2),
      {
        ...createEmptyCard("ancestry"),
        id: "ancestry:automated",
        name: "Automated Ancestry",
        type: "ancestry",
        instanceId: "cardinst_old",
      },
      ...defaultSheetData.cards.slice(3),
    ],
    ancestry1: "ancestry:automated",
    ancestry1Ref: { id: "ancestry:automated", name: "Automated Ancestry" },
  })

  store().clearCharacterChoiceCard("ancestry1")

  expect(sheet().ancestry1).toBe("")
  expect(sheet().ancestry1Ref).toEqual({ id: "", name: "" })
  expect(sheet().cards[2].name).toBe("")
})

it("overwriteCardInstancesFromAudit updates selected audit items through the store", () => {
  resetSheetStore({
    evasion: "10",
    cards: [
      ...defaultSheetData.cards.slice(0, 2),
      {
        ...createEmptyCard("ancestry"),
        id: "ancestry:nimble",
        name: "灵活",
        type: "ancestry",
        instanceId: "cardinst_old",
      },
      ...defaultSheetData.cards.slice(3),
    ],
  })
  const template = {
    ...createEmptyCard("ancestry"),
    id: "ancestry:nimble",
    name: "灵活",
    type: "ancestry",
    automation: {
      ...testCardAutomation,
      abilities: [{
        id: "nimble",
        label: "灵活",
        lifetime: { kind: "whileInLoadout" as const },
        effects: [{ id: "nimble-evasion", kind: "emitModifier" as const, target: "evasion" as const, value: 1 }],
      }],
    },
  }

  const report = store().auditCardInstancesOnLoad(id => id === template.id ? template : undefined)
  store().overwriteCardInstancesFromAudit(report.items)

  expect(sheet().cards[2]).toEqual(expect.objectContaining({
    id: "ancestry:nimble",
    instanceId: expect.stringMatching(/^cardinst_/),
    automationState: { version: 1, abilities: {} },
  }))
  expect(sheet().evasion).toBe("11")
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test:run tests/unit/modifiers/store-actions.test.ts -t "Character Choice Card|audit"
```

Expected: FAIL because store actions do not exist.

- [ ] **Step 3: Add store action types and imports**

In `lib/sheet-store.ts`, extend imports from `@/automation/actions/card-actions` and add the audit import:

```ts
import {
    deleteCardInstance,
    moveCardInstance,
    replaceCardInstance,
    selectCardIntoSlot,
    setProtectedLoadoutCardInstance,
    type CardZone,
} from "@/automation/actions/card-actions";
import {
    auditCardInstancesOnLoad as auditCardInstancesOnLoadAction,
    overwriteCardInstancesFromAudit as overwriteCardInstancesFromAuditAction,
    type CardInstanceAuditItem,
    type CardInstanceAuditReport,
    type CharacterChoiceCardKind,
} from "@/automation/actions/card-instance-audit";
```

Extend `SheetState`:

```ts
    selectCharacterChoiceCard: (
        kind: CharacterChoiceCardKind,
        ref: SheetCardReference,
        template: StandardCard,
    ) => void;
    clearCharacterChoiceCard: (kind: CharacterChoiceCardKind) => void;
    auditCardInstancesOnLoad: (
        lookupTemplate: (templateId: string) => StandardCard | undefined,
    ) => CardInstanceAuditReport;
    overwriteCardInstancesFromAudit: (auditItems: CardInstanceAuditItem[]) => void;
```

- [ ] **Step 4: Add helper and implementations**

In `lib/sheet-store.ts`, add near `syncSubclassSpellcasting`:

```ts
const CHARACTER_CHOICE_FIELDS: Record<CharacterChoiceCardKind, {
    slotIndex: number;
    valueField: keyof Pick<SheetData, "profession" | "subclass" | "ancestry1" | "ancestry2" | "community">;
    refField: keyof Pick<SheetData, "professionRef" | "subclassRef" | "ancestry1Ref" | "ancestry2Ref" | "communityRef">;
}> = {
    profession: { slotIndex: 0, valueField: "profession", refField: "professionRef" },
    subclass: { slotIndex: 1, valueField: "subclass", refField: "subclassRef" },
    ancestry1: { slotIndex: 2, valueField: "ancestry1", refField: "ancestry1Ref" },
    ancestry2: { slotIndex: 3, valueField: "ancestry2", refField: "ancestry2Ref" },
    community: { slotIndex: 4, valueField: "community", refField: "communityRef" },
};

function withCharacterChoiceFields(
    sheetData: SheetData,
    kind: CharacterChoiceCardKind,
    ref: SheetCardReference | undefined,
): SheetData {
    const fields = CHARACTER_CHOICE_FIELDS[kind];
    return {
        ...sheetData,
        [fields.valueField]: ref?.id ?? "",
        [fields.refField]: ref ?? { id: "", name: "" },
    };
}
```

Inside `create<SheetState>()`, add actions before `handleProfessionChange`:

```ts
    selectCharacterChoiceCard: (kind, ref, template) => set((state) => {
        const fields = CHARACTER_CHOICE_FIELDS[kind];
        const result = setProtectedLoadoutCardInstance(
            withCharacterChoiceFields(state.sheetData, kind, ref),
            fields.slotIndex,
            template,
        );

        if (result.kind === "failure") {
            console.log("[Store]", result.message);
            return state;
        }

        return { sheetData: result.sheetData };
    }),

    clearCharacterChoiceCard: (kind) => set((state) => {
        const fields = CHARACTER_CHOICE_FIELDS[kind];
        const result = setProtectedLoadoutCardInstance(
            withCharacterChoiceFields(state.sheetData, kind, undefined),
            fields.slotIndex,
            undefined,
        );

        if (result.kind === "failure") {
            console.log("[Store]", result.message);
            return state;
        }

        return { sheetData: result.sheetData };
    }),

    auditCardInstancesOnLoad: (lookupTemplate) => {
        return auditCardInstancesOnLoadAction(get().sheetData, lookupTemplate);
    },

    overwriteCardInstancesFromAudit: (auditItems) => set((state) => {
        const result = overwriteCardInstancesFromAuditAction(state.sheetData, auditItems);

        if (result.kind === "failure") {
            console.log("[Store]", result.message);
            return state;
        }

        return { sheetData: result.sheetData };
    }),
```

Then replace `handleProfessionChange` body with a compatibility call:

```ts
    handleProfessionChange: (newProfessionRef, newProfessionCard) => {
        if (newProfessionRef && newProfessionCard) {
            get().selectCharacterChoiceCard("profession", newProfessionRef, newProfessionCard);
            return;
        }
        get().clearCharacterChoiceCard("profession");
    },
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
pnpm test:run tests/unit/modifiers/store-actions.test.ts -t "Character Choice Card|audit|handleProfessionChange"
```

Expected: PASS.

Commit:

```bash
git add lib/sheet-store.ts tests/unit/modifiers/store-actions.test.ts
git commit -m "feat: add semantic character choice card store actions"
```

## Task 3: Character Sheet Selection Uses Semantic Actions

**Files:**
- Modify: `components/character-sheet.tsx`
- Modify: `tests/unit/character-sheet-equipment.test.tsx`

- [ ] **Step 1: Update UI regression tests**

In `tests/unit/character-sheet-equipment.test.tsx`, rename the existing test from:

```ts
it("instantiates selected special ancestry cards before card automation sync", async () => {
```

to:

```ts
it("reports stale selected ancestry cards through load-time audit without mutating sheet data", async () => {
```

Change the final expectation to:

```ts
    render(<CharacterSheet />)

    await waitFor(() => {
      expect(screen.getByText(/发现 1 张卡牌可能需要更新/)).toBeInTheDocument()
    })

    expect(sheet().cards[2]?.instanceId).toBeUndefined()
    expect(sheet().stressMax).toBe(6)
```

Add a new test below it:

```ts
  it("updates audited ancestry card after player confirms overwrite update", async () => {
    const user = userEvent.setup()
    const humanCard = {
      ...createEmptyCard("ancestry"),
      id: "Human-HighStamina",
      name: "精力充沛",
      type: CardType.Ancestry,
      class: "人类",
      automation: humanHighStaminaAutomation,
    }

    useCardStore.setState({
      initialized: true,
      loading: false,
      cards: new Map([[humanCard.id, humanCard]]),
      cardsByType: new Map([[CardType.Ancestry, [humanCard.id]]]),
    })
    resetSheetStore({
      level: "1",
      stressMax: 6,
      cards: [
        ...Array.from({ length: 2 }, () => createEmptyCard()),
        {
          ...createEmptyCard("ancestry"),
          id: humanCard.id,
          name: humanCard.name,
          type: CardType.Ancestry,
        },
      ],
      ancestry1: humanCard.id,
      ancestry1Ref: { id: humanCard.id, name: humanCard.name },
    })

    render(<CharacterSheet />)

    await user.click(await screen.findByRole("button", { name: "更新选中卡牌" }))

    await waitFor(() => {
      expect(sheet().cards[2]).toEqual(expect.objectContaining({
        id: humanCard.id,
        instanceId: expect.stringMatching(/^cardinst_/),
        automationState: { version: 1, abilities: {} },
      }))
      expect(sheet().stressMax).toBe(7)
    })
  })
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm test:run tests/unit/character-sheet-equipment.test.tsx -t "ancestry card"
```

Expected: FAIL because the audit dialog UI does not exist and current effect mutates sheet data.

- [ ] **Step 3: Route selection handlers through semantic store actions**

In `components/character-sheet.tsx`, change the `useSheetStore()` destructuring:

```ts
    updateCard,
    selectCharacterChoiceCard,
    clearCharacterChoiceCard,
    auditCardInstancesOnLoad,
    overwriteCardInstancesFromAudit,
```

Remove `needsSyncRef`, `initialRenderRef`, `getUpdatedSpecialCards`, `shouldSyncSpecialCard`, `syncSpecialCardsWithCharacterChoices`, and the effect that calls them.

Update handlers:

```ts
  const handleAncestryChange = (field: string, value: string) => {
    const kind = field === "ancestry1" ? "ancestry1" : "ancestry2"
    if (value === "none" || !value) {
      clearCharacterChoiceCard(kind)
      return
    }
    if (cardsLoading) return
    const ancestryCard = store.getCardById(value)
    if (ancestryCard && ancestryCard.type === CardType.Ancestry) {
      selectCharacterChoiceCard(kind, { id: ancestryCard.id, name: ancestryCard.name }, ancestryCard)
    }
  }

  const handleCommunityChange = (value: string) => {
    if (value === "none" || !value) {
      clearCharacterChoiceCard("community")
      return
    }
    if (cardsLoading) return
    const communityCard = store.getCardById(value)
    if (communityCard && communityCard.type === CardType.Community) {
      selectCharacterChoiceCard("community", { id: communityCard.id, name: communityCard.name }, communityCard)
    }
  }

  const handleSubclassChange = (value: string) => {
    if (value === "none" || !value) {
      clearCharacterChoiceCard("subclass")
      return
    }
    if (cardsLoading) return
    const subclassCard = store.getCardById(value)
    if (subclassCard && (subclassCard.type === CardType.Subclass || subclassCard.type === CardType.Profession)) {
      selectCharacterChoiceCard("subclass", { id: subclassCard.id, name: subclassCard.name }, subclassCard)
    }
  }
```

Keep `handleProfessionChange` using the existing `autofillProfessionData` compatibility facade, or replace it with `selectCharacterChoiceCard("profession", ...)` once all tests pass.

- [ ] **Step 4: Commit semantic UI selection**

Run:

```bash
pnpm test:run tests/unit/character-sheet-equipment.test.tsx tests/unit/modifiers/store-actions.test.ts -t "Character Choice Card|ancestry card|handleProfessionChange"
```

Expected: store semantic tests pass; audit UI tests still fail until Task 4.

Commit:

```bash
git add components/character-sheet.tsx tests/unit/character-sheet-equipment.test.tsx
git commit -m "refactor: route character choice selection through semantic actions"
```

## Task 4: Load-Time Audit Dialog UI

**Files:**
- Create: `components/card-instance-audit-dialog.tsx`
- Modify: `components/character-sheet.tsx`
- Modify: `components/character-sheet-page-two-sections/card-deck-section.tsx`
- Modify: `tests/unit/character-sheet-equipment.test.tsx`

- [ ] **Step 1: Create the dialog component**

Create `components/card-instance-audit-dialog.tsx`.

The component must be a real dialog, not an inline notice. It receives `open`, `items`, `onConfirm`, and `onOpenChange`; opening with zero items shows an explicit empty state. The dialog is a single-action card-pack update flow, not a general diagnostics page.

The dialog title is `更新卡牌`. It should explain: `发现 {n} 张卡牌和当前卡包中的同名卡牌不同。你可以用卡包数据更新选中的卡牌。`

Each row should contain a checkbox, card name, one short reason, and an eye icon button for previewing the current saved card instance. Do not show slot labels like `配置 3` or `库存 1` in the main list.

Each card should show only card-pack update reasons:
- `文本内容不同。`
- `自动化脚本不同。`
- `这张卡还没有自动化脚本，可以和卡包同步。`

Only when the audited card has filled automation settings and its automation script differs, use: `自动化脚本不同。更新会清空这张卡已填写的自动化设置。`

Do not show automation-state setup tasks or Character Choice Card mismatch repair tasks in this dialog.

- [ ] **Step 2: Wire load-time audit in CharacterSheet**

Add a `sheetLoadRevision` guard. After runtime cards are initialized, run `auditCardInstancesOnLoad` once per loaded sheet revision. This warms the audit path and verifies current sheet state, but it must not open `CardInstanceAuditDialog` automatically.

- [ ] **Step 3: Add the page-two card deck header entry**

In `components/character-sheet-page-two-sections/card-deck-section.tsx`, add a small icon button beside the `卡组` title.

The button must:
- show a help icon when the latest audit has no pending items;
- show a warning icon when pending items exist;
- refresh audit items immediately before opening the dialog;
- keep the dialog available even when there are no pending items, so the player can manually check the current state.

- [ ] **Step 4: Run UI audit tests**

Run:

```bash
pnpm test:run tests/unit/character-sheet-equipment.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit audit UI**

Commit:

```bash
git add components/card-instance-audit-dialog.tsx components/character-sheet.tsx components/character-sheet-page-two-sections/card-deck-section.tsx tests/unit/character-sheet-equipment.test.tsx
git commit -m "refactor: make card audit dialog manually opened"
```

## Task 5: Focused Regression And Broad Verification

**Files:**
- Modify only if verification exposes issues.

- [ ] **Step 1: Run focused card action tests**

Run:

```bash
pnpm test:run automation/actions/__tests__/card-actions.test.ts automation/actions/__tests__/card-instance-audit.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run store and character sheet tests**

Run:

```bash
pnpm test:run tests/unit/modifiers/store-actions.test.ts tests/unit/character-sheet-equipment.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run card automation propagation tests**

Run:

```bash
pnpm test:run card/automation/__tests__/resolver.test.ts card/automation/__tests__/fixture-matrix.test.ts tests/unit/automation/profession-automation.test.ts tests/unit/automation/target-sync-unification.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run full test suite**

Run:

```bash
pnpm test:run
```

Expected: PASS, with any existing skipped tests unchanged.

- [ ] **Step 5: Build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 6: Final commit if verification required fixes**

If any verification fixes were made:

```bash
git add <changed-files>
git commit -m "fix: stabilize card interaction audit regressions"
```

If no files changed, do not create an empty commit.

## Self-Review

- Spec coverage:
  - Template selection always instantiates: Task 2 and Task 3.
  - Character Choice Card semantic actions: Task 2 and Task 3.
  - Load-time audit without mutation: Task 1 and Task 4.
  - Player-approved overwrite update with cleared choices: Task 1 and Task 4.
  - Audit dialog, card deck header entry, default-selected update items, per-item deselect: Task 4.
  - Unavailable templates are ignored by load-time audit: Task 1.
  - Runtime source/import/IR validation not expanded: no task touches those layers.
- Placeholder scan: no TBD/TODO/fill-in placeholders remain.
- Type consistency:
  - `CharacterChoiceCardKind`, `CardInstanceAuditItem`, and `CardInstanceAuditReport` are introduced in Task 1 and reused consistently in later tasks.
  - Store action names match the spec: `selectCharacterChoiceCard`, `clearCharacterChoiceCard`, `auditCardInstancesOnLoad`, `overwriteCardInstancesFromAudit`.
