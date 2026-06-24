# Card Automation Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 card automation so card instances can carry normalized automation IR, derive requirements/diagnostics/card-sourced modifier contributions inside the existing automatic-calculation boundary, and cover the confirmed builtin-base and Void1.5 fixture matrix.

**Architecture:** External card packs and editor drafts carry `CardAutomationDefinition`; import/editor validation compile it through one shared compiler into normalized `CardAutomationIR`. Installed templates and character sheet card instances store compiled IR, while the runtime resolver remains pure and projects requirements, diagnostics, and card-sourced contributions from instance IR plus snapshot plus `CardAbilityState`.

**Tech Stack:** TypeScript, Next.js, Zustand, Vitest, AJV-style JSON Schema, existing modifier automation core.

---

## Required Reading

Read these before executing Task 1:

- `AGENTS.md`
- `CONTEXT.md`
- `docs/contexts/modifiers/CONTEXT.md`
- `docs/contexts/content-pack-import/CONTEXT.md`
- `docs/architecture/character-data.md`
- `docs/architecture/storage-boundaries.md`
- `docs/architecture/ui-business-boundaries.md`
- `docs/architecture/testing.md`
- `docs/superpowers/specs/2026-06-21-card-automation-dsl-phase-1-design.md`
- `docs/superpowers/specs/2026-06-22-card-automation-phase-1-fixture-matrix.md`
- `docs/superpowers/specs/2026-06-22-card-automation-implementation-planning-notes.md`

## Non-Negotiable Constraints

- Do not infer automation from card prose.
- Do not run card automation outside the automatic-calculation boundary.
- Do not write card automation output into `userModifierContributions`.
- Do not persist calculated card-sourced contributions.
- Do not let resolver/projectors write `sheetData`, card zone, or choice state.
- Do not introduce card lifecycle effects into IR.
- Do not auto-refresh instance IR from templates.
- Do not generate automation IR during save migration.
- Do not start `pnpm dev` or another long-running server.

## File Structure

Create these new files:

- `card/automation/compiler-diagnostics.ts`: compile/import-facing automation diagnostic codes and helpers.
- `card/automation/runtime-diagnostics.ts`: runtime card automation diagnostic codes and helpers derived from sheet state.
- `card/automation/limits.ts`: Phase 1 structural limits.
- `card/automation/ir-types.ts`: normalized IR and runtime state TypeScript types.
- `card/automation/definition-types.ts`: external `CardAutomationDefinition` and low-level definition types.
- `card/automation/definition-schema.ts`: strict JSON schema fragments for card-pack v1 `automation`.
- `card/automation/revision.ts`: canonical stringify and revision hash for normalized IR.
- `card/automation/normalize-definition.ts`: Definition -> normalized IR compiler.
- `card/automation/validate-ir.ts`: normalized IR validation.
- `card/automation/compile-definition.ts`: single public compile entry used by import/editor/builtin/tests.
- `card/automation/card-getters.ts`: semantic getter/matcher layer over `StandardCard`.
- `card/automation/snapshot.ts`: `CardAutomationSnapshot` builder.
- `card/automation/choice-resolution.ts`: raw `choiceValues` -> resolved choice read model.
- `card/automation/value-evaluator.ts`: pure `CardValueIR` evaluation.
- `card/automation/condition-evaluator.ts`: pure `CardConditionIR` evaluation.
- `card/automation/resolve.ts`: pure `resolveCardAutomation`.
- `card/automation/project-requirements.ts`: `ResolvedCardAutomation` -> requirements.
- `card/automation/project-diagnostics.ts`: `ResolvedCardAutomation` -> runtime diagnostics.
- `card/automation/project-contributions.ts`: `ResolvedCardAutomation` -> card contribution facts.
- `automation/card/provider.ts`: card provider integration into modifier registry.
- `automation/card/contribution-utils.ts`: card contribution sanitizer/converter helpers.
- `automation/actions/card-actions.ts`: modifier-aware card instance and choice intents.
- `card/automation/__tests__/definition-compiler.test.ts`
- `card/automation/__tests__/helpers.ts`
- `card/automation/__tests__/resolver.test.ts`
- `card/automation/__tests__/fixture-matrix.test.ts`
- `automation/card/__tests__/provider.test.ts`
- `automation/actions/__tests__/card-actions.test.ts`

Modify these existing files:

- `card/card-types.ts`: add optional instance automation fields to `StandardCard` / `ExtendedStandardCard`.
- `card/import/card-pack-v1.schema.ts`: add per-card optional `automation` schema.
- `card/import/types.ts`: accept source Definition in v1 card items and carry compiled IR in dry-run cards.
- `card/import/import-pipeline.ts`: compile automation after structural validation and before semantic validation diagnostics are finalized.
- `card/import/semantic-validation.ts`: surface automation compiler diagnostics.
- `card/packs/storage-types.ts`: store compiled template IR.
- `card/packs/legacy-storage-format-adapter.ts`: preserve compiled template IR during storage projection.
- `app/card-editor/types/index.ts`: preserve raw Definition on editor draft cards.
- `app/card-editor/utils/import-export.ts`: round-trip Definition through editor import/export.
- `app/card-editor/services/*`: include automation compiler diagnostics in editor validation without writing compiled IR to draft.
- `lib/sheet-schema-version.ts`: bump current schema version from 2 to 3.
- `lib/sheet-data-migration.ts`: add idempotent card instance id migration.
- `lib/character-data-validator.ts`: accept optional instance automation fields.
- `lib/sheet-data.ts`: include optional card automation fields through `StandardCard`.
- `lib/sheet-store.ts`: expose card action wrappers and route card-changing actions through card automation boundary.
- `components/character-sheet-page-two.tsx`: stop direct card array writes and call store card actions.
- `automation/core/types.ts`: add `ModifierSourceType` `"card"`.
- `automation/core/registry.ts`: collect card provider entries.
- `automation/core/target-sync.ts`: card entries must participate in full target universe through registry.
- `data/cards/builtin-base.json`: add low-level Definition for confirmed builtin fixture cards.

## Task 1: Card Automation Type Contracts

**Files:**

- Create: `card/automation/limits.ts`
- Create: `card/automation/compiler-diagnostics.ts`
- Create: `card/automation/runtime-diagnostics.ts`
- Create: `card/automation/ir-types.ts`
- Create: `card/automation/definition-types.ts`
- Create: `card/automation/__tests__/definition-compiler.test.ts`

- [ ] **Step 1: Write type-level smoke tests for exported constants and discriminants**

Add this to `card/automation/__tests__/definition-compiler.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { CARD_AUTOMATION_PHASE_1_LIMITS } from "../limits"
import { CARD_AUTOMATION_IR_FORMAT, CARD_AUTOMATION_DEFINITION_FORMAT } from "../ir-types"
import type { CardAutomationDefinition } from "../definition-types"

describe("card automation type contracts", () => {
  it("exports stable phase 1 limits", () => {
    expect(CARD_AUTOMATION_PHASE_1_LIMITS).toEqual({
      maxAbilitiesPerCard: 8,
      maxChoicesPerAbility: 8,
      maxEffectsPerAbility: 32,
      maxNestedEffectDepth: 4,
      maxValueExpressionDepth: 6,
      maxConditionDepth: 6,
      maxExpandedContributionsPerAbility: 32,
    })
  })

  it("keeps definition and IR formats distinct", () => {
    expect(CARD_AUTOMATION_DEFINITION_FORMAT).toBe("daggerheart.card-automation.definition.v1")
    expect(CARD_AUTOMATION_IR_FORMAT).toBe("daggerheart.card-automation.ir.v1")
  })

  it("allows low-level definition wrapper without revision", () => {
    const definition: CardAutomationDefinition = {
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "simiah-nimble",
            label: "灵活",
            effects: [{ kind: "emitModifier", target: "evasion", value: 1 }],
          },
        ],
      },
    }

    expect(definition).not.toHaveProperty("revision")
    expect(definition.body).not.toHaveProperty("format")
  })
})
```

- [ ] **Step 2: Run the smoke tests and verify they fail**

Run: `pnpm test:run card/automation/__tests__/definition-compiler.test.ts`

Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Add Phase 1 limits**

Create `card/automation/limits.ts`:

```ts
export const CARD_AUTOMATION_PHASE_1_LIMITS = {
  maxAbilitiesPerCard: 8,
  maxChoicesPerAbility: 8,
  maxEffectsPerAbility: 32,
  maxNestedEffectDepth: 4,
  maxValueExpressionDepth: 6,
  maxConditionDepth: 6,
  maxExpandedContributionsPerAbility: 32,
} as const
```

- [ ] **Step 4: Add separated diagnostics contracts**

Create `card/automation/compiler-diagnostics.ts`:

```ts
export type CardAutomationCompilerDiagnosticSeverity = "error" | "warning"

export type CardAutomationCompilerDiagnosticCode =
  | "UNSUPPORTED_AUTOMATION_FORMAT"
  | "INVALID_AUTOMATION_DEFINITION"
  | "INVALID_AUTOMATION_IR"
  | "AUTOMATION_LIMIT_EXCEEDED"

export interface CardAutomationCompilerDiagnostic {
  severity: CardAutomationCompilerDiagnosticSeverity
  code: CardAutomationCompilerDiagnosticCode
  message: string
  path?: string
  value?: unknown
}

export function cardAutomationCompilerError(
  code: CardAutomationCompilerDiagnosticCode,
  message: string,
  details: Omit<CardAutomationCompilerDiagnostic, "severity" | "code" | "message"> = {},
): CardAutomationCompilerDiagnostic {
  return { severity: "error", code, message, ...details }
}
```

Create `card/automation/runtime-diagnostics.ts`:

```ts
export type CardAutomationRuntimeDiagnosticSeverity = "error" | "warning"

export type CardAutomationRuntimeDiagnosticCode =
  | "INVALID_ABILITY_STATE"
  | "MISSING_REQUIRED_CHOICE"
  | "INVALID_CHOICE_VALUE"
  | "INVALID_TARGET"
  | "VALUE_EVALUATION_FAILED"
  | "MISSING_INSTANCE_ID"
  | "MISSING_INSTANCE_AUTOMATION"
  | "INVALID_INSTANCE_AUTOMATION_IR"
  | "TEMPLATE_AUTOMATION_DRIFT"
  | "TEMPLATE_AUTOMATION_MISSING"
  | "ORPHAN_ABILITY_STATE"
  | "MULTIPLE_ACTIVE_CHOICES"

export interface CardAutomationRuntimeDiagnostic {
  severity: CardAutomationRuntimeDiagnosticSeverity
  code: CardAutomationRuntimeDiagnosticCode
  message: string
  cardInstanceId?: string
  abilityId?: string
  choiceId?: string
  effectId?: string
}

export function cardAutomationRuntimeError(
  code: CardAutomationRuntimeDiagnosticCode,
  message: string,
  details: Omit<CardAutomationRuntimeDiagnostic, "severity" | "code" | "message"> = {},
): CardAutomationRuntimeDiagnostic {
  return { severity: "error", code, message, ...details }
}

export function cardAutomationRuntimeWarning(
  code: CardAutomationRuntimeDiagnosticCode,
  message: string,
  details: Omit<CardAutomationRuntimeDiagnostic, "severity" | "code" | "message"> = {},
): CardAutomationRuntimeDiagnostic {
  return { severity: "warning", code, message, ...details }
}
```

- [ ] **Step 5: Add normalized IR contracts**

Create `card/automation/ir-types.ts` with the exact discriminated unions from `docs/superpowers/specs/2026-06-21-card-automation-dsl-phase-1-design.md`, including:

```ts
import type { ModifierTargetId } from "@/automation/core/types"
import type { CardAutomationRuntimeDiagnostic } from "./runtime-diagnostics"

export const CARD_AUTOMATION_IR_FORMAT = "daggerheart.card-automation.ir.v1" as const
export const CARD_AUTOMATION_DEFINITION_FORMAT = "daggerheart.card-automation.definition.v1" as const

export type CardZone = "loadout" | "vault"
export type CardTier = "1" | "2" | "3" | "4"
export type CardAttributeKey = "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"
export type CardAutomationCardType = "profession" | "ancestry" | "community" | "subclass" | "domain" | "variant"
export type CardSelectableTargetGroupId = "attributes" | "experiences"
export type CardModifierTargetId = ModifierTargetId

export interface CardAutomationIR {
  format: typeof CARD_AUTOMATION_IR_FORMAT
  revision: string
  abilities: CardAbilityIR[]
}

export interface CardAbilityIR {
  id: string
  label: string
  lifetime: CardLifetimeIR
  choices?: CardChoiceIR[]
  when?: CardConditionIR
  effects: CardEffectIR[]
}

export type CardLifetimeIR =
  | { kind: "whileInLoadout" }
  | { kind: "permanentOnceClaimed" }

export type CardChoiceIR = CardStaticChoiceIR | CardTargetChoiceIR

export interface CardChoiceBaseIR {
  id: string
  label?: string
  requiredWhen?: CardConditionIR
  cardinality: { min: number; max: number; unique: boolean }
}

export type CardStaticChoiceIR = CardChoiceBaseIR & {
  kind: "selectOne" | "selectMany"
  domain: { kind: "staticOptions"; options: CardChoiceOptionIR[] }
}

export type CardTargetChoiceIR = CardChoiceBaseIR & {
  kind: "targetSelectMany"
  domain: { kind: "modifierTargetGroup"; group: CardSelectableTargetGroupId }
}

export interface CardChoiceOptionIR {
  id: string
  label: string
  effects?: CardOptionEffectIR[]
}

export type CardValueIR =
  | number
  | { kind: "readTarget"; target: CardModifierTargetId }
  | { kind: "level" }
  | { kind: "tier" }
  | { kind: "proficiency" }
  | { kind: "attribute"; attribute: CardAttributeKey }
  | { kind: "add"; values: CardValueIR[] }
  | { kind: "subtract"; left: CardValueIR; right: CardValueIR }
  | { kind: "multiply"; values: CardValueIR[] }
  | { kind: "divide"; left: CardValueIR; right: CardValueIR }
  | { kind: "floor"; value: CardValueIR }
  | { kind: "ceil"; value: CardValueIR }
  | { kind: "round"; value: CardValueIR }
  | { kind: "min"; values: CardValueIR[] }
  | { kind: "max"; values: CardValueIR[] }
  | { kind: "valueByTier"; values: Record<CardTier, CardValueIR> }

export type CardConditionIR =
  | { kind: "all"; conditions: [CardConditionIR, ...CardConditionIR[]] }
  | { kind: "any"; conditions: [CardConditionIR, ...CardConditionIR[]] }
  | { kind: "not"; condition: CardConditionIR }
  | { kind: "cardCount"; zone: CardZone | "any"; match: CardMatchIR; atLeast?: number; exactly?: number }
  | { kind: "equipmentSlotEmpty"; slot: "armor" | "primaryWeapon" | "secondaryWeapon" }
  | { kind: "equipmentSlotFilled"; slot: "armor" | "primaryWeapon" | "secondaryWeapon" }
  | { kind: "choiceEquals"; choiceId: string; valueId: string }
  | { kind: "choiceIncludes"; choiceId: string; valueId: string }

export interface CardMatchIR {
  type?: CardAutomationCardType
  classification?: string
  level?: number
  variantType?: string
  variantSubCategory?: string
}

export type CardEffectIR =
  | CardContributionEffectIR
  | CardConditionalEffectIR
  | CardSelectedOptionEffectIR
  | CardSelectedTargetEffectIR

export type CardOptionEffectIR = CardContributionEffectIR | CardOptionConditionalEffectIR

export type CardContributionEffectIR =
  | { kind: "emitModifier"; id: string; target: CardModifierTargetId; value: CardValueIR; label?: string }
  | { kind: "emitBase"; id: string; target: CardModifierTargetId; value: CardValueIR; label?: string }

export interface CardConditionalEffectIR {
  kind: "emitWhen"
  id?: string
  when: CardConditionIR
  effects: CardEffectIR[]
}

export interface CardOptionConditionalEffectIR {
  kind: "emitWhen"
  id?: string
  when: CardConditionIR
  effects: CardContributionEffectIR[]
}

export interface CardSelectedOptionEffectIR {
  kind: "emitEachSelectedOptionEffect"
  id?: string
  choiceId: string
}

export interface CardSelectedTargetEffectIR {
  kind: "emitEachSelectedTarget"
  id: string
  choiceId: string
  value: CardValueIR
  label?: string
}

export type CardChoiceValues = Record<string, string[]>

export interface CardAbilityState {
  choiceValues?: CardChoiceValues
}

export interface CardInstanceAutomationState {
  version: 1
  abilities?: Record<string, CardAbilityState>
}

export interface CardAutomationSourceSnapshot {
  templateId: string
  packId?: string
  templateAutomationRevision?: string
  copiedAt?: string
}

export interface ResolvedCardAutomation {
  sources: ResolvedCardAutomationSource[]
  diagnostics: CardAutomationRuntimeDiagnostic[]
}

export interface ResolvedCardAutomationSource {
  cardInstanceId: string
  cardTemplateId: string
  cardName: string
  zone: CardZone
  abilities: ResolvedCardAbility[]
}

export interface ResolvedCardAbility {
  abilityId: string
  abilityLabel: string
  lifetime: CardLifetimeIR
  status: "ready" | "inactive" | "blocked" | "invalid"
  choices: Record<string, ResolvedCardChoice>
  effects: ResolvedCardEffect[]
  diagnostics: CardAutomationRuntimeDiagnostic[]
}

export interface ResolvedCardChoice {
  choiceId: string
  kind: CardChoiceIR["kind"]
  status: "notRequired" | "missing" | "valid" | "invalid"
  selectedIds: string[]
  selectedOptions?: CardChoiceOptionIR[]
  selectedTargets?: CardModifierTargetId[]
  diagnostics: CardAutomationRuntimeDiagnostic[]
}

export interface ResolvedCardEffect {
  effectId: string
  status: "ready" | "blocked" | "skipped" | "invalid"
  contribution?: CardModifierContribution
  diagnostics: CardAutomationRuntimeDiagnostic[]
}

export interface CardModifierContribution {
  id: string
  kind: "base" | "modifier"
  target: CardModifierTargetId
  value: number
  label?: string
  source: CardModifierSourceIdentity
}

export interface CardModifierSourceIdentity {
  type: "card"
  cardInstanceId: string
  cardTemplateId: string
  cardName: string
  abilityId: string
  abilityLabel: string
  zone: CardZone
  effectId: string
  packId?: string
}
```

- [ ] **Step 6: Add Definition contracts**

Create `card/automation/definition-types.ts`:

```ts
import type {
  CardAbilityIR,
  CardConditionIR,
  CardContributionEffectIR,
  CardEffectIR,
  CardOptionConditionalEffectIR,
  CardSelectedOptionEffectIR,
  CardSelectedTargetEffectIR,
  CARD_AUTOMATION_DEFINITION_FORMAT,
} from "./ir-types"

export interface CardAutomationDefinition {
  format: typeof CARD_AUTOMATION_DEFINITION_FORMAT
  mode: "lowLevel"
  body: CardAutomationLowLevelDefinition
}

export interface CardAutomationLowLevelDefinition {
  abilities: CardAutomationLowLevelAbilityDefinition[]
}

export type CardAutomationLowLevelAbilityDefinition =
  Omit<CardAbilityIR, "lifetime" | "effects"> & {
    lifetime?: CardAbilityIR["lifetime"]
    effects: CardAutomationLowLevelEffectDefinition[]
  }

export type CardAutomationLowLevelEffectDefinition =
  | CardAutomationLowLevelContributionEffectDefinition
  | CardAutomationLowLevelConditionalEffectDefinition
  | CardAutomationLowLevelSelectedOptionEffectDefinition
  | CardAutomationLowLevelSelectedTargetEffectDefinition

export type CardAutomationLowLevelOptionEffectDefinition =
  | CardAutomationLowLevelContributionEffectDefinition
  | CardAutomationLowLevelOptionConditionalEffectDefinition

export type CardAutomationLowLevelContributionEffectDefinition =
  Omit<CardContributionEffectIR, "id"> & { id?: string }

export type CardAutomationLowLevelConditionalEffectDefinition =
  Omit<Extract<CardEffectIR, { kind: "emitWhen" }>, "effects"> & {
    when: CardConditionIR
    effects: CardAutomationLowLevelEffectDefinition[]
  }

export type CardAutomationLowLevelOptionConditionalEffectDefinition =
  Omit<CardOptionConditionalEffectIR, "effects"> & {
    when: CardConditionIR
    effects: CardAutomationLowLevelContributionEffectDefinition[]
  }

export type CardAutomationLowLevelSelectedOptionEffectDefinition =
  CardSelectedOptionEffectIR

export type CardAutomationLowLevelSelectedTargetEffectDefinition =
  Omit<CardSelectedTargetEffectIR, "id"> & { id?: string }
```

Low-level Definition may omit effect ids only in contribution effects and selected-target effects. Normalized IR must contain ids for every contribution-producing effect.

- [ ] **Step 7: Run the smoke tests**

Run: `pnpm test:run card/automation/__tests__/definition-compiler.test.ts`

Expected: PASS for the type contract tests.

- [ ] **Step 8: Commit Task 1**

```bash
git add card/automation
git commit -m "feat: add card automation type contracts"
```

## Task 2: Shared Definition Compiler And IR Validation

**Files:**

- Create: `card/automation/definition-schema.ts`
- Create: `card/automation/revision.ts`
- Create: `card/automation/normalize-definition.ts`
- Create: `card/automation/validate-ir.ts`
- Create: `card/automation/compile-definition.ts`
- Modify: `card/automation/__tests__/definition-compiler.test.ts`

- [ ] **Step 1: Add compiler behavior tests**

Append these cases to `card/automation/__tests__/definition-compiler.test.ts`:

```ts
import { compileCardAutomationDefinition } from "../compile-definition"

describe("card automation compiler", () => {
  it("normalizes low-level definition into revisioned IR", () => {
    const result = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "simiah-nimble",
            label: "灵活",
            effects: [{ kind: "emitModifier", target: "evasion", value: 1 }],
          },
        ],
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ir.format).toBe("daggerheart.card-automation.ir.v1")
    expect(result.ir.revision).toMatch(/^stable32:/)
    expect(result.ir.abilities[0].lifetime).toEqual({ kind: "whileInLoadout" })
    expect(result.ir.abilities[0].effects[0]).toMatchObject({
      id: "effect-1",
      kind: "emitModifier",
      target: "evasion",
      value: 1,
    })
  })

  it("rejects definition body carrying internal IR markers", () => {
    const result = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        format: "daggerheart.card-automation.ir.v1",
        abilities: [],
      } as never,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ severity: "error", code: "INVALID_AUTOMATION_DEFINITION" }),
    )
  })

  it("rejects missing tier keys in normalized valueByTier", () => {
    const result = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "bad-tier",
            label: "Bad Tier",
            effects: [
              {
                kind: "emitModifier",
                target: "minorThreshold",
                value: { kind: "valueByTier", values: { "1": 1, "2": 2, "3": 3 } },
              },
            ],
          },
        ],
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ severity: "error", code: "INVALID_AUTOMATION_IR" }),
    )
  })

  it("rejects parallel active choice chains during IR validation", () => {
    const result = compileCardAutomationDefinition({
      format: "daggerheart.card-automation.definition.v1",
      mode: "lowLevel",
      body: {
        abilities: [
          {
            id: "bad-choices",
            label: "Bad Choices",
            choices: [
              {
                id: "mode",
                kind: "selectOne",
                cardinality: { min: 1, max: 1, unique: true },
                domain: {
                  kind: "staticOptions",
                  options: [{ id: "advanced", label: "Advanced" }],
                },
              },
              {
                id: "attribute",
                kind: "targetSelectMany",
                requiredWhen: { kind: "choiceEquals", choiceId: "mode", valueId: "advanced" },
                cardinality: { min: 1, max: 1, unique: true },
                domain: { kind: "modifierTargetGroup", group: "attributes" },
              },
              {
                id: "experience",
                kind: "targetSelectMany",
                requiredWhen: { kind: "choiceEquals", choiceId: "mode", valueId: "advanced" },
                cardinality: { min: 1, max: 1, unique: true },
                domain: { kind: "modifierTargetGroup", group: "experiences" },
              },
            ],
            effects: [],
          },
        ],
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ severity: "error", code: "INVALID_AUTOMATION_IR" }),
    )
  })
})
```

- [ ] **Step 2: Run compiler tests and verify they fail**

Run: `pnpm test:run card/automation/__tests__/definition-compiler.test.ts`

Expected: FAIL because compiler modules do not exist.

- [ ] **Step 3: Implement strict definition schema constants**

Create `card/automation/definition-schema.ts` exporting:

```ts
export const cardAutomationDefinitionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["format", "mode", "body"],
  properties: {
    format: { const: "daggerheart.card-automation.definition.v1" },
    mode: { const: "lowLevel" },
    body: { type: "object", additionalProperties: false },
  },
} as const
```

Then expand `body` in the same file to validate the exact Phase 1 low-level shape defined in Task 1. Keep it strict. Use reusable schema constants for:

- `cardValueSchema`
- `cardConditionSchema`
- `cardChoiceSchema`
- `cardEffectSchema`
- `cardAutomationLowLevelBodySchema`

The schema must reject unknown fields in every automation subtree. It must allow omitted `lifetime` and omitted effect ids only in low-level Definition. It must not accept `format` or `revision` inside `body`.

- [ ] **Step 4: Implement canonical revision hashing**

Create `card/automation/revision.ts`:

```ts
import type { CardAutomationIR } from "./ir-types"

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (!value || typeof value !== "object") return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "revision")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortValue(nested)]),
  )
}

export function canonicalizeCardAutomationIR(ir: Omit<CardAutomationIR, "revision"> | CardAutomationIR): string {
  return JSON.stringify(sortValue(ir))
}

function fnv1a32(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

export function createCardAutomationRevision(ir: Omit<CardAutomationIR, "revision"> | CardAutomationIR): string {
  return `stable32:${fnv1a32(canonicalizeCardAutomationIR(ir))}`
}
```

Use a deterministic browser-safe hash here. Do not import Node `crypto` from `card/automation/*`, because editor validation and import orchestration can be statically reachable from client code.

- [ ] **Step 5: Implement normalization**

Create `card/automation/normalize-definition.ts` exporting `normalizeCardAutomationDefinition(definition)`.

Required behavior:

- reject unsupported `format` / `mode`;
- reject `body.format` and `body.revision`;
- default missing `ability.lifetime` to `{ kind: "whileInLoadout" }`;
- default missing contribution/selected-target effect ids to `effect-1`, `effect-2`, in ability traversal order;
- keep `emitWhen.id` optional;
- reject `selectMany` with `unique: false`;
- return `{ ok: true, irWithoutRevision }` or `{ ok: false, diagnostics }`.

Use this return type:

```ts
import type { CardAutomationCompilerDiagnostic } from "./compiler-diagnostics"
import type { CardAutomationIR } from "./ir-types"

export type NormalizeCardAutomationDefinitionResult =
  | { ok: true; irWithoutRevision: Omit<CardAutomationIR, "revision"> }
  | { ok: false; diagnostics: CardAutomationCompilerDiagnostic[] }
```

- [ ] **Step 6: Implement IR validation**

Create `card/automation/validate-ir.ts` exporting `validateCardAutomationIR(ir)`.

Validation must enforce:

- ability count <= `maxAbilitiesPerCard`;
- unique ability ids;
- choices per ability <= `maxChoicesPerAbility`;
- choice ids unique within ability;
- `requiredWhen` can reference only previous choices in the same `choices` array;
- `choiceEquals` / `choiceIncludes` in effects can reference only declared choices;
- `valueByTier.values` has exactly `"1"`, `"2"`, `"3"`, `"4"`;
- `all.conditions` and `any.conditions` non-empty;
- `cardCount` has exactly one of `atLeast` or `exactly`;
- max effect depth/value depth/condition depth from `limits.ts`;
- no parallel required choice branch: for any previous choice option value, no more than one later choice may use the same direct `choiceEquals` predicate as `requiredWhen`.

Return:

```ts
export type ValidateCardAutomationIRResult =
  | { ok: true }
  | { ok: false; diagnostics: CardAutomationCompilerDiagnostic[] }
```

- [ ] **Step 7: Implement the shared compile entry**

Create `card/automation/compile-definition.ts`:

```ts
import type { CardAutomationCompilerDiagnostic } from "./compiler-diagnostics"
import type { CardAutomationDefinition } from "./definition-types"
import type { CardAutomationIR } from "./ir-types"
import { normalizeCardAutomationDefinition } from "./normalize-definition"
import { createCardAutomationRevision } from "./revision"
import { validateCardAutomationIR } from "./validate-ir"

export type CompileCardAutomationDefinitionResult =
  | { ok: true; ir: CardAutomationIR; diagnostics: CardAutomationCompilerDiagnostic[] }
  | { ok: false; diagnostics: CardAutomationCompilerDiagnostic[] }

export function compileCardAutomationDefinition(
  definition: unknown,
): CompileCardAutomationDefinitionResult {
  const normalized = normalizeCardAutomationDefinition(definition as CardAutomationDefinition)
  if (!normalized.ok) return normalized

  const irWithoutRevision = normalized.irWithoutRevision
  const ir: CardAutomationIR = {
    ...irWithoutRevision,
    revision: createCardAutomationRevision(irWithoutRevision),
  }
  const validation = validateCardAutomationIR(ir)
  if (!validation.ok) return validation

  return { ok: true, ir, diagnostics: [] }
}
```

- [ ] **Step 8: Run compiler tests**

Run: `pnpm test:run card/automation/__tests__/definition-compiler.test.ts`

Expected: PASS.

- [ ] **Step 9: Commit Task 2**

```bash
git add card/automation
git commit -m "feat: compile card automation definitions"
```

## Task 3: Card Pack Import And Editor Validation Integration

**Files:**

- Modify: `card/import/card-pack-v1.schema.ts`
- Modify: `card/import/types.ts`
- Modify: `card/import/import-pipeline.ts`
- Modify: `card/import/legacy-adapter.ts`
- Modify: `card/import/semantic-validation.ts`
- Modify: `card/packs/storage-types.ts`
- Modify: `card/packs/legacy-storage-format-adapter.ts`
- Modify: `app/card-editor/types/index.ts`
- Modify: `app/card-editor/utils/import-export.ts`
- Modify: `app/card-editor/services/__tests__/card-editor-validation.test.ts`
- Modify: `card/import/__tests__/schema.test.ts`
- Modify: `card/import/__tests__/pipeline-dry-run.test.ts`
- Modify: `card/packs/__tests__/legacy-storage-format-adapter.test.ts`

- [ ] **Step 1: Add import schema test for per-card automation**

Add a test to `card/import/__tests__/schema.test.ts` that validates direct v1 input containing:

```json
{
  "format": "daggerheart.card-pack.v1",
  "ancestries": [
    {
      "id": "simiah-nimble",
      "name": "灵活",
      "ancestry": "猿族",
      "summary": "",
      "effect": "闪避永久 +1",
      "category": 1,
      "automation": {
        "format": "daggerheart.card-automation.definition.v1",
        "mode": "lowLevel",
        "body": {
          "abilities": [
            {
              "id": "simiah-nimble",
              "label": "灵活",
              "effects": [
                { "kind": "emitModifier", "target": "evasion", "value": 1 }
              ]
            }
          ]
        }
      }
    }
  ]
}
```

Assert schema validation succeeds.

- [ ] **Step 2: Add import dry-run compile test**

Add a test to `card/import/__tests__/pipeline-dry-run.test.ts` asserting:

```ts
expect(result.model?.cards[0].automation).toMatchObject({
  format: "daggerheart.card-automation.ir.v1",
  abilities: [expect.objectContaining({ id: "simiah-nimble" })],
})
expect(result.model?.cards[0].automation?.revision).toMatch(/^stable32:/)
```

Also assert invalid automation produces an import error diagnostic with code `INVALID_AUTOMATION_DEFINITION` or `INVALID_AUTOMATION_IR` and no commit-ready compiled IR on that card.

- [ ] **Step 3: Add storage projection test**

Add a test to `card/packs/__tests__/legacy-storage-format-adapter.test.ts` asserting `projectCardImportToLegacyBatchStorage` preserves compiled template `automation` on `ExtendedStandardCard`.

- [ ] **Step 4: Add editor validation test**

Add a test to `app/card-editor/services/__tests__/card-editor-validation.test.ts` asserting editor validation:

- serializes draft `automation` Definition;
- runs the shared compiler;
- reports compiler diagnostics;
- does not mutate draft state into compiled IR.

- [ ] **Step 5: Run tests and verify they fail**

Run:

```bash
pnpm test:run card/import/__tests__/schema.test.ts card/import/__tests__/pipeline-dry-run.test.ts card/packs/__tests__/legacy-storage-format-adapter.test.ts app/card-editor/services/__tests__/card-editor-validation.test.ts
```

Expected: FAIL because import/editor paths do not know `automation`.

- [ ] **Step 6: Add optional `automation` to each card-pack v1 item schema**

In `card/import/card-pack-v1.schema.ts`, add `automation: cardAutomationDefinitionSchema` to `baseCard.properties` by importing from `card/automation/definition-schema.ts`. Keep `additionalProperties: false`.

- [ ] **Step 7: Extend dry-run card types**

In `card/import/types.ts`, import automation types near the existing imports:

```ts
import type { CardAutomationDefinition } from "@/card/automation/definition-types"
import type { CardAutomationIR } from "@/card/automation/ir-types"
```

Then add optional author input to `CardBaseV1` so every card-pack v1 item can carry the external Definition:

```ts
export interface CardBaseV1 {
  id: string
  name: string
  imageUrl?: string
  hasLocalImage?: boolean
  automation?: CardAutomationDefinition
}
```

Then extend the existing `CardImportErrorCode` union with automation compiler-facing import errors:

```ts
export type CardImportErrorCode =
  | "SOURCE_READ_FAILED"
  // existing codes...
  | "UNSUPPORTED_AUTOMATION_FORMAT"
  | "INVALID_AUTOMATION_DEFINITION"
  | "INVALID_AUTOMATION_IR"
  | "AUTOMATION_LIMIT_EXCEEDED"
```

Then extend the existing `CardPackDryRunCard` union members so dry-run staged cards carry only compiled IR:

```ts
export type CardPackCompiledAutomation = {
  automation?: CardAutomationIR
}
```

Apply `& CardPackCompiledAutomation` to each existing `CardPackDryRunCard` union branch:

```ts
export type CardPackDryRunCard =
  | (Omit<CardClassV1, "automation"> & { group: "classes" } & CardPackCompiledAutomation)
  | (Omit<CardAncestryV1, "automation"> & { group: "ancestries" } & CardPackCompiledAutomation)
  | (Omit<CardCommunityV1, "automation"> & { group: "communities" } & CardPackCompiledAutomation)
  | (Omit<CardSubclassV1, "automation"> & { group: "subclasses" } & CardPackCompiledAutomation)
  | (Omit<CardDomainV1, "automation"> & { group: "domains" } & CardPackCompiledAutomation)
  | (Omit<CardVariantV1, "automation"> & { group: "variants" } & CardPackCompiledAutomation)
```

Do not expose `CardAutomationIR` in editor draft types.

- [ ] **Step 8: Compile during dry-run pipeline staging**

Keep `buildCardPackDryRunValidationModel` as a pure model builder that returns only a model. Add a new helper in `card/import/semantic-validation.ts`:

```ts
export function compileCardPackAutomation(
  pack: CardPackV1,
  model: CardPackDryRunValidationModel,
): { model: CardPackDryRunValidationModel; diagnostics: CardImportDiagnostic[] }
```

Call this helper from `card/import/import-pipeline.ts` immediately after `buildCardPackDryRunValidationModel(structural.value, imageAssets)` and before `validateCardPackSemantics(model)`.

Behavior:

- compiled IR goes to `dryRunCard.automation`;
- source Definition is not retained in `CardPackDryRunValidationModel`;
- compiler errors become dry-run diagnostics with JSON pointer under `/ancestries/0/automation` etc.;
- automation compiler diagnostic codes are mapped into `CardImportErrorCode`;
- cards without `automation` remain valid and have no `automation` field.

- [ ] **Step 9: Preserve compiled template IR in storage projection**

In `card/packs/storage-types.ts` and `card/packs/legacy-storage-format-adapter.ts`, add optional `automation?: CardAutomationIR` to installed template read model / `ExtendedStandardCard` projection.

In `projectCard`, copy:

```ts
automation: card.automation,
```

only when `card.automation` is defined.

- [ ] **Step 10: Preserve editor draft Definition raw**

In editor draft types and import/export utilities, add optional `automation?: CardAutomationDefinition` to draft card items. The editor draft must never write `CardAutomationIR`.

- [ ] **Step 11: Preserve automation through legacy editor serialization**

Current editor validation/export serializes legacy card JSON before dry-run. In `card/import/legacy-adapter.ts`, add `"automation"` to each `knownCardFields` set and copy `automation` from legacy/editor card records into the adapted v1 card item unchanged.

This is a Phase 1 compatibility bridge for editor draft validation/export. It does not make legacy published prose inference more powerful; it only preserves an explicit structured `automation` field when present.

- [ ] **Step 12: Route editor validation through shared compiler**

In the editor validation service, call the same dry-run path or compiler so automation diagnostics match formal import. Keep editor-owned authoring checks separate from automation compiler diagnostics.

- [ ] **Step 13: Run import/editor tests**

Run:

```bash
pnpm test:run card/import/__tests__/schema.test.ts card/import/__tests__/pipeline-dry-run.test.ts card/packs/__tests__/legacy-storage-format-adapter.test.ts app/card-editor/services/__tests__/card-editor-validation.test.ts
```

Expected: PASS.

- [ ] **Step 14: Run card import suite**

Run: `pnpm test:card-import`

Expected: PASS.

- [ ] **Step 15: Commit Task 3**

```bash
git add card/import card/packs app/card-editor card/automation
git commit -m "feat: compile card automation during card import"
```

## Task 4: Card Instance Storage And Sheet Migration

**Files:**

- Modify: `card/card-types.ts`
- Modify: `lib/sheet-schema-version.ts`
- Modify: `lib/sheet-data-migration.ts`
- Modify: `lib/character-data-validator.ts`
- Modify: `tests/unit/migration-regression-baseline.test.ts`
- Modify: `tests/unit/migration-versioning.test.ts`
- Add or modify: `lib/__tests__/sheet-data-card-instance-migration.test.ts`

- [ ] **Step 1: Add migration tests**

Create `lib/__tests__/sheet-data-card-instance-migration.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { migrateSheetData } from "../sheet-data-migration"

describe("card instance identity migration", () => {
  it("adds instanceId to non-empty loadout and vault cards", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      cards: [
        { standarized: true, id: "card-a", name: "Card A", type: "domain", class: "Valor", cardSelectDisplay: {} },
      ],
      inventory_cards: [
        { standarized: true, id: "card-b", name: "Card B", type: "domain", class: "Blade", cardSelectDisplay: {} },
      ],
    })

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.cards[0].id).toBe("card-a")
    expect(migrated.cards[0].instanceId).toMatch(/^cardinst_/)
    expect(migrated.inventory_cards?.[0].instanceId).toMatch(/^cardinst_/)
  })

  it("does not add instanceId to empty placeholders", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      cards: [
        { standarized: true, id: "empty-1", name: "", type: "unknown", class: "", cardSelectDisplay: {} },
      ],
    })

    expect(migrated.cards[0].instanceId).toBeUndefined()
  })

  it("preserves existing instance automation fields and does not generate automation", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      cards: [
        {
          standarized: true,
          id: "card-a",
          name: "Card A",
          type: "domain",
          class: "Valor",
          cardSelectDisplay: {},
          instanceId: "cardinst_existing",
          automationState: { version: 1, abilities: {} },
        },
      ],
    })

    expect(migrated.cards[0].instanceId).toBe("cardinst_existing")
    expect(migrated.cards[0].automation).toBeUndefined()
    expect(migrated.cards[0].automationState).toEqual({ version: 1, abilities: {} })
  })
})
```

- [ ] **Step 2: Run migration tests and verify they fail**

Run: `pnpm test:run lib/__tests__/sheet-data-card-instance-migration.test.ts`

Expected: FAIL because schema version is still 2 and cards lack `instanceId`.

- [ ] **Step 3: Extend `StandardCard` with instance automation fields**

In `card/card-types.ts`, import automation types and add optional fields:

```ts
import type {
  CardAutomationIR,
  CardAutomationSourceSnapshot,
  CardInstanceAutomationState,
} from "@/card/automation/ir-types"

export interface StandardCard {
  // existing fields
  instanceId?: string
  automation?: CardAutomationIR
  automationSource?: CardAutomationSourceSnapshot
  automationState?: CardInstanceAutomationState
}
```

- [ ] **Step 4: Bump schema version**

In `lib/sheet-schema-version.ts`, change `CURRENT_SCHEMA_VERSION` to `3` and add:

```ts
export const V3_SCHEMA_VERSION = 3
```

Update `tests/unit/migration-versioning.test.ts`:

- test name: `uses schema version 3 for card automation instance identity`;
- `CURRENT_SCHEMA_VERSION` expectation: `3`;
- `defaultSheetData.schemaVersion` expectation: `3`;
- supported versions include `3`;
- newer schema rejection uses `4`.

Update `tests/unit/migration-regression-baseline.test.ts` so the expected migrated schema version is `3`. If the baseline test snapshots complete migrated data, update only the schema version and deterministic non-empty card `instanceId` fields introduced by this migration.

- [ ] **Step 5: Add v2 -> v3 migration**

In `lib/sheet-data-migration.ts`, add an idempotent migration function:

```ts
function createCardInstanceId(cardId: string, zone: "loadout" | "vault", index: number): string {
  const safeCardId = cardId.replace(/[^a-zA-Z0-9_-]/g, "_")
  return `cardinst_${zone}_${index}_${safeCardId}`
}

function migrateCardInstanceIds(raw: Partial<SheetData> | any): Partial<SheetData> {
  const migrateCards = (cards: unknown, zone: "loadout" | "vault") => {
    if (!Array.isArray(cards)) return cards
    return cards.map((card, index) => {
      if (!isValidStandardCard(card)) return card
      if (!card.name || card.type === "unknown") return card
      if (typeof card.instanceId === "string" && card.instanceId.length > 0) return card
      return { ...card, instanceId: createCardInstanceId(card.id, zone, index) }
    })
  }

  return {
    ...raw,
    cards: migrateCards(raw.cards, "loadout"),
    inventory_cards: migrateCards(raw.inventory_cards, "vault"),
    schemaVersion: 3,
  }
}
```

Wire it into `migrateSheetData` after v2 migration and before `normalizeCurrentSheetData`.

- [ ] **Step 6: Update validator for optional automation fields**

In `lib/character-data-validator.ts`, accept optional `instanceId`, `automation`, `automationSource`, and `automationState` on card objects. Do not validate full IR there; defer full runtime validation to card automation modules. The character validator should reject only clearly malformed non-object automation fields if current style already rejects malformed nested card fields.

- [ ] **Step 7: Run migration tests**

Run:

```bash
pnpm test:run lib/__tests__/sheet-data-card-instance-migration.test.ts tests/unit/migration-versioning.test.ts tests/unit/migration-regression-baseline.test.ts tests/unit/character-data-validator.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 4**

```bash
git add card/card-types.ts lib tests/unit
git commit -m "feat: migrate card instance identities"
```

## Task 5: Pure Resolver, Snapshot, Requirements, Diagnostics, Contributions

**Files:**

- Create: `card/automation/card-getters.ts`
- Create: `card/automation/snapshot.ts`
- Create: `card/automation/choice-resolution.ts`
- Create: `card/automation/value-evaluator.ts`
- Create: `card/automation/condition-evaluator.ts`
- Create: `card/automation/resolve.ts`
- Create: `card/automation/project-requirements.ts`
- Create: `card/automation/project-diagnostics.ts`
- Create: `card/automation/project-contributions.ts`
- Create: `card/automation/__tests__/helpers.ts`
- Modify: `card/automation/__tests__/resolver.test.ts`

- [ ] **Step 1: Add resolver tests for fixed, snapshot, condition, choice, and no guessing**

Create `card/automation/__tests__/resolver.test.ts` with the following initial tests:

```ts
import { describe, expect, it } from "vitest"
import type { SheetData } from "@/lib/sheet-data"
import { defaultSheetData } from "@/lib/default-sheet-data"
import type { CardAutomationIR } from "../ir-types"
import { buildCardAutomationSnapshot } from "../snapshot"
import { resolveCardAutomation } from "../resolve"
import { projectCardAutomationContributions } from "../project-contributions"
import { projectCardAutomationRequirements } from "../project-requirements"

function makeSheet(overrides: Partial<SheetData> = {}): SheetData {
  return {
    ...defaultSheetData,
    schemaVersion: 3,
    name: "",
    cards: [],
    inventory_cards: [],
    experience: ["Smith", "", "", "", ""],
    experienceValues: ["0", "", "", "", ""],
    proficiency: 2,
    level: "1",
    agility: { value: "3", checked: false },
    strength: { value: "2", checked: false },
    finesse: { value: "0", checked: false },
    instinct: { value: "0", checked: false },
    presence: { value: "0", checked: false },
    knowledge: { value: "0", checked: false },
    evasion: "10",
    armorMax: "0",
    minorThreshold: "4",
    majorThreshold: "8",
    hpMax: 6,
    stressMax: 6,
    equipment: defaultSheetData.equipment,
    modifierState: { targetStates: {}, entryStates: {} },
    userModifierContributions: [],
    ...overrides,
  } as SheetData
}

describe("card automation resolver", () => {
  it("emits fixed modifier from loadout card", () => {
    const ir: CardAutomationIR = {
      format: "daggerheart.card-automation.ir.v1",
      revision: "stable32:test",
      abilities: [
        {
          id: "nimble",
          label: "灵活",
          lifetime: { kind: "whileInLoadout" },
          effects: [{ id: "effect-1", kind: "emitModifier", target: "evasion", value: 1 }],
        },
      ],
    }
    const sheet = makeSheet({
      cards: [{ standarized: true, id: "simiah", instanceId: "cardinst_1", name: "灵活", type: "ancestry", class: "猿族", cardSelectDisplay: {}, automation: ir }],
    })

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet))
    expect(projectCardAutomationContributions(resolved)).toEqual([
      expect.objectContaining({ id: "card:cardinst_1:nimble:effect-1", target: "evasion", value: 1 }),
    ])
  })

  it("blocks target choice ability until required choice exists", () => {
    const ir: CardAutomationIR = {
      format: "daggerheart.card-automation.ir.v1",
      revision: "stable32:test",
      abilities: [
        {
          id: "purposeful-design",
          label: "定制设计",
          lifetime: { kind: "permanentOnceClaimed" },
          choices: [
            {
              id: "boostedExperience",
              kind: "targetSelectMany",
              cardinality: { min: 1, max: 1, unique: true },
              domain: { kind: "modifierTargetGroup", group: "experiences" },
            },
          ],
          effects: [{ id: "effect-1", kind: "emitEachSelectedTarget", choiceId: "boostedExperience", value: 1 }],
        },
      ],
    }
    const sheet = makeSheet({
      inventory_cards: [{ standarized: true, id: "clank", instanceId: "cardinst_2", name: "定制设计", type: "ancestry", class: "机械人", cardSelectDisplay: {}, automation: ir }],
    })

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet))
    expect(projectCardAutomationContributions(resolved)).toEqual([])
    expect(projectCardAutomationRequirements(resolved)).toEqual([
      expect.objectContaining({
        cardInstanceId: "cardinst_2",
        abilityId: "purposeful-design",
        status: "missingChoice",
      }),
    ])
  })

  it("reports invalid stored choice without emitting contribution", () => {
    const ir: CardAutomationIR = {
      format: "daggerheart.card-automation.ir.v1",
      revision: "stable32:test",
      abilities: [
        {
          id: "purposeful-design",
          label: "定制设计",
          lifetime: { kind: "permanentOnceClaimed" },
          choices: [
            {
              id: "boostedExperience",
              kind: "targetSelectMany",
              cardinality: { min: 1, max: 1, unique: true },
              domain: { kind: "modifierTargetGroup", group: "experiences" },
            },
          ],
          effects: [{ id: "effect-1", kind: "emitEachSelectedTarget", choiceId: "boostedExperience", value: 1 }],
        },
      ],
    }
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "clank",
          instanceId: "cardinst_invalid_choice",
          name: "定制设计",
          type: "ancestry",
          class: "机械人",
          cardSelectDisplay: {},
          automation: ir,
          automationState: {
            version: 1,
            abilities: {
              "purposeful-design": {
                choiceValues: { boostedExperience: ["experienceValues.4"] },
              },
            },
          },
        },
      ],
    })

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet))
    expect(projectCardAutomationContributions(resolved)).toEqual([])
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({ code: "INVALID_CHOICE_VALUE", cardInstanceId: "cardinst_invalid_choice" }),
    )
  })

  it("reports missing instance id and does not emit contribution", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "simiah",
          name: "灵活",
          type: "ancestry",
          class: "猿族",
          cardSelectDisplay: {},
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "stable32:test",
            abilities: [
              {
                id: "nimble",
                label: "灵活",
                lifetime: { kind: "whileInLoadout" },
                effects: [{ id: "effect-1", kind: "emitModifier", target: "evasion", value: 1 }],
              },
            ],
          },
        },
      ],
    })

    const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheet))
    expect(projectCardAutomationContributions(resolved)).toEqual([])
    expect(resolved.diagnostics).toContainEqual(expect.objectContaining({ code: "MISSING_INSTANCE_ID" }))
  })
})
```

Move `makeSheet` into `card/automation/__tests__/helpers.ts` after this test passes, then import it from resolver, provider, and fixture tests. Keep the helper based on `defaultSheetData` so future schema fields inherit production defaults.

- [ ] **Step 2: Run resolver tests and verify they fail**

Run: `pnpm test:run card/automation/__tests__/resolver.test.ts`

Expected: FAIL because resolver modules do not exist.

- [ ] **Step 3: Add runtime diagnostic regression tests**

Extend `card/automation/__tests__/resolver.test.ts` with focused tests for runtime diagnostics:

- card has non-empty `name` and `automationState` but no `automation` => no contribution and diagnostic `MISSING_INSTANCE_AUTOMATION`;
- `automationState.abilities` contains an ability id not declared by instance IR => diagnostic `ORPHAN_ABILITY_STATE`;
- instance `automationSource.templateAutomationRevision` differs from a current template revision supplied to the snapshot builder => warning `TEMPLATE_AUTOMATION_DRIFT`, while contributions still use instance IR;
- current template is unavailable to the snapshot builder => warning `TEMPLATE_AUTOMATION_MISSING`, while contributions still use instance IR.

These tests can use a small optional template lookup argument on `buildCardAutomationSnapshot(sheet, { findTemplateById })`. The lookup must not be required for contribution projection; it is diagnostics-only.

- [ ] **Step 4: Implement semantic card getters**

Create `card/automation/card-getters.ts`:

- `getCardAutomationCardType(card)` returns one of `"profession" | "ancestry" | "community" | "subclass" | "domain" | "variant"` or `undefined`.
- `getCardAutomationClassification(card)` returns `card.class` for domain cards.
- `getCardAutomationLevel(card)` returns numeric domain level.
- `matchesCardAutomationCard(cardFact, match)` applies AND semantics.

Do not expose arbitrary `StandardCard` paths.

- [ ] **Step 5: Implement snapshot builder**

Create `card/automation/snapshot.ts` exporting:

```ts
export interface CardAutomationSnapshot {
  level: number
  tier: "1" | "2" | "3" | "4"
  proficiency: number
  targetValues: Partial<Record<ModifierTargetId, number>>
  equipmentSlots: {
    armor: { empty: boolean }
    primaryWeapon: { empty: boolean }
    secondaryWeapon: { empty: boolean }
  }
  cards: CardAutomationSnapshotCard[]
}
```

Build `cards` from non-empty `sheetData.cards` as `zone: "loadout"` and non-empty `sheetData.inventory_cards` as `zone: "vault"`. Include instance IR/state from card object. Read target values from existing `automation/core/target-accessors.ts` or direct stable fields only through a local helper. Do not read final values that are unparseable as numbers.

Support an optional diagnostics-only template lookup:

```ts
buildCardAutomationSnapshot(sheetData, {
  findTemplateById(templateId: string) {
    return undefined
  },
})
```

The resolver may use this lookup result only for `TEMPLATE_AUTOMATION_DRIFT` / `TEMPLATE_AUTOMATION_MISSING` diagnostics. It must never replace instance IR with template IR.

- [ ] **Step 6: Implement choice resolution**

Create `card/automation/choice-resolution.ts`.

Behavior:

- raw missing required choice => resolved choice status `missing`;
- unknown choice key in state => ability-level `INVALID_ABILITY_STATE`;
- unknown option id/target id => choice status `invalid`;
- invalid cardinality => choice status `invalid`;
- target group `attributes` expands six attribute targets;
- target group `experiences` expands only non-empty experience slots;
- all raw strings are interpreted only through current `CardChoiceIR`.

- [ ] **Step 7: Implement value and condition evaluators**

Create:

- `card/automation/value-evaluator.ts`
- `card/automation/condition-evaluator.ts`

Value evaluator rules:

- all values must be finite numbers;
- divide by zero fails;
- `readTarget` reads pre-card snapshot target value only;
- `attribute` maps to `${attribute}.value`;
- no default 0.

Condition evaluator rules:

- `all`, `any`, `not`;
- `equipmentSlotEmpty` and `equipmentSlotFilled`;
- `cardCount` against snapshot cards only;
- `choiceEquals` / `choiceIncludes` against resolved choices only.

- [ ] **Step 8: Implement pure resolver**

Create `card/automation/resolve.ts` exporting:

```ts
export function resolveCardAutomation(snapshot: CardAutomationSnapshot): ResolvedCardAutomation
```

For each card with `instanceId` and valid `automation`, resolve abilities. Missing `instanceId` or invalid automation should create diagnostics and no contributions.

Lifetime behavior:

- `whileInLoadout`: inactive outside loadout.
- `permanentOnceClaimed`: eligible in loadout or vault while instance exists.

Choice chain behavior:

- if more than one active missing choice is found for one ability, mark ability invalid and emit `MULTIPLE_ACTIVE_CHOICES`;
- no contribution from blocked/invalid ability.

- [ ] **Step 9: Implement projectors**

Create:

- `project-requirements.ts`
- `project-diagnostics.ts`
- `project-contributions.ts`

Requirements must expose only derived read model data and available action `"setChoiceValues"`. Do not include UI presentation decisions.

Template drift and missing template are Phase 1 runtime diagnostics only. Do not expose `"refreshAutomationFromTemplate"` as an available action in Phase 1 requirement projection.

Contributions must produce stable ids:

```ts
`card:${cardInstanceId}:${abilityId}:${effectId}`
```

- [ ] **Step 10: Run resolver tests**

Run: `pnpm test:run card/automation/__tests__/resolver.test.ts`

Expected: PASS.

- [ ] **Step 11: Commit Task 5**

```bash
git add card/automation
git commit -m "feat: resolve card automation outputs"
```

## Task 6: Card Provider In Modifier Registry

**Files:**

- Modify: `automation/core/types.ts`
- Modify: `automation/core/registry.ts`
- Create: `automation/card/provider.ts`
- Create: `automation/card/contribution-utils.ts`
- Create: `automation/card/__tests__/provider.test.ts`

- [ ] **Step 1: Add provider tests**

Create `automation/card/__tests__/provider.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { collectModifierEntries } from "@/automation/core/registry"
import { makeSheet } from "@/card/automation/__tests__/helpers"

describe("card modifier provider", () => {
  it("collects card-sourced modifier entries with card source type", () => {
    const sheet = makeSheet({
      cards: [
        {
          standarized: true,
          id: "simiah",
          instanceId: "cardinst_1",
          name: "灵活",
          type: "ancestry",
          class: "猿族",
          cardSelectDisplay: {},
          automation: {
            format: "daggerheart.card-automation.ir.v1",
            revision: "stable32:test",
            abilities: [
              {
                id: "nimble",
                label: "灵活",
                lifetime: { kind: "whileInLoadout" },
                effects: [{ id: "effect-1", kind: "emitModifier", target: "evasion", value: 1 }],
              },
            ],
          },
        },
      ],
    })

    expect(collectModifierEntries(sheet, "evasion")).toContainEqual(
      expect.objectContaining({
        id: "card:cardinst_1:nimble:effect-1",
        source: { type: "card", id: "card:cardinst_1:nimble" },
        priority: 160,
      }),
    )
  })
})
```

Import and reuse `makeSheet` from `card/automation/__tests__/helpers.ts`.

- [ ] **Step 2: Run provider tests and verify they fail**

Run: `pnpm test:run automation/card/__tests__/provider.test.ts`

Expected: FAIL because registry does not collect card entries.

- [ ] **Step 3: Add `card` source type**

In `automation/core/types.ts`, change:

```ts
export type ModifierSourceType = "profession" | "armor" | "level" | "upgrade" | "user" | "equipment" | "card"
```

- [ ] **Step 4: Implement card contribution conversion**

Create `automation/card/contribution-utils.ts`:

- validate finite numeric value;
- validate target is current `ModifierTargetId`;
- convert card contribution fact into `ModifierEntry`;
- priority: base `110`, modifier `160`;
- source id: `card:${cardInstanceId}:${abilityId}`;
- label: `${cardName}`.

- [ ] **Step 5: Implement provider**

Create `automation/card/provider.ts`:

```ts
import type { SheetData } from "@/lib/sheet-data"
import type { ModifierEntry } from "@/automation/core/types"
import { buildCardAutomationSnapshot } from "@/card/automation/snapshot"
import { resolveCardAutomation } from "@/card/automation/resolve"
import { projectCardAutomationContributions } from "@/card/automation/project-contributions"
import { cardContributionToEntry } from "./contribution-utils"

export function collectCardModifierEntries(sheetData: SheetData): ModifierEntry[] {
  const resolved = resolveCardAutomation(buildCardAutomationSnapshot(sheetData))
  return projectCardAutomationContributions(resolved).flatMap(cardContributionToEntry)
}
```

- [ ] **Step 6: Wire registry**

In `automation/core/registry.ts`, import `collectCardModifierEntries` and include card entries with system/equipment/user entries:

```ts
const cardModifierEntries = collectCardModifierEntries(sheetData)
const entries = [...systemEntries, ...equipmentModifierEntries, ...cardModifierEntries, ...userModifierEntries]
```

Do not make card provider read entries generated later in the same registry call.

- [ ] **Step 7: Run provider tests**

Run: `pnpm test:run automation/card/__tests__/provider.test.ts`

Expected: PASS.

- [ ] **Step 8: Run modifier core tests**

Run: `pnpm test:run tests/unit/modifiers automation/card`

Expected: PASS.

- [ ] **Step 9: Commit Task 6**

```bash
git add automation card/automation
git commit -m "feat: add card modifier provider"
```

## Task 7: Modifier-Aware Card Actions And Requirements API

**Files:**

- Create: `automation/actions/card-actions.ts`
- Create: `automation/actions/__tests__/card-actions.test.ts`
- Modify: `lib/sheet-store.ts`
- Modify: `components/character-sheet-page-two.tsx`
- Modify: `components/character-sheet-page-two-sections/card-deck-section.tsx`

- [ ] **Step 1: Add card action tests**

Create `automation/actions/__tests__/card-actions.test.ts` with these test cases:

- `selectCardIntoSlot creates a card instance from a template and syncs once`;
- `moveCardInstance preserves instance automation fields`;
- `replaceCardInstance creates a new instance and discards old automation state`;
- `deleteCardInstance removes the instance and its contribution disappears after sync`;
- `setCardAbilityChoiceValues replaces the whole ability choiceValues when valid`;
- `setCardAbilityChoiceValues keeps old state unchanged when invalid`;
- `deleteCardInstance rejects protected loadout slots`;
- `moveCardInstance rejects moving protected loadout slots to vault`.

Use this assertion shape for invalid choice:

```ts
expect(result.kind).toBe("failure")
expect(result.sheetData.cards[0].automationState).toEqual(previousAutomationState)
```

- [ ] **Step 2: Run action tests and verify they fail**

Run: `pnpm test:run automation/actions/__tests__/card-actions.test.ts`

Expected: FAIL because card actions do not exist.

- [ ] **Step 3: Implement card action result contracts**

Create `automation/actions/card-actions.ts`:

```ts
import type { StandardCard } from "@/card/card-types"
import type { SheetData } from "@/lib/sheet-data"
import { applyAutoCalculationForTargets } from "@/automation/core/target-sync"

export type CardAutomationActionResult =
  | { kind: "success"; sheetData: SheetData }
  | { kind: "failure"; sheetData: SheetData; message: string }

export type CardZone = "loadout" | "vault"

export type CreateCardInstanceId = () => string

export function createRandomCardInstanceId(): string {
  return `cardinst_${crypto.randomUUID()}`
}

export function instantiateCardTemplate(
  template: StandardCard,
  now = new Date(),
  createInstanceId: CreateCardInstanceId = createRandomCardInstanceId,
): StandardCard {
  const instanceId = createInstanceId()
  return {
    ...template,
    instanceId,
    automation: template.automation,
    automationSource: template.automation
      ? {
          templateId: template.id,
          packId: (template as { batchId?: string }).batchId,
          templateAutomationRevision: template.automation.revision,
          copiedAt: now.toISOString(),
        }
      : undefined,
    automationState: template.automation ? { version: 1, abilities: {} } : undefined,
  }
}
```

Then add pure action functions:

- `selectCardIntoSlot(sheetData, zone, index, template)`
- `deleteCardInstance(sheetData, zone, index)`
- `moveCardInstance(sheetData, fromZone, fromIndex, toZone)`
- `replaceCardInstance(sheetData, zone, index, template)`
- `setCardAbilityChoiceValues(sheetData, cardInstanceId, abilityId, choiceValues)`

Every success path returns `applyAutoCalculationForTargets(nextSheetData)` exactly once.

Preserve existing loadout slot protection in this action layer:

- deleting a loadout card at index `< 5` fails;
- moving a loadout card at index `< 5` to vault fails;
- moving a vault card into loadout searches from index `5`;
- selecting/replacing into a protected loadout slot is allowed only for the existing UI flow that owns those special slots; otherwise return failure.

Tests should inject deterministic ids:

```ts
const createInstanceId = () => "cardinst_test_1"
```

- [ ] **Step 4: Validate choice writes against current instance IR**

Inside `setCardAbilityChoiceValues`, find the card instance by `instanceId`, then run resolver or choice-resolution against a trial state. If invalid, return failure with old sheet data unchanged. If valid, replace:

```ts
automationState: {
  version: 1,
  abilities: {
    ...oldAbilities,
    [abilityId]: { choiceValues },
  },
}
```

Do not patch individual choice ids.

- [ ] **Step 5: Wire store card actions**

In `lib/sheet-store.ts`, update `deleteCard`, `moveCard`, `updateCard` or add new explicit actions so card-changing UI paths use the functions from `automation/actions/card-actions.ts`. Preserve existing public hook names where possible to reduce UI churn.

Do not change generic `setSheetData` behavior.

- [ ] **Step 6: Update page two component wiring**

In `components/character-sheet-page-two.tsx` and card deck section props, replace direct `setSheetData({ cards })` / `setSheetData({ inventory_cards })` card mutations with store card actions.

No new card automation UI is required in Phase 1.

- [ ] **Step 7: Run action and page tests**

Run:

```bash
pnpm test:run automation/actions/__tests__/card-actions.test.ts app/card-manager/__tests__/card-manager-card-lifecycle.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Task 7**

```bash
git add automation/actions lib/sheet-store.ts components
git commit -m "feat: route card changes through automation boundary"
```

## Task 8: Fixture Matrix Automation Data And Regression Tests

**Files:**

- Modify: `data/cards/builtin-base.json`
- Create: `card/automation/__tests__/fixture-matrix.test.ts`
- Reuse: `card/automation/__tests__/helpers.ts`

- [ ] **Step 1: Add fixture matrix regression tests**

Create `card/automation/__tests__/fixture-matrix.test.ts` that constructs cards from low-level Definitions and includes one `it(...)` case for each confirmed fixture row:

- `Simiah-Nimble`: evasion +1
- `Giant-Endurance`: `hpMax` +1
- `Human-HighStamina`: `stressMax` +1
- `Clank-PurposefulDesign`: selected `experienceValues.0` +1
- `Galapa-Shell`: thresholds += proficiency
- Stalwart +1/+2/+3
- `Nightwalker-Mastery`: evasion +1
- `School-of-War-Foundation`: `hpMax` +1
- `Vengeance-Foundation`: `stressMax` +1
- `Winged-Sentinel-Mastery`: `majorThreshold` +4
- `fortified-armor`: armor filled => thresholds +2
- `bare-bones`: armor empty => armor/threshold bases
- `vitality`: choose two static options
- `master-of-the-craft`: choose two experiences +2 or one experience +3
- `untouchable`: evasion += `ceil(agility / 2)`
- `armorer`: armor filled => `armorMax` +1
- `rise-up`: `majorThreshold` += proficiency
- `blade-touched`, `bone-touched`, `splendor-touched`, `valor-touched`
- Void1.5: `格斗家`, `石肤`, `重拳主宰专精`, `稳健`, `坚定`

Each test should assert exact contribution ids/targets/values and should not assert localized UI text. The tests must also assert deferred text does not produce contributions by checking that no contribution exists for targets outside the stable Phase 1 automation claim.

Add explicit negative condition cases:

- `fortified-armor`: no armor equipped => no threshold contribution.
- `bare-bones`: armor equipped => no base contribution.
- `格斗家`: either weapon slot filled => no evasion contribution.
- each touched card: matching domain card count below 4 => no contribution.

- [ ] **Step 2: Run fixture tests and verify they fail**

Run: `pnpm test:run card/automation/__tests__/fixture-matrix.test.ts`

Expected: FAIL until builtin data and fixtures have automation Definitions.

- [ ] **Step 3: Add builtin-base Definitions**

In `data/cards/builtin-base.json`, add `automation` Definition wrappers to confirmed builtin cards only.

Use `mode: "lowLevel"` and do not write `format` or `revision` inside `body`.

For `untouchable`, encode:

```json
{
  "kind": "ceil",
  "value": {
    "kind": "divide",
    "left": { "kind": "attribute", "attribute": "agility" },
    "right": 2
  }
}
```

For `fortified-armor`, use `equipmentSlotFilled`, not `not(equipmentSlotEmpty)`.

For “no weapon equipped”, use:

```json
{
  "kind": "all",
  "conditions": [
    { "kind": "equipmentSlotEmpty", "slot": "primaryWeapon" },
    { "kind": "equipmentSlotEmpty", "slot": "secondaryWeapon" }
  ]
}
```

- [ ] **Step 4: Add stable Void1.5 regression samples**

Do not depend on ignored local fixture files in CI. Add a small committed test-only fixture object inside `fixture-matrix.test.ts` or a colocated helper containing only the confirmed Void1.5 card ids/names/Definitions. Do not copy full ignored fixture payloads.

- [ ] **Step 5: Run fixture tests**

Run: `pnpm test:run card/automation/__tests__/fixture-matrix.test.ts`

Expected: PASS.

- [ ] **Step 6: Run compiler and resolver suites together**

Run:

```bash
pnpm test:run card/automation automation/card automation/actions
```

Expected: PASS.

- [ ] **Step 7: Commit Task 8**

```bash
git add data/cards/builtin-base.json card/automation
git commit -m "test: cover card automation fixture matrix"
```

## Task 9: Full Verification And Documentation Cleanup

**Files:**

- Modify only if needed: `docs/superpowers/specs/2026-06-21-card-automation-dsl-phase-1-design.md`
- Modify only if needed: `docs/superpowers/specs/2026-06-22-card-automation-phase-1-fixture-matrix.md`
- Modify only if needed: `docs/contexts/modifiers/CONTEXT.md`
- Modify only if needed: `docs/contexts/content-pack-import/CONTEXT.md`

- [ ] **Step 1: Run targeted suites**

Run:

```bash
pnpm test:run card/automation automation/card automation/actions card/import card/packs app/card-editor/services lib/__tests__/sheet-data-card-instance-migration.test.ts tests/unit/character-data-validator.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run existing card import suite**

Run: `pnpm test:card-import`

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run: `pnpm test:run`

Expected: PASS.

- [ ] **Step 4: Run build**

Run: `pnpm build`

Expected: PASS. Do not start a dev server.

- [ ] **Step 5: Update docs only for implementation deltas**

If implementation required a different field name, function boundary, diagnostic code, or fixture interpretation, update the authoritative spec or context document in the same commit. Do not add implementation diary notes.

- [ ] **Step 6: Final review checklist**

Confirm each statement is true:

- `CardAutomationDefinition` appears only in external card pack/editor draft/pre-dry-run structural input paths.
- `CardPackDryRunValidationModel`, installed templates, and sheet card instances use compiled `CardAutomationIR`, not Definition.
- installed templates and sheet card instances use compiled `CardAutomationIR`.
- `CardAutomationIR.revision` is generated, not supplied by author input.
- old save migration only adds `instanceId`.
- resolver/projectors do not write state.
- card provider is inside `collectModifierEntries`.
- card entries have `source.type === "card"`.
- no card contributions are persisted in `userModifierContributions`.
- generic `setSheetData` still does not automatically run modifier sync.
- no `activateCardAbility` or standalone active/claimed state exists.
- `hitPointMax` does not appear; use `hpMax`.
- fixture matrix must-support rows have tests.

- [ ] **Step 7: Commit final cleanup**

```bash
git add docs/superpowers/specs/2026-06-21-card-automation-dsl-phase-1-design.md docs/superpowers/specs/2026-06-22-card-automation-phase-1-fixture-matrix.md docs/contexts/modifiers/CONTEXT.md docs/contexts/content-pack-import/CONTEXT.md
git commit -m "docs: align card automation phase 1 implementation notes"
```

Skip this commit if Step 5 made no doc changes.

## Execution Order

Run tasks in order. Do not start Task 6 before Task 5 passes; provider integration depends on resolver/projector behavior. Do not start Task 8 before Task 3 and Task 5 pass; fixture data depends on compiler and resolver semantics.

Recommended implementation mode:

1. Use `superpowers:subagent-driven-development` with one worker per task.
2. Review each worker result before dispatching the next dependent task.
3. Run the task-specific tests after every task.
4. Commit after every task.

## Gaps To Watch During Implementation

- The current `SheetData` test helpers may need a shared builder to avoid copying large defaults. Keep it in test helpers, not production code.
- `crypto.randomUUID()` may need a browser-safe wrapper if tests run in an environment without global crypto. If so, add a tiny local `createCardInstanceId()` helper and inject deterministic ids in tests.
- `card/import/card-pack-v1.schema.ts` is strict; missing nested schema additions will break valid automation payloads.
- Existing card UI paths are not all modifier-aware. Only touch the paths needed for loadout/vault card arrays and choice state in Phase 1.
- Build may expose import cycles between `card/card-types.ts` and `card/automation/*`; keep automation type imports as `import type`.
- Do not replace `revision.ts` with Node `crypto` unless the module is split so browser/client paths cannot import it.
