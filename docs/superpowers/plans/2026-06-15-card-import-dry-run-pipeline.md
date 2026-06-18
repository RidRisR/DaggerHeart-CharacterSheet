# Card Import Dry-run Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-wave card import dry-run pipeline: source intake, external contract guard, legacy adapter, internal English validation schema, dry-run validation model, semantic validation, and structured diagnostics without writing card/image storage.

**Architecture:** Follow the equipment import pipeline shape, but stop before conflict check and commit. Legacy no-format card packs first pass an External Contract Guard that decides whether the public legacy shape is structurally interpretable, then the adapter translates the guarded legacy shape into `daggerheart.card-pack.v1`. Direct v1 input is accepted; unsupported `format` fails. Editor-only authoring regularity diagnostics are kept separate from formal import blocking rules.

**Tech Stack:** TypeScript, Vitest, Ajv 2020, JSZip, existing card type modules, Next path aliases.

---

## File Structure

- Create `card/import/types.ts`: import source, payload, pipeline stage, diagnostics, internal v1 shape, dry-run model, and result types.
- Create `card/import/diagnostics.ts`: diagnostic constructors and severity counting.
- Create `card/import/json-pointer.ts`: small JSON Pointer helpers copied in style from equipment import.
- Create `card/import/source.ts`: object/json/dhcb source helpers used by tests and later UI wiring.
- Create `card/import/card-pack-v1.schema.ts`: internal, non-public schema object for `daggerheart.card-pack.v1`.
- Create `card/import/external-contract-guard.ts`: admissibility guard for structurally interpretable accepted external legacy contracts.
- Create `card/import/legacy-adapter.ts`: Legacy Card Format to internal English v1 adapter, including effective definitions derivation.
- Create `card/import/schema-validator.ts`: Ajv wrapper mapping schema errors to `CardImportDiagnostic`.
- Create `card/import/dry-run-model.ts`: schema value to dry-run validation model.
- Create `card/import/semantic-validation.ts`: formal dry-run semantic rules only.
- Create `card/import/import-pipeline.ts`: stage orchestration, no storage dependency.
- Create `card/import/__tests__/legacy-adapter.test.ts`: adapter compatibility and unknown legacy field warnings.
- Create `card/import/__tests__/external-contract-guard.test.ts`: legacy public-contract admissibility errors before adaptation.
- Create `card/import/__tests__/schema.test.ts`: internal schema acceptance/rejection.
- Create `card/import/__tests__/pipeline-dry-run.test.ts`: full dry-run stage behavior, JSON/dhcb/format routing/no-storage guarantees.
- Create `card/import/__tests__/semantic-validation.test.ts`: duplicate IDs, required fields, definitions, and non-blocking ancestry/subclass group sizes.
- Create `app/card-editor/services/editor-authoring-diagnostics.ts`: pure editor-local ancestry pair and subclass triple diagnostics.
- Create `app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts`: editor-only diagnostics are stricter than formal import.

Do not modify `card/stores/store-actions.ts`, card-manager UI, editor toolbar, localStorage, IndexedDB, or public docs/schemas in this first wave.

---

### Task 1: Core Import Types And Diagnostics

**Files:**
- Create: `card/import/types.ts`
- Create: `card/import/diagnostics.ts`
- Create: `card/import/json-pointer.ts`
- Test: `card/import/__tests__/diagnostics.test.ts`

- [ ] **Step 1: Write the failing diagnostics test**

Create `card/import/__tests__/diagnostics.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { appendJsonPointer, getJsonPointerValue } from "@/card/import/json-pointer"
import { countCardImportDiagnostics, makeCardImportError, makeCardImportWarning } from "@/card/import/diagnostics"

describe("card import diagnostics", () => {
  it("builds diagnostics and counts severities", () => {
    const diagnostics = [
      makeCardImportError("INVALID_JSON", "", "Invalid JSON."),
      makeCardImportWarning("LEGACY_FORMAT_ASSUMED", "", "No format field; using legacy card format."),
    ]

    expect(countCardImportDiagnostics(diagnostics)).toEqual({ errorCount: 1, warningCount: 1 })
    expect(diagnostics[0]).toMatchObject({ severity: "error", code: "INVALID_JSON", path: "" })
    expect(diagnostics[1]).toMatchObject({ severity: "warning", code: "LEGACY_FORMAT_ASSUMED", path: "" })
  })

  it("handles json pointer append and lookup", () => {
    const value = { classes: [{ name: "战士" }] }

    expect(appendJsonPointer("", "classes")).toBe("/classes")
    expect(appendJsonPointer("/classes", 0)).toBe("/classes/0")
    expect(getJsonPointerValue(value, "/classes/0/name")).toBe("战士")
    expect(getJsonPointerValue(value, "/missing")).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm run test:run -- card/import/__tests__/diagnostics.test.ts
```

Expected: fail because `card/import/*` files do not exist.

- [ ] **Step 3: Add `card/import/types.ts`**

Create `card/import/types.ts`:

```ts
export type CardImportOriginKind = "file" | "object" | "builtin" | "container"
export type CardImportMode = "dryRun"

export type CardImportPipelineStage =
  | "sourceRead"
  | "jsonParse"
  | "externalContractGuard"
  | "externalFormatAdapter"
  | "structuralValidation"
  | "dryRunValidationModel"
  | "semanticValidation"

export type CardImportErrorCode =
  | "SOURCE_READ_FAILED"
  | "INVALID_JSON"
  | "INVALID_DHCB"
  | "MISSING_CARDS_JSON"
  | "UNSUPPORTED_FORMAT"
  | "INVALID_FORMAT"
  | "MISSING_FIELD"
  | "UNKNOWN_FIELD"
  | "INVALID_TYPE"
  | "INVALID_VALUE"
  | "DUPLICATE_ID"
  | "UNKNOWN_REFERENCE"
  | "ORPHAN_IMAGE"

export type CardImportWarningCode =
  | "LEGACY_FORMAT_ASSUMED"
  | "LEGACY_UNKNOWN_FIELD_DROPPED"
  | "DEFINITIONS_DERIVED"
  | "EXPLICIT_DEFINITION_UNUSED"
  | "VARIANT_TYPES_DERIVED"

export type CardImportDiagnostic =
  | {
      severity: "error"
      code: CardImportErrorCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }
  | {
      severity: "warning"
      code: CardImportWarningCode
      path: string
      message: string
      value?: unknown
      relatedPaths?: string[]
    }

export type CardPackRawPayload =
  | { kind: "jsonText"; text: string; sizeBytes?: number }
  | { kind: "parsedObject"; value: unknown; sizeBytes?: number }
  | { kind: "dhcbBytes"; bytes: ArrayBuffer; sizeBytes?: number }

export interface CardImportSource {
  origin: {
    kind: CardImportOriginKind
    label?: string
    fileName?: string
  }
  read(): Promise<CardPackRawPayload>
}

export interface CardPackImportOptions {
  mode?: CardImportMode
}

export interface CardPackV1Definitions {
  classes?: string[]
  ancestries?: string[]
  communities?: string[]
  domains?: string[]
  variants?: string[]
  variantTypes?: Record<string, { description?: string; subclasses?: string[]; levelRange?: [number, number] }>
}

export interface CardPackV1 {
  format: "daggerheart.card-pack.v1"
  name?: string
  version?: string
  author?: string
  description?: string
  definitions?: CardPackV1Definitions
  classes?: CardClassV1[]
  ancestries?: CardAncestryV1[]
  communities?: CardCommunityV1[]
  subclasses?: CardSubclassV1[]
  domains?: CardDomainV1[]
  variants?: CardVariantV1[]
}

export interface CardBaseV1 {
  id: string
  name: string
  imageUrl?: string
  hasLocalImage?: boolean
}

export interface CardClassV1 extends CardBaseV1 {
  summary: string
  domain1: string
  domain2: string
  startingHitPoints: number
  startingEvasion: number
  startingItems: string
  hopeFeature: string
  classFeature: string
}

export interface CardAncestryV1 extends CardBaseV1 {
  ancestry: string
  summary: string
  effect: string
  category: number
}

export interface CardCommunityV1 extends CardBaseV1 {
  feature: string
  summary: string
  description: string
}

export interface CardSubclassV1 extends CardBaseV1 {
  description: string
  class: string
  subclass: string
  level: string
  spellcastTrait: string
}

export interface CardDomainV1 extends CardBaseV1 {
  domain: string
  description: string
  level: number
  trait: string
  recallCost: number
}

export interface CardVariantV1 extends CardBaseV1 {
  type: string
  subCategory?: string
  level?: number
  effect: string
  summaryItems?: {
    item1?: string
    item2?: string
    item3?: string
  }
}

export type CardPackDryRunCard =
  | (CardClassV1 & { group: "classes" })
  | (CardAncestryV1 & { group: "ancestries" })
  | (CardCommunityV1 & { group: "communities" })
  | (CardSubclassV1 & { group: "subclasses" })
  | (CardDomainV1 & { group: "domains" })
  | (CardVariantV1 & { group: "variants" })

export interface CardImportImageAsset {
  cardId: string
  path: string
  sizeBytes?: number
  mimeType?: string
}

export interface CardPackDryRunValidationModel {
  metadata: {
    format: "daggerheart.card-pack.v1"
    name?: string
    version?: string
    author?: string
    description?: string
  }
  definitions: Required<Pick<CardPackV1Definitions, "classes" | "ancestries" | "communities" | "domains" | "variants">> & {
    variantTypes: NonNullable<CardPackV1Definitions["variantTypes"]>
  }
  cards: CardPackDryRunCard[]
  imageAssets: CardImportImageAsset[]
}

export interface CardPackImportResult {
  success: boolean
  stage: CardImportPipelineStage
  mode: CardImportMode
  model?: CardPackDryRunValidationModel
  summary: {
    name?: string
    version?: string
    author?: string
    cardCount: number
    warningCount: number
    errorCount: number
  }
  diagnostics: CardImportDiagnostic[]
}
```

- [ ] **Step 4: Add diagnostics and json-pointer helpers**

Create `card/import/diagnostics.ts`:

```ts
import type { CardImportDiagnostic, CardImportErrorCode, CardImportWarningCode } from "./types"

export function makeCardImportError(
  code: CardImportErrorCode,
  path: string,
  message: string,
  options: { value?: unknown; relatedPaths?: string[] } = {},
): CardImportDiagnostic {
  return { severity: "error", code, path, message, ...options }
}

export function makeCardImportWarning(
  code: CardImportWarningCode,
  path: string,
  message: string,
  options: { value?: unknown; relatedPaths?: string[] } = {},
): CardImportDiagnostic {
  return { severity: "warning", code, path, message, ...options }
}

export function countCardImportDiagnostics(diagnostics: CardImportDiagnostic[]) {
  return {
    warningCount: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
    errorCount: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
  }
}
```

Create `card/import/json-pointer.ts`:

```ts
function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1")
}

function unescapeJsonPointerSegment(segment: string) {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~")
}

export function appendJsonPointer(base: string, segment: string | number) {
  const normalizedBase = base === "/" ? "" : base
  return `${normalizedBase}/${escapeJsonPointerSegment(String(segment))}`
}

export function getJsonPointerValue(value: unknown, path: string): unknown {
  if (path === "") return value
  if (!path.startsWith("/")) return undefined

  return path
    .slice(1)
    .split("/")
    .map(unescapeJsonPointerSegment)
    .reduce<unknown>((current, segment) => {
      if (current === undefined || current === null) return undefined
      if (Array.isArray(current)) return current[Number(segment)]
      if (typeof current === "object") return (current as Record<string, unknown>)[segment]
      return undefined
    }, value)
}
```

- [ ] **Step 5: Run focused test**

Run:

```bash
npm run test:run -- card/import/__tests__/diagnostics.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add card/import/types.ts card/import/diagnostics.ts card/import/json-pointer.ts card/import/__tests__/diagnostics.test.ts
git commit -m "feat: add card import dry-run core types"
```

---

### Task 2: Internal Card Pack V1 Schema

**Files:**
- Create: `card/import/card-pack-v1.schema.ts`
- Create: `card/import/schema-validator.ts`
- Test: `card/import/__tests__/schema.test.ts`

- [ ] **Step 1: Write the failing schema tests**

Create `card/import/__tests__/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { validateCardPackV1Structure } from "@/card/import/schema-validator"

const validPack = {
  format: "daggerheart.card-pack.v1",
  name: "测试卡包",
  version: "1.0.0",
  author: "测试作者",
  definitions: {
    classes: ["战士"],
    domains: ["利刃", "骸骨"],
  },
  classes: [
    {
      id: "warrior",
      name: "战士",
      summary: "战斗职业。",
      domain1: "利刃",
      domain2: "骸骨",
      startingHitPoints: 6,
      startingEvasion: 10,
      startingItems: "武器",
      hopeFeature: "希望特性",
      classFeature: "职业特性",
    },
  ],
}

describe("card pack v1 internal schema", () => {
  it("accepts a minimal shape-preserving English card pack", () => {
    expect(validateCardPackV1Structure(validPack)).toEqual({
      success: true,
      value: validPack,
      diagnostics: [],
    })
  })

  it("rejects unsupported format values", () => {
    const result = validateCardPackV1Structure({ ...validPack, format: "daggerheart.card-pack.v2" })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ severity: "error", code: "INVALID_FORMAT", path: "/format" }),
      )
    }
  })

  it("rejects unknown fields in internal schema", () => {
    const pack = {
      ...validPack,
      classes: [{ ...validPack.classes[0], extra: "not allowed" }],
    }

    const result = validateCardPackV1Structure(pack)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ severity: "error", code: "UNKNOWN_FIELD", path: "/classes/0/extra" }),
      )
    }
  })

  it("rejects required field type errors with stable paths", () => {
    const pack = {
      ...validPack,
      classes: [{ ...validPack.classes[0], startingHitPoints: "6" }],
    }

    const result = validateCardPackV1Structure(pack)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.diagnostics).toContainEqual(
        expect.objectContaining({ severity: "error", code: "INVALID_TYPE", path: "/classes/0/startingHitPoints" }),
      )
    }
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm run test:run -- card/import/__tests__/schema.test.ts
```

Expected: fail because `schema-validator.ts` does not exist.

- [ ] **Step 3: Add internal schema**

Create `card/import/card-pack-v1.schema.ts`:

```ts
const stringField = { type: "string", minLength: 1 }
const optionalStringField = { type: "string" }
const imageFields = {
  imageUrl: optionalStringField,
  hasLocalImage: { type: "boolean" },
}

const baseCard = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name"],
  properties: {
    id: stringField,
    name: stringField,
    ...imageFields,
  },
}

export const cardPackV1Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["format"],
  properties: {
    format: { const: "daggerheart.card-pack.v1" },
    name: optionalStringField,
    version: optionalStringField,
    author: optionalStringField,
    description: optionalStringField,
    definitions: {
      type: "object",
      additionalProperties: false,
      properties: {
        classes: { type: "array", items: stringField },
        ancestries: { type: "array", items: stringField },
        communities: { type: "array", items: stringField },
        domains: { type: "array", items: stringField },
        variants: { type: "array", items: stringField },
        variantTypes: {
          type: "object",
          additionalProperties: {
            type: "object",
            additionalProperties: false,
            properties: {
              description: optionalStringField,
              subclasses: { type: "array", items: stringField },
              levelRange: {
                type: "array",
                minItems: 2,
                maxItems: 2,
                items: { type: "number" },
              },
            },
          },
        },
      },
    },
    classes: {
      type: "array",
      items: {
        ...baseCard,
        required: [
          "id",
          "name",
          "summary",
          "domain1",
          "domain2",
          "startingHitPoints",
          "startingEvasion",
          "startingItems",
          "hopeFeature",
          "classFeature",
        ],
        properties: {
          ...baseCard.properties,
          summary: optionalStringField,
          domain1: stringField,
          domain2: stringField,
          startingHitPoints: { type: "number", minimum: 1 },
          startingEvasion: { type: "number", minimum: 0 },
          startingItems: optionalStringField,
          hopeFeature: optionalStringField,
          classFeature: optionalStringField,
        },
      },
    },
    ancestries: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "ancestry", "summary", "effect", "category"],
        properties: {
          ...baseCard.properties,
          ancestry: stringField,
          summary: optionalStringField,
          effect: optionalStringField,
          category: { type: "number" },
        },
      },
    },
    communities: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "feature", "summary", "description"],
        properties: {
          ...baseCard.properties,
          feature: optionalStringField,
          summary: optionalStringField,
          description: optionalStringField,
        },
      },
    },
    subclasses: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "description", "class", "subclass", "level", "spellcastTrait"],
        properties: {
          ...baseCard.properties,
          description: optionalStringField,
          class: stringField,
          subclass: stringField,
          level: stringField,
          spellcastTrait: stringField,
        },
      },
    },
    domains: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "domain", "description", "level", "trait", "recallCost"],
        properties: {
          ...baseCard.properties,
          domain: stringField,
          description: optionalStringField,
          level: { type: "number", minimum: 1, maximum: 10 },
          trait: stringField,
          recallCost: { type: "number", minimum: 0 },
        },
      },
    },
    variants: {
      type: "array",
      items: {
        ...baseCard,
        required: ["id", "name", "type", "effect"],
        properties: {
          ...baseCard.properties,
          type: stringField,
          subCategory: optionalStringField,
          level: { type: "number", minimum: 0 },
          effect: optionalStringField,
          summaryItems: {
            type: "object",
            additionalProperties: false,
            properties: {
              item1: optionalStringField,
              item2: optionalStringField,
              item3: optionalStringField,
            },
          },
        },
      },
    },
  },
} as const
```

- [ ] **Step 4: Add schema validator**

Create `card/import/schema-validator.ts`:

```ts
import Ajv2020, { type ErrorObject } from "ajv/dist/2020"
import { cardPackV1Schema } from "./card-pack-v1.schema"
import { makeCardImportError } from "./diagnostics"
import { appendJsonPointer, getJsonPointerValue } from "./json-pointer"
import type { CardImportDiagnostic, CardImportErrorCode, CardPackV1 } from "./types"

const ajv = new Ajv2020({ allErrors: true, strict: false })
const validate = ajv.compile(cardPackV1Schema)

const keywordPriority: Record<string, number> = {
  required: 1,
  additionalProperties: 2,
  const: 3,
  enum: 4,
  type: 5,
  minimum: 6,
  maximum: 6,
  minLength: 7,
}

function pathForError(error: ErrorObject): string {
  if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
    return appendJsonPointer(error.instancePath, error.params.missingProperty)
  }

  if (error.keyword === "additionalProperties" && typeof error.params.additionalProperty === "string") {
    return appendJsonPointer(error.instancePath, error.params.additionalProperty)
  }

  return error.instancePath || ""
}

function codeForError(error: ErrorObject, path: string): CardImportErrorCode {
  if (error.keyword === "required") return "MISSING_FIELD"
  if (error.keyword === "additionalProperties") return "UNKNOWN_FIELD"
  if (error.keyword === "const" && path === "/format") return "INVALID_FORMAT"
  if (error.keyword === "const" || error.keyword === "enum") return "INVALID_VALUE"
  return "INVALID_TYPE"
}

function messageForCode(code: CardImportErrorCode): string {
  return {
    SOURCE_READ_FAILED: "Unable to read card pack source.",
    INVALID_JSON: "Invalid JSON.",
    INVALID_DHCB: "Invalid card bundle.",
    MISSING_CARDS_JSON: "cards.json is missing.",
    UNSUPPORTED_FORMAT: "Unsupported card pack format.",
    INVALID_FORMAT: "Invalid card pack format.",
    MISSING_FIELD: "Required field is missing.",
    UNKNOWN_FIELD: "Unknown field is not allowed.",
    INVALID_TYPE: "Invalid field type.",
    INVALID_VALUE: "Invalid field value.",
    DUPLICATE_ID: "Duplicate card id.",
    UNKNOWN_REFERENCE: "Unknown card reference.",
    ORPHAN_IMAGE: "Image does not reference a card in this pack.",
  }[code]
}

export function validateCardPackV1Structure(
  value: unknown,
):
  | { success: true; value: CardPackV1; diagnostics: [] }
  | { success: false; diagnostics: CardImportDiagnostic[] } {
  if (validate(value)) {
    return { success: true, value: value as CardPackV1, diagnostics: [] }
  }

  const byPath = new Map<string, { priority: number; diagnostic: CardImportDiagnostic }>()

  for (const error of validate.errors ?? []) {
    const path = pathForError(error)
    const code = codeForError(error, path)
    const priority = keywordPriority[error.keyword] ?? 99
    const current = byPath.get(path)

    if (current && current.priority <= priority) continue

    byPath.set(path, {
      priority,
      diagnostic: makeCardImportError(
        code,
        path,
        messageForCode(code),
        error.keyword === "required" ? {} : { value: getJsonPointerValue(value, path) },
      ),
    })
  }

  return {
    success: false,
    diagnostics: Array.from(byPath.values()).map((entry) => entry.diagnostic),
  }
}
```

- [ ] **Step 5: Run schema tests**

Run:

```bash
npm run test:run -- card/import/__tests__/schema.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add card/import/card-pack-v1.schema.ts card/import/schema-validator.ts card/import/__tests__/schema.test.ts
git commit -m "feat: add card pack internal schema validation"
```

---

### Task 3: External Contract Guard, Legacy Adapter, And Effective Definitions

**Files:**
- Create: `card/import/external-contract-guard.ts`
- Create: `card/import/legacy-adapter.ts`
- Test: `card/import/__tests__/external-contract-guard.test.ts`
- Test: `card/import/__tests__/legacy-adapter.test.ts`

**Updated boundary decision:** Task 3 now has an External Contract Guard before the adapter. The guard owns blocking admission errors for malformed accepted external legacy structure. The adapter assumes the legacy object has passed the guard and only translates Chinese legacy fields to internal English v1, derives effective definitions, warns/drops unknown legacy fields, emits `LEGACY_FORMAT_ASSUMED`, and avoids mutating input.

The guard should reject:

- non-object legacy roots;
- present known card groups (`profession`, `ancestry`, `community`, `subclass`, `domain`, `variant`) that are not arrays;
- non-object items inside known card groups;
- present `customFieldDefinitions` that is not an object;
- present known definition lists (`professions`, `classes`, `ancestries`, `communities`, `domains`, `variants`) that are not arrays;
- present `customFieldDefinitions.variantTypes` that is not an object;
- present `variantTypes[type]` that is not an object;
- present `variantTypes[type].subclasses` that is not an array;
- present `variantTypes[type].levelRange` that is not a 2-number tuple.

Unknown legacy fields are not guard errors. Non-string items inside definition arrays are not guard errors; they are left for adapter/internal schema/semantic stages after translation. Unknown legacy fields remain adapter warnings with `LEGACY_UNKNOWN_FIELD_DROPPED`.

**Adapter simplification:** Do not preserve malformed known legacy values just to make internal schema validation fail. That was an older boundary. After this change, malformed accepted external legacy structure is stopped by the guard; internal schema validation validates only the translated `daggerheart.card-pack.v1` model.

- [ ] **Step 1: Write the failing external guard and adapter tests**

Create `card/import/__tests__/external-contract-guard.test.ts` with cases for root object, card group arrays/object items, `customFieldDefinitions` object shape, definition-list containers, `variantTypes` object shape, `variantTypes[type]` object shape, `subclasses` array container, and `levelRange` 2-number tuple. Include an acceptance case proving non-string items inside definition arrays are allowed by the guard.

Create `card/import/__tests__/legacy-adapter.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { adaptLegacyCardPack } from "@/card/import/legacy-adapter"

const legacyPack = {
  name: "旧卡包",
  version: "1.0.0",
  author: "作者",
  customFieldDefinitions: {
    professions: ["战士"],
    domains: ["利刃", "骸骨"],
    variants: ["食物"],
  },
  profession: [
    {
      id: "warrior",
      名称: "战士",
      简介: "战斗职业。",
      领域1: "利刃",
      领域2: "骸骨",
      起始生命: 6,
      起始闪避: 10,
      起始物品: "武器",
      希望特性: "希望特性",
      职业特性: "职业特性",
    },
  ],
  ancestry: [
    {
      id: "human-1",
      名称: "人类能力一",
      种族: "人类",
      简介: "人类简介",
      效果: "效果",
      类别: 1,
    },
  ],
  variant: [
    {
      id: "meal",
      名称: "餐点",
      类型: "食物",
      子类别: "餐食",
      等级: 1,
      效果: "吃掉。",
      简略信息: { item1: "食物" },
      extraLegacyField: "drop me",
    },
  ],
}

describe("legacy card adapter", () => {
  it("maps legacy Chinese fields to the English v1 shape", () => {
    const result = adaptLegacyCardPack(legacyPack)

    expect(result.value).toMatchObject({
      format: "daggerheart.card-pack.v1",
      name: "旧卡包",
      classes: [
        {
          id: "warrior",
          name: "战士",
          summary: "战斗职业。",
          domain1: "利刃",
          domain2: "骸骨",
          startingHitPoints: 6,
          startingEvasion: 10,
          startingItems: "武器",
          hopeFeature: "希望特性",
          classFeature: "职业特性",
        },
      ],
      ancestries: [{ id: "human-1", ancestry: "人类", category: 1 }],
      variants: [{ id: "meal", type: "食物", subCategory: "餐食", summaryItems: { item1: "食物" } }],
    })
  })

  it("derives definitions from cards and explicit legacy definitions", () => {
    const result = adaptLegacyCardPack(legacyPack)

    expect(result.value.definitions).toMatchObject({
      classes: ["战士"],
      ancestries: ["人类"],
      domains: ["利刃", "骸骨"],
      variants: ["食物"],
      variantTypes: {
        食物: {
          subclasses: ["餐食"],
          levelRange: [1, 1],
        },
      },
    })
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "LEGACY_FORMAT_ASSUMED" }),
    )
  })

  it("warns and drops unknown legacy card fields", () => {
    const result = adaptLegacyCardPack(legacyPack)

    expect(result.value.variants?.[0]).not.toHaveProperty("extraLegacyField")
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "LEGACY_UNKNOWN_FIELD_DROPPED",
        path: "/variant/0/extraLegacyField",
        value: "drop me",
      }),
    )
  })

  it("does not auto-create missing ancestry pair or subclass triple cards", () => {
    const result = adaptLegacyCardPack(legacyPack)

    expect(result.value.ancestries).toHaveLength(1)
    expect(result.value.subclasses ?? []).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm run test:run -- card/import/__tests__/external-contract-guard.test.ts card/import/__tests__/legacy-adapter.test.ts
```

Expected: fail because the guard/adapter implementation files do not exist yet.

- [ ] **Step 3: Implement the adapter**

Create `card/import/legacy-adapter.ts` with these exported functions and helpers:

```ts
import { makeCardImportWarning } from "./diagnostics"
import { appendJsonPointer } from "./json-pointer"
import type { CardImportDiagnostic, CardPackV1, CardPackV1Definitions } from "./types"

type RawRecord = Record<string, any>

const topLevelKnownFields = new Set([
  "name",
  "version",
  "author",
  "description",
  "customFieldDefinitions",
  "profession",
  "ancestry",
  "community",
  "subclass",
  "domain",
  "variant",
])

const knownCardFields: Record<string, Set<string>> = {
  profession: new Set(["id", "名称", "简介", "imageUrl", "hasLocalImage", "领域1", "领域2", "起始生命", "起始闪避", "起始物品", "希望特性", "职业特性"]),
  ancestry: new Set(["id", "名称", "种族", "简介", "效果", "类别", "imageUrl", "hasLocalImage"]),
  community: new Set(["id", "名称", "特性", "简介", "描述", "imageUrl", "hasLocalImage"]),
  subclass: new Set(["id", "名称", "描述", "imageUrl", "hasLocalImage", "主职", "子职业", "等级", "施法"]),
  domain: new Set(["id", "名称", "领域", "描述", "imageUrl", "hasLocalImage", "等级", "属性", "回想"]),
  variant: new Set(["id", "名称", "类型", "子类别", "等级", "效果", "imageUrl", "hasLocalImage", "简略信息"]),
}

function asArray(value: unknown): RawRecord[] {
  return Array.isArray(value) ? value.filter((item): item is RawRecord => typeof item === "object" && item !== null && !Array.isArray(item)) : []
}

function unique(values: unknown[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)))
}

function warnUnknownFields(group: string, cards: RawRecord[], diagnostics: CardImportDiagnostic[]) {
  const known = knownCardFields[group]
  cards.forEach((card, index) => {
    for (const [key, value] of Object.entries(card)) {
      if (!known.has(key)) {
        diagnostics.push(
          makeCardImportWarning(
            "LEGACY_UNKNOWN_FIELD_DROPPED",
            appendJsonPointer(appendJsonPointer(`/${group}`, index), key),
            "Unknown legacy card field was ignored.",
            { value },
          ),
        )
      }
    }
  })
}

function deriveDefinitions(input: RawRecord): CardPackV1Definitions {
  const classes = asArray(input.profession)
  const ancestries = asArray(input.ancestry)
  const communities = asArray(input.community)
  const subclasses = asArray(input.subclass)
  const domains = asArray(input.domain)
  const variants = asArray(input.variant)
  const explicit = typeof input.customFieldDefinitions === "object" && input.customFieldDefinitions !== null
    ? input.customFieldDefinitions as RawRecord
    : {}

  const variantNames = unique([...(explicit.variants ?? []), ...variants.map((card) => card.类型)])
  const variantTypes: NonNullable<CardPackV1Definitions["variantTypes"]> = {}

  for (const type of variantNames) {
    const matching = variants.filter((card) => card.类型 === type)
    const levels = matching.map((card) => card.等级).filter((level): level is number => typeof level === "number")
    const explicitVariantType = typeof explicit.variantTypes?.[type] === "object" ? explicit.variantTypes[type] : {}

    variantTypes[type] = {
      description: explicitVariantType.description,
      subclasses: unique([...(explicitVariantType.subclasses ?? []), ...matching.map((card) => card.子类别)]),
      levelRange: explicitVariantType.levelRange ?? (levels.length > 0 ? [Math.min(...levels), Math.max(...levels)] : undefined),
    }
  }

  return {
    classes: unique([...(explicit.professions ?? []), ...(explicit.classes ?? []), ...classes.map((card) => card.名称), ...subclasses.map((card) => card.主职)]),
    ancestries: unique([...(explicit.ancestries ?? []), ...ancestries.map((card) => card.种族)]),
    communities: unique([...(explicit.communities ?? []), ...communities.map((card) => card.名称)]),
    domains: unique([...(explicit.domains ?? []), ...classes.map((card) => card.领域1), ...classes.map((card) => card.领域2), ...domains.map((card) => card.领域)]),
    variants: variantNames,
    variantTypes,
  }
}

export function adaptLegacyCardPack(input: unknown): { value: CardPackV1; diagnostics: CardImportDiagnostic[] } {
  const source = typeof input === "object" && input !== null && !Array.isArray(input) ? input as RawRecord : {}
  const diagnostics: CardImportDiagnostic[] = [
    makeCardImportWarning("LEGACY_FORMAT_ASSUMED", "", "No format field; using legacy card format."),
  ]

  for (const [key, value] of Object.entries(source)) {
    if (!topLevelKnownFields.has(key)) {
      diagnostics.push(makeCardImportWarning("LEGACY_UNKNOWN_FIELD_DROPPED", `/${key}`, "Unknown legacy field was ignored.", { value }))
    }
  }

  for (const group of Object.keys(knownCardFields)) {
    warnUnknownFields(group, asArray(source[group]), diagnostics)
  }

  return {
    value: {
      format: "daggerheart.card-pack.v1",
      name: source.name,
      version: source.version,
      author: source.author,
      description: source.description,
      definitions: deriveDefinitions(source),
      classes: asArray(source.profession).map((card) => ({
        id: card.id,
        name: card.名称,
        summary: card.简介,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
        domain1: card.领域1,
        domain2: card.领域2,
        startingHitPoints: card.起始生命,
        startingEvasion: card.起始闪避,
        startingItems: card.起始物品,
        hopeFeature: card.希望特性,
        classFeature: card.职业特性,
      })),
      ancestries: asArray(source.ancestry).map((card) => ({
        id: card.id,
        name: card.名称,
        ancestry: card.种族,
        summary: card.简介,
        effect: card.效果,
        category: card.类别,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
      })),
      communities: asArray(source.community).map((card) => ({
        id: card.id,
        name: card.名称,
        feature: card.特性,
        summary: card.简介,
        description: card.描述,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
      })),
      subclasses: asArray(source.subclass).map((card) => ({
        id: card.id,
        name: card.名称,
        description: card.描述,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
        class: card.主职,
        subclass: card.子职业,
        level: card.等级,
        spellcastTrait: card.施法,
      })),
      domains: asArray(source.domain).map((card) => ({
        id: card.id,
        name: card.名称,
        domain: card.领域,
        description: card.描述,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
        level: card.等级,
        trait: card.属性,
        recallCost: card.回想,
      })),
      variants: asArray(source.variant).map((card) => ({
        id: card.id,
        name: card.名称,
        type: card.类型,
        subCategory: card.子类别,
        level: card.等级,
        effect: card.效果,
        imageUrl: card.imageUrl,
        hasLocalImage: card.hasLocalImage,
        summaryItems: card.简略信息,
      })),
    },
    diagnostics,
  }
}
```

- [ ] **Step 4: Run adapter tests**

Run:

```bash
npm run test:run -- card/import/__tests__/external-contract-guard.test.ts card/import/__tests__/legacy-adapter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add card/import/types.ts card/import/external-contract-guard.ts card/import/legacy-adapter.ts card/import/__tests__/external-contract-guard.test.ts card/import/__tests__/legacy-adapter.test.ts docs/superpowers/plans/2026-06-15-card-import-dry-run-pipeline.md
git commit -m "feat: add legacy external contract guard"
```

---

### Task 4: Dry-run Validation Model And Semantic Rules

**Files:**
- Create: `card/import/dry-run-model.ts`
- Create: `card/import/semantic-validation.ts`
- Test: `card/import/__tests__/semantic-validation.test.ts`

- [ ] **Step 1: Write failing semantic tests**

Create `card/import/__tests__/semantic-validation.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { buildCardPackDryRunValidationModel } from "@/card/import/dry-run-model"
import { validateCardPackSemantics } from "@/card/import/semantic-validation"
import type { CardPackV1 } from "@/card/import/types"

const validPack: CardPackV1 = {
  format: "daggerheart.card-pack.v1",
  name: "测试",
  definitions: {
    classes: ["战士"],
    ancestries: ["人类"],
    domains: ["利刃", "骸骨"],
    variants: ["食物"],
    variantTypes: { 食物: { subclasses: ["餐食"], levelRange: [1, 1] } },
  },
  classes: [
    {
      id: "warrior",
      name: "战士",
      summary: "",
      domain1: "利刃",
      domain2: "骸骨",
      startingHitPoints: 6,
      startingEvasion: 10,
      startingItems: "",
      hopeFeature: "",
      classFeature: "",
    },
  ],
  ancestries: [{ id: "human-1", name: "人类一", ancestry: "人类", summary: "", effect: "", category: 1 }],
  variants: [{ id: "meal", name: "餐点", type: "食物", subCategory: "餐食", level: 1, effect: "" }],
}

describe("card pack semantic validation", () => {
  it("accepts packs with a single ancestry card and no subclass triples", () => {
    const model = buildCardPackDryRunValidationModel(validPack, [])
    const diagnostics = validateCardPackSemantics(model)

    expect(diagnostics).toEqual([])
  })

  it("reports duplicate card ids inside the source pack", () => {
    const pack: CardPackV1 = {
      ...validPack,
      variants: [{ id: "warrior", name: "重复", type: "食物", effect: "" }],
    }
    const model = buildCardPackDryRunValidationModel(pack, [])

    expect(validateCardPackSemantics(model)).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "DUPLICATE_ID",
        path: "/variants/0/id",
        relatedPaths: ["/classes/0/id"],
      }),
    )
  })

  it("reports unknown definition references without reading installed storage", () => {
    const pack: CardPackV1 = {
      ...validPack,
      classes: [{ ...validPack.classes![0], domain1: "未知领域" }],
    }
    const model = buildCardPackDryRunValidationModel(pack, [])

    expect(validateCardPackSemantics(model)).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "UNKNOWN_REFERENCE",
        path: "/classes/0/domain1",
        value: "未知领域",
      }),
    )
  })

  it("reports orphan image assets against cards in the same pack only", () => {
    const model = buildCardPackDryRunValidationModel(validPack, [{ cardId: "missing", path: "images/missing.png" }])

    expect(validateCardPackSemantics(model)).toContainEqual(
      expect.objectContaining({ severity: "error", code: "ORPHAN_IMAGE", path: "/images/missing.png" }),
    )
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm run test:run -- card/import/__tests__/semantic-validation.test.ts
```

Expected: fail because model/semantic files do not exist.

- [ ] **Step 3: Add dry-run model builder**

Create `card/import/dry-run-model.ts`:

```ts
import type { CardImportImageAsset, CardPackDryRunCard, CardPackDryRunValidationModel, CardPackV1 } from "./types"

function withGroup<T extends object, G extends CardPackDryRunCard["group"]>(items: T[] | undefined, group: G) {
  return (items ?? []).map((item) => ({ ...item, group })) as CardPackDryRunCard[]
}

export function buildCardPackDryRunValidationModel(
  pack: CardPackV1,
  imageAssets: CardImportImageAsset[],
): CardPackDryRunValidationModel {
  return {
    metadata: {
      format: "daggerheart.card-pack.v1",
      name: pack.name,
      version: pack.version,
      author: pack.author,
      description: pack.description,
    },
    definitions: {
      classes: pack.definitions?.classes ?? [],
      ancestries: pack.definitions?.ancestries ?? [],
      communities: pack.definitions?.communities ?? [],
      domains: pack.definitions?.domains ?? [],
      variants: pack.definitions?.variants ?? [],
      variantTypes: pack.definitions?.variantTypes ?? {},
    },
    cards: [
      ...withGroup(pack.classes, "classes"),
      ...withGroup(pack.ancestries, "ancestries"),
      ...withGroup(pack.communities, "communities"),
      ...withGroup(pack.subclasses, "subclasses"),
      ...withGroup(pack.domains, "domains"),
      ...withGroup(pack.variants, "variants"),
    ],
    imageAssets,
  }
}
```

- [ ] **Step 4: Add semantic validation**

Create `card/import/semantic-validation.ts`:

```ts
import { makeCardImportError } from "./diagnostics"
import type { CardImportDiagnostic, CardPackDryRunValidationModel } from "./types"

const groupOrder = ["classes", "ancestries", "communities", "subclasses", "domains", "variants"] as const

function validateDuplicateIds(model: CardPackDryRunValidationModel): CardImportDiagnostic[] {
  const diagnostics: CardImportDiagnostic[] = []
  const seen = new Map<string, string>()
  const countsByGroup: Record<string, number> = {}

  for (const card of model.cards) {
    const index = countsByGroup[card.group] ?? 0
    countsByGroup[card.group] = index + 1
    const path = `/${card.group}/${index}/id`
    const existingPath = seen.get(card.id)

    if (existingPath) {
      diagnostics.push(makeCardImportError("DUPLICATE_ID", path, "Duplicate card id.", { value: card.id, relatedPaths: [existingPath] }))
    } else {
      seen.set(card.id, path)
    }
  }

  return diagnostics
}

function requireReference(
  diagnostics: CardImportDiagnostic[],
  values: string[],
  path: string,
  value: unknown,
) {
  if (typeof value === "string" && value.length > 0 && !values.includes(value)) {
    diagnostics.push(makeCardImportError("UNKNOWN_REFERENCE", path, "Referenced definition is not declared by this pack.", { value }))
  }
}

function validateReferences(model: CardPackDryRunValidationModel): CardImportDiagnostic[] {
  const diagnostics: CardImportDiagnostic[] = []

  for (const group of groupOrder) {
    const cards = model.cards.filter((card) => card.group === group)
    cards.forEach((card, index) => {
      if (card.group === "classes") {
        requireReference(diagnostics, model.definitions.classes, `/classes/${index}/name`, card.name)
        requireReference(diagnostics, model.definitions.domains, `/classes/${index}/domain1`, card.domain1)
        requireReference(diagnostics, model.definitions.domains, `/classes/${index}/domain2`, card.domain2)
      }
      if (card.group === "ancestries") {
        requireReference(diagnostics, model.definitions.ancestries, `/ancestries/${index}/ancestry`, card.ancestry)
      }
      if (card.group === "communities") {
        requireReference(diagnostics, model.definitions.communities, `/communities/${index}/name`, card.name)
      }
      if (card.group === "subclasses") {
        requireReference(diagnostics, model.definitions.classes, `/subclasses/${index}/class`, card.class)
      }
      if (card.group === "domains") {
        requireReference(diagnostics, model.definitions.domains, `/domains/${index}/domain`, card.domain)
      }
      if (card.group === "variants") {
        requireReference(diagnostics, model.definitions.variants, `/variants/${index}/type`, card.type)
        const typeDefinition = model.definitions.variantTypes[card.type]
        if (card.subCategory && typeDefinition?.subclasses?.length && !typeDefinition.subclasses.includes(card.subCategory)) {
          diagnostics.push(makeCardImportError("UNKNOWN_REFERENCE", `/variants/${index}/subCategory`, "Variant subcategory is not declared by this pack.", { value: card.subCategory }))
        }
      }
    })
  }

  return diagnostics
}

function validateImageAssets(model: CardPackDryRunValidationModel): CardImportDiagnostic[] {
  const cardIds = new Set(model.cards.map((card) => card.id))
  return model.imageAssets
    .filter((asset) => !cardIds.has(asset.cardId))
    .map((asset) => makeCardImportError("ORPHAN_IMAGE", `/${asset.path}`, "Image does not reference a card in this pack.", { value: asset.cardId }))
}

export function validateCardPackSemantics(model: CardPackDryRunValidationModel): CardImportDiagnostic[] {
  return [
    ...validateDuplicateIds(model),
    ...validateReferences(model),
    ...validateImageAssets(model),
  ]
}
```

- [ ] **Step 5: Run semantic tests**

Run:

```bash
npm run test:run -- card/import/__tests__/semantic-validation.test.ts
```

Expected: PASS. If path order is wrong, fix by using per-group indices as shown in the tests.

- [ ] **Step 6: Commit**

```bash
git add card/import/dry-run-model.ts card/import/semantic-validation.ts card/import/__tests__/semantic-validation.test.ts
git commit -m "feat: add card import dry-run semantic validation"
```

---

### Task 5: Source Intake And Dry-run Pipeline

**Files:**
- Create: `card/import/source.ts`
- Create: `card/import/import-pipeline.ts`
- Test: `card/import/__tests__/pipeline-dry-run.test.ts`

- [ ] **Step 1: Write failing pipeline tests**

Create `card/import/__tests__/pipeline-dry-run.test.ts`:

```ts
import JSZip from "jszip"
import { describe, expect, it } from "vitest"
import { importCardPackFromSource } from "@/card/import/import-pipeline"
import { createCardDhcbSource, createCardJsonSource, createCardObjectSource } from "@/card/import/source"

const legacyPack = {
  name: "旧卡包",
  customFieldDefinitions: { professions: ["战士"], domains: ["利刃", "骸骨"] },
  profession: [
    {
      id: "warrior",
      名称: "战士",
      简介: "",
      领域1: "利刃",
      领域2: "骸骨",
      起始生命: 6,
      起始闪避: 10,
      起始物品: "",
      希望特性: "",
      职业特性: "",
    },
  ],
}

const v1Pack = {
  format: "daggerheart.card-pack.v1",
  name: "v1 卡包",
  definitions: { classes: ["战士"], domains: ["利刃", "骸骨"] },
  classes: [
    {
      id: "warrior",
      name: "战士",
      summary: "",
      domain1: "利刃",
      domain2: "骸骨",
      startingHitPoints: 6,
      startingEvasion: 10,
      startingItems: "",
      hopeFeature: "",
      classFeature: "",
    },
  ],
}

async function createDhcbBytes(cardsJson: unknown, imageName?: string) {
  const zip = new JSZip()
  zip.file("cards.json", JSON.stringify(cardsJson))
  if (imageName) zip.file(`images/${imageName}`, "image-bytes")
  return await zip.generateAsync({ type: "arraybuffer" })
}

describe("card import dry-run pipeline", () => {
  it("accepts legacy object input without committing storage", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(legacyPack), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: true,
      stage: "semanticValidation",
      mode: "dryRun",
      summary: { name: "旧卡包", cardCount: 1, errorCount: 0 },
    })
    expect(result.model?.metadata.name).toBe("旧卡包")
    expect(result.model?.cards).toHaveLength(1)
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "LEGACY_FORMAT_ASSUMED" }))
  })

  it("accepts direct daggerheart.card-pack.v1 input", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(v1Pack), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: true,
      stage: "semanticValidation",
      summary: { name: "v1 卡包", cardCount: 1 },
    })
    expect(result.diagnostics).toEqual([])
  })

  it("rejects unsupported format without legacy fallback", async () => {
    const result = await importCardPackFromSource(
      createCardObjectSource({ ...v1Pack, format: "unknown.format" }),
      { mode: "dryRun" },
    )

    expect(result).toMatchObject({
      success: false,
      stage: "externalFormatAdapter",
      diagnostics: [expect.objectContaining({ code: "UNSUPPORTED_FORMAT", path: "/format" })],
    })
  })

  it("stops at jsonParse for invalid json text", async () => {
    const result = await importCardPackFromSource(createCardJsonSource("{bad json"), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: false,
      stage: "jsonParse",
      diagnostics: [expect.objectContaining({ code: "INVALID_JSON" })],
    })
  })

  it("reads legacy dhcb cards.json and discovers images without writing them", async () => {
    const bytes = await createDhcbBytes(legacyPack, "warrior.png")

    const result = await importCardPackFromSource(createCardDhcbSource(bytes, "pack.dhcb"), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: true,
      stage: "semanticValidation",
      summary: { cardCount: 1 },
    })
    expect(result.model?.imageAssets).toEqual([expect.objectContaining({ cardId: "warrior", path: "images/warrior.png" })])
  })

  it("reports missing cards.json in dhcb sources", async () => {
    const zip = new JSZip()
    const bytes = await zip.generateAsync({ type: "arraybuffer" })

    const result = await importCardPackFromSource(createCardDhcbSource(bytes, "empty.dhcb"), { mode: "dryRun" })

    expect(result).toMatchObject({
      success: false,
      stage: "sourceRead",
      diagnostics: [expect.objectContaining({ code: "MISSING_CARDS_JSON" })],
    })
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm run test:run -- card/import/__tests__/pipeline-dry-run.test.ts
```

Expected: fail because `source.ts` and `import-pipeline.ts` do not exist.

- [ ] **Step 3: Add source helpers**

Create `card/import/source.ts`:

```ts
import type { CardImportSource } from "./types"

export function createCardObjectSource(value: unknown, label = "object"): CardImportSource {
  return {
    origin: { kind: "object", label },
    async read() {
      return { kind: "parsedObject", value }
    },
  }
}

export function createCardJsonSource(text: string, fileName = "cards.json"): CardImportSource {
  return {
    origin: { kind: "file", fileName },
    async read() {
      return { kind: "jsonText", text }
    },
  }
}

export function createCardDhcbSource(bytes: ArrayBuffer, fileName = "cards.dhcb"): CardImportSource {
  return {
    origin: { kind: "container", fileName },
    async read() {
      return { kind: "dhcbBytes", bytes, sizeBytes: bytes.byteLength }
    },
  }
}
```

- [ ] **Step 4: Add pipeline orchestration**

Create `card/import/import-pipeline.ts`:

```ts
import JSZip from "jszip"
import { buildCardPackDryRunValidationModel } from "./dry-run-model"
import { makeCardImportError } from "./diagnostics"
import { validateLegacyExternalContract } from "./external-contract-guard"
import { adaptLegacyCardPack } from "./legacy-adapter"
import { validateCardPackV1Structure } from "./schema-validator"
import { validateCardPackSemantics } from "./semantic-validation"
import type {
  CardImportDiagnostic,
  CardImportImageAsset,
  CardImportMode,
  CardImportPipelineStage,
  CardPackImportOptions,
  CardPackImportResult,
  CardImportSource,
  CardPackV1,
} from "./types"
import { countCardImportDiagnostics } from "./diagnostics"

function hasErrors(diagnostics: CardImportDiagnostic[]) {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error")
}

function resultFromDiagnostics(params: {
  stage: CardImportPipelineStage
  success: boolean
  mode: CardImportMode
  diagnostics: CardImportDiagnostic[]
  pack?: CardPackV1
  model?: CardPackImportResult["model"]
}): CardPackImportResult {
  const counts = countCardImportDiagnostics(params.diagnostics)

  return {
    success: params.success,
    stage: params.stage,
    mode: params.mode,
    model: params.model,
    summary: {
      name: params.pack?.name ?? params.model?.metadata.name,
      version: params.pack?.version ?? params.model?.metadata.version,
      author: params.pack?.author ?? params.model?.metadata.author,
      cardCount: params.model?.cards.length ?? 0,
      ...counts,
    },
    diagnostics: params.diagnostics,
  }
}

async function readDhcb(bytes: ArrayBuffer): Promise<
  | { success: true; value: unknown; imageAssets: CardImportImageAsset[] }
  | { success: false; diagnostics: CardImportDiagnostic[] }
> {
  try {
    const zip = await JSZip.loadAsync(bytes)
    const cardsFile = zip.file("cards.json")
    if (!cardsFile) {
      return { success: false, diagnostics: [makeCardImportError("MISSING_CARDS_JSON", "/cards.json", "cards.json is missing.")] }
    }

    const parsed = JSON.parse(await cardsFile.async("text"))
    const imageAssets = Object.keys(zip.files)
      .filter((path) => path.startsWith("images/") && !zip.files[path].dir)
      .map((path) => {
        const filename = path.replace("images/", "")
        const cardId = filename.replace(/\.(webp|png|jpg|jpeg|gif|svg)$/i, "")
        return { cardId, path }
      })

    return { success: true, value: parsed, imageAssets }
  } catch {
    return { success: false, diagnostics: [makeCardImportError("INVALID_DHCB", "", "Invalid card bundle.")] }
  }
}

function routeExternalFormat(value: unknown): { value?: CardPackV1; diagnostics: CardImportDiagnostic[]; success: boolean; stage?: CardImportPipelineStage } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      success: false,
      stage: "externalContractGuard",
      diagnostics: [makeCardImportError("INVALID_TYPE", "", "Card pack payload must be an object.")],
    }
  }

  const record = value as Record<string, unknown>
  if (record.format === undefined) {
    const guarded = validateLegacyExternalContract(value)
    if (!guarded.success) {
      return { success: false, stage: "externalContractGuard", diagnostics: guarded.diagnostics }
    }

    const adapted = adaptLegacyCardPack(guarded.value)
    return { success: true, value: adapted.value, diagnostics: adapted.diagnostics }
  }

  if (record.format === "daggerheart.card-pack.v1") {
    return { success: true, value: value as CardPackV1, diagnostics: [] }
  }

  return {
    success: false,
    stage: "externalFormatAdapter",
    diagnostics: [
      makeCardImportError("UNSUPPORTED_FORMAT", "/format", "Unsupported card pack format.", {
        value: record.format,
      }),
    ],
  }
}

export async function importCardPackFromSource(
  source: CardImportSource,
  options: CardPackImportOptions = {},
): Promise<CardPackImportResult> {
  const mode = options.mode ?? "dryRun"
  let value: unknown
  let imageAssets: CardImportImageAsset[] = []

  try {
    const payload = await source.read()
    if (payload.kind === "jsonText") {
      try {
        value = JSON.parse(payload.text)
      } catch {
        return resultFromDiagnostics({
          stage: "jsonParse",
          success: false,
          mode,
          diagnostics: [makeCardImportError("INVALID_JSON", "", "Invalid JSON.")],
        })
      }
    } else if (payload.kind === "parsedObject") {
      value = payload.value
    } else {
      const dhcb = await readDhcb(payload.bytes)
      if (!dhcb.success) {
        return resultFromDiagnostics({ stage: "sourceRead", success: false, mode, diagnostics: dhcb.diagnostics })
      }
      value = dhcb.value
      imageAssets = dhcb.imageAssets
    }
  } catch {
    return resultFromDiagnostics({
      stage: "sourceRead",
      success: false,
      mode,
      diagnostics: [makeCardImportError("SOURCE_READ_FAILED", "", "Unable to read card pack source.")],
    })
  }

  const routed = routeExternalFormat(value)
  if (!routed.success || !routed.value) {
    return resultFromDiagnostics({ stage: routed.stage ?? "externalFormatAdapter", success: false, mode, diagnostics: routed.diagnostics })
  }

  const structural = validateCardPackV1Structure(routed.value)
  if (!structural.success) {
    return resultFromDiagnostics({
      stage: "structuralValidation",
      success: false,
      mode,
      diagnostics: [...routed.diagnostics, ...structural.diagnostics],
      pack: routed.value,
    })
  }

  const model = buildCardPackDryRunValidationModel(structural.value, imageAssets)
  const semanticDiagnostics = validateCardPackSemantics(model)
  const diagnostics = [...routed.diagnostics, ...semanticDiagnostics]

  return resultFromDiagnostics({
    stage: hasErrors(semanticDiagnostics) ? "semanticValidation" : "semanticValidation",
    success: !hasErrors(semanticDiagnostics),
    mode,
    diagnostics,
    pack: structural.value,
    model,
  })
}
```

- [ ] **Step 5: Run pipeline tests**

Run:

```bash
npm run test:run -- card/import/__tests__/pipeline-dry-run.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add card/import/source.ts card/import/import-pipeline.ts card/import/__tests__/pipeline-dry-run.test.ts
git commit -m "feat: add card import dry-run pipeline"
```

---

### Task 6: Editor-Local Authoring Diagnostics

**Files:**
- Create: `app/card-editor/services/editor-authoring-diagnostics.ts`
- Create: `app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts`

- [ ] **Step 1: Write failing editor-local diagnostics tests**

Create `app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createEditorLocalCardAuthoringDiagnostics } from "../editor-authoring-diagnostics"
import type { CardPackageState } from "../../types"

const draft: CardPackageState = {
  name: "草稿",
  customFieldDefinitions: { professions: [], ancestries: [], communities: [], domains: [], variants: [] },
  profession: [],
  community: [],
  domain: [],
  variant: [],
  ancestry: [{ id: "human-1", 名称: "人类一", 种族: "人类", 简介: "", 效果: "", 类别: 1 }],
  subclass: [{ id: "warrior-sub-1", 名称: "战士基石", 主职: "战士", 子职业: "战士", 等级: "基石", 施法: "力量", 描述: "" }],
}

describe("editor-local card authoring diagnostics", () => {
  it("reports ancestry pair and subclass triple regularity without formal import semantics", () => {
    const diagnostics = createEditorLocalCardAuthoringDiagnostics(draft)

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "EDITOR_ANCESTRY_PAIR_INCOMPLETE",
        path: "/ancestry/0",
      }),
    )
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "EDITOR_SUBCLASS_TRIPLE_INCOMPLETE",
        path: "/subclass/0",
      }),
    )
  })

  it("does not report complete ancestry pairs or subclass triples", () => {
    const complete: CardPackageState = {
      ...draft,
      ancestry: [
        draft.ancestry![0],
        { id: "human-2", 名称: "人类二", 种族: "人类", 简介: "", 效果: "", 类别: 2 },
      ],
      subclass: [
        draft.subclass![0],
        { ...draft.subclass![0], id: "warrior-sub-2", 等级: "专精" },
        { ...draft.subclass![0], id: "warrior-sub-3", 等级: "大师" },
      ],
    }

    expect(createEditorLocalCardAuthoringDiagnostics(complete)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm run test:run -- app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts
```

Expected: fail because `editor-authoring-diagnostics.ts` does not exist.

- [ ] **Step 3: Add editor-local diagnostics**

Create `app/card-editor/services/editor-authoring-diagnostics.ts`:

```ts
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

export function createEditorLocalCardAuthoringDiagnostics(
  draft: CardPackageState,
): CardEditorLocalAuthoringDiagnostic[] {
  const diagnostics: CardEditorLocalAuthoringDiagnostic[] = []
  const ancestryGroups = new Map<string, { paths: string[]; categories: Set<number> }>()

  ;(draft.ancestry ?? []).forEach((card, index) => {
    const key = String(card.种族 ?? "")
    const group = ancestryGroups.get(key) ?? { paths: [], categories: new Set<number>() }
    group.paths.push(`/ancestry/${index}`)
    if (typeof card.类别 === "number") group.categories.add(card.类别)
    ancestryGroups.set(key, group)
  })

  for (const [ancestry, group] of ancestryGroups.entries()) {
    if (group.paths.length !== 2 || !group.categories.has(1) || !group.categories.has(2)) {
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

  const subclassGroups = new Map<string, { paths: string[]; levels: Set<string> }>()
  ;(draft.subclass ?? []).forEach((card, index) => {
    const key = `${card.主职 ?? ""}/${card.子职业 ?? ""}`
    const group = subclassGroups.get(key) ?? { paths: [], levels: new Set<string>() }
    group.paths.push(`/subclass/${index}`)
    if (typeof card.等级 === "string") group.levels.add(card.等级)
    subclassGroups.set(key, group)
  })

  for (const [subclass, group] of subclassGroups.entries()) {
    if (group.paths.length !== 3 || !group.levels.has("基石") || !group.levels.has("专精") || !group.levels.has("大师")) {
      diagnostics.push({
        severity: "error",
        code: "EDITOR_SUBCLASS_TRIPLE_INCOMPLETE",
        path: group.paths[0] ?? "/subclass",
        message: "Editor draft subclass cards should include foundation, specialization, and mastery cards.",
        value: subclass,
        relatedPaths: group.paths.slice(1),
      })
    }
  }

  return diagnostics
}
```

- [ ] **Step 4: Run editor-local diagnostics tests**

Run:

```bash
npm run test:run -- app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/card-editor/services/editor-authoring-diagnostics.ts app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts
git commit -m "feat: add card editor local authoring diagnostics"
```

---

### Task 7: Compatibility Fixtures And Full Verification

**Files:**
- Create: `card/import/__tests__/compatibility-fixtures.test.ts`
- Modify only if needed: `card/import/legacy-adapter.ts`, `card/import/card-pack-v1.schema.ts`, `card/import/semantic-validation.ts`

- [ ] **Step 1: Write compatibility fixture tests**

Create `card/import/__tests__/compatibility-fixtures.test.ts`:

```ts
import builtinBase from "@/data/cards/builtin-base.json"
import publicSample from "@/public/自定义卡包指南和示例/神州战役卡牌包.json"
import { describe, expect, it } from "vitest"
import { importCardPackFromSource } from "@/card/import/import-pipeline"
import { createCardObjectSource } from "@/card/import/source"

describe("card import compatibility fixtures", () => {
  it("accepts builtin base card pack through legacy adapter", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(builtinBase, "builtin-base"), { mode: "dryRun" })

    expect(result.success).toBe(true)
    expect(result.stage).toBe("semanticValidation")
    expect(result.summary.cardCount).toBeGreaterThan(0)
  })

  it("accepts published public sample through legacy adapter", async () => {
    const result = await importCardPackFromSource(createCardObjectSource(publicSample, "public sample"), { mode: "dryRun" })

    expect(result.success).toBe(true)
    expect(result.stage).toBe("semanticValidation")
    expect(result.summary.cardCount).toBeGreaterThan(0)
  })

  it("accepts missing customFieldDefinitions when definitions can be derived from cards", async () => {
    const noDefinitions = {
      name: "无 definitions 卡包",
      profession: [
        {
          id: "warrior",
          名称: "战士",
          简介: "",
          领域1: "利刃",
          领域2: "骸骨",
          起始生命: 6,
          起始闪避: 10,
          起始物品: "",
          希望特性: "",
          职业特性: "",
        },
      ],
    }

    const result = await importCardPackFromSource(createCardObjectSource(noDefinitions), { mode: "dryRun" })

    expect(result.success).toBe(true)
    expect(result.model?.definitions.classes).toContain("战士")
    expect(result.model?.definitions.domains).toEqual(expect.arrayContaining(["利刃", "骸骨"]))
  })
})
```

- [ ] **Step 2: Run compatibility tests and fix real fixture gaps**

Run:

```bash
npm run test:run -- card/import/__tests__/compatibility-fixtures.test.ts
```

Expected: PASS. If a published fixture fails because the adapter missed a known legacy field, add that field to `knownCardFields` and map it only if it is part of the documented contract. If a fixture fails because semantic validation is stricter than current formal import, relax the formal dry-run semantic rule unless the spec explicitly says it should block.

- [ ] **Step 3: Run the full card import dry-run test set**

Run:

```bash
npm run test:run -- card/import app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts
```

Expected: all new tests PASS.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add card/import app/card-editor/services/editor-authoring-diagnostics.ts app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts
git commit -m "test: add card import compatibility coverage"
```

---

## Self-Review Checklist

- Spec coverage:
  - Validation Contract Module: Tasks 2 and 7.
  - Source Intake Module: Task 5.
  - External Format Adapter Module: Task 3.
  - Structural Validation Module: Task 2.
  - Dry-run Validation Model Module: Task 4.
  - Semantic Validation Module: Task 4.
  - Editor-local authoring diagnostics: Task 6.
- No storage writes: pipeline has no imports from `card/stores`, `localStorage`, or IndexedDB helpers.
- No conflict check: pipeline has no current-storage dependency and no existing-card-ID input.
- Formal import group-size compatibility: Task 4 explicitly asserts single ancestry/no subclass triple is accepted.
- Editor regularity: Task 6 separately reports ancestry pair/subclass triple diagnostics.
- Format routing: Task 5 covers missing format legacy, direct v1, and unsupported format.
- Compatibility corpus: Task 7 covers builtin and published sample.

## Verification Commands

Run these before handing off the implementation branch:

```bash
npm run test:run -- card/import app/card-editor/services/__tests__/editor-authoring-diagnostics.test.ts
npx tsc --noEmit
git status --short
```

Expected:

- Vitest exits 0.
- TypeScript exits 0.
- `git status --short` contains only intentional files for this branch.
