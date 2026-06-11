# Equipment Pack Dry Run Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Stage 1+2 custom equipment pack import pipeline needed to verify dry-run behavior through `stageCommitData`, including public schema validation, canonical normalization, semantic validation, conflict checking, structured diagnostics, and commit-plan construction.

**Architecture:** Create a new root-level `equipment/import/` module, parallel to the existing `card/` domain directory, so the equipment pack import feature is isolated from automation runtime code. The pipeline accepts source adapters, options, and dependency-injected conflict/storage/registry/clock/id factories; dry run stops at `stageCommitData` and never mutates storage or runtime registries. Commit-mode behavior in this plan is limited to dependency-injected fake gate assertions required by Stage 2 result mapping; it must not wire any real storage or registry.

**Tech Stack:** TypeScript, Vitest, AJV 8 with JSON Schema draft 2020-12 support, existing `@/*` path alias.

---

## Scope Boundaries

This plan implements Stage 1+2 dry-run import plus Stage 2 fake commit gate assertions only.

In scope:

- Public schema at `public/schemas/equipment-pack.v1.schema.json`.
- Runtime schema validation using AJV.
- `equipment/import/` production module.
- Tests colocated under `equipment/import/__tests__/` to keep the feature in one directory tree.
- Fake storage/registry dependencies for Stage 2 gate/result mapping assertions.
- `mode: "dryRun"` through `stage: "stageCommitData"`.
- Explicit `mode: "commit"` tests may call fake storage/registry dependencies, only to prove stage/result mapping and gate order. Do not add real localStorage, real store mutation, or real registry rebuild.

Out of scope:

- Real localStorage transaction.
- Real registry/query index rebuild.
- Startup integrity recovery.
- UI.
- Card pack refactor.
- Any change under `docs/refs/`.

## File Structure

Create this directory:

```text
equipment/import/
  __tests__/
    schema.test.ts
    preprocess-normalize.test.ts
    structural-diagnostics.test.ts
    semantic-conflict.test.ts
    pipeline-dry-run.test.ts
  aliases.ts
  constants.ts
  diagnostics.ts
  import-pipeline.ts
  json-pointer.ts
  normalize.ts
  preprocess.ts
  schema-validator.ts
  semantic-validation.ts
  types.ts
```

Create this public asset:

```text
public/schemas/equipment-pack.v1.schema.json
```

Modify:

```text
package.json
pnpm-lock.yaml
```

Only because AJV must be a direct runtime dependency. If `pnpm add ajv@8.17.1` changes only the lockfile and `package.json`, keep that change. If it tries to rewrite unrelated dependencies, stop and inspect before committing.

## Review Constraints To Preserve During Execution

The implementation must preserve these decisions from the final plan review:

- `public/schemas/equipment-pack.v1.schema.json` uses JSON Schema draft 2020-12, not draft-07.
- Canonical normalized data uses the Stage 1 shape: `metadata`, top-level `weapons`, and top-level `armor`.
- The public schema uses `damage.maxLength = 40`; `modifierContributions[].id` reuses `$defs.templateId`.
- Missing required-field tests must omit fields, not set them to `undefined`.
- Test fixtures that intentionally delete optional properties must be typed as mutable JSON records or constructed without those fields, so `pnpm tsc --noEmit` stays clean.
- Builtin sources skip the 500 KiB user-file size gate.
- AJV diagnostics must include safe `value` where applicable, while never exposing raw AJV `keyword`, `params`, or `message`.
- Stage 2 keeps explicit commit-mode fake gate tests, but default mode should be `dryRun` in this Stage 1+2 implementation plan to avoid accidental writes when callers omit options.
- This implementation phase does not modify spec documents. If implementation reveals a real spec issue, stop and report it instead of silently changing the specs.

## Shared Test Fixtures

Each test file can define local fixtures. Use this minimal valid input shape repeatedly:

```ts
const validWeaponPack: Record<string, any> = {
  format: "daggerheart.equipment-pack.v1",
  name: "暗影装备包",
  version: "1.0.0",
  author: "测试作者",
  equipment: {
    weapons: [
      {
        id: "暗影装备包-测试作者-weapon-影刃",
        name: "影刃",
        tier: "T1",
        weaponType: "primary",
        trait: "agility",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
        damage: "d8",
        featureName: "暗影",
        description: "在阴影中闪烁。",
      },
    ],
  },
}
```

Use this dependency factory in pipeline tests:

```ts
import type { EquipmentPackImportDependencies } from "@/equipment/import/types"

function createDependencies(
  overrides: Partial<EquipmentPackImportDependencies> = {},
): EquipmentPackImportDependencies {
  return {
    conflictContext: {
      builtinTemplateIds: new Set(),
      importedTemplateIds: new Set(),
      customPackCount: 0,
      maxCustomPackCount: 50,
    },
    storageTransaction: {
      commit: vi.fn(async () => ({ ok: true } as const)),
    },
    registryRebuilder: {
      rebuild: vi.fn(async () => ({ ok: true } as const)),
    },
    createPackId: vi.fn(() => "pack-test-id"),
    now: () => new Date("2026-05-31T00:00:00.000Z"),
    ...overrides,
  }
}
```

### Task 1: Direct AJV Dependency And Public Schema

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `public/schemas/equipment-pack.v1.schema.json`
- Create: `equipment/import/__tests__/schema.test.ts`

- [ ] **Step 1: Add AJV as a direct dependency**

Run:

```bash
pnpm add ajv@8.17.1
```

Expected:

- `package.json` contains `"ajv": "8.17.1"` or compatible `^8.17.1` under `dependencies`.
- `pnpm-lock.yaml` records AJV as a direct dependency for the project importer.

- [ ] **Step 2: Write the failing schema tests**

Create `equipment/import/__tests__/schema.test.ts`:

```ts
import Ajv2020 from "ajv/dist/2020"
import { describe, expect, it } from "vitest"
import schema from "@/public/schemas/equipment-pack.v1.schema.json"

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

const validWeaponPack: Record<string, any> = {
  format: "daggerheart.equipment-pack.v1",
  name: "暗影装备包",
  version: "1.0.0",
  author: "测试作者",
  equipment: {
    weapons: [
      {
        id: "暗影装备包-测试作者-weapon-影刃",
        name: "影刃",
        tier: "T1",
        weaponType: "primary",
        trait: "agility",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
        damage: "d8",
      },
    ],
  },
}

function isValid(value: unknown): boolean {
  return validate(value) === true
}

describe("equipment pack public schema", () => {
  it("accepts a minimal weapon-only pack", () => {
    expect(isValid(validWeaponPack)).toBe(true)
  })

  it("accepts a minimal armor-only pack", () => {
    expect(
      isValid({
        format: "daggerheart.equipment-pack.v1",
        name: "护甲包",
        version: "1.0.0-beta.1",
        equipment: {
          armor: [
            {
              id: "护甲包-作者-armor-影织甲",
              name: "影织甲",
              tier: "T1",
              baseArmorMax: 4,
              baseThresholds: { minor: 7, major: 15 },
            },
          ],
        },
      }),
    ).toBe(true)
  })

  it("accepts name, author, and descriptions exactly at their max lengths", () => {
    const pack = structuredClone(validWeaponPack)
    pack.name = "x".repeat(100)
    pack.author = "a".repeat(100)
    pack.description = "d".repeat(4000)
    pack.equipment.weapons[0].description = "t".repeat(4000)

    expect(isValid(pack)).toBe(true)
  })

  it("rejects descriptions longer than 4000 characters", () => {
    const topLevelTooLong = structuredClone(validWeaponPack)
    topLevelTooLong.description = "d".repeat(4001)
    const templateTooLong = structuredClone(validWeaponPack)
    templateTooLong.equipment.weapons[0].description = "t".repeat(4001)

    expect(isValid(topLevelTooLong)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "maxLength")).toBe(true)
    expect(isValid(templateTooLong)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "maxLength")).toBe(true)
  })

  it("rejects missing required top-level fields", () => {
    const { format: _format, ...missingFormat } = validWeaponPack
    const { name: _name, ...missingName } = validWeaponPack
    const { version: _version, ...missingVersion } = validWeaponPack
    const { equipment: _equipment, ...missingEquipment } = validWeaponPack

    expect(isValid(missingFormat)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "required")).toBe(true)
    expect(isValid(missingName)).toBe(false)
    expect(isValid(missingVersion)).toBe(false)
    expect(isValid(missingEquipment)).toBe(false)
  })

  it("rejects Chinese enum values in the core schema", () => {
    const pack = structuredClone(validWeaponPack)
    pack.equipment.weapons[0].trait = "敏捷"

    expect(isValid(pack)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "enum")).toBe(true)
  })

  it("does not impose weapon or armor maxItems limits", () => {
    const weaponPack = structuredClone(validWeaponPack)
    weaponPack.equipment.weapons = Array.from({ length: 21 }, (_, index) => ({
      ...validWeaponPack.equipment.weapons[0],
      id: `暗影装备包-测试作者-weapon-影刃-${index}`,
      name: `影刃 ${index}`,
    }))

    const armorPack = {
      format: "daggerheart.equipment-pack.v1",
      name: "护甲包",
      version: "1.0.0",
      equipment: {
        armor: Array.from({ length: 21 }, (_, index) => ({
          id: `护甲包-作者-armor-影织甲-${index}`,
          name: `影织甲 ${index}`,
          tier: "T1",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
        })),
      },
    }

    expect(isValid(weaponPack)).toBe(true)
    expect(isValid(armorPack)).toBe(true)
  })

  it("limits modifierContributions to 20 and validates contribution ids like template ids", () => {
    const pack = structuredClone(validWeaponPack)
    pack.equipment.weapons[0].modifierContributions = Array.from({ length: 21 }, (_, index) => ({
      id: `contribution-${index}`,
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: `调整 ${index}`, value: index },
    }))

    expect(isValid(pack)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "maxItems")).toBe(true)

    const invalidContributionIdPack = structuredClone(validWeaponPack)
    invalidContributionIdPack.equipment.weapons[0].modifierContributions = [
      {
        id: "bad/id",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "调整", value: 1 },
      },
    ]

    expect(isValid(invalidContributionIdPack)).toBe(false)
    expect(validate.errors?.some((error) => error.keyword === "not")).toBe(true)
  })
})
```

- [ ] **Step 3: Run the test and verify it fails because the schema file is missing**

Run:

```bash
pnpm vitest run equipment/import/__tests__/schema.test.ts
```

Expected: FAIL with an import or file-not-found error for `public/schemas/equipment-pack.v1.schema.json`.

- [ ] **Step 4: Create the public schema**

Create `public/schemas/equipment-pack.v1.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "/schemas/equipment-pack.v1.schema.json",
  "title": "Daggerheart Equipment Pack v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["format", "name", "version", "equipment"],
  "properties": {
    "format": { "const": "daggerheart.equipment-pack.v1" },
    "name": { "type": "string", "minLength": 1, "maxLength": 100 },
    "version": {
      "type": "string",
      "minLength": 1,
      "maxLength": 40,
      "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$"
    },
    "author": { "type": "string", "minLength": 1, "maxLength": 100 },
    "description": { "type": "string", "maxLength": 4000 },
    "equipment": { "$ref": "#/$defs/equipment" }
  },
  "$defs": {
    "equipment": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "weapons": {
          "type": "array",
          "items": { "$ref": "#/$defs/weaponTemplate" }
        },
        "armor": {
          "type": "array",
          "items": { "$ref": "#/$defs/armorTemplate" }
        }
      }
    },
    "templateId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 160,
      "not": { "pattern": "[/\\\\\\u0000-\\u001F\\u007F]" }
    },
    "tier": { "enum": ["T1", "T2", "T3", "T4"] },
    "weaponTemplate": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "tier",
        "weaponType",
        "trait",
        "damageType",
        "range",
        "burden",
        "damage"
      ],
      "properties": {
        "id": { "$ref": "#/$defs/templateId" },
        "name": { "type": "string", "minLength": 1, "maxLength": 120 },
        "tier": { "$ref": "#/$defs/tier" },
        "weaponType": { "enum": ["primary", "secondary"] },
        "trait": {
          "enum": ["agility", "strength", "finesse", "instinct", "presence", "knowledge"]
        },
        "damageType": { "enum": ["physical", "magic"] },
        "range": { "enum": ["melee", "veryClose", "close", "far", "veryFar"] },
        "burden": { "enum": ["oneHanded", "twoHanded"] },
        "damage": { "type": "string", "minLength": 1, "maxLength": 40 },
        "featureName": { "type": "string", "maxLength": 120 },
        "description": { "type": "string", "maxLength": 4000 },
        "modifierContributions": {
          "type": "array",
          "maxItems": 20,
          "items": { "$ref": "#/$defs/modifierContribution" }
        }
      }
    },
    "armorTemplate": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "name", "tier", "baseArmorMax", "baseThresholds"],
      "properties": {
        "id": { "$ref": "#/$defs/templateId" },
        "name": { "type": "string", "minLength": 1, "maxLength": 120 },
        "tier": { "$ref": "#/$defs/tier" },
        "baseArmorMax": { "type": "integer", "minimum": 0 },
        "baseThresholds": {
          "type": "object",
          "additionalProperties": false,
          "required": ["minor", "major"],
          "properties": {
            "minor": { "type": "integer", "minimum": 0 },
            "major": { "type": "integer", "minimum": 0 }
          }
        },
        "featureName": { "type": "string", "maxLength": 120 },
        "description": { "type": "string", "maxLength": 4000 },
        "modifierContributions": {
          "type": "array",
          "maxItems": 20,
          "items": { "$ref": "#/$defs/modifierContribution" }
        }
      }
    },
    "modifierContribution": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "definition", "editable"],
      "properties": {
        "id": { "$ref": "#/$defs/templateId" },
        "definition": {
          "type": "object",
          "additionalProperties": false,
          "required": ["target", "kind"],
          "properties": {
            "target": {
              "enum": [
                "evasion",
                "armorMax",
                "minorThreshold",
                "majorThreshold",
                "hpMax",
                "stressMax",
                "proficiency",
                "agility.value",
                "strength.value",
                "finesse.value",
                "instinct.value",
                "presence.value",
                "knowledge.value"
              ]
            },
            "kind": { "const": "modifier" }
          }
        },
        "editable": {
          "type": "object",
          "additionalProperties": false,
          "required": ["label", "value"],
          "properties": {
            "label": { "type": "string", "minLength": 1, "maxLength": 120 },
            "value": { "type": "number" }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 5: Run schema tests**

Run:

```bash
pnpm vitest run equipment/import/__tests__/schema.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml public/schemas/equipment-pack.v1.schema.json equipment/import/__tests__/schema.test.ts
git commit -m "feat: add equipment pack public schema"
```

### Task 2: Import Types, Constants, And Diagnostics

**Files:**

- Create: `equipment/import/constants.ts`
- Create: `equipment/import/types.ts`
- Create: `equipment/import/diagnostics.ts`
- Create: `equipment/import/json-pointer.ts`
- Create: `equipment/import/__tests__/structural-diagnostics.test.ts`

- [ ] **Step 1: Write failing diagnostic shape tests**

Create `equipment/import/__tests__/structural-diagnostics.test.ts` with the JSON Pointer and discriminated-union tests first:

```ts
import { describe, expect, it } from "vitest"
import { makeErrorDiagnostic, makeWarningDiagnostic } from "@/equipment/import/diagnostics"
import { appendJsonPointer, toJsonPointer } from "@/equipment/import/json-pointer"

describe("equipment import diagnostic helpers", () => {
  it("escapes JSON Pointer segments", () => {
    expect(toJsonPointer(["equipment", "weapons", "0", "a/b~c"])).toBe(
      "/equipment/weapons/0/a~1b~0c",
    )
    expect(toJsonPointer([])).toBe("")
    expect(appendJsonPointer("/equipment", "a/b~c")).toBe("/equipment/a~1b~0c")
  })

  it("creates error and warning diagnostics in one public shape", () => {
    const error = makeErrorDiagnostic("MISSING_FIELD", "/format", "Missing field")
    const warning = makeWarningDiagnostic("MISSING_DESCRIPTION", "/description", "Missing description")

    expect(error).toMatchObject({ severity: "error", code: "MISSING_FIELD", path: "/format" })
    expect(warning).toMatchObject({
      severity: "warning",
      code: "MISSING_DESCRIPTION",
      path: "/description",
    })
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run equipment/import/__tests__/structural-diagnostics.test.ts
```

Expected: FAIL with missing module errors for `diagnostics` and `json-pointer`.

- [ ] **Step 3: Create constants**

Create `equipment/import/constants.ts`:

```ts
export const EQUIPMENT_PACK_FORMAT = "daggerheart.equipment-pack.v1" as const
export const MAX_EQUIPMENT_PACK_FILE_SIZE_BYTES = 500 * 1024
export const MAX_CUSTOM_EQUIPMENT_PACKS = 50
export const DEFAULT_EQUIPMENT_PACK_AUTHOR = "Unknown"
export const DESCRIPTION_LONG_WARNING_THRESHOLD = 1000
```

- [ ] **Step 4: Create types**

Create `equipment/import/types.ts`:

```ts
import type { EquipmentModifierTargetId } from "@/automation/equipment/types"

export type EquipmentPackImportOriginKind = "file" | "object" | "builtin" | "container"
export type EquipmentPackImportMode = "commit" | "dryRun"

export type EquipmentPackImportPipelineStage =
  | "sourceRead"
  | "jsonParse"
  | "authoringPreprocess"
  | "structuralValidation"
  | "canonicalNormalize"
  | "semanticValidation"
  | "conflictCheck"
  | "stageCommitData"
  | "storageTransaction"
  | "registryRebuild"

export type EquipmentPackImportErrorCode =
  | "SOURCE_READ_FAILED"
  | "INVALID_JSON"
  | "INVALID_FORMAT"
  | "MISSING_FIELD"
  | "UNKNOWN_FIELD"
  | "INVALID_TYPE"
  | "INVALID_ENUM"
  | "INVALID_SEMVER"
  | "DUPLICATE_ID"
  | "ID_CONFLICT"
  | "INVALID_CONTRIBUTION_TARGET"
  | "EMPTY_EQUIPMENT"
  | "INVALID_THRESHOLD_ORDER"
  | "FILE_TOO_LARGE"
  | "PACK_LIMIT_EXCEEDED"
  | "TEMPLATE_LIMIT_EXCEEDED"
  | "FIELD_TOO_LONG"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_SERIALIZE_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "REGISTRY_REBUILD_FAILED"

export type EquipmentPackImportWarningCode =
  | "MISSING_AUTHOR"
  | "MISSING_DESCRIPTION"
  | "MISSING_TEMPLATE_DESCRIPTION"
  | "DESCRIPTION_LONG"

export type EquipmentPackImportDiagnostic =
  | {
      severity: "error"
      code: EquipmentPackImportErrorCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
  | {
      severity: "warning"
      code: EquipmentPackImportWarningCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }

export type EquipmentPackRawPayload =
  | { kind: "jsonText"; text: string; sizeBytes?: number }
  | { kind: "parsedObject"; value: unknown; sizeBytes?: number }

export interface EquipmentPackImportSource {
  origin: {
    kind: EquipmentPackImportOriginKind
    label?: string
    fileName?: string
  }
  read(): Promise<EquipmentPackRawPayload>
}

export interface EquipmentPackImportOptions {
  mode?: EquipmentPackImportMode
}

export type EquipmentTier = "T1" | "T2" | "T3" | "T4"
export type EquipmentTrait = "agility" | "strength" | "finesse" | "instinct" | "presence" | "knowledge"
export type EquipmentDamageType = "physical" | "magic"
export type EquipmentRange = "melee" | "veryClose" | "close" | "far" | "veryFar"
export type EquipmentBurden = "oneHanded" | "twoHanded"

export interface NormalizedEquipmentPackData {
  metadata: {
    format: "daggerheart.equipment-pack.v1"
    name: string
    version: string
    author: string
    description: string
  }
  weapons: NormalizedEquipmentWeaponTemplate[]
  armor: NormalizedEquipmentArmorTemplate[]
}

export interface NormalizedEquipmentWeaponTemplate {
  id: string
  name: string
  tier: EquipmentTier
  weaponType: "primary" | "secondary"
  trait: EquipmentTrait
  damageType: EquipmentDamageType
  range: EquipmentRange
  burden: EquipmentBurden
  damage: string
  featureName?: string
  description?: string
  modifierContributions: NormalizedEquipmentModifierContributionTemplate[]
}

export interface NormalizedEquipmentArmorTemplate {
  id: string
  name: string
  tier: EquipmentTier
  baseArmorMax: number
  baseThresholds: { minor: number; major: number }
  featureName?: string
  description?: string
  modifierContributions: NormalizedEquipmentModifierContributionTemplate[]
}

export interface NormalizedEquipmentModifierContributionTemplate {
  id: string
  definition: {
    target: EquipmentModifierTargetId
    kind: "modifier"
  }
  editable: {
    label: string
    value: number
  }
}

export interface EquipmentPackConflictContext {
  builtinTemplateIds: ReadonlySet<string>
  importedTemplateIds: ReadonlySet<string>
  importedTemplateSources?: ReadonlyMap<string, { packId?: string }>
  customPackCount: number
  maxCustomPackCount: number
}

export interface EquipmentPackCommitPlanIdInput {
  name: string
  author: string
  version: string
  importTime: string
}

export interface EquipmentPackCommitPlan {
  packId: string
  packInfo: {
    id: string
    name: string
    version: string
    author: string
    description: string
    weaponCount: number
    armorCount: number
    importedAt: string
    disabled: false
  }
  packData: NormalizedEquipmentPackData
  templateIds: string[]
  source: {
    originKind: EquipmentPackImportOriginKind
    label?: string
    fileName?: string
    sizeBytes?: number
  }
  importTime: string
  disabled: false
}

export type EquipmentPackStorageResult =
  | { ok: true }
  | { ok: false; diagnostic: EquipmentPackImportDiagnostic }

export type EquipmentPackRegistryRebuildResult =
  | { ok: true }
  | { ok: false; diagnostic: EquipmentPackImportDiagnostic }

export interface EquipmentPackImportDependencies {
  conflictContext: EquipmentPackConflictContext
  storageTransaction: { commit(plan: EquipmentPackCommitPlan): Promise<EquipmentPackStorageResult> }
  registryRebuilder: { rebuild(): Promise<EquipmentPackRegistryRebuildResult> }
  createPackId(input: EquipmentPackCommitPlanIdInput): string
  now(): Date
}

export interface EquipmentPackImportResult {
  success: boolean
  stage: EquipmentPackImportPipelineStage
  mode: EquipmentPackImportMode
  summary: {
    packId?: string
    name?: string
    version?: string
    author?: string
    weaponCount: number
    armorCount: number
    warningCount: number
    errorCount: number
  }
  diagnostics: EquipmentPackImportDiagnostic[]
}
```

- [ ] **Step 5: Create JSON Pointer helper**

Create `equipment/import/json-pointer.ts`:

```ts
export function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1")
}

export function toJsonPointer(segments: Array<string | number>): string {
  if (segments.length === 0) {
    return ""
  }

  return `/${segments.map((segment) => escapeJsonPointerSegment(String(segment))).join("/")}`
}

export function appendJsonPointer(basePath: string, segment: string | number): string {
  const escaped = escapeJsonPointerSegment(String(segment))
  return basePath ? `${basePath}/${escaped}` : `/${escaped}`
}

export function getJsonPointerValue(value: unknown, path: string): unknown {
  if (path === "") {
    return value
  }

  return path
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce<unknown>((current, segment) => {
      if (current === undefined || current === null) {
        return undefined
      }

      if (Array.isArray(current)) {
        return current[Number(segment)]
      }

      if (typeof current === "object") {
        return (current as Record<string, unknown>)[segment]
      }

      return undefined
    }, value)
}
```

- [ ] **Step 6: Create diagnostic helpers**

Create `equipment/import/diagnostics.ts`:

```ts
import type {
  EquipmentPackImportDiagnostic,
  EquipmentPackImportErrorCode,
  EquipmentPackImportWarningCode,
} from "./types"

export function makeErrorDiagnostic(
  code: EquipmentPackImportErrorCode,
  path: string,
  message: string,
  extras: Pick<Extract<EquipmentPackImportDiagnostic, { severity: "error" }>, "value" | "relatedPaths"> = {},
): EquipmentPackImportDiagnostic {
  return {
    severity: "error",
    code,
    path,
    message,
    ...extras,
  }
}

export function makeWarningDiagnostic(
  code: EquipmentPackImportWarningCode,
  path: string,
  message: string,
  extras: Pick<Extract<EquipmentPackImportDiagnostic, { severity: "warning" }>, "value" | "relatedPaths"> = {},
): EquipmentPackImportDiagnostic {
  return {
    severity: "warning",
    code,
    path,
    message,
    ...extras,
  }
}

export function countDiagnostics(diagnostics: EquipmentPackImportDiagnostic[]) {
  return {
    warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
  }
}
```

- [ ] **Step 7: Run diagnostic tests**

Run:

```bash
pnpm vitest run equipment/import/__tests__/structural-diagnostics.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add equipment/import/constants.ts equipment/import/types.ts equipment/import/diagnostics.ts equipment/import/json-pointer.ts equipment/import/__tests__/structural-diagnostics.test.ts
git commit -m "feat: add equipment import diagnostic types"
```

### Task 3: Authoring Preprocess And Canonical Normalize

**Files:**

- Create: `equipment/import/aliases.ts`
- Create: `equipment/import/preprocess.ts`
- Create: `equipment/import/normalize.ts`
- Create: `equipment/import/__tests__/preprocess-normalize.test.ts`

- [ ] **Step 1: Write failing preprocess and normalize tests**

Create `equipment/import/__tests__/preprocess-normalize.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { normalizeEquipmentPack } from "@/equipment/import/normalize"
import { preprocessAuthoringInput } from "@/equipment/import/preprocess"

const validWeaponPack: Record<string, any> = {
  format: "daggerheart.equipment-pack.v1",
  name: "  暗影装备包  ",
  version: "1.0.0",
  equipment: {
    weapons: [
      {
        id: " 暗影装备包-测试作者-weapon-影刃 ",
        name: " 影刃 ",
        tier: "T1",
        weaponType: "primary",
        trait: " 敏捷 ",
        damageType: " 物理 ",
        range: " 近战 ",
        burden: " 单手 ",
        damage: " d8 ",
        description: "  描述  ",
      },
    ],
  },
}

describe("equipment pack authoring preprocess", () => {
  it("trims strings before converting zh-CN enum aliases", () => {
    const result = preprocessAuthoringInput(validWeaponPack)

    expect(result.diagnostics).toEqual([])
    expect(result.value).toMatchObject({
      name: "暗影装备包",
      equipment: {
        weapons: [
          {
            id: "暗影装备包-测试作者-weapon-影刃",
            name: "影刃",
            trait: "agility",
            damageType: "physical",
            range: "melee",
            burden: "oneHanded",
            damage: "d8",
          },
        ],
      },
    })
  })

  it("reports unknown Chinese enum aliases before structural validation", () => {
    const pack = structuredClone(validWeaponPack)
    pack.equipment.weapons[0].trait = "敏捷力"

    const result = preprocessAuthoringInput(pack)

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        code: "INVALID_ENUM",
        path: "/equipment/weapons/0/trait",
        value: "敏捷力",
      }),
    ])
  })
})

describe("equipment pack canonical normalize", () => {
  it("applies defaults and warning diagnostics", () => {
    const preprocessed = preprocessAuthoringInput(validWeaponPack)
    const normalized = normalizeEquipmentPack(preprocessed.value)

    expect(normalized.pack.metadata.author).toBe("Unknown")
    expect(normalized.pack.metadata.description).toBe("")
    expect(normalized.pack.armor).toEqual([])
    expect(normalized.pack.weapons[0].modifierContributions).toEqual([])
    expect(normalized.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "warning", code: "MISSING_AUTHOR", path: "/author" }),
        expect.objectContaining({
          severity: "warning",
          code: "MISSING_DESCRIPTION",
          path: "/description",
        }),
      ]),
    )
  })

  it("warns when a template has no featureName and no description", () => {
    const pack = structuredClone(validWeaponPack) as Record<string, any>
    delete pack.equipment.weapons[0].description

    const preprocessed = preprocessAuthoringInput(pack)
    const normalized = normalizeEquipmentPack(preprocessed.value)

    expect(normalized.pack.weapons[0]).not.toHaveProperty("featureName")
    expect(normalized.pack.weapons[0]).not.toHaveProperty("description")
    expect(normalized.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "warning",
          code: "MISSING_TEMPLATE_DESCRIPTION",
          path: "/equipment/weapons/0",
        }),
      ]),
    )
  })

  it("warns only for descriptions longer than 1000 and not longer than 4000", () => {
    const packAtLimit = { ...validWeaponPack, description: "x".repeat(1000) }
    const packLong = { ...validWeaponPack, description: "x".repeat(1001) }
    const packMax = { ...validWeaponPack, description: "x".repeat(4000) }

    expect(normalizeEquipmentPack(preprocessAuthoringInput(packAtLimit).value).diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "DESCRIPTION_LONG" })]),
    )
    expect(normalizeEquipmentPack(preprocessAuthoringInput(packLong).value).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "DESCRIPTION_LONG", path: "/description" })]),
    )
    expect(normalizeEquipmentPack(preprocessAuthoringInput(packMax).value).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "DESCRIPTION_LONG", path: "/description" })]),
    )
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run equipment/import/__tests__/preprocess-normalize.test.ts
```

Expected: FAIL with missing module errors.

- [ ] **Step 3: Create alias maps**

Create `equipment/import/aliases.ts`:

```ts
export const zhCnEnumAliases = {
  trait: {
    敏捷: "agility",
    力量: "strength",
    灵巧: "finesse",
    本能: "instinct",
    风度: "presence",
    知识: "knowledge",
  },
  damageType: {
    物理: "physical",
    魔法: "magic",
  },
  range: {
    近战: "melee",
    邻近: "veryClose",
    近距离: "close",
    远距离: "far",
    极远: "veryFar",
  },
  burden: {
    单手: "oneHanded",
    双手: "twoHanded",
  },
} as const

export const enumAliasFields = Object.keys(zhCnEnumAliases) as Array<keyof typeof zhCnEnumAliases>
```

- [ ] **Step 4: Create preprocess**

Create `equipment/import/preprocess.ts`:

```ts
import { makeErrorDiagnostic } from "./diagnostics"
import { appendJsonPointer } from "./json-pointer"
import { enumAliasFields, zhCnEnumAliases } from "./aliases"
import type { EquipmentPackImportDiagnostic } from "./types"

type PreprocessResult = {
  value: unknown
  diagnostics: EquipmentPackImportDiagnostic[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function cloneAndTrim(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim()
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneAndTrim(item))
  }

  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneAndTrim(item)]))
  }

  return value
}

function convertEnumAlias(
  value: unknown,
  path: string,
  diagnostics: EquipmentPackImportDiagnostic[],
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, index) => convertEnumAlias(item, appendJsonPointer(path, index), diagnostics))
  }

  if (!isRecord(value)) {
    return value
  }

  const converted: Record<string, unknown> = {}

  for (const [key, item] of Object.entries(value)) {
    const childPath = appendJsonPointer(path, key)

    if (enumAliasFields.includes(key as keyof typeof zhCnEnumAliases) && typeof item === "string") {
      const aliases = zhCnEnumAliases[key as keyof typeof zhCnEnumAliases] as Record<string, string>

      if (item in aliases) {
        converted[key] = aliases[item]
        continue
      }

      if (/[\u4e00-\u9fff]/.test(item)) {
        diagnostics.push(
          makeErrorDiagnostic("INVALID_ENUM", childPath, "Unknown Chinese enum alias.", {
            value: item,
          }),
        )
        converted[key] = item
        continue
      }
    }

    converted[key] = convertEnumAlias(item, childPath, diagnostics)
  }

  return converted
}

export function preprocessAuthoringInput(value: unknown): PreprocessResult {
  const diagnostics: EquipmentPackImportDiagnostic[] = []
  const trimmed = cloneAndTrim(value)
  const converted = convertEnumAlias(trimmed, "", diagnostics)

  return {
    value: converted,
    diagnostics,
  }
}
```

- [ ] **Step 5: Create normalize**

Create `equipment/import/normalize.ts`:

```ts
import {
  DEFAULT_EQUIPMENT_PACK_AUTHOR,
  DESCRIPTION_LONG_WARNING_THRESHOLD,
  EQUIPMENT_PACK_FORMAT,
} from "./constants"
import { makeWarningDiagnostic } from "./diagnostics"
import type {
  EquipmentPackImportDiagnostic,
  NormalizedEquipmentArmorTemplate,
  NormalizedEquipmentModifierContributionTemplate,
  NormalizedEquipmentPackData,
  NormalizedEquipmentWeaponTemplate,
} from "./types"

type RawRecord = Record<string, any>

function normalizeContributions(items: RawRecord[] | undefined): NormalizedEquipmentModifierContributionTemplate[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    definition: {
      target: item.definition.target,
      kind: "modifier",
    },
    editable: {
      label: item.editable.label,
      value: item.editable.value,
    },
  }))
}

function addDescriptionWarning(
  diagnostics: EquipmentPackImportDiagnostic[],
  description: string,
  path: string,
) {
  if (description.length > DESCRIPTION_LONG_WARNING_THRESHOLD && description.length <= 4000) {
    diagnostics.push(makeWarningDiagnostic("DESCRIPTION_LONG", path, "Description is long."))
  }
}

function normalizeWeapon(item: RawRecord, index: number, diagnostics: EquipmentPackImportDiagnostic[]) {
  const featureName = item.featureName ?? ""
  const description = item.description ?? ""

  if (!featureName && !description) {
    diagnostics.push(
      makeWarningDiagnostic(
        "MISSING_TEMPLATE_DESCRIPTION",
        `/equipment/weapons/${index}`,
        "Template has no feature name or description.",
      ),
    )
  }

  addDescriptionWarning(diagnostics, description, `/equipment/weapons/${index}/description`)

  return {
    id: item.id,
    name: item.name,
    tier: item.tier,
    weaponType: item.weaponType,
    trait: item.trait,
    damageType: item.damageType,
    range: item.range,
    burden: item.burden,
    damage: item.damage,
    ...(featureName ? { featureName } : {}),
    ...(description ? { description } : {}),
    modifierContributions: normalizeContributions(item.modifierContributions),
  } satisfies NormalizedEquipmentWeaponTemplate
}

function normalizeArmor(item: RawRecord, index: number, diagnostics: EquipmentPackImportDiagnostic[]) {
  const featureName = item.featureName ?? ""
  const description = item.description ?? ""

  if (!featureName && !description) {
    diagnostics.push(
      makeWarningDiagnostic(
        "MISSING_TEMPLATE_DESCRIPTION",
        `/equipment/armor/${index}`,
        "Template has no feature name or description.",
      ),
    )
  }

  addDescriptionWarning(diagnostics, description, `/equipment/armor/${index}/description`)

  return {
    id: item.id,
    name: item.name,
    tier: item.tier,
    baseArmorMax: item.baseArmorMax,
    baseThresholds: { ...item.baseThresholds },
    ...(featureName ? { featureName } : {}),
    ...(description ? { description } : {}),
    modifierContributions: normalizeContributions(item.modifierContributions),
  } satisfies NormalizedEquipmentArmorTemplate
}

export function normalizeEquipmentPack(value: unknown): {
  pack: NormalizedEquipmentPackData
  diagnostics: EquipmentPackImportDiagnostic[]
} {
  const input = value as RawRecord
  const equipment = input.equipment as RawRecord
  const diagnostics: EquipmentPackImportDiagnostic[] = []

  const author = input.author ?? DEFAULT_EQUIPMENT_PACK_AUTHOR
  const description = input.description ?? ""

  if (!input.author) {
    diagnostics.push(makeWarningDiagnostic("MISSING_AUTHOR", "/author", "Author is missing."))
  }

  if (!input.description) {
    diagnostics.push(
      makeWarningDiagnostic("MISSING_DESCRIPTION", "/description", "Description is missing."),
    )
  }

  addDescriptionWarning(diagnostics, description, "/description")

  return {
    pack: {
      metadata: {
        format: EQUIPMENT_PACK_FORMAT,
        name: input.name,
        version: input.version,
        author,
        description,
      },
      weapons: ((equipment.weapons ?? []) as RawRecord[]).map((item, index) =>
        normalizeWeapon(item, index, diagnostics),
      ),
      armor: ((equipment.armor ?? []) as RawRecord[]).map((item, index) =>
        normalizeArmor(item, index, diagnostics),
      ),
    },
    diagnostics,
  }
}
```

- [ ] **Step 6: Run preprocess/normalize tests**

Run:

```bash
pnpm vitest run equipment/import/__tests__/preprocess-normalize.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add equipment/import/aliases.ts equipment/import/preprocess.ts equipment/import/normalize.ts equipment/import/__tests__/preprocess-normalize.test.ts
git commit -m "feat: add equipment pack preprocess and normalize"
```

### Task 4: AJV Structural Validation And Diagnostic Mapping

**Files:**

- Create: `equipment/import/schema-validator.ts`
- Modify: `equipment/import/__tests__/structural-diagnostics.test.ts`

- [ ] **Step 1: Extend failing structural diagnostics tests**

Append to `equipment/import/__tests__/structural-diagnostics.test.ts`:

```ts
import { validateEquipmentPackStructure } from "@/equipment/import/schema-validator"

describe("equipment import structural validation", () => {
  it("maps required and additionalProperties paths", () => {
    const result = validateEquipmentPackStructure({
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "1.0.0",
      equipment: {
        weapons: [{ extra: true }],
      },
    })

    expect(result.success).toBe(false)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_FIELD", path: "/equipment/weapons/0/id" }),
        expect.objectContaining({ code: "UNKNOWN_FIELD", path: "/equipment/weapons/0/extra" }),
      ]),
    )
  })

  it("maps missing format separately from invalid format", () => {
    const missing = validateEquipmentPackStructure({ name: "包", version: "1.0.0", equipment: {} })
    const invalid = validateEquipmentPackStructure({
      format: "wrong",
      name: "包",
      version: "1.0.0",
      equipment: {},
    })

    expect(missing.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "MISSING_FIELD", path: "/format" })]),
    )
    expect(invalid.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "INVALID_FORMAT", path: "/format" })]),
    )
  })

  it("maps semver, enum, field length, contribution count, and values", () => {
    const pack = {
      format: "daggerheart.equipment-pack.v1",
      name: "x".repeat(101),
      version: "v1.0.0",
      author: "a".repeat(101),
      description: "d".repeat(4001),
      equipment: {
        weapons: [
          {
            id: "weapon",
            name: "Weapon",
            tier: "T9",
            weaponType: "primary",
            trait: "fast",
            damageType: "physical",
            range: "melee",
            burden: "oneHanded",
            damage: "x".repeat(41),
            modifierContributions: Array.from({ length: 21 }, (_, index) => ({
              id: `c-${index}`,
              definition: { target: "evasion", kind: "modifier" },
              editable: { label: `L${index}`, value: 1 },
            })),
          },
        ],
      },
    }

    const result = validateEquipmentPackStructure(pack)

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "FIELD_TOO_LONG", path: "/name", value: "x".repeat(101) }),
        expect.objectContaining({ code: "FIELD_TOO_LONG", path: "/author", value: "a".repeat(101) }),
        expect.objectContaining({ code: "FIELD_TOO_LONG", path: "/description", value: "d".repeat(4001) }),
        expect.objectContaining({ code: "INVALID_SEMVER", path: "/version", value: "v1.0.0" }),
        expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/tier", value: "T9" }),
        expect.objectContaining({
          code: "FIELD_TOO_LONG",
          path: "/equipment/weapons/0/damage",
          value: "x".repeat(41),
        }),
        expect.objectContaining({
          code: "TEMPLATE_LIMIT_EXCEEDED",
          path: "/equipment/weapons/0/modifierContributions",
        }),
      ]),
    )
  })

  it("accepts 4000-character descriptions but rejects 4001-character descriptions", () => {
    const accepted = {
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "1.0.0",
      description: "d".repeat(4000),
      equipment: {
        weapons: [
          {
            id: "weapon",
            name: "Weapon",
            tier: "T1",
            weaponType: "primary",
            trait: "agility",
            damageType: "physical",
            range: "melee",
            burden: "oneHanded",
            damage: "d8",
            description: "t".repeat(4000),
          },
        ],
      },
    }
    const rejected = structuredClone(accepted)
    rejected.equipment.weapons[0].description = "t".repeat(4001)

    expect(validateEquipmentPackStructure(accepted).success).toBe(true)
    expect(validateEquipmentPackStructure(rejected).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FIELD_TOO_LONG",
          path: "/equipment/weapons/0/description",
          value: "t".repeat(4001),
        }),
      ]),
    )
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run equipment/import/__tests__/structural-diagnostics.test.ts
```

Expected: FAIL with missing `schema-validator`.

- [ ] **Step 3: Create schema validator**

Create `equipment/import/schema-validator.ts`:

```ts
import Ajv2020, { type ErrorObject } from "ajv/dist/2020"
import schema from "@/public/schemas/equipment-pack.v1.schema.json"
import { makeErrorDiagnostic } from "./diagnostics"
import { appendJsonPointer, getJsonPointerValue } from "./json-pointer"
import type { EquipmentPackImportDiagnostic, EquipmentPackImportErrorCode } from "./types"

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

const keywordPriority: Record<string, number> = {
  required: 1,
  additionalProperties: 2,
  const: 3,
  enum: 4,
  pattern: 5,
  maxLength: 6,
  maxItems: 7,
  type: 8,
  minimum: 8,
  integer: 8,
  minLength: 8,
  not: 8,
}

function pathForError(error: ErrorObject): string {
  if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
    return appendJsonPointer(error.instancePath, error.params.missingProperty)
  }

  if (
    error.keyword === "additionalProperties" &&
    typeof error.params.additionalProperty === "string"
  ) {
    return appendJsonPointer(error.instancePath, error.params.additionalProperty)
  }

  return error.instancePath || ""
}

function codeForError(error: ErrorObject, path: string): EquipmentPackImportErrorCode {
  if (error.keyword === "required") return "MISSING_FIELD"
  if (error.keyword === "additionalProperties") return "UNKNOWN_FIELD"
  if (error.keyword === "const" && path === "/format") return "INVALID_FORMAT"
  if (error.keyword === "enum" || error.keyword === "const") return "INVALID_ENUM"
  if (error.keyword === "pattern" && path === "/version") return "INVALID_SEMVER"
  if (error.keyword === "maxLength") return "FIELD_TOO_LONG"
  if (error.keyword === "maxItems") return "TEMPLATE_LIMIT_EXCEEDED"
  return "INVALID_TYPE"
}

function messageForCode(code: EquipmentPackImportErrorCode): string {
  return {
    SOURCE_READ_FAILED: "Unable to read equipment pack source.",
    INVALID_JSON: "Invalid JSON.",
    INVALID_FORMAT: "Invalid equipment pack format.",
    MISSING_FIELD: "Required field is missing.",
    UNKNOWN_FIELD: "Unknown field is not allowed.",
    INVALID_TYPE: "Invalid field type or value.",
    INVALID_ENUM: "Invalid enum value.",
    INVALID_SEMVER: "Invalid semantic version.",
    DUPLICATE_ID: "Duplicate id.",
    ID_CONFLICT: "Id conflicts with existing template.",
    INVALID_CONTRIBUTION_TARGET: "Invalid contribution target.",
    EMPTY_EQUIPMENT: "Equipment pack must contain at least one template.",
    INVALID_THRESHOLD_ORDER: "Major threshold must be greater than or equal to minor threshold.",
    FILE_TOO_LARGE: "Equipment pack source is too large.",
    PACK_LIMIT_EXCEEDED: "Custom equipment pack limit exceeded.",
    TEMPLATE_LIMIT_EXCEEDED: "Template limit exceeded.",
    FIELD_TOO_LONG: "Field is too long.",
    STORAGE_QUOTA_EXCEEDED: "Storage quota exceeded.",
    STORAGE_SERIALIZE_FAILED: "Storage serialization failed.",
    STORAGE_WRITE_FAILED: "Storage write failed.",
    REGISTRY_REBUILD_FAILED: "Registry rebuild failed.",
  }[code]
}

export function validateEquipmentPackStructure(value: unknown):
  | { success: true; value: unknown; diagnostics: [] }
  | { success: false; diagnostics: EquipmentPackImportDiagnostic[] } {
  if (validate(value)) {
    return { success: true, value, diagnostics: [] }
  }

  const byPath = new Map<string, { priority: number; diagnostic: EquipmentPackImportDiagnostic }>()

  for (const error of validate.errors ?? []) {
    const path = pathForError(error)
    const code = codeForError(error, path)
    const priority = keywordPriority[error.keyword] ?? 99
    const current = byPath.get(path)

    if (current && current.priority <= priority) {
      continue
    }

    byPath.set(path, {
      priority,
      diagnostic: makeErrorDiagnostic(code, path, messageForCode(code), {
        value: error.keyword === "required" ? undefined : getJsonPointerValue(value, path),
      }),
    })
  }

  return {
    success: false,
    diagnostics: Array.from(byPath.values()).map((entry) => entry.diagnostic),
  }
}
```

- [ ] **Step 4: Run structural diagnostics tests**

Run:

```bash
pnpm vitest run equipment/import/__tests__/structural-diagnostics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add equipment/import/schema-validator.ts equipment/import/__tests__/structural-diagnostics.test.ts
git commit -m "feat: map equipment pack schema diagnostics"
```

### Task 5: Semantic Validation And Conflict Check

**Files:**

- Create: `equipment/import/semantic-validation.ts`
- Create: `equipment/import/__tests__/semantic-conflict.test.ts`

- [ ] **Step 1: Write failing semantic and conflict tests**

Create `equipment/import/__tests__/semantic-conflict.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  checkEquipmentPackConflicts,
  validateEquipmentPackSemantics,
} from "@/equipment/import/semantic-validation"
import type { NormalizedEquipmentPackData } from "@/equipment/import/types"

function createPack(overrides: Partial<NormalizedEquipmentPackData> = {}): NormalizedEquipmentPackData {
  return {
    metadata: {
      format: "daggerheart.equipment-pack.v1",
      name: "包",
      version: "1.0.0",
      author: "作者",
      description: "",
    },
    weapons: [
      {
        id: "pack-author-weapon-shadow",
        name: "影刃",
        tier: "T1",
        weaponType: "primary",
        trait: "agility",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
        damage: "d8",
        featureName: "",
        description: "",
        modifierContributions: [],
      },
    ],
    armor: [],
    ...overrides,
  }
}

describe("equipment pack semantic validation", () => {
  it("rejects an empty equipment pack", () => {
    const diagnostics = validateEquipmentPackSemantics(
      createPack({ weapons: [], armor: [] }),
    )

    expect(diagnostics).toEqual([
      expect.objectContaining({ severity: "error", code: "EMPTY_EQUIPMENT", path: "/equipment" }),
    ])
  })

  it("reports duplicate ids with related paths", () => {
    const diagnostics = validateEquipmentPackSemantics(
      createPack({
        weapons: [
          createPack().weapons[0],
          { ...createPack().weapons[0], name: "第二把" },
        ],
        armor: [],
      }),
    )

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_ID",
        path: "/equipment/weapons/1/id",
        relatedPaths: ["/equipment/weapons/0/id"],
      }),
    ])
  })

  it("reports duplicate contribution ids within the same template", () => {
    const diagnostics = validateEquipmentPackSemantics(
      createPack({
        weapons: [
          {
            ...createPack().weapons[0],
            modifierContributions: [
              {
                id: "duplicate-contribution",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "A", value: 1 },
              },
              {
                id: "duplicate-contribution",
                definition: { target: "armorMax", kind: "modifier" },
                editable: { label: "B", value: 2 },
              },
            ],
          },
        ],
      }),
    )

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_ID",
        path: "/equipment/weapons/0/modifierContributions/1/id",
        relatedPaths: ["/equipment/weapons/0/modifierContributions/0/id"],
      }),
    ])
  })

  it("rejects invalid armor threshold order", () => {
    const diagnostics = validateEquipmentPackSemantics(
      createPack({
        weapons: [],
        armor: [
          {
            id: "pack-author-armor-shadow",
            name: "影甲",
            tier: "T1",
            baseArmorMax: 4,
            baseThresholds: { minor: 15, major: 7 },
            featureName: "",
            description: "",
            modifierContributions: [],
          },
        ],
      }),
    )

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "INVALID_THRESHOLD_ORDER",
        path: "/equipment/armor/0/baseThresholds/major",
        value: { minor: 15, major: 7 },
      }),
    ])
  })
})

describe("equipment pack conflict check", () => {
  it("reports builtin and custom id conflicts without relatedPaths", () => {
    const diagnostics = checkEquipmentPackConflicts(createPack(), {
      builtinTemplateIds: new Set(["pack-author-weapon-shadow"]),
      importedTemplateIds: new Set(["custom-id"]),
      customPackCount: 0,
      maxCustomPackCount: 50,
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "ID_CONFLICT",
        path: "/equipment/weapons/0/id",
        value: { id: "pack-author-weapon-shadow", conflictSource: "builtin" },
      }),
    ])
    expect(diagnostics[0].relatedPaths).toBeUndefined()
  })

  it("reports imported custom id conflicts with optional packId metadata", () => {
    const diagnostics = checkEquipmentPackConflicts(createPack(), {
      builtinTemplateIds: new Set(),
      importedTemplateIds: new Set(["pack-author-weapon-shadow"]),
      importedTemplateSources: new Map([["pack-author-weapon-shadow", { packId: "existing-pack" }]]),
      customPackCount: 0,
      maxCustomPackCount: 50,
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "ID_CONFLICT",
        path: "/equipment/weapons/0/id",
        value: {
          id: "pack-author-weapon-shadow",
          conflictSource: "custom",
          packId: "existing-pack",
        },
      }),
    ])
    expect(diagnostics[0].relatedPaths).toBeUndefined()
  })

  it("reports pack count limit in dry-run-compatible conflict context", () => {
    const diagnostics = checkEquipmentPackConflicts(createPack(), {
      builtinTemplateIds: new Set(),
      importedTemplateIds: new Set(),
      customPackCount: 50,
      maxCustomPackCount: 50,
    })

    expect(diagnostics).toEqual([
      expect.objectContaining({ code: "PACK_LIMIT_EXCEEDED", path: "" }),
    ])
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run equipment/import/__tests__/semantic-conflict.test.ts
```

Expected: FAIL with missing `semantic-validation`.

- [ ] **Step 3: Create semantic validation and conflict check**

Create `equipment/import/semantic-validation.ts`:

```ts
import { makeErrorDiagnostic } from "./diagnostics"
import type {
  EquipmentPackConflictContext,
  EquipmentPackImportDiagnostic,
  NormalizedEquipmentPackData,
} from "./types"

type TemplateRef = { id: string; path: string }

function templateRefs(pack: NormalizedEquipmentPackData): TemplateRef[] {
  return [
    ...pack.weapons.map((template, index) => ({
      id: template.id,
      path: `/equipment/weapons/${index}/id`,
    })),
    ...pack.armor.map((template, index) => ({
      id: template.id,
      path: `/equipment/armor/${index}/id`,
    })),
  ]
}

export function validateEquipmentPackSemantics(
  pack: NormalizedEquipmentPackData,
): EquipmentPackImportDiagnostic[] {
  const diagnostics: EquipmentPackImportDiagnostic[] = []

  if (pack.weapons.length + pack.armor.length === 0) {
    diagnostics.push(makeErrorDiagnostic("EMPTY_EQUIPMENT", "/equipment", "Equipment pack is empty."))
  }

  const firstPathById = new Map<string, string>()
  for (const item of templateRefs(pack)) {
    const firstPath = firstPathById.get(item.id)
    if (firstPath) {
      diagnostics.push(
        makeErrorDiagnostic("DUPLICATE_ID", item.path, "Duplicate template id.", {
          value: item.id,
          relatedPaths: [firstPath],
        }),
      )
    } else {
      firstPathById.set(item.id, item.path)
    }
  }

  const templateGroups = [
    ...pack.weapons.map((template, templateIndex) => ({
      contributions: template.modifierContributions,
      basePath: `/equipment/weapons/${templateIndex}/modifierContributions`,
    })),
    ...pack.armor.map((template, templateIndex) => ({
      contributions: template.modifierContributions,
      basePath: `/equipment/armor/${templateIndex}/modifierContributions`,
    })),
  ]

  for (const group of templateGroups) {
    const firstContributionPathById = new Map<string, string>()
    for (const [contributionIndex, contribution] of group.contributions.entries()) {
      const path = `${group.basePath}/${contributionIndex}/id`
      const firstPath = firstContributionPathById.get(contribution.id)
      if (firstPath) {
        diagnostics.push(
          makeErrorDiagnostic("DUPLICATE_ID", path, "Duplicate contribution id.", {
            value: contribution.id,
            relatedPaths: [firstPath],
          }),
        )
      } else {
        firstContributionPathById.set(contribution.id, path)
      }
    }
  }

  for (const [index, armor] of pack.armor.entries()) {
    if (armor.baseThresholds.major < armor.baseThresholds.minor) {
      diagnostics.push(
        makeErrorDiagnostic(
          "INVALID_THRESHOLD_ORDER",
          `/equipment/armor/${index}/baseThresholds/major`,
          "Major threshold must be greater than or equal to minor threshold.",
          { value: { ...armor.baseThresholds } },
        ),
      )
    }
  }

  return diagnostics
}

export function checkEquipmentPackConflicts(
  pack: NormalizedEquipmentPackData,
  context: EquipmentPackConflictContext,
): EquipmentPackImportDiagnostic[] {
  const diagnostics: EquipmentPackImportDiagnostic[] = []

  if (context.customPackCount >= context.maxCustomPackCount) {
    diagnostics.push(
      makeErrorDiagnostic("PACK_LIMIT_EXCEEDED", "", "Custom equipment pack limit exceeded.", {
        value: {
          customPackCount: context.customPackCount,
          maxCustomPackCount: context.maxCustomPackCount,
        },
      }),
    )
  }

  for (const template of templateRefs(pack)) {
    if (context.builtinTemplateIds.has(template.id)) {
      diagnostics.push(
        makeErrorDiagnostic("ID_CONFLICT", template.path, "Template id conflicts with builtin equipment.", {
          value: { id: template.id, conflictSource: "builtin" },
        }),
      )
      continue
    }

    if (context.importedTemplateIds.has(template.id)) {
      diagnostics.push(
        makeErrorDiagnostic("ID_CONFLICT", template.path, "Template id conflicts with imported equipment.", {
          value: {
            id: template.id,
            conflictSource: "custom",
            ...context.importedTemplateSources?.get(template.id),
          },
        }),
      )
    }
  }

  return diagnostics
}
```

- [ ] **Step 4: Run semantic/conflict tests**

Run:

```bash
pnpm vitest run equipment/import/__tests__/semantic-conflict.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add equipment/import/semantic-validation.ts equipment/import/__tests__/semantic-conflict.test.ts
git commit -m "feat: validate equipment pack semantic conflicts"
```

### Task 6: Dry Run Import Pipeline

**Files:**

- Create: `equipment/import/import-pipeline.ts`
- Create: `equipment/import/__tests__/pipeline-dry-run.test.ts`

- [ ] **Step 1: Write failing dry-run pipeline tests**

Create `equipment/import/__tests__/pipeline-dry-run.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { importEquipmentPackFromSource } from "@/equipment/import/import-pipeline"
import type { EquipmentPackImportDependencies, EquipmentPackImportSource } from "@/equipment/import/types"

const validWeaponPack = {
  format: "daggerheart.equipment-pack.v1",
  name: "暗影装备包",
  version: "1.0.0",
  author: "测试作者",
  equipment: {
    weapons: [
      {
        id: "暗影装备包-测试作者-weapon-影刃",
        name: "影刃",
        tier: "T1",
        weaponType: "primary",
        trait: "agility",
        damageType: "physical",
        range: "melee",
        burden: "oneHanded",
        damage: "d8",
        featureName: "暗影",
        description: "在阴影中闪烁。",
      },
    ],
  },
}

function createObjectSource(value: unknown, sizeBytes?: number): EquipmentPackImportSource {
  return {
    origin: { kind: "object", label: "test object" },
    async read() {
      return { kind: "parsedObject", value, sizeBytes }
    },
  }
}

function createJsonSource(text: string, sizeBytes?: number): EquipmentPackImportSource {
  return {
    origin: { kind: "file", fileName: "pack.json" },
    async read() {
      return { kind: "jsonText", text, sizeBytes }
    },
  }
}

function createBuiltinSource(value: unknown, sizeBytes?: number): EquipmentPackImportSource {
  return {
    origin: { kind: "builtin", label: "builtin fixture" },
    async read() {
      return { kind: "parsedObject", value, sizeBytes }
    },
  }
}

function createDependencies(
  overrides: Partial<EquipmentPackImportDependencies> = {},
): EquipmentPackImportDependencies {
  return {
    conflictContext: {
      builtinTemplateIds: new Set(),
      importedTemplateIds: new Set(),
      customPackCount: 0,
      maxCustomPackCount: 50,
    },
    storageTransaction: { commit: vi.fn(async () => ({ ok: true } as const)) },
    registryRebuilder: { rebuild: vi.fn(async () => ({ ok: true } as const)) },
    createPackId: vi.fn(() => "pack-test-id"),
    now: () => new Date("2026-05-31T00:00:00.000Z"),
    ...overrides,
  }
}

describe("equipment pack dry run pipeline", () => {
  it("runs valid object source to stageCommitData without storage or registry calls", async () => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(
      createObjectSource(validWeaponPack),
      { mode: "dryRun" },
      dependencies,
    )

    expect(result).toMatchObject({
      success: true,
      stage: "stageCommitData",
      mode: "dryRun",
      summary: {
        packId: "pack-test-id",
        name: "暗影装备包",
        version: "1.0.0",
        author: "测试作者",
        weaponCount: 1,
        armorCount: 0,
        warningCount: 0,
        errorCount: 0,
      },
      diagnostics: [],
    })
    expect(dependencies.storageTransaction.commit).not.toHaveBeenCalled()
    expect(dependencies.registryRebuilder.rebuild).not.toHaveBeenCalled()
  })

  it("defaults mode to dryRun to avoid accidental writes", async () => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(createObjectSource(validWeaponPack), {}, dependencies)

    expect(result).toMatchObject({ success: true, stage: "stageCommitData", mode: "dryRun" })
    expect(dependencies.storageTransaction.commit).not.toHaveBeenCalled()
    expect(dependencies.registryRebuilder.rebuild).not.toHaveBeenCalled()
  })

  it("calls fake storage/registry only for explicit commit mode", async () => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(
      createObjectSource(validWeaponPack),
      { mode: "commit" },
      dependencies,
    )

    expect(result).toMatchObject({ success: true, stage: "registryRebuild", mode: "commit" })
    expect(dependencies.storageTransaction.commit).toHaveBeenCalledTimes(1)
    expect(dependencies.registryRebuilder.rebuild).toHaveBeenCalledTimes(1)
  })

  it("maps fake storage and registry failures in explicit commit mode", async () => {
    const storageFailure = createDependencies({
      storageTransaction: {
        commit: vi.fn(async () => ({
          ok: false,
          diagnostic: {
            severity: "error",
            code: "STORAGE_WRITE_FAILED",
            path: "",
            message: "Storage write failed.",
          },
        } as const)),
      },
    })
    const registryFailure = createDependencies({
      registryRebuilder: {
        rebuild: vi.fn(async () => ({
          ok: false,
          diagnostic: {
            severity: "error",
            code: "REGISTRY_REBUILD_FAILED",
            path: "",
            message: "Registry rebuild failed.",
          },
        } as const)),
      },
    })

    const storageResult = await importEquipmentPackFromSource(
      createObjectSource(validWeaponPack),
      { mode: "commit" },
      storageFailure,
    )
    const registryResult = await importEquipmentPackFromSource(
      createObjectSource(validWeaponPack),
      { mode: "commit" },
      registryFailure,
    )

    expect(storageResult).toMatchObject({
      success: false,
      stage: "storageTransaction",
      diagnostics: [expect.objectContaining({ code: "STORAGE_WRITE_FAILED" })],
    })
    expect(storageFailure.registryRebuilder.rebuild).not.toHaveBeenCalled()
    expect(registryResult).toMatchObject({
      success: false,
      stage: "registryRebuild",
      diagnostics: [expect.objectContaining({ code: "REGISTRY_REBUILD_FAILED" })],
    })
  })

  it("stops at sourceRead for source failures and large files", async () => {
    const dependencies = createDependencies()
    const source: EquipmentPackImportSource = {
      origin: { kind: "file", fileName: "broken.json" },
      async read() {
        throw new Error("read failed")
      },
    }

    const readFailure = await importEquipmentPackFromSource(source, { mode: "dryRun" }, dependencies)
    const largeFile = await importEquipmentPackFromSource(
      createJsonSource("{}", 500 * 1024 + 1),
      { mode: "dryRun" },
      dependencies,
    )

    expect(readFailure).toMatchObject({
      success: false,
      stage: "sourceRead",
      diagnostics: [expect.objectContaining({ code: "SOURCE_READ_FAILED", path: "" })],
    })
    expect(largeFile).toMatchObject({
      success: false,
      stage: "sourceRead",
      diagnostics: [expect.objectContaining({ code: "FILE_TOO_LARGE", path: "" })],
    })
  })

  it("does not apply the user-file size gate to builtin sources", async () => {
    const dependencies = createDependencies()

    const result = await importEquipmentPackFromSource(
      createBuiltinSource(validWeaponPack, 500 * 1024 + 1),
      { mode: "dryRun" },
      dependencies,
    )

    expect(result).toMatchObject({ success: true, stage: "stageCommitData" })
  })

  it("stops at jsonParse for invalid JSON text", async () => {
    const result = await importEquipmentPackFromSource(
      createJsonSource("{ invalid"),
      { mode: "dryRun" },
      createDependencies(),
    )

    expect(result).toMatchObject({
      success: false,
      stage: "jsonParse",
      diagnostics: [expect.objectContaining({ code: "INVALID_JSON", path: "" })],
    })
  })

  it("stops at authoringPreprocess for unknown Chinese aliases", async () => {
    const pack = structuredClone(validWeaponPack) as Record<string, any>
    pack.equipment.weapons[0].trait = "敏捷力"

    const result = await importEquipmentPackFromSource(createObjectSource(pack), { mode: "dryRun" }, createDependencies())

    expect(result).toMatchObject({
      success: false,
      stage: "authoringPreprocess",
      diagnostics: [expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/trait" })],
    })
  })

  it("stops at structuralValidation for unknown English enum values", async () => {
    const pack = structuredClone(validWeaponPack) as Record<string, any>
    pack.equipment.weapons[0].trait = "fast"

    const result = await importEquipmentPackFromSource(createObjectSource(pack), { mode: "dryRun" }, createDependencies())

    expect(result).toMatchObject({
      success: false,
      stage: "structuralValidation",
      diagnostics: [expect.objectContaining({ code: "INVALID_ENUM", path: "/equipment/weapons/0/trait" })],
    })
  })

  it("stops at semanticValidation for empty equipment", async () => {
    const pack = { ...validWeaponPack, equipment: {} }

    const result = await importEquipmentPackFromSource(createObjectSource(pack), { mode: "dryRun" }, createDependencies())

    expect(result).toMatchObject({
      success: false,
      stage: "semanticValidation",
      diagnostics: [expect.objectContaining({ code: "EMPTY_EQUIPMENT", path: "/equipment" })],
    })
  })

  it("keeps warnings when a later conflict fails", async () => {
    const dependencies = createDependencies({
      conflictContext: {
        builtinTemplateIds: new Set(["暗影装备包-测试作者-weapon-影刃"]),
        importedTemplateIds: new Set(),
        customPackCount: 0,
        maxCustomPackCount: 50,
      },
    })
    const pack = structuredClone(validWeaponPack)

    const result = await importEquipmentPackFromSource(createObjectSource(pack), { mode: "dryRun" }, dependencies)

    expect(result).toMatchObject({
      success: false,
      stage: "conflictCheck",
      summary: { warningCount: 1, errorCount: 1 },
    })
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "warning", code: "MISSING_DESCRIPTION" }),
        expect.objectContaining({ severity: "error", code: "ID_CONFLICT" }),
      ]),
    )
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
pnpm vitest run equipment/import/__tests__/pipeline-dry-run.test.ts
```

Expected: FAIL with missing `import-pipeline`.

- [ ] **Step 3: Create the import pipeline**

Create `equipment/import/import-pipeline.ts`:

```ts
import { MAX_EQUIPMENT_PACK_FILE_SIZE_BYTES } from "./constants"
import { countDiagnostics, makeErrorDiagnostic } from "./diagnostics"
import { normalizeEquipmentPack } from "./normalize"
import { preprocessAuthoringInput } from "./preprocess"
import { validateEquipmentPackStructure } from "./schema-validator"
import { checkEquipmentPackConflicts, validateEquipmentPackSemantics } from "./semantic-validation"
import type {
  EquipmentPackCommitPlan,
  EquipmentPackImportDependencies,
  EquipmentPackImportDiagnostic,
  EquipmentPackImportMode,
  EquipmentPackImportOptions,
  EquipmentPackImportResult,
  EquipmentPackImportSource,
  EquipmentPackRawPayload,
  EquipmentPackImportPipelineStage,
  NormalizedEquipmentPackData,
} from "./types"

function resultFromDiagnostics(params: {
  stage: EquipmentPackImportPipelineStage
  success: boolean
  mode: EquipmentPackImportMode
  diagnostics: EquipmentPackImportDiagnostic[]
  pack?: NormalizedEquipmentPackData
  packId?: string
}): EquipmentPackImportResult {
  const counts = countDiagnostics(params.diagnostics)

  return {
    success: params.success,
    stage: params.stage,
    mode: params.mode,
    summary: {
      packId: params.packId,
      name: params.pack?.metadata.name,
      version: params.pack?.metadata.version,
      author: params.pack?.metadata.author,
      weaponCount: params.pack?.weapons.length ?? 0,
      armorCount: params.pack?.armor.length ?? 0,
      ...counts,
    },
    diagnostics: params.diagnostics,
  }
}

function hasErrors(diagnostics: EquipmentPackImportDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error")
}

function checkSize(
  source: EquipmentPackImportSource,
  payload: EquipmentPackRawPayload,
): EquipmentPackImportDiagnostic | null {
  if (source.origin.kind === "builtin") {
    return null
  }

  const sizeBytes =
    payload.sizeBytes ??
    (payload.kind === "jsonText" ? new TextEncoder().encode(payload.text).byteLength : undefined)

  if (sizeBytes !== undefined && sizeBytes > MAX_EQUIPMENT_PACK_FILE_SIZE_BYTES) {
    return makeErrorDiagnostic("FILE_TOO_LARGE", "", "Equipment pack source is too large.", {
      value: { sizeBytes, maxSizeBytes: MAX_EQUIPMENT_PACK_FILE_SIZE_BYTES },
    })
  }

  return null
}

function buildCommitPlan(
  pack: NormalizedEquipmentPackData,
  source: EquipmentPackImportSource,
  payload: EquipmentPackRawPayload,
  dependencies: EquipmentPackImportDependencies,
): EquipmentPackCommitPlan {
  const importTime = dependencies.now().toISOString()
  const packId = dependencies.createPackId({
    name: pack.metadata.name,
    author: pack.metadata.author,
    version: pack.metadata.version,
    importTime,
  })
  const templateIds = [
    ...pack.weapons.map((template) => template.id),
    ...pack.armor.map((template) => template.id),
  ]

  return {
    packId,
    packInfo: {
      id: packId,
      name: pack.metadata.name,
      version: pack.metadata.version,
      author: pack.metadata.author,
      description: pack.metadata.description,
      weaponCount: pack.weapons.length,
      armorCount: pack.armor.length,
      importedAt: importTime,
      disabled: false,
    },
    packData: pack,
    templateIds,
    source: {
      originKind: source.origin.kind,
      label: source.origin.label,
      fileName: source.origin.fileName,
      sizeBytes: payload.sizeBytes,
    },
    importTime,
    disabled: false,
  }
}

export async function importEquipmentPackFromSource(
  source: EquipmentPackImportSource,
  options: EquipmentPackImportOptions,
  dependencies: EquipmentPackImportDependencies,
): Promise<EquipmentPackImportResult> {
  const mode = options.mode ?? "dryRun"
  let payload: EquipmentPackRawPayload

  try {
    payload = await source.read()
  } catch {
    return resultFromDiagnostics({
      stage: "sourceRead",
      success: false,
      mode,
      diagnostics: [makeErrorDiagnostic("SOURCE_READ_FAILED", "", "Unable to read equipment pack source.")],
    })
  }

  const sizeDiagnostic = checkSize(source, payload)
  if (sizeDiagnostic) {
    return resultFromDiagnostics({
      stage: "sourceRead",
      success: false,
      mode,
      diagnostics: [sizeDiagnostic],
    })
  }

  let parsed: unknown
  if (payload.kind === "jsonText") {
    try {
      parsed = JSON.parse(payload.text)
    } catch {
      return resultFromDiagnostics({
        stage: "jsonParse",
        success: false,
        mode,
        diagnostics: [makeErrorDiagnostic("INVALID_JSON", "", "Invalid JSON.")],
      })
    }
  } else {
    parsed = payload.value
  }

  const preprocessed = preprocessAuthoringInput(parsed)
  if (hasErrors(preprocessed.diagnostics)) {
    return resultFromDiagnostics({
      stage: "authoringPreprocess",
      success: false,
      mode,
      diagnostics: preprocessed.diagnostics,
    })
  }

  const structural = validateEquipmentPackStructure(preprocessed.value)
  if (!structural.success) {
    return resultFromDiagnostics({
      stage: "structuralValidation",
      success: false,
      mode,
      diagnostics: [...preprocessed.diagnostics, ...structural.diagnostics],
    })
  }

  const normalized = normalizeEquipmentPack(structural.value)
  const semanticDiagnostics = validateEquipmentPackSemantics(normalized.pack)
  if (semanticDiagnostics.length > 0) {
    return resultFromDiagnostics({
      stage: "semanticValidation",
      success: false,
      mode,
      pack: normalized.pack,
      diagnostics: [...preprocessed.diagnostics, ...normalized.diagnostics, ...semanticDiagnostics],
    })
  }

  const conflictDiagnostics = checkEquipmentPackConflicts(normalized.pack, dependencies.conflictContext)
  if (conflictDiagnostics.length > 0) {
    return resultFromDiagnostics({
      stage: "conflictCheck",
      success: false,
      mode,
      pack: normalized.pack,
      diagnostics: [...preprocessed.diagnostics, ...normalized.diagnostics, ...conflictDiagnostics],
    })
  }

  const plan = buildCommitPlan(normalized.pack, source, payload, dependencies)
  const diagnostics = [...preprocessed.diagnostics, ...normalized.diagnostics]

  if (mode === "dryRun") {
    return resultFromDiagnostics({
      stage: "stageCommitData",
      success: true,
      mode,
      pack: normalized.pack,
      packId: plan.packId,
      diagnostics,
    })
  }

  const storageResult = await dependencies.storageTransaction.commit(plan)
  if (!storageResult.ok) {
    return resultFromDiagnostics({
      stage: "storageTransaction",
      success: false,
      mode,
      pack: normalized.pack,
      packId: plan.packId,
      diagnostics: [...diagnostics, storageResult.diagnostic],
    })
  }

  const registryResult = await dependencies.registryRebuilder.rebuild()
  if (!registryResult.ok) {
    return resultFromDiagnostics({
      stage: "registryRebuild",
      success: false,
      mode,
      pack: normalized.pack,
      packId: plan.packId,
      diagnostics: [...diagnostics, registryResult.diagnostic],
    })
  }

  return resultFromDiagnostics({
    stage: "registryRebuild",
    success: true,
    mode,
    pack: normalized.pack,
    packId: plan.packId,
    diagnostics,
  })
}
```

- [ ] **Step 4: Run dry-run pipeline tests**

Run:

```bash
pnpm vitest run equipment/import/__tests__/pipeline-dry-run.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all equipment import tests**

Run:

```bash
pnpm vitest run equipment/import
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add equipment/import/import-pipeline.ts equipment/import/__tests__/pipeline-dry-run.test.ts
git commit -m "feat: add equipment pack dry run pipeline"
```

### Task 7: Final Verification And Scope Guard

**Files:**

- No planned file edits. This task verifies tests, typecheck, and scope.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm vitest run equipment/import
```

Expected: PASS.

- [ ] **Step 2: Run existing equipment tests**

Run:

```bash
pnpm vitest run tests/unit/equipment
```

Expected: PASS. These tests prove the new import module did not disturb existing automation equipment helpers.

- [ ] **Step 3: Run TypeScript check through build-free compiler**

Run:

```bash
pnpm tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Confirm docs/refs untouched**

Run:

```bash
git status --short docs/refs
```

Expected: no output.

- [ ] **Step 5: Review implementation against Stage 1+2 specs**

Check these requirements manually:

- `public/schemas/equipment-pack.v1.schema.json` is the only schema copy.
- `equipment/import/` contains the dry-run implementation.
- No production import code was added under `automation/equipment/`.
- Dry run returns `stage: "stageCommitData"` and never calls storage/registry fakes.
- Default mode is `dryRun`; explicit `mode: "commit"` only calls injected fake storage/registry dependencies in tests.
- Unknown English enum reaches structural validation, not authoring preprocess.
- Unknown Chinese enum alias stops at `authoringPreprocess`.
- Missing `format` maps to `MISSING_FIELD`.
- Wrong `format` maps to `INVALID_FORMAT`.
- `modifierContributions` maxItems maps to `TEMPLATE_LIMIT_EXCEEDED`.
- Weapon/armor arrays have no maxItems.
- `packId` is generated in commit plan and not used as template identity.

- [ ] **Step 6: Stop if spec changes appear necessary**

If Step 5 reveals a real spec issue, stop and report it. Do not change Stage 1/2 spec documents inside this implementation plan.

## Self-Review

Spec coverage:

- Stage 1 Public Schema: Task 1.
- Diagnostic type and path model: Task 2.
- Authoring preprocess, trim, alias, defaults, warning diagnostics: Task 3.
- AJV mapping and raw AJV isolation: Task 4.
- Semantic validation and conflict context: Task 5.
- `stage + success + mode`, dryRun, fake storage/registry boundaries, commit plan: Task 6.
- Final verification and docs/refs guard: Task 7.

No Stage 3 behavior is implemented. Real storage transaction and real registry rebuild remain explicitly out of scope.
