# Card Automation Setup UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Card Automation Setup flow so card selection creates the card first, then prompts the player to fill missing card automation choices, with saved choices committed one ability at a time.

**Architecture:** Keep card automation rules in `card/automation/`, modifier-aware writes in `automation/actions/` and `lib/sheet-store.ts`, and React components as orchestration/UI only. Card selection actions return the created `cardInstanceId` and optional post-action effect descriptors; setup prompt orchestration derives requirements from committed sheet state and opens a dialog when needed. Setup draft state stays in React memory and is validated by a pure helper before `setCardAbilityChoiceValues` writes through the existing action boundary.

**Tech Stack:** Next.js React components, Zustand sheet store, Vitest, Testing Library, existing Radix/shadcn-style `Dialog`, `Button`, and `Checkbox` components.

---

## Spec And Context

- Spec: `docs/superpowers/specs/2026-06-24-card-automation-setup-ui-design.md`
- Domain glossary: `docs/contexts/modifiers/CONTEXT.md`
- Prior semantic action spec: `docs/superpowers/specs/2026-06-23-card-interaction-semantics-design.md`

Keep these constraints intact:

- Selecting a card and setting up automation are separate intents.
- Canceling setup never removes or rolls back the newly selected card.
- Only complete ability-level `choiceValues` are saved.
- A player-visible setup session can process multiple ability-level requirements sequentially, but each save commits exactly one ability.
- First version does not reconfigure already-saved valid choices.
- First version setup marker ignores invalid saved choices; it only reflects missing Card Automation Requirements.
- Do not add UI callback behavior to `applyAutoCalculationForTargets` or automation resolver code.

## File Map

- Create `card/automation/setup-projection.ts`
  - Rich setup requirement projection.
  - Draft projection for one card + one ability using `resolveAbilityChoices`.
  - Option labels for static options, attributes, and experiences.
- Create `card/automation/__tests__/setup-projection.test.ts`
  - Domain tests for requirement ordering, options, no-option state, draft advancement, and branch cleanup inputs.
- Modify `automation/actions/card-actions.ts`
  - Add card selection result metadata/effects.
  - Return `cardInstanceId` from selection/replacement/protected-slot selection success paths.
  - Condition `cardAutomationSetupAvailable` on post-boundary missing setup requirements.
- Modify `automation/actions/__tests__/card-actions.test.ts`
  - Verify card selection result metadata/effects and no prompt for clears/deletes/moves.
- Modify `lib/sheet-store.ts`
  - Add result-bearing `selectCardForSlot`.
  - Make `selectCharacterChoiceCard` return a result while preserving existing call sites that ignore it.
  - Add result-bearing `setCardAbilityChoiceValuesForInstance`.
  - Keep `updateCard` as compatibility facade.
- Modify `tests/unit/modifiers/store-actions.test.ts`
  - Verify store actions return success/failure and keep state unchanged on failures.
- Create `components/card-automation-setup/card-automation-setup-dialog.tsx`
  - Dialog for one setup session.
  - Local draft + step history.
  - Save-confirm and next-ability transition.
- Create `components/card-automation-setup/use-card-automation-setup-prompt.tsx`
  - Independent prompt orchestration.
  - Consumes card selection action result/effects.
  - Opens dialog for the created card instance or explicit marker click.
- Create `components/card-automation-setup/card-automation-setup-marker.tsx`
  - Small warning button for cards with missing setup requirement.
- Create `components/card-automation-setup/__tests__/card-automation-setup-dialog.test.tsx`
  - UI flow tests for select-one auto-advance, select-many manual finish, back behavior, cancel discard, save result handling.
- Modify `components/character-sheet-page-two-sections/card-deck-section.tsx`
  - Use result-bearing selection action.
  - Render setup marker for visible loadout/vault cards.
  - Mount setup prompt orchestration.
- Modify `components/character-sheet-page-two.tsx`
  - Route upgrade-domain/subclass modal selections through `selectCardForSlot` and setup prompt orchestration.
- Modify `components/home-client-app.tsx`
  - Route legacy/home card selection through `selectCardForSlot` and setup prompt orchestration.
- Modify `components/character-sheet.tsx`
  - Route Character Choice Card selections through result-bearing `selectCharacterChoiceCard` and setup prompt orchestration.
  - Render markers for visible protected slots where this component owns the card UI.

---

### Task 1: Rich Setup Projection And Draft Helper

**Files:**
- Create: `card/automation/setup-projection.ts`
- Create: `card/automation/__tests__/setup-projection.test.ts`

- [ ] **Step 1: Write failing projection tests**

Create `card/automation/__tests__/setup-projection.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import type { CardAutomationIR } from "../ir-types"
import { makeSheet } from "./helpers"
import {
  projectCardAutomationSetupDraft,
  projectCardAutomationSetupRequirements,
} from "../setup-projection"

function makeCard(overrides: Partial<StandardCard> = {}): StandardCard {
  return {
    standarized: true,
    id: "template-setup",
    instanceId: "cardinst_setup",
    name: "Setup Card",
    type: "domain",
    class: "Blade",
    cardSelectDisplay: {},
    ...overrides,
  }
}

const setupIr: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:setup",
  abilities: [
    {
      id: "choose-attribute",
      label: "Choose Attribute",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "attribute",
          label: "Attribute",
          kind: "targetSelectMany",
          cardinality: { min: 1, max: 1, unique: true },
          domain: { kind: "modifierTargetGroup", group: "attributes" },
        },
      ],
      effects: [
        {
          id: "effect-1",
          kind: "emitEachSelectedTarget",
          choiceId: "attribute",
          value: 1,
        },
      ],
    },
    {
      id: "choose-experience",
      label: "Choose Experience",
      lifetime: { kind: "permanentOnceClaimed" },
      choices: [
        {
          id: "experience",
          label: "Experience",
          kind: "targetSelectMany",
          cardinality: { min: 1, max: 1, unique: true },
          domain: { kind: "modifierTargetGroup", group: "experiences" },
        },
      ],
      effects: [
        {
          id: "effect-2",
          kind: "emitEachSelectedTarget",
          choiceId: "experience",
          value: 2,
        },
      ],
    },
  ],
}

const branchedIr: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:branch",
  abilities: [
    {
      id: "branch",
      label: "Branch",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "mode",
          label: "Mode",
          kind: "selectOne",
          cardinality: { min: 1, max: 1, unique: true },
          domain: {
            kind: "staticOptions",
            options: [
              { id: "attribute", label: "Attribute" },
              { id: "experience", label: "Experience" },
            ],
          },
        },
        {
          id: "experience",
          label: "Experience",
          kind: "targetSelectMany",
          requiredWhen: { kind: "choiceEquals", choiceId: "mode", valueId: "experience" },
          cardinality: { min: 1, max: 1, unique: true },
          domain: { kind: "modifierTargetGroup", group: "experiences" },
        },
      ],
      effects: [],
    },
  ],
}

describe("card automation setup projection", () => {
  it("projects missing setup requirements in ability order with target labels", () => {
    const sheet = makeSheet({
      experience: ["Smith", "Scout", "", "", ""],
      cards: [makeCard({ automation: setupIr })],
    })

    const requirements = projectCardAutomationSetupRequirements(sheet, {
      cardInstanceId: "cardinst_setup",
    })

    expect(requirements.map((requirement) => requirement.abilityId)).toEqual([
      "choose-attribute",
      "choose-experience",
    ])
    expect(requirements[0].choices[0].options).toEqual(
      expect.arrayContaining([
        { id: "agility.value", label: "敏捷" },
        { id: "strength.value", label: "力量" },
      ]),
    )
    expect(requirements[1].choices[0].options).toEqual([
      { id: "experienceValues.0", label: "经历 1：Smith" },
      { id: "experienceValues.1", label: "经历 2：Scout" },
    ])
  })

  it("keeps a missing requirement when a target choice has no options", () => {
    const sheet = makeSheet({
      experience: ["", "", "", "", ""],
      cards: [makeCard({ automation: setupIr })],
    })

    const requirements = projectCardAutomationSetupRequirements(sheet, {
      cardInstanceId: "cardinst_setup",
    })

    expect(requirements.find((requirement) => requirement.abilityId === "choose-experience")?.choices[0].options).toEqual([])
  })

  it("projects draft state and identifies the active missing choice", () => {
    const sheet = makeSheet({
      experience: ["Smith", "", "", "", ""],
      cards: [makeCard({ automation: branchedIr })],
    })

    const initial = projectCardAutomationSetupDraft(sheet, {
      cardInstanceId: "cardinst_setup",
      abilityId: "branch",
      draftChoiceValues: {},
    })
    const withMode = projectCardAutomationSetupDraft(sheet, {
      cardInstanceId: "cardinst_setup",
      abilityId: "branch",
      draftChoiceValues: { mode: ["experience"] },
    })
    const complete = projectCardAutomationSetupDraft(sheet, {
      cardInstanceId: "cardinst_setup",
      abilityId: "branch",
      draftChoiceValues: {
        mode: ["experience"],
        experience: ["experienceValues.0"],
      },
    })

    expect(initial.activeChoice?.choiceId).toBe("mode")
    expect(initial.canSaveAbility).toBe(false)
    expect(withMode.activeChoice?.choiceId).toBe("experience")
    expect(withMode.canSaveAbility).toBe(false)
    expect(complete.activeChoice).toBeUndefined()
    expect(complete.canSaveAbility).toBe(true)
    expect(complete.savableChoiceValues).toEqual({
      mode: ["experience"],
      experience: ["experienceValues.0"],
    })
  })

  it("excludes draft choices that are not required in the current branch", () => {
    const sheet = makeSheet({
      experience: ["Smith", "", "", "", ""],
      cards: [makeCard({ automation: branchedIr })],
    })

    const projection = projectCardAutomationSetupDraft(sheet, {
      cardInstanceId: "cardinst_setup",
      abilityId: "branch",
      draftChoiceValues: {
        mode: ["attribute"],
        experience: ["experienceValues.0"],
      },
    })

    expect(projection.canSaveAbility).toBe(true)
    expect(projection.savableChoiceValues).toEqual({ mode: ["attribute"] })
    expect(projection.discardedChoiceIds).toEqual(["experience"])
  })
})
```

- [ ] **Step 2: Run projection tests to verify they fail**

Run:

```bash
pnpm test:run card/automation/__tests__/setup-projection.test.ts
```

Expected: FAIL because `card/automation/setup-projection.ts` does not exist.

- [ ] **Step 3: Implement setup projection helper**

Create `card/automation/setup-projection.ts` with these exported types and functions:

```ts
import type { ModifierTargetId } from "@/automation/core/types"
import type { SheetData } from "@/lib/sheet-data"
import { resolveAbilityChoices } from "./choice-resolution"
import type {
  CardAbilityIR,
  CardChoiceIR,
  CardChoiceValues,
  CardModifierTargetId,
  CardZone,
  ResolvedCardChoice,
} from "./ir-types"
import { resolveCardAutomation } from "./resolve"
import {
  buildCardAutomationSnapshot,
  type CardAutomationSnapshot,
  type CardAutomationSnapshotCard,
} from "./snapshot"

const ATTRIBUTE_LABELS: Record<ModifierTargetId, string> = {
  "agility.value": "敏捷",
  "strength.value": "力量",
  "finesse.value": "灵巧",
  "instinct.value": "本能",
  "presence.value": "风度",
  "knowledge.value": "知识",
  evasion: "闪避",
  armorMax: "护甲槽",
  minorThreshold: "轻伤阈值",
  majorThreshold: "重伤阈值",
  hpMax: "生命槽",
  stressMax: "压力槽",
  proficiency: "熟练",
}

export interface CardAutomationSetupOption {
  id: string
  label: string
}

export interface CardAutomationSetupChoice {
  choiceId: string
  label?: string
  kind: CardChoiceIR["kind"]
  cardinality: { min: number; max: number; unique: boolean }
  selectedIds: string[]
  status: ResolvedCardChoice["status"]
  options: CardAutomationSetupOption[]
}

export interface CardAutomationSetupRequirement {
  cardInstanceId: string
  cardTemplateId: string
  cardName: string
  zone: CardZone
  abilityId: string
  abilityLabel: string
  choices: CardAutomationSetupChoice[]
}

export interface ProjectCardAutomationSetupRequirementsOptions {
  cardInstanceId?: string
}

export interface ProjectCardAutomationSetupDraftInput {
  cardInstanceId: string
  abilityId: string
  draftChoiceValues: CardChoiceValues
}

export interface CardAutomationSetupDraftProjection {
  requirement?: CardAutomationSetupRequirement
  activeChoice?: CardAutomationSetupChoice
  canSaveAbility: boolean
  savableChoiceValues: CardChoiceValues
  discardedChoiceIds: string[]
  diagnostics: ReturnType<typeof resolveAbilityChoices>["diagnostics"]
}

function findSnapshotCard(
  snapshot: CardAutomationSnapshot,
  cardInstanceId: string,
): (CardAutomationSnapshotCard & { instanceId: string }) | undefined {
  return snapshot.cards.find(
    (card): card is CardAutomationSnapshotCard & { instanceId: string } =>
      card.instanceId === cardInstanceId && Boolean(card.instanceId),
  )
}

function optionsForChoice(
  sheetData: SheetData,
  snapshot: CardAutomationSnapshot,
  choice: CardChoiceIR,
): CardAutomationSetupOption[] {
  if (choice.domain.kind === "staticOptions") {
    return choice.domain.options.map((option) => ({
      id: option.id,
      label: option.label,
    }))
  }

  const targets = snapshot.selectableTargets[choice.domain.group]
  if (choice.domain.group === "attributes") {
    return targets.map((target) => ({
      id: target,
      label: ATTRIBUTE_LABELS[target] ?? target,
    }))
  }

  return targets.map((target) => {
    const match = /^experienceValues\.(\d+)$/.exec(target)
    const index = match ? Number(match[1]) : -1
    const text = index >= 0 ? sheetData.experience?.[index]?.trim() : ""
    return {
      id: target,
      label: text ? `经历 ${index + 1}：${text}` : `经历 ${index + 1}`,
    }
  })
}

function choiceReadModel(
  sheetData: SheetData,
  snapshot: CardAutomationSnapshot,
  choice: CardChoiceIR,
  resolved: ResolvedCardChoice,
): CardAutomationSetupChoice {
  return {
    choiceId: choice.id,
    label: choice.label,
    kind: choice.kind,
    cardinality: choice.cardinality,
    selectedIds: resolved.selectedIds,
    status: resolved.status,
    options: optionsForChoice(sheetData, snapshot, choice),
  }
}

function abilityRequirement(
  sheetData: SheetData,
  snapshot: CardAutomationSnapshot,
  card: CardAutomationSnapshotCard & { instanceId: string },
  ability: CardAbilityIR,
  choices: Record<string, ResolvedCardChoice>,
): CardAutomationSetupRequirement {
  return {
    cardInstanceId: card.instanceId,
    cardTemplateId: card.templateId,
    cardName: card.name,
    zone: card.zone,
    abilityId: ability.id,
    abilityLabel: ability.label,
    choices: (ability.choices ?? []).map((choice) =>
      choiceReadModel(sheetData, snapshot, choice, choices[choice.id]),
    ),
  }
}

export function projectCardAutomationSetupRequirements(
  sheetData: SheetData,
  options: ProjectCardAutomationSetupRequirementsOptions = {},
): CardAutomationSetupRequirement[] {
  const snapshot = buildCardAutomationSnapshot(sheetData)
  const resolved = resolveCardAutomation(snapshot)
  const requirements: CardAutomationSetupRequirement[] = []

  resolved.sources.forEach((source) => {
    if (options.cardInstanceId && source.cardInstanceId !== options.cardInstanceId) return
    const card = findSnapshotCard(snapshot, source.cardInstanceId)
    if (!card?.automation) return

    source.abilities.forEach((resolvedAbility) => {
      if (resolvedAbility.status !== "blocked") return
      if (!Object.values(resolvedAbility.choices).some((choice) => choice.status === "missing")) return
      const ability = card.automation?.abilities.find((candidate) => candidate.id === resolvedAbility.abilityId)
      if (!ability) return
      requirements.push(abilityRequirement(sheetData, snapshot, card, ability, resolvedAbility.choices))
    })
  })

  return requirements
}

function normalizeSavableChoiceValues(
  ability: CardAbilityIR,
  resolvedChoices: Record<string, ResolvedCardChoice>,
): { choiceValues: CardChoiceValues; discardedChoiceIds: string[] } {
  const choiceValues: CardChoiceValues = {}
  const discardedChoiceIds: string[] = []

  ;(ability.choices ?? []).forEach((choice) => {
    const resolved = resolvedChoices[choice.id]
    if (!resolved || resolved.status === "notRequired") {
      discardedChoiceIds.push(choice.id)
      return
    }
    if (resolved.selectedIds.length > 0) {
      choiceValues[choice.id] = [...resolved.selectedIds]
    }
  })

  return { choiceValues, discardedChoiceIds }
}

export function projectCardAutomationSetupDraft(
  sheetData: SheetData,
  input: ProjectCardAutomationSetupDraftInput,
): CardAutomationSetupDraftProjection {
  const snapshot = buildCardAutomationSnapshot(sheetData)
  const card = findSnapshotCard(snapshot, input.cardInstanceId)
  const ability = card?.automation?.abilities.find((candidate) => candidate.id === input.abilityId)
  if (!card || !ability) {
    return {
      canSaveAbility: false,
      savableChoiceValues: {},
      discardedChoiceIds: [],
      diagnostics: [],
    }
  }

  const resolved = resolveAbilityChoices(
    input.cardInstanceId,
    ability,
    { choiceValues: input.draftChoiceValues },
    snapshot,
  )
  const requirement = abilityRequirement(sheetData, snapshot, card, ability, resolved.choices)
  const activeChoice = requirement.choices.find(
    (choice) => choice.status === "missing" || choice.status === "invalid",
  )
  const hasErrors = resolved.diagnostics.some((diagnostic) => diagnostic.severity === "error")
  const allRequiredChoicesSatisfied = Object.values(resolved.choices).every(
    (choice) => choice.status === "valid" || choice.status === "notRequired",
  )
  const normalized = normalizeSavableChoiceValues(ability, resolved.choices)

  return {
    requirement,
    activeChoice,
    canSaveAbility: allRequiredChoicesSatisfied && !hasErrors,
    savableChoiceValues: normalized.choiceValues,
    discardedChoiceIds: normalized.discardedChoiceIds.filter(
      (choiceId) => Object.prototype.hasOwnProperty.call(input.draftChoiceValues, choiceId),
    ),
    diagnostics: resolved.diagnostics,
  }
}
```

- [ ] **Step 4: Run projection tests**

Run:

```bash
pnpm test:run card/automation/__tests__/setup-projection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add card/automation/setup-projection.ts card/automation/__tests__/setup-projection.test.ts
git commit -m "feat: project card automation setup state"
```

---

### Task 2: Result-Bearing Card Selection Actions

**Files:**
- Modify: `automation/actions/card-actions.ts`
- Modify: `automation/actions/__tests__/card-actions.test.ts`

- [ ] **Step 1: Write failing action tests**

In `automation/actions/__tests__/card-actions.test.ts`, add `projectCardAutomationSetupRequirements` behavior coverage by appending these tests inside the existing `describe("card automation actions", ...)`:

```ts
  it("selectCardIntoSlot returns setup effect for a new instance with missing choices", () => {
    const template = makeCard({ automation: choiceAutomation })
    const sheet = makeSheet({ cards: [] })

    const result = selectCardIntoSlot(sheet, "loadout", 5, template, {
      now: fixedNow,
      createInstanceId: createInstanceId("cardinst_prompt"),
    })

    expect(result.kind).toBe("success")
    if (result.kind === "success") {
      expect(result.cardInstanceId).toBe("cardinst_prompt")
      expect(result.effects).toEqual([
        { kind: "cardAutomationSetupAvailable", cardInstanceId: "cardinst_prompt" },
      ])
    }
  })

  it("selectCardIntoSlot omits setup effect when the new instance has no missing choices", () => {
    const template = makeCard({ automation: evasionBaseAutomation })
    const sheet = makeSheet({ cards: [] })

    const result = selectCardIntoSlot(sheet, "loadout", 5, template, {
      now: fixedNow,
      createInstanceId: createInstanceId("cardinst_no_prompt"),
    })

    expect(result.kind).toBe("success")
    if (result.kind === "success") {
      expect(result.cardInstanceId).toBe("cardinst_no_prompt")
      expect(result.effects).toEqual([])
    }
  })

  it("setProtectedLoadoutCardInstance returns setup effect for character choice cards", () => {
    const template = makeCard({
      type: "profession",
      automation: choiceAutomation,
    })
    const sheet = makeSheet({ cards: [] })

    const result = setProtectedLoadoutCardInstance(sheet, 0, template, {
      now: fixedNow,
      createInstanceId: createInstanceId("cardinst_character_choice_prompt"),
    })

    expect(result.kind).toBe("success")
    if (result.kind === "success") {
      expect(result.cardInstanceId).toBe("cardinst_character_choice_prompt")
      expect(result.effects).toEqual([
        {
          kind: "cardAutomationSetupAvailable",
          cardInstanceId: "cardinst_character_choice_prompt",
        },
      ])
    }
  })

  it("deleteCardInstance does not return setup prompt effects", () => {
    const instance = makeCard({
      instanceId: "cardinst_delete_prompt",
      automation: choiceAutomation,
      automationState: { version: 1, abilities: {} },
    })
    const sheet = makeSheet({
      cards: [undefined, undefined, undefined, undefined, undefined, instance] as unknown as StandardCard[],
    })

    const result = deleteCardInstance(sheet, "loadout", 5)

    expect(result.kind).toBe("success")
    if (result.kind === "success") {
      expect(result.cardInstanceId).toBeUndefined()
      expect(result.effects).toEqual([])
    }
  })
```

Also add `setProtectedLoadoutCardInstance` to the import list from `../card-actions`.

- [ ] **Step 2: Run action tests to verify they fail**

Run:

```bash
pnpm test:run automation/actions/__tests__/card-actions.test.ts
```

Expected: FAIL because success results do not expose `cardInstanceId` or `effects`.

- [ ] **Step 3: Add action result metadata**

Modify `automation/actions/card-actions.ts`:

```ts
import { projectCardAutomationSetupRequirements } from "@/card/automation/setup-projection"
```

Replace the result types and helpers with this shape:

```ts
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

function success(
  nextSheetData: SheetData,
  options: { cardInstanceId?: string; promptForSetup?: boolean } = {},
): CardAutomationActionResult {
  const sheetData = applyAutoCalculationForTargets(nextSheetData)
  const effects: CardAutomationActionEffect[] = []
  if (
    options.promptForSetup &&
    options.cardInstanceId &&
    projectCardAutomationSetupRequirements(sheetData, {
      cardInstanceId: options.cardInstanceId,
    }).length > 0
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
```

Update selection paths to capture the instantiated card before assigning:

```ts
const instance = instantiateCardTemplate(template, options.now, options.createInstanceId)
cards[index] = instance
return success(sheetDataWithZone(sheetData, zone, cards), {
  cardInstanceId: instance.instanceId,
  promptForSetup: true,
})
```

Apply the same pattern in:

- `selectCardIntoSlot`
- `replaceCardInstance`
- `setProtectedLoadoutCardInstance` when `template && !isEmptyCard(template)`

For `setProtectedLoadoutCardInstance` clearing path, return `success(..., { promptForSetup: false })`.

For `deleteCardInstance`, `moveCardInstance`, and `setCardAbilityChoiceValues`, call `success(nextSheetData)` with no prompt options.

- [ ] **Step 4: Run action tests**

Run:

```bash
pnpm test:run automation/actions/__tests__/card-actions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add automation/actions/card-actions.ts automation/actions/__tests__/card-actions.test.ts
git commit -m "feat: return card selection setup effects"
```

---

### Task 3: Result-Bearing Sheet Store Actions

**Files:**
- Modify: `lib/sheet-store.ts`
- Modify: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Write failing store tests**

In `tests/unit/modifiers/store-actions.test.ts`, add imports if needed for `StandardCard` and append tests near existing card action tests:

```ts
  it("selectCardForSlot returns the created card instance id and setup effects", () => {
    const template: StandardCard = {
      standarized: true,
      id: "choice-template",
      name: "Choice Template",
      type: "domain",
      class: "Blade",
      cardSelectDisplay: {},
      automation: {
        format: "daggerheart.card-automation.ir.v1",
        revision: "stable32:choice-template",
        abilities: [
          {
            id: "choose",
            label: "Choose",
            lifetime: { kind: "whileInLoadout" },
            choices: [
              {
                id: "mode",
                kind: "selectOne",
                cardinality: { min: 1, max: 1, unique: true },
                domain: { kind: "staticOptions", options: [{ id: "a", label: "A" }] },
              },
            ],
            effects: [],
          },
        ],
      },
    }

    const result = store().selectCardForSlot({
      zone: "loadout",
      index: 5,
      template,
    })

    expect(result.kind).toBe("success")
    if (result.kind === "success") {
      expect(result.cardInstanceId).toMatch(/^cardinst_/)
      expect(result.effects).toEqual([
        {
          kind: "cardAutomationSetupAvailable",
          cardInstanceId: result.cardInstanceId,
        },
      ])
    }
  })

  it("setCardAbilityChoiceValuesForInstance returns failure and keeps state unchanged for invalid choices", () => {
    const template: StandardCard = {
      standarized: true,
      id: "choice-template",
      name: "Choice Template",
      type: "domain",
      class: "Blade",
      cardSelectDisplay: {},
      automation: {
        format: "daggerheart.card-automation.ir.v1",
        revision: "stable32:choice-template",
        abilities: [
          {
            id: "choose",
            label: "Choose",
            lifetime: { kind: "whileInLoadout" },
            choices: [
              {
                id: "mode",
                kind: "selectOne",
                cardinality: { min: 1, max: 1, unique: true },
                domain: { kind: "staticOptions", options: [{ id: "a", label: "A" }] },
              },
            ],
            effects: [],
          },
        ],
      },
    }
    const selection = store().selectCardForSlot({
      zone: "loadout",
      index: 5,
      template,
    })
    if (selection.kind !== "success") throw new Error("selection failed")
    const before = store().sheetData

    const result = store().setCardAbilityChoiceValuesForInstance({
      cardInstanceId: selection.cardInstanceId,
      abilityId: "choose",
      choiceValues: { mode: ["missing"] },
    })

    expect(result.kind).toBe("failure")
    expect(store().sheetData).toBe(before)
  })
```

- [ ] **Step 2: Run store tests to verify they fail**

Run:

```bash
pnpm test:run tests/unit/modifiers/store-actions.test.ts
```

Expected: FAIL because the store does not expose `selectCardForSlot` or `setCardAbilityChoiceValuesForInstance`.

- [ ] **Step 3: Add store-facing result types and actions**

Modify the `SheetStore` interface in `lib/sheet-store.ts`:

```ts
import type {
  CardAutomationActionEffect,
  CardZone,
} from "@/automation/actions/card-actions"
import type { CardChoiceValues } from "@/card/automation/ir-types"
```

Add local result/input types near the store interface:

```ts
export type CardSelectionActionResult =
  | {
      kind: "success"
      cardInstanceId: string
      effects: CardAutomationActionEffect[]
    }
  | { kind: "failure"; message: string }

export interface SelectCardForSlotInput {
  zone: CardZone
  index: number
  template: StandardCard
}

export interface SetCardAbilityChoiceValuesInput {
  cardInstanceId: string
  abilityId: string
  choiceValues: CardChoiceValues
}

export type StoreActionResult =
  | { kind: "success" }
  | { kind: "failure"; message: string }
```

Add these methods to `SheetStore`:

```ts
selectCardForSlot: (input: SelectCardForSlotInput) => CardSelectionActionResult;
setCardAbilityChoiceValuesForInstance: (input: SetCardAbilityChoiceValuesInput) => StoreActionResult;
```

Change `selectCharacterChoiceCard` to return `CardSelectionActionResult`:

```ts
selectCharacterChoiceCard: (
  kind: CharacterChoiceCardKind,
  ref: SheetCardReference,
  template: StandardCard,
) => CardSelectionActionResult;
```

Implement a mapper:

```ts
function toCardSelectionActionResult(result: CardAutomationActionResult): CardSelectionActionResult {
  if (result.kind === "failure") return { kind: "failure", message: result.message }
  if (!result.cardInstanceId) {
    return { kind: "failure", message: "Card selection did not create a card instance." }
  }
  return {
    kind: "success",
    cardInstanceId: result.cardInstanceId,
    effects: result.effects,
  }
}
```

Implement `selectCardForSlot` with the Zustand pattern that captures a result outside `set`:

```ts
selectCardForSlot: (input) => {
  let output: CardSelectionActionResult = {
    kind: "failure",
    message: "Card selection did not run.",
  }

  set((state) => {
    const currentCards = input.zone === "loadout"
      ? state.sheetData.cards ?? []
      : state.sheetData.inventory_cards ?? []
    const currentCard = currentCards[input.index]
    const result = isEmptyCard(input.template)
      ? deleteCardInstance(state.sheetData, input.zone, input.index)
      : !currentCard || !currentCard.name
        ? selectCardIntoSlot(state.sheetData, input.zone, input.index, input.template)
        : replaceCardInstance(state.sheetData, input.zone, input.index, input.template)

    if (result.kind === "failure") {
      output = { kind: "failure", message: result.message }
      console.log("[Store]", result.message)
      return state
    }

    output = toCardSelectionActionResult(result)
    return { sheetData: result.sheetData }
  })

  return output
},
```

Update `updateCard` to delegate to `selectCardForSlot` for non-protected card selections but preserve `void` return:

```ts
updateCard: (index, card, isInventory) => {
  const zone: CardZone = isInventory ? "vault" : "loadout"
  if (zone === "loadout" && index < 5) {
    set((state) => {
      const result = setProtectedLoadoutCardInstance(state.sheetData, index, card)
      if (result.kind === "failure") {
        console.log("[Store]", result.message)
        return state
      }
      return { sheetData: result.sheetData }
    })
    return
  }
  get().selectCardForSlot({ zone, index, template: card })
},
```

If this store file does not currently pass `get` into the Zustand creator, update the creator signature from `create<SheetStore>()((set) => ({ ... }))` to `create<SheetStore>()((set, get) => ({ ... }))`.

Implement result-bearing `selectCharacterChoiceCard`:

```ts
selectCharacterChoiceCard: (kind, ref, template) => {
  let output: CardSelectionActionResult = {
    kind: "failure",
    message: "Character choice card selection did not run.",
  }
  set((state) => {
    const result = selectCharacterChoiceCardInSheetData(state.sheetData, kind, ref, template)
    if (result.kind === "failure") {
      output = { kind: "failure", message: result.message }
      console.log("[Store]", result.message)
      return state
    }
    output = toCardSelectionActionResult(result)
    return { sheetData: result.sheetData }
  })
  return output
},
```

Implement choice-value write:

```ts
setCardAbilityChoiceValuesForInstance: (input) => {
  let output: StoreActionResult = {
    kind: "failure",
    message: "Card ability choice update did not run.",
  }

  set((state) => {
    const result = setCardAbilityChoiceValues(
      state.sheetData,
      input.cardInstanceId,
      input.abilityId,
      input.choiceValues,
    )
    if (result.kind === "failure") {
      output = { kind: "failure", message: result.message }
      return state
    }

    output = { kind: "success" }
    return { sheetData: result.sheetData }
  })

  return output
},
```

Update `useCardActions` cache type to include `selectCardForSlot` if components will consume it through that hook. Otherwise consume `useSheetStore(state => state.selectCardForSlot)` directly in new code.

- [ ] **Step 4: Run store tests**

Run:

```bash
pnpm test:run tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sheet-store.ts tests/unit/modifiers/store-actions.test.ts
git commit -m "feat: expose result-bearing card setup actions"
```

---

### Task 4: Setup Dialog Component And Local Draft Flow

**Files:**
- Create: `components/card-automation-setup/card-automation-setup-dialog.tsx`
- Create: `components/card-automation-setup/__tests__/card-automation-setup-dialog.test.tsx`

- [ ] **Step 1: Write failing dialog tests**

Create `components/card-automation-setup/__tests__/card-automation-setup-dialog.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { SheetData } from "@/lib/sheet-data"
import { makeSheet } from "@/card/automation/__tests__/helpers"
import type { StandardCard } from "@/card/card-types"
import type { CardAutomationIR } from "@/card/automation/ir-types"
import { CardAutomationSetupDialog } from "../card-automation-setup-dialog"

const automation: CardAutomationIR = {
  format: "daggerheart.card-automation.ir.v1",
  revision: "stable32:dialog",
  abilities: [
    {
      id: "choose-mode",
      label: "Choose Mode",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "mode",
          label: "Mode",
          kind: "selectOne",
          cardinality: { min: 1, max: 1, unique: true },
          domain: {
            kind: "staticOptions",
            options: [
              { id: "a", label: "A" },
              { id: "b", label: "B" },
            ],
          },
        },
      ],
      effects: [],
    },
    {
      id: "choose-many",
      label: "Choose Many",
      lifetime: { kind: "whileInLoadout" },
      choices: [
        {
          id: "targets",
          label: "Targets",
          kind: "targetSelectMany",
          cardinality: { min: 1, max: 2, unique: true },
          domain: { kind: "modifierTargetGroup", group: "attributes" },
        },
      ],
      effects: [],
    },
  ],
}

function sheet(): SheetData {
  const card: StandardCard = {
    standarized: true,
    id: "dialog-card",
    instanceId: "cardinst_dialog",
    name: "Dialog Card",
    type: "domain",
    class: "Blade",
    cardSelectDisplay: {},
    automation,
    automationState: { version: 1, abilities: {} },
  }
  return makeSheet({ cards: [card] })
}

describe("CardAutomationSetupDialog", () => {
  it("auto-advances selectOne to save confirmation and saves one ability", () => {
    const onSaveAbility = vi.fn(() => ({ kind: "success" as const }))
    render(
      <CardAutomationSetupDialog
        open
        sheetData={sheet()}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={onSaveAbility}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "A" }))

    expect(screen.getByText("当前能力选择尚未保存")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "保存当前能力" }))

    expect(onSaveAbility).toHaveBeenCalledWith({
      cardInstanceId: "cardinst_dialog",
      abilityId: "choose-mode",
      choiceValues: { mode: ["a"] },
    })
    expect(screen.getByText("已完成并保存当前能力")).toBeInTheDocument()
  })

  it("requires explicit finish for selectMany before save confirmation", () => {
    const startingSheet = sheet()
    startingSheet.cards[0].automationState = {
      version: 1,
      abilities: { "choose-mode": { choiceValues: { mode: ["a"] } } },
    }
    render(
      <CardAutomationSetupDialog
        open
        sheetData={startingSheet}
        cardInstanceId="cardinst_dialog"
        onOpenChange={vi.fn()}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "敏捷" }))

    expect(screen.queryByRole("button", { name: "保存当前能力" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "完成当前选择" }))
    expect(screen.getByRole("button", { name: "保存当前能力" })).toBeEnabled()
  })

  it("allows returning before save and discards the current draft on close", () => {
    const onOpenChange = vi.fn()
    render(
      <CardAutomationSetupDialog
        open
        sheetData={sheet()}
        cardInstanceId="cardinst_dialog"
        onOpenChange={onOpenChange}
        onSaveAbility={vi.fn(() => ({ kind: "success" as const }))}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "A" }))
    fireEvent.click(screen.getByRole("button", { name: "返回上一步" }))
    fireEvent.click(screen.getByRole("button", { name: "B" }))
    fireEvent.click(screen.getByRole("button", { name: "取消" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
```

- [ ] **Step 2: Run dialog tests to verify they fail**

Run:

```bash
pnpm test:run components/card-automation-setup/__tests__/card-automation-setup-dialog.test.tsx
```

Expected: FAIL because the dialog component does not exist.

- [ ] **Step 3: Implement the dialog**

Create `components/card-automation-setup/card-automation-setup-dialog.tsx` with these props and state model:

```tsx
"use client"

import { useMemo, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  projectCardAutomationSetupDraft,
  projectCardAutomationSetupRequirements,
} from "@/card/automation/setup-projection"
import type { CardChoiceValues } from "@/card/automation/ir-types"
import type { SheetData } from "@/lib/sheet-data"
import type { SetCardAbilityChoiceValuesInput, StoreActionResult } from "@/lib/sheet-store"

type SetupDialogStep = "choice" | "confirmSave" | "savedTransition" | "blocked"

interface DraftFrame {
  choiceValues: CardChoiceValues
  completedChoiceIds: string[]
}

interface CardAutomationSetupDialogProps {
  open: boolean
  sheetData: SheetData
  cardInstanceId: string | null
  onOpenChange: (open: boolean) => void
  onSaveAbility: (input: SetCardAbilityChoiceValuesInput) => StoreActionResult
}
```

Implement these behaviors:

- On open/card change, start with `draft = { choiceValues: {}, completedChoiceIds: [] }` and `step = "choice"`.
- Derive requirements with `projectCardAutomationSetupRequirements(sheetData, { cardInstanceId })`.
- Pick the first requirement as current.
- Derive draft projection with `projectCardAutomationSetupDraft`.
- If the active choice has no options and `canSaveAbility === false`, render blocked message and only a close button.
- For `selectOne`, render each option as a `Button`; clicking sets `choiceValues[choiceId] = [option.id]`, pushes history, and immediately advances to confirm if `projectCardAutomationSetupDraft` has no active choice.
- For `selectMany` / `targetSelectMany`, render `Checkbox` rows. Toggling only updates draft. Show `完成当前选择` when selected count is at least `min` and less than `max`; auto-advance when selected count reaches `max`.
- `返回上一步` restores the previous `DraftFrame` and sets `step = "choice"`.
- `保存当前能力` calls `onSaveAbility({ cardInstanceId, abilityId, choiceValues: projection.savableChoiceValues })`.
- On save success, reset draft and show `已完成并保存当前能力`; if more requirements remain in the latest `sheetData` after parent rerender, `继续下一个能力` returns to `choice`. If no requirement remains, close.
- On save failure, stay open and render `保存失败，请重试。`

Use these exact Chinese strings because tests and user-facing clarity depend on them:

- `配置卡牌自动化`
- `当前能力选择尚未保存`
- `保存当前能力`
- `返回上一步`
- `完成当前选择`
- `已完成并保存当前能力`
- `继续下一个能力`
- `当前无法完成设置`
- `保存失败，请重试。`

- [ ] **Step 4: Run dialog tests**

Run:

```bash
pnpm test:run components/card-automation-setup/__tests__/card-automation-setup-dialog.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/card-automation-setup/card-automation-setup-dialog.tsx components/card-automation-setup/__tests__/card-automation-setup-dialog.test.tsx
git commit -m "feat: add card automation setup dialog"
```

---

### Task 5: Setup Prompt Orchestration And Marker

**Files:**
- Create: `components/card-automation-setup/use-card-automation-setup-prompt.tsx`
- Create: `components/card-automation-setup/card-automation-setup-marker.tsx`
- Create: `components/card-automation-setup/index.ts`
- Create: `components/card-automation-setup/__tests__/card-automation-setup-marker.test.tsx`

- [ ] **Step 1: Write failing marker test**

Create `components/card-automation-setup/__tests__/card-automation-setup-marker.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CardAutomationSetupMarker } from "../card-automation-setup-marker"

describe("CardAutomationSetupMarker", () => {
  it("renders a warning setup button for pending setup", () => {
    const onClick = vi.fn()

    render(<CardAutomationSetupMarker cardName="Setup Card" onClick={onClick} />)

    const button = screen.getByRole("button", { name: "配置 Setup Card 的卡牌自动化" })
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run marker test to verify it fails**

Run:

```bash
pnpm test:run components/card-automation-setup/__tests__/card-automation-setup-marker.test.tsx
```

Expected: FAIL because the marker component does not exist.

- [ ] **Step 3: Implement marker and hook**

Create `components/card-automation-setup/card-automation-setup-marker.tsx`:

```tsx
"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CardAutomationSetupMarkerProps {
  cardName: string
  onClick: () => void
}

export function CardAutomationSetupMarker({
  cardName,
  onClick,
}: CardAutomationSetupMarkerProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className="h-7 w-7 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
      aria-label={`配置 ${cardName} 的卡牌自动化`}
      title="需要配置卡牌自动化"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <AlertTriangle className="h-4 w-4" />
    </Button>
  )
}
```

Create `components/card-automation-setup/use-card-automation-setup-prompt.tsx`:

```tsx
"use client"

import { useCallback, useMemo, useState } from "react"
import { projectCardAutomationSetupRequirements } from "@/card/automation/setup-projection"
import type { SheetData } from "@/lib/sheet-data"
import {
  CardAutomationSetupDialog,
} from "./card-automation-setup-dialog"
import type {
  CardSelectionActionResult,
  SetCardAbilityChoiceValuesInput,
  StoreActionResult,
} from "@/lib/sheet-store"

export interface UseCardAutomationSetupPromptInput {
  sheetData: SheetData
  onSaveAbility: (input: SetCardAbilityChoiceValuesInput) => StoreActionResult
}

export function useCardAutomationSetupPrompt({
  sheetData,
  onSaveAbility,
}: UseCardAutomationSetupPromptInput) {
  const [cardInstanceId, setCardInstanceId] = useState<string | null>(null)

  const openForCard = useCallback((nextCardInstanceId: string) => {
    if (
      projectCardAutomationSetupRequirements(sheetData, {
        cardInstanceId: nextCardInstanceId,
      }).length > 0
    ) {
      setCardInstanceId(nextCardInstanceId)
    }
  }, [sheetData])

  const handleSelectionResult = useCallback((result: CardSelectionActionResult) => {
    if (result.kind !== "success") return
    if (
      result.effects.some(
        (effect) => effect.kind === "cardAutomationSetupAvailable",
      )
    ) {
      setCardInstanceId(result.cardInstanceId)
      return
    }
    openForCard(result.cardInstanceId)
  }, [openForCard])

  const dialog = useMemo(() => (
    <CardAutomationSetupDialog
      open={Boolean(cardInstanceId)}
      sheetData={sheetData}
      cardInstanceId={cardInstanceId}
      onOpenChange={(open) => {
        if (!open) setCardInstanceId(null)
      }}
      onSaveAbility={onSaveAbility}
    />
  ), [cardInstanceId, onSaveAbility, sheetData])

  return {
    openForCard,
    handleSelectionResult,
    dialog,
  }
}
```

Create `components/card-automation-setup/index.ts`:

```ts
export { CardAutomationSetupDialog } from "./card-automation-setup-dialog"
export { CardAutomationSetupMarker } from "./card-automation-setup-marker"
export { useCardAutomationSetupPrompt } from "./use-card-automation-setup-prompt"
```

- [ ] **Step 4: Run marker test**

Run:

```bash
pnpm test:run components/card-automation-setup/__tests__/card-automation-setup-marker.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/card-automation-setup
git commit -m "feat: add card automation setup prompt orchestration"
```

---

### Task 6: Wire Card Selection Entrances And Visible Markers

**Files:**
- Modify: `components/character-sheet-page-two-sections/card-deck-section.tsx`
- Modify: `components/character-sheet-page-two.tsx`
- Modify: `components/home-client-app.tsx`
- Modify: `components/character-sheet.tsx`
- Modify: `tests/unit/character-sheet-equipment.test.tsx` or create `tests/unit/card-automation-setup-wiring.test.tsx`

- [ ] **Step 1: Write failing wiring tests**

Create `tests/unit/card-automation-setup-wiring.test.tsx` with focused tests around store/action wiring rather than full visual layout:

```tsx
import { describe, expect, it } from "vitest"
import type { StandardCard } from "@/card/card-types"
import { useSheetStore } from "@/lib/sheet-store"
import { projectCardAutomationSetupRequirements } from "@/card/automation/setup-projection"

function setupTemplate(): StandardCard {
  return {
    standarized: true,
    id: "setup-template",
    name: "Setup Template",
    type: "domain",
    class: "Blade",
    cardSelectDisplay: {},
    automation: {
      format: "daggerheart.card-automation.ir.v1",
      revision: "stable32:wiring",
      abilities: [
        {
          id: "choose",
          label: "Choose",
          lifetime: { kind: "whileInLoadout" },
          choices: [
            {
              id: "mode",
              kind: "selectOne",
              cardinality: { min: 1, max: 1, unique: true },
              domain: {
                kind: "staticOptions",
                options: [{ id: "a", label: "A" }],
              },
            },
          ],
          effects: [],
        },
      ],
    },
  }
}

describe("card automation setup wiring", () => {
  it("ordinary card selection creates a visible pending setup requirement", () => {
    const result = useSheetStore.getState().selectCardForSlot({
      zone: "loadout",
      index: 5,
      template: setupTemplate(),
    })

    expect(result.kind).toBe("success")
    if (result.kind !== "success") return

    expect(projectCardAutomationSetupRequirements(useSheetStore.getState().sheetData, {
      cardInstanceId: result.cardInstanceId,
    })).toHaveLength(1)
  })

  it("character choice card selection creates a visible pending setup requirement", () => {
    const template = {
      ...setupTemplate(),
      type: "profession" as const,
      class: "Blade",
    }

    const result = useSheetStore.getState().selectCharacterChoiceCard(
      "profession",
      { id: template.id, name: template.name },
      template,
    )

    expect(result.kind).toBe("success")
    if (result.kind !== "success") return

    expect(projectCardAutomationSetupRequirements(useSheetStore.getState().sheetData, {
      cardInstanceId: result.cardInstanceId,
    })).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run wiring tests to verify they fail or expose missing resets**

Run:

```bash
pnpm test:run tests/unit/card-automation-setup-wiring.test.tsx
```

Expected before implementation: FAIL if store actions are not wired from Task 3, or PASS after Task 3. If it passes after Task 3, keep it as regression coverage for entrance semantics.

- [ ] **Step 3: Wire `CardDeckSection`**

In `components/character-sheet-page-two-sections/card-deck-section.tsx`:

- Import:

```ts
import {
  CardAutomationSetupMarker,
  useCardAutomationSetupPrompt,
} from "@/components/card-automation-setup"
import { projectCardAutomationSetupRequirements } from "@/card/automation/setup-projection"
```

- Read store actions:

```ts
const selectCardForSlot = useSheetStore(state => state.selectCardForSlot)
const setCardAbilityChoiceValuesForInstance = useSheetStore(state => state.setCardAbilityChoiceValuesForInstance)
```

- Initialize prompt:

```ts
const setupPrompt = useCardAutomationSetupPrompt({
  sheetData: formData,
  onSaveAbility: setCardAbilityChoiceValuesForInstance,
})
```

- Replace `updateCard(selectedCardIndex, card, activeDeck === 'inventory')` in `handleCardSelect`:

```ts
const result = selectCardForSlot({
  zone: activeDeck === "inventory" ? "vault" : "loadout",
  index: selectedCardIndex,
  template: card,
})
setupPrompt.handleSelectionResult(result)
```

- Render `{setupPrompt.dialog}` near the existing `CardSelectionModal` and `CardInstanceAuditDialog`.
- When rendering each card, compute marker visibility:

```ts
const setupRequirementCount = standardCard.instanceId
  ? projectCardAutomationSetupRequirements(formData, {
      cardInstanceId: standardCard.instanceId,
    }).length
  : 0
```

- Add marker near existing card controls:

```tsx
{standardCard.instanceId && setupRequirementCount > 0 && (
  <CardAutomationSetupMarker
    cardName={standardCard.name}
    onClick={() => setupPrompt.openForCard(standardCard.instanceId!)}
  />
)}
```

- [ ] **Step 4: Wire `CharacterSheetPageTwo` upgrade modals**

In `components/character-sheet-page-two.tsx`:

- Replace `const updateCard = useSheetStore(state => state.updateCard)` with:

```ts
const selectCardForSlot = useSheetStore(state => state.selectCardForSlot)
const setCardAbilityChoiceValuesForInstance = useSheetStore(state => state.setCardAbilityChoiceValuesForInstance)
```

- Initialize prompt:

```ts
const setupPrompt = useCardAutomationSetupPrompt({
  sheetData: safeFormData,
  onSaveAbility: setCardAbilityChoiceValuesForInstance,
})
```

- Update `handleCardChange`:

```ts
const handleCardChange = (index: number, card: StandardCard) => {
  const isEmptyCard = !card || (!card.name && (!card.type || card.type === "unknown"))
  if (!isEmptyCard) {
    console.log(`[handleCardChange] 更新聚焦卡牌 #${index}:`, card)
  }

  const result = selectCardForSlot({
    zone: "loadout",
    index,
    template: card,
  })
  setupPrompt.handleSelectionResult(result)
}
```

- Render `{setupPrompt.dialog}` in the returned fragment next to existing modals.

- [ ] **Step 5: Wire `HomeClientApp` legacy card modal**

In `components/home-client-app.tsx`:

- Replace `updateCard` usage for selection with `selectCardForSlot`.
- Initialize `useCardAutomationSetupPrompt` with current `formData`.
- In `handleCardSelect`, call:

```ts
const result = selectCardForSlot({
  zone: pendingCardIsInventory ? "vault" : "loadout",
  index: pendingCardIndex,
  template: card,
})
setupPrompt.handleSelectionResult(result)
```

- Keep the existing success notification after a successful result:

```ts
if (result.kind === "success") {
  showFadeNotification({
    message: `卡牌已添加到${pendingCardIsInventory ? "库存" : "聚焦"}卡组`,
    type: "success",
  })
}
```

- Render `{setupPrompt.dialog}` once in the component.

- [ ] **Step 6: Wire Character Choice Card selection**

In `components/character-sheet.tsx`:

- Initialize setup prompt:

```ts
const setCardAbilityChoiceValuesForInstance = useSheetStore(state => state.setCardAbilityChoiceValuesForInstance)
const setupPrompt = useCardAutomationSetupPrompt({
  sheetData: formData,
  onSaveAbility: setCardAbilityChoiceValuesForInstance,
})
```

- After each `selectCharacterChoiceCard(...)` call, capture the result and pass it to `setupPrompt.handleSelectionResult(result)`.

Example:

```ts
const result = selectCharacterChoiceCard(
  kind,
  { id: ancestryCard.id, name: ancestryCard.name },
  ancestryCard,
)
setupPrompt.handleSelectionResult(result)
```

- Keep `clearCharacterChoiceCard(...)` unchanged; do not trigger setup prompt for clears.
- Render `{setupPrompt.dialog}` in the component fragment.
- If protected slot cards are visibly rendered in this component, render `CardAutomationSetupMarker` beside those visible cards using the same `projectCardAutomationSetupRequirements` check from `CardDeckSection`.

- [ ] **Step 7: Run wiring tests**

Run:

```bash
pnpm test:run tests/unit/card-automation-setup-wiring.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/character-sheet-page-two-sections/card-deck-section.tsx components/character-sheet-page-two.tsx components/home-client-app.tsx components/character-sheet.tsx tests/unit/card-automation-setup-wiring.test.tsx
git commit -m "feat: wire card automation setup prompts"
```

---

### Task 7: Final Verification And Regression Pass

**Files:**
- Check: all modified files from Tasks 1-6.

- [ ] **Step 1: Run focused automation tests**

Run:

```bash
pnpm test:run card/automation/__tests__/setup-projection.test.ts automation/actions/__tests__/card-actions.test.ts tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused UI tests**

Run:

```bash
pnpm test:run components/card-automation-setup/__tests__/card-automation-setup-dialog.test.tsx components/card-automation-setup/__tests__/card-automation-setup-marker.test.tsx tests/unit/card-automation-setup-wiring.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run broader unit suite**

Run:

```bash
pnpm test:unit
```

Expected: PASS.

- [ ] **Step 4: Run build**

Run:

```bash
pnpm build
```

Expected: PASS. Do not start `pnpm dev` unless the user explicitly asks.

- [ ] **Step 5: Stop on verification failure**

If any command in this task fails, do not make a generic verification-fix commit. Add a new focused task to this plan that names the exact failing files, writes the failing assertion or type error in the step, applies the exact fix, reruns the failed command, and commits that focused fix with a concrete file list.

Expected when no failures occur: no files change in this step.

---

## Self-Review

**Spec coverage:**

- Card acquisition remains independent from setup: Tasks 2, 3, and 6 select cards before prompting.
- Immediate prompt after ordinary and Character Choice selection: Tasks 3, 5, and 6.
- Cancel keeps Card Instance and discards draft: Task 4.
- Per-card later setup marker: Tasks 5 and 6.
- Setup writes complete ability-level `choiceValues`: Tasks 1, 3, and 4.
- No saved-choice reconfiguration in first version: Task 4 only opens missing requirements.
- Invalid saved choices excluded from setup marker: Task 1 projects missing requirements only.
- No UI callback from resolver or `applyAutoCalculationForTargets`: Tasks 2 and 5 use post-action result/effects.
- Character Choice Cards included in first version: Tasks 2, 3, and 6.
- Setup draft uses shared choice resolution: Task 1.

**Red-flag scan:** This plan uses concrete filenames, commands, expected outcomes, type names, and user-facing strings. It avoids deferred implementation gaps.

**Type consistency:** `CardSelectionActionResult`, `SetCardAbilityChoiceValuesInput`, and `StoreActionResult` are defined in Task 3 before React code consumes them in Tasks 4-6. `projectCardAutomationSetupRequirements` and `projectCardAutomationSetupDraft` are defined in Task 1 before later tasks use them.
