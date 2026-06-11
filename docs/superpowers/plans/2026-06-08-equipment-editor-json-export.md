# Equipment Editor JSON Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add equipment pack authoring to `/card-editor`, exporting ordinary `daggerheart.equipment-pack.v1` JSON while preserving current card pack behavior.

**Architecture:** Keep the existing card editor store and card import/export flow intact. Add a separate equipment editor module under `app/card-editor/equipment/`, with pure draft/id/import/export/validation helpers and a small Zustand store. Move default equipment service construction out of `equipment/ui/equipment-ui-store.ts` so UI/editor code does not directly choose localStorage.

**Tech Stack:** Next.js client components, React, Zustand, TypeScript, Vitest, Testing Library, existing equipment import pipeline and shadcn/Radix UI primitives.

---

## Source Design

Primary spec:

- `docs/superpowers/specs/2026-06-07-equipment-editor-json-export-scope-design.md`

Glossary:

- `docs/contexts/content-pack-import/CONTEXT.md`

Critical decisions:

- Current branch does not change `.dhcb` / `.zip` behavior.
- Equipment mode exports one full equipment JSON payload containing both weapons and armor.
- Export does not run full validation and may write half-finished JSON.
- Equipment draft keeps `daggerheart.equipment-pack.v1` shape; it is not a separate draft format.
- Import into editor is lenient recovery and replacement, not merge and not install.
- New equipment editor code must not directly depend on localStorage adapters/repositories.
- Validation UI should mirror current card validation result dialog.
- Equipment preview tab is hidden in the first version.

Reviewer audit amendments:

- Each task must be independently executable. Do not commit tests in Task 7 that are expected to stay red until Task 8; page integration tests belong to Task 8.
- Armor editing must include `tier`; it is part of the minimum armor field set.
- Equipment item editing must keep the card-editor-like top controls: previous item, next item, top quick jump select, plus add/copy/delete. The right quick-select list is an enhancement, not a replacement.
- `从卡包基础信息复制` must confirm before overwriting equipment metadata, because it may also rewrite standard equipment ID prefixes.
- Page tests must import `@testing-library/jest-dom/vitest`, use `findByRole` after the client gate, and reset global stores between tests.
- Mode-aware top actions need automated coverage: card export still calls the existing card export path; equipment export does not call card export; equipment import replaces only the equipment draft; equipment validate runs dry-run.
- Import recovery must reject all invalid envelopes listed in the spec, including non-string `format` values when `format` exists.
- Validation result types should use `EquipmentPackApplicationImportResult` from the application service, not the lower-level import result type.
- New editor code and `equipment/ui/equipment-ui-store.ts` must not directly import `local-storage-adapter` or `local-storage-repository`; add an import-boundary test.
- Numeric inputs should not turn arbitrary invalid typing into `null` immediately. Empty input writes `null`; valid input writes a number; invalid input should remain local UI state or show a field error without mutating draft.

## File Map

Create:

- `equipment/services/default-equipment-services.ts`: browser/default equipment service composition root.
- `app/card-editor/equipment/equipment-draft.ts`: draft types, default draft, item creation/copy/update/delete helpers, numeric/null handling.
- `app/card-editor/equipment/equipment-id.ts`: standard equipment editor template ID generation, parse/build, metadata-prefix rewrite, duplicate checks.
- `app/card-editor/equipment/equipment-import-export.ts`: file import recovery and JSON download export.
- `app/card-editor/equipment/equipment-validation.ts`: dry-run validation wrapper and diagnostic-to-friendly mapping.
- `app/card-editor/equipment/equipment-editor-store.ts`: equipment editor Zustand store.
- `app/card-editor/equipment/components/equipment-tabs.tsx`: equipment mode tabs.
- `app/card-editor/equipment/components/equipment-metadata-tab.tsx`: equipment metadata form and manual card metadata copy action.
- `app/card-editor/equipment/components/equipment-item-tab.tsx`: shared weapon/armor item editor shell.
- `app/card-editor/equipment/components/equipment-quick-switch.tsx`: right-side quick-select list.
- `app/card-editor/equipment/components/equipment-validation-results.tsx`: equipment validation dialog based on card validation UX.
- `app/card-editor/equipment/__tests__/equipment-id.test.ts`
- `app/card-editor/equipment/__tests__/equipment-draft.test.ts`
- `app/card-editor/equipment/__tests__/equipment-import-export.test.ts`
- `app/card-editor/equipment/__tests__/equipment-validation.test.ts`
- `app/card-editor/__tests__/equipment-editor-page.test.tsx`
- `equipment/services/__tests__/default-equipment-services.test.ts`

Modify:

- `equipment/ui/equipment-ui-store.ts`: use the new default service composition root instead of directly constructing localStorage services.
- `app/card-editor/page.tsx`: add card/equipment mode state and dispatch toolbar/tabs/dialogs by mode.
- `app/card-editor/components/toolbar.tsx`: make labels mode-aware, add right-side `卡牌 / 装备` mode switch, hide keyword button in equipment mode.
- `docs/superpowers/specs/2026-06-07-equipment-editor-json-export-scope-design.md`: only if implementation uncovers a necessary correction.

Do not modify:

- `app/card-editor/store/card-editor-store.ts`, except if a compile error makes a tiny type-only adjustment unavoidable.
- `app/card-editor/utils/import-export.ts`
- `app/card-editor/utils/zip-export.ts`
- `app/card-editor/utils/zip-import.ts`
- `public/schemas/equipment-pack.v1.schema.json`
- card-only `.dhcb` / `.zip` import/export behavior.

---

## Task 1: Extract Default Equipment Service Composition

**Files:**

- Create: `equipment/services/default-equipment-services.ts`
- Modify: `equipment/ui/equipment-ui-store.ts`
- Test: `equipment/services/__tests__/default-equipment-services.test.ts`

- [ ] **Step 1: Write the failing service composition tests**

Create `equipment/services/__tests__/default-equipment-services.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createInMemoryEquipmentPackStorageAdapter } from "@/equipment/packs/local-storage-adapter"
import { createDefaultEquipmentServices } from "../default-equipment-services"

describe("default equipment services", () => {
  it("creates application and runtime cache services without requiring browser localStorage", () => {
    const services = createDefaultEquipmentServices({ storage: "memory" })

    expect(services.applicationService).toBeTruthy()
    expect(services.runtimeCacheService).toBeTruthy()
  })

  it("can use memory storage outside a browser", async () => {
    const services = createDefaultEquipmentServices({ storage: "memory" })
    const result = await services.applicationService.initialize()

    expect(result.snapshot.packCount).toBe(0)
  })

  it("accepts an injected storage adapter for tests and future composition roots", async () => {
    const services = createDefaultEquipmentServices({
      storage: "adapter",
      adapter: createInMemoryEquipmentPackStorageAdapter(),
    })
    const result = await services.applicationService.initialize()

    expect(result.snapshot.packCount).toBe(0)
  })
})
```

- [ ] **Step 1a: Add import-boundary guard for editor/UI storage composition**

Add a lightweight boundary test that scans these files/directories:

- `equipment/ui/equipment-ui-store.ts`
- `app/card-editor/equipment/**/*.ts`
- `app/card-editor/equipment/**/*.tsx`

The test must fail if they directly import either:

- `local-storage-adapter`
- `local-storage-repository`

Only `equipment/services/default-equipment-services.ts` may know the default browser/localStorage implementation.

- [ ] **Step 2: Run the failing service composition tests**

Run:

```bash
npm run test:run -- equipment/services/__tests__/default-equipment-services.test.ts
```

Expected: FAIL because `equipment/services/default-equipment-services.ts` does not exist.

- [ ] **Step 3: Create the default service composition root**

Create `equipment/services/default-equipment-services.ts`:

```ts
import { allWeapons } from "@/data/list/all-weapons"
import { armorItems } from "@/data/list/armor"
import type { EquipmentPackStorageAdapter } from "@/equipment/packs/local-storage-adapter"
import {
  createBrowserLocalStorageAdapter,
  createInMemoryEquipmentPackStorageAdapter,
} from "@/equipment/packs/local-storage-adapter"
import { createLocalStorageEquipmentPackRepository } from "@/equipment/packs/local-storage-repository"
import {
  createEquipmentPackApplicationService,
  type EquipmentPackApplicationService,
} from "@/equipment/packs/application-service"
import { buildBuiltinRuntimeEquipmentTemplates } from "@/equipment/runtime-cache/builtin-templates"
import { createEquipmentRuntimeCacheService } from "@/equipment/runtime-cache/runtime-cache-service"
import type { EquipmentRuntimeCacheService } from "@/equipment/runtime-cache/types"
import type { NormalizedEquipmentModifierContributionTemplate } from "@/equipment/import/types"

export interface DefaultEquipmentServices {
  applicationService: EquipmentPackApplicationService
  runtimeCacheService: EquipmentRuntimeCacheService
}

export type DefaultEquipmentStorageInput =
  | { storage?: "browser" | "memory"; adapter?: never }
  | { storage: "adapter"; adapter: EquipmentPackStorageAdapter }

function normalizedBuiltinArmor() {
  return armorItems.map((armor) => ({
    ...armor,
    modifierContributions: (armor.modifierContributions ?? []).filter(
      (contribution): contribution is NormalizedEquipmentModifierContributionTemplate =>
        contribution.definition.kind === "modifier",
    ),
  }))
}

function createDefaultAdapter(input: DefaultEquipmentStorageInput = {}) {
  if (input.storage === "adapter") return input.adapter
  if (input.storage === "memory") return createInMemoryEquipmentPackStorageAdapter()
  if (typeof window === "undefined") return createInMemoryEquipmentPackStorageAdapter()
  return createBrowserLocalStorageAdapter(window.localStorage)
}

export function createDefaultEquipmentServices(
  input: DefaultEquipmentStorageInput = {},
): DefaultEquipmentServices {
  const runtimeCacheService = createEquipmentRuntimeCacheService()
  const repository = createLocalStorageEquipmentPackRepository(createDefaultAdapter(input))
  const builtinTemplates = buildBuiltinRuntimeEquipmentTemplates({
    weapons: allWeapons,
    armor: normalizedBuiltinArmor(),
  })
  const applicationService = createEquipmentPackApplicationService({
    repository,
    runtimeCacheService,
    builtinTemplates,
  })

  return { applicationService, runtimeCacheService }
}
```

- [ ] **Step 4: Update the equipment UI store to use the composition root**

In `equipment/ui/equipment-ui-store.ts`, remove these imports:

```ts
import { allWeapons } from "@/data/list/all-weapons"
import { armorItems } from "@/data/list/armor"
import { buildBuiltinRuntimeEquipmentTemplates } from "@/equipment/runtime-cache/builtin-templates"
import { createEquipmentRuntimeCacheService } from "@/equipment/runtime-cache/runtime-cache-service"
import {
  createEquipmentPackApplicationService,
  type EquipmentPackApplicationService,
} from "@/equipment/packs/application-service"
import {
  createBrowserLocalStorageAdapter,
  createInMemoryEquipmentPackStorageAdapter,
} from "@/equipment/packs/local-storage-adapter"
import { createLocalStorageEquipmentPackRepository } from "@/equipment/packs/local-storage-repository"
import type {
  EquipmentPackImportSource,
  NormalizedEquipmentModifierContributionTemplate,
} from "@/equipment/import/types"
```

Replace them with:

```ts
import type { EquipmentPackApplicationService } from "@/equipment/packs/application-service"
import type { EquipmentPackImportSource } from "@/equipment/import/types"
import { createDefaultEquipmentServices } from "@/equipment/services/default-equipment-services"
```

Delete `normalizedBuiltinArmor()` from `equipment/ui/equipment-ui-store.ts`.

Replace `createBrowserEquipmentUiStore()` with:

```ts
function createBrowserEquipmentUiStore() {
  return createEquipmentUiStore(createDefaultEquipmentServices())
}
```

- [ ] **Step 5: Run focused service and UI store tests**

Run:

```bash
npm run test:run -- equipment/services/__tests__/default-equipment-services.test.ts equipment/ui/__tests__/equipment-ui-store.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit service composition extraction**

```bash
git add equipment/services/default-equipment-services.ts equipment/services/__tests__/default-equipment-services.test.ts equipment/ui/equipment-ui-store.ts
git commit -m "refactor: extract equipment service composition"
```

---

## Task 2: Add Equipment ID Helpers

**Files:**

- Create: `app/card-editor/equipment/equipment-id.ts`
- Test: `app/card-editor/equipment/__tests__/equipment-id.test.ts`

- [ ] **Step 1: Write failing ID helper tests**

Create `app/card-editor/equipment/__tests__/equipment-id.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import {
  buildStandardEquipmentId,
  generateStandardEquipmentId,
  parseStandardEquipmentId,
  rewriteEquipmentIdsForMetadataChange,
} from "../equipment-id"

describe("equipment editor ids", () => {
  it("generates ids from pack name, author, type, and a random suffix", () => {
    const random = vi.fn(() => 0.123456789)
    const now = vi.fn(() => 1710000000000)

    expect(
      generateStandardEquipmentId({
        packName: "星剑军械库",
        author: "虹色青空",
        kind: "weapon",
        random,
        now,
      }),
    ).toMatch(/^星剑军械-虹色青空-weap-/)
  })

  it("rewrites only ids matching the previous standard prefix", () => {
    const rewritten = rewriteEquipmentIdsForMetadataChange({
      previous: { name: "旧包", author: "旧作者" },
      next: { name: "新包", author: "新作者" },
      weapons: [
        { id: buildStandardEquipmentId("旧包", "旧作者", "weapon", "abc") },
        { id: "custom-weapon-id" },
      ],
      armor: [{ id: buildStandardEquipmentId("旧包", "旧作者", "armor", "def") }],
    })

    expect(rewritten.weapons.map((item) => item.id)).toEqual([
      buildStandardEquipmentId("新包", "新作者", "weapon", "abc"),
      "custom-weapon-id",
    ])
    expect(rewritten.armor.map((item) => item.id)).toEqual([
      buildStandardEquipmentId("新包", "新作者", "armor", "def"),
    ])
  })

  it("treats non-standard ids as custom ids", () => {
    expect(parseStandardEquipmentId("hand-written", "包", "作者", "weapon").isStandard).toBe(false)
  })
})
```

- [ ] **Step 2: Run the failing ID helper tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-id.test.ts
```

Expected: FAIL because `equipment-id.ts` does not exist.

- [ ] **Step 3: Implement equipment ID helpers**

Create `app/card-editor/equipment/equipment-id.ts`:

```ts
export type EquipmentItemKind = "weapon" | "armor"

const TYPE_ABBREVIATION: Record<EquipmentItemKind, string> = {
  weapon: "weap",
  armor: "armo",
}

export function sanitizeEquipmentIdString(value: string): string {
  return value
    .replace(/[^\w\u4e00-\u9fff-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function truncate(value: string, maxLength = 8) {
  return value.length <= maxLength ? value : value.substring(0, maxLength)
}

function cleanPrefixPart(value: string, fallback: string) {
  return truncate(sanitizeEquipmentIdString(value) || fallback)
}

function randomSuffix(input: { now?: () => number; random?: () => number }) {
  const timestamp = (input.now ?? Date.now)().toString(36)
  const random = (input.random ?? Math.random)().toString(36).substring(2, 8).padEnd(6, "0")
  return `${timestamp}-${random}`
}

export function buildStandardEquipmentId(
  packName: string,
  author: string,
  kind: EquipmentItemKind,
  suffix: string,
) {
  const cleanPackName = cleanPrefixPart(packName, "装备包")
  const cleanAuthor = cleanPrefixPart(author, "作者")
  const cleanSuffix = sanitizeEquipmentIdString(suffix) || "unnamed"
  return `${cleanPackName}-${cleanAuthor}-${TYPE_ABBREVIATION[kind]}-${cleanSuffix}`
}

export function generateStandardEquipmentId(input: {
  packName: string
  author: string
  kind: EquipmentItemKind
  now?: () => number
  random?: () => number
}) {
  return buildStandardEquipmentId(
    input.packName || "装备包",
    input.author || "作者",
    input.kind,
    randomSuffix(input),
  )
}

export function parseStandardEquipmentId(
  id: string,
  packName: string,
  author: string,
  kind: EquipmentItemKind,
): { isStandard: boolean; suffix: string; prefix: string } {
  const prefix = buildStandardEquipmentId(packName || "装备包", author || "作者", kind, "").replace(/unnamed$/, "")
  if (!id.startsWith(prefix)) return { isStandard: false, suffix: id, prefix }
  return { isStandard: true, suffix: id.substring(prefix.length), prefix }
}

export function rewriteEquipmentIdsForMetadataChange<TWeapon extends { id?: string }, TArmor extends { id?: string }>(
  input: {
    previous: { name: string; author: string }
    next: { name: string; author: string }
    weapons: TWeapon[]
    armor: TArmor[]
  },
) {
  return {
    weapons: input.weapons.map((item) => {
      const parsed = parseStandardEquipmentId(item.id ?? "", input.previous.name, input.previous.author, "weapon")
      return parsed.isStandard
        ? { ...item, id: buildStandardEquipmentId(input.next.name, input.next.author, "weapon", parsed.suffix) }
        : item
    }),
    armor: input.armor.map((item) => {
      const parsed = parseStandardEquipmentId(item.id ?? "", input.previous.name, input.previous.author, "armor")
      return parsed.isStandard
        ? { ...item, id: buildStandardEquipmentId(input.next.name, input.next.author, "armor", parsed.suffix) }
        : item
    }),
  }
}
```

- [ ] **Step 4: Run ID helper tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-id.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit ID helpers**

```bash
git add app/card-editor/equipment/equipment-id.ts app/card-editor/equipment/__tests__/equipment-id.test.ts
git commit -m "feat: add equipment editor id helpers"
```

---

## Task 3: Add Equipment Draft Helpers

**Files:**

- Create: `app/card-editor/equipment/equipment-draft.ts`
- Test: `app/card-editor/equipment/__tests__/equipment-draft.test.ts`

- [ ] **Step 1: Write failing draft helper tests**

Create `app/card-editor/equipment/__tests__/equipment-draft.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import {
  addEquipmentArmor,
  addEquipmentWeapon,
  createDefaultEquipmentDraft,
  duplicateEquipmentWeapon,
  findDuplicateEquipmentIds,
  updateEquipmentMetadata,
} from "../equipment-draft"

describe("equipment editor draft", () => {
  it("creates the default equipment draft", () => {
    expect(createDefaultEquipmentDraft()).toEqual({
      format: "daggerheart.equipment-pack.v1",
      name: "未命名装备包",
      version: "1.0.0",
      author: "",
      description: "",
      equipment: { weapons: [], armor: [] },
    })
  })

  it("adds a weapon with generated id and empty editor-safe values", () => {
    const draft = addEquipmentWeapon(createDefaultEquipmentDraft(), {
      now: () => 1710000000000,
      random: () => 0.1,
    })

    expect(draft.equipment.weapons).toHaveLength(1)
    expect(draft.equipment.weapons[0]).toMatchObject({
      name: "",
      tier: "",
      weaponType: "primary",
      trait: "",
      damageType: "",
      range: "",
      burden: "",
      damage: "",
      featureName: "",
      description: "",
      modifierContributions: [],
    })
    expect(draft.equipment.weapons[0].id).toContain("未命名装备-作者-weap-")
  })

  it("adds armor with null numeric placeholders", () => {
    const draft = addEquipmentArmor(createDefaultEquipmentDraft(), {
      now: () => 1710000000000,
      random: () => 0.1,
    })

    expect(draft.equipment.armor[0]).toMatchObject({
      baseArmorMax: null,
      baseThresholds: { minor: null, major: null },
    })
  })

  it("rewrites standard ids when metadata name or author changes", () => {
    let draft = createDefaultEquipmentDraft()
    draft = addEquipmentWeapon(draft, { now: () => 1710000000000, random: () => 0.1 })
    const oldId = draft.equipment.weapons[0].id

    draft = updateEquipmentMetadata(draft, "name", "新装备包")

    expect(draft.equipment.weapons[0].id).not.toBe(oldId)
    expect(draft.equipment.weapons[0].id).toContain("新装备包-作者-weap-")
  })

  it("does not rewrite custom ids when metadata changes", () => {
    const draft = {
      ...createDefaultEquipmentDraft(),
      equipment: {
        weapons: [{ ...addEquipmentWeapon(createDefaultEquipmentDraft()).equipment.weapons[0], id: "custom-id" }],
        armor: [],
      },
    }

    expect(updateEquipmentMetadata(draft, "author", "新作者").equipment.weapons[0].id).toBe("custom-id")
  })

  it("duplicates weapons with a fresh generated id", () => {
    let draft = addEquipmentWeapon(createDefaultEquipmentDraft(), {
      now: () => 1710000000000,
      random: () => 0.1,
    })
    const originalId = draft.equipment.weapons[0].id
    draft = duplicateEquipmentWeapon(draft, 0, { now: () => 1710000000001, random: () => 0.2 })

    expect(draft.equipment.weapons).toHaveLength(2)
    expect(draft.equipment.weapons[1].id).not.toBe(originalId)
  })

  it("finds duplicate ids across weapons and armor", () => {
    const draft = {
      ...createDefaultEquipmentDraft(),
      equipment: {
        weapons: [{ ...addEquipmentWeapon(createDefaultEquipmentDraft()).equipment.weapons[0], id: "same-id" }],
        armor: [{ ...addEquipmentArmor(createDefaultEquipmentDraft()).equipment.armor[0], id: "same-id" }],
      },
    }

    expect(findDuplicateEquipmentIds(draft)).toEqual(["same-id"])
  })

  it("does not rewrite ids when only version changes", () => {
    let draft = addEquipmentWeapon(createDefaultEquipmentDraft(), {
      now: () => 1710000000000,
      random: () => 0.1,
    })
    const oldId = draft.equipment.weapons[0].id

    draft = updateEquipmentMetadata(draft, "version", "1.0.1")

    expect(draft.equipment.weapons[0].id).toBe(oldId)
  })
})
```

- [ ] **Step 2: Run failing draft tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-draft.test.ts
```

Expected: FAIL because `equipment-draft.ts` does not exist.

- [ ] **Step 3: Implement draft types and helpers**

Create `app/card-editor/equipment/equipment-draft.ts` with these public exports:

```ts
import type {
  EquipmentBurden,
  EquipmentDamageType,
  EquipmentRange,
  EquipmentTier,
  EquipmentTrait,
  NormalizedEquipmentModifierContributionTemplate,
} from "@/equipment/import/types"
import { generateStandardEquipmentId, rewriteEquipmentIdsForMetadataChange } from "./equipment-id"

export type EquipmentEditorDraft = {
  format: "daggerheart.equipment-pack.v1"
  name: string
  version: string
  author: string
  description: string
  equipment: {
    weapons: WeaponEditorDraft[]
    armor: ArmorEditorDraft[]
  }
}

export type WeaponEditorDraft = {
  id: string
  name: string
  tier: EquipmentTier | ""
  weaponType: "primary" | "secondary"
  trait: EquipmentTrait | ""
  damageType: EquipmentDamageType | ""
  range: EquipmentRange | ""
  burden: EquipmentBurden | ""
  damage: string
  featureName: string
  description: string
  modifierContributions: NormalizedEquipmentModifierContributionTemplate[]
}

export type ArmorEditorDraft = {
  id: string
  name: string
  tier: EquipmentTier | ""
  baseArmorMax: number | null
  baseThresholds: { minor: number | null; major: number | null }
  featureName: string
  description: string
  modifierContributions: NormalizedEquipmentModifierContributionTemplate[]
}

type IdOptions = { now?: () => number; random?: () => number }

export function createDefaultEquipmentDraft(): EquipmentEditorDraft {
  return {
    format: "daggerheart.equipment-pack.v1",
    name: "未命名装备包",
    version: "1.0.0",
    author: "",
    description: "",
    equipment: { weapons: [], armor: [] },
  }
}

function newWeapon(draft: EquipmentEditorDraft, options: IdOptions = {}): WeaponEditorDraft {
  return {
    id: generateStandardEquipmentId({ packName: draft.name, author: draft.author, kind: "weapon", ...options }),
    name: "",
    tier: "",
    weaponType: "primary",
    trait: "",
    damageType: "",
    range: "",
    burden: "",
    damage: "",
    featureName: "",
    description: "",
    modifierContributions: [],
  }
}

function newArmor(draft: EquipmentEditorDraft, options: IdOptions = {}): ArmorEditorDraft {
  return {
    id: generateStandardEquipmentId({ packName: draft.name, author: draft.author, kind: "armor", ...options }),
    name: "",
    tier: "",
    baseArmorMax: null,
    baseThresholds: { minor: null, major: null },
    featureName: "",
    description: "",
    modifierContributions: [],
  }
}

export function addEquipmentWeapon(draft: EquipmentEditorDraft, options: IdOptions = {}): EquipmentEditorDraft {
  return {
    ...draft,
    equipment: { ...draft.equipment, weapons: [...draft.equipment.weapons, newWeapon(draft, options)] },
  }
}

export function addEquipmentArmor(draft: EquipmentEditorDraft, options: IdOptions = {}): EquipmentEditorDraft {
  return {
    ...draft,
    equipment: { ...draft.equipment, armor: [...draft.equipment.armor, newArmor(draft, options)] },
  }
}

export function duplicateEquipmentWeapon(
  draft: EquipmentEditorDraft,
  index: number,
  options: IdOptions = {},
): EquipmentEditorDraft {
  const source = draft.equipment.weapons[index]
  if (!source) return draft
  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      weapons: [
        ...draft.equipment.weapons,
        { ...source, id: generateStandardEquipmentId({ packName: draft.name, author: draft.author, kind: "weapon", ...options }) },
      ],
    },
  }
}

export function updateEquipmentMetadata<K extends "name" | "version" | "author" | "description">(
  draft: EquipmentEditorDraft,
  field: K,
  value: EquipmentEditorDraft[K],
): EquipmentEditorDraft {
  const previous = { name: draft.name, author: draft.author }
  const nextDraft = { ...draft, [field]: value }
  if (field !== "name" && field !== "author") return nextDraft
  const rewritten = rewriteEquipmentIdsForMetadataChange({
    previous,
    next: { name: nextDraft.name, author: nextDraft.author },
    weapons: nextDraft.equipment.weapons,
    armor: nextDraft.equipment.armor,
  })
  return { ...nextDraft, equipment: { weapons: rewritten.weapons, armor: rewritten.armor } }
}
```

Add the remaining immutable helper exports to the same file:

```ts
export function duplicateEquipmentArmor(
  draft: EquipmentEditorDraft,
  index: number,
  options: IdOptions = {},
): EquipmentEditorDraft {
  const source = draft.equipment.armor[index]
  if (!source) return draft
  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      armor: [
        ...draft.equipment.armor,
        { ...source, id: generateStandardEquipmentId({ packName: draft.name, author: draft.author, kind: "armor", ...options }) },
      ],
    },
  }
}

export function deleteEquipmentWeapon(draft: EquipmentEditorDraft, index: number): EquipmentEditorDraft {
  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      weapons: draft.equipment.weapons.filter((_, itemIndex) => itemIndex !== index),
    },
  }
}

export function deleteEquipmentArmor(draft: EquipmentEditorDraft, index: number): EquipmentEditorDraft {
  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      armor: draft.equipment.armor.filter((_, itemIndex) => itemIndex !== index),
    },
  }
}

export function updateEquipmentWeapon(
  draft: EquipmentEditorDraft,
  index: number,
  patch: Partial<WeaponEditorDraft>,
): EquipmentEditorDraft {
  if (!draft.equipment.weapons[index]) return draft
  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      weapons: draft.equipment.weapons.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    },
  }
}

export function updateEquipmentArmor(
  draft: EquipmentEditorDraft,
  index: number,
  patch: Partial<ArmorEditorDraft>,
): EquipmentEditorDraft {
  if (!draft.equipment.armor[index]) return draft
  return {
    ...draft,
    equipment: {
      ...draft.equipment,
      armor: draft.equipment.armor.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    },
  }
}

export function hasEquipmentItems(draft: EquipmentEditorDraft): boolean {
  return draft.equipment.weapons.length + draft.equipment.armor.length > 0
}

export function findDuplicateEquipmentIds(draft: EquipmentEditorDraft): string[] {
  const ids = [...draft.equipment.weapons, ...draft.equipment.armor].map((item) => item.id).filter(Boolean)
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id)
    seen.add(id)
  }
  return Array.from(duplicates)
}
```

- [ ] **Step 4: Run draft helper tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-draft.test.ts app/card-editor/equipment/__tests__/equipment-id.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit draft helpers**

```bash
git add app/card-editor/equipment/equipment-draft.ts app/card-editor/equipment/__tests__/equipment-draft.test.ts
git commit -m "feat: add equipment editor draft helpers"
```

---

## Task 4: Add Equipment Import and Export Helpers

**Files:**

- Create: `app/card-editor/equipment/equipment-import-export.ts`
- Test: `app/card-editor/equipment/__tests__/equipment-import-export.test.ts`

- [ ] **Step 1: Write failing import/export helper tests**

Create `app/card-editor/equipment/__tests__/equipment-import-export.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { importEquipmentDraftFromFile, recoverEquipmentEditorDraft, toEquipmentExportJson } from "../equipment-import-export"

describe("equipment editor import/export", () => {
  it("recovers missing editor-safe structure", () => {
    const result = recoverEquipmentEditorDraft({
      format: "daggerheart.equipment-pack.v1",
      name: "装备",
      version: "1.0.0",
      equipment: { weapons: [{ name: "半成品" }] },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.draft.author).toBe("")
    expect(result.draft.description).toBe("")
    expect(result.draft.equipment.weapons[0]).toMatchObject({
      name: "半成品",
      tier: "",
      modifierContributions: [],
    })
    expect(result.draft.equipment.armor).toEqual([])
  })

  it("rejects non-object weapon entries", () => {
    const result = recoverEquipmentEditorDraft({
      format: "daggerheart.equipment-pack.v1",
      equipment: { weapons: ["bad"] },
    })

    expect(result).toMatchObject({ ok: false })
  })

  it.each([
    ["null top-level", null],
    ["array top-level", []],
    ["wrong string format", { format: "daggerheart.card-pack.v1" }],
    ["non-string format", { format: 123 }],
    ["equipment array", { format: "daggerheart.equipment-pack.v1", equipment: [] }],
    ["weapons object", { format: "daggerheart.equipment-pack.v1", equipment: { weapons: {} } }],
    ["armor object", { format: "daggerheart.equipment-pack.v1", equipment: { armor: {} } }],
    ["non-object armor entry", { format: "daggerheart.equipment-pack.v1", equipment: { armor: ["bad"] } }],
  ])("rejects invalid envelope: %s", (_name, value) => {
    expect(recoverEquipmentEditorDraft(value)).toMatchObject({ ok: false })
  })

  it("reports malformed JSON file import", async () => {
    const file = new File(["{"], "bad.json", { type: "application/json" })

    await expect(importEquipmentDraftFromFile(file)).resolves.toMatchObject({
      ok: false,
      message: "装备 JSON 解析失败",
    })
  })

  it("keeps null numeric placeholders in export JSON", () => {
    const result = recoverEquipmentEditorDraft({
      format: "daggerheart.equipment-pack.v1",
      equipment: { armor: [{ id: "armor", name: "armor", baseThresholds: {} }] },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(toEquipmentExportJson(result.draft).equipment.armor[0]).toMatchObject({
      baseArmorMax: null,
      baseThresholds: { minor: null, major: null },
    })
  })
})
```

- [ ] **Step 2: Run failing import/export tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-import-export.test.ts
```

Expected: FAIL because `equipment-import-export.ts` does not exist.

- [ ] **Step 3: Implement import recovery and export serialization**

Create `app/card-editor/equipment/equipment-import-export.ts`:

```ts
import { toast } from "sonner"
import {
  createDefaultEquipmentDraft,
  type ArmorEditorDraft,
  type EquipmentEditorDraft,
  type WeaponEditorDraft,
} from "./equipment-draft"

type RecoveryResult = { ok: true; draft: EquipmentEditorDraft } | { ok: false; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value : ""
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function arrayOrEmpty(value: unknown) {
  return Array.isArray(value) ? value : []
}

function recoverWeapon(value: Record<string, unknown>): WeaponEditorDraft {
  return {
    id: stringOrEmpty(value.id),
    name: stringOrEmpty(value.name),
    tier: (typeof value.tier === "string" ? value.tier : "") as WeaponEditorDraft["tier"],
    weaponType: value.weaponType === "secondary" ? "secondary" : "primary",
    trait: (typeof value.trait === "string" ? value.trait : "") as WeaponEditorDraft["trait"],
    damageType: (typeof value.damageType === "string" ? value.damageType : "") as WeaponEditorDraft["damageType"],
    range: (typeof value.range === "string" ? value.range : "") as WeaponEditorDraft["range"],
    burden: (typeof value.burden === "string" ? value.burden : "") as WeaponEditorDraft["burden"],
    damage: stringOrEmpty(value.damage),
    featureName: stringOrEmpty(value.featureName),
    description: stringOrEmpty(value.description),
    modifierContributions: arrayOrEmpty(value.modifierContributions) as WeaponEditorDraft["modifierContributions"],
  }
}

function recoverArmor(value: Record<string, unknown>): ArmorEditorDraft {
  const thresholds = isRecord(value.baseThresholds) ? value.baseThresholds : {}
  return {
    id: stringOrEmpty(value.id),
    name: stringOrEmpty(value.name),
    tier: (typeof value.tier === "string" ? value.tier : "") as ArmorEditorDraft["tier"],
    baseArmorMax: numberOrNull(value.baseArmorMax),
    baseThresholds: {
      minor: numberOrNull(thresholds.minor),
      major: numberOrNull(thresholds.major),
    },
    featureName: stringOrEmpty(value.featureName),
    description: stringOrEmpty(value.description),
    modifierContributions: arrayOrEmpty(value.modifierContributions) as ArmorEditorDraft["modifierContributions"],
  }
}

export function recoverEquipmentEditorDraft(value: unknown): RecoveryResult {
  if (!isRecord(value)) return { ok: false, message: "装备 JSON 顶层必须是对象" }
  if (value.format !== undefined && value.format !== "daggerheart.equipment-pack.v1") {
    return { ok: false, message: "不是有效的装备包格式" }
  }

  const equipment = value.equipment === undefined ? {} : value.equipment
  if (!isRecord(equipment)) return { ok: false, message: "equipment 必须是对象" }
  if (equipment.weapons !== undefined && !Array.isArray(equipment.weapons)) {
    return { ok: false, message: "equipment.weapons 必须是数组" }
  }
  if (equipment.armor !== undefined && !Array.isArray(equipment.armor)) {
    return { ok: false, message: "equipment.armor 必须是数组" }
  }

  const weapons = arrayOrEmpty(equipment.weapons)
  const armor = arrayOrEmpty(equipment.armor)
  if (!weapons.every(isRecord) || !armor.every(isRecord)) {
    return { ok: false, message: "weapons 和 armor 里的每个条目都必须是对象" }
  }

  return {
    ok: true,
    draft: {
      ...createDefaultEquipmentDraft(),
      name: stringOrEmpty(value.name),
      version: stringOrEmpty(value.version),
      author: stringOrEmpty(value.author),
      description: stringOrEmpty(value.description),
      equipment: {
        weapons: weapons.map(recoverWeapon),
        armor: armor.map(recoverArmor),
      },
    },
  }
}

export function toEquipmentExportJson(draft: EquipmentEditorDraft) {
  return {
    format: draft.format,
    name: draft.name,
    version: draft.version,
    author: draft.author,
    description: draft.description,
    equipment: draft.equipment,
  }
}

export async function importEquipmentDraftFromFile(file: File): Promise<RecoveryResult> {
  try {
    return recoverEquipmentEditorDraft(JSON.parse(await file.text()))
  } catch {
    return { ok: false, message: "装备 JSON 解析失败" }
  }
}

export function downloadEquipmentDraftJson(draft: EquipmentEditorDraft) {
  const blob = new Blob([JSON.stringify(toEquipmentExportJson(draft), null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${draft.name || "装备包"}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast.success("装备包已导出")
}
```

- [ ] **Step 4: Run import/export tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-import-export.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit import/export helpers**

```bash
git add app/card-editor/equipment/equipment-import-export.ts app/card-editor/equipment/__tests__/equipment-import-export.test.ts
git commit -m "feat: add equipment editor import export helpers"
```

---

## Task 5: Add Equipment Validation Mapping

**Files:**

- Create: `app/card-editor/equipment/equipment-validation.ts`
- Test: `app/card-editor/equipment/__tests__/equipment-validation.test.ts`

- [ ] **Step 1: Write failing validation mapping tests**

Create `app/card-editor/equipment/__tests__/equipment-validation.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  createEditorLocalDiagnostics,
  mapEquipmentDiagnosticsToFriendly,
  targetFromDiagnosticPath,
} from "../equipment-validation"

describe("equipment validation mapping", () => {
  it("maps weapon paths to weapon jump targets", () => {
    expect(targetFromDiagnosticPath("/equipment/weapons/3/damage")).toEqual({
      tab: "weapons",
      index: 3,
      field: "damage",
    })
  })

  it("maps metadata paths to metadata jump targets", () => {
    expect(targetFromDiagnosticPath("/name")).toEqual({ tab: "metadata", field: "name" })
  })

  it("groups diagnostics into friendly equipment errors", () => {
    const result = mapEquipmentDiagnosticsToFriendly([
      {
        severity: "error",
        code: "MISSING_FIELD",
        path: "/equipment/armor/1/baseThresholds/minor",
        message: "Required field is missing.",
      },
    ])

    expect(result[0]).toMatchObject({
      severity: "error",
      title: "第2件护甲的轻微阈值有问题",
      groupType: "护甲",
      specificGroup: "第2件护甲",
    })
  })

  it("adds editor-local duplicate id diagnostics before dry-run diagnostics", () => {
    const result = createEditorLocalDiagnostics({
      format: "daggerheart.equipment-pack.v1",
      name: "装备",
      version: "1.0.0",
      author: "",
      description: "",
      equipment: {
        weapons: [{ id: "dup" } as never],
        armor: [{ id: "dup" } as never],
      },
    })

    expect(result).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_ID",
        path: "/equipment",
        message: expect.stringContaining("dup"),
      }),
    ])
  })
})
```

- [ ] **Step 2: Run failing validation tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-validation.test.ts
```

Expected: FAIL because `equipment-validation.ts` does not exist.

- [ ] **Step 3: Implement validation mapping and dry-run wrapper**

Create `app/card-editor/equipment/equipment-validation.ts`:

```ts
import type {
  EquipmentPackImportDiagnostic,
} from "@/equipment/import/types"
import type {
  EquipmentPackApplicationImportResult,
  EquipmentPackApplicationService,
} from "@/equipment/packs/application-service"
import type { EquipmentEditorDraft } from "./equipment-draft"
import { findDuplicateEquipmentIds } from "./equipment-draft"
import { toEquipmentExportJson } from "./equipment-import-export"

export type EquipmentEditorTab = "metadata" | "weapons" | "armor"

export type EquipmentValidationJumpTarget =
  | { tab: "metadata"; field?: string }
  | { tab: "weapons"; index: number; field?: string }
  | { tab: "armor"; index: number; field?: string }

export type FriendlyEquipmentDiagnostic = {
  title: string
  description: string
  suggestion: string
  severity: "error" | "warning"
  field?: string
  groupType: "基础信息" | "武器" | "护甲" | "系统"
  specificGroup: string
  diagnostic: EquipmentPackImportDiagnostic
  jumpTarget?: EquipmentValidationJumpTarget
}

const FIELD_NAMES: Record<string, string> = {
  id: "装备ID",
  name: "名称",
  version: "版本号",
  author: "作者",
  description: "描述",
  format: "格式",
  tier: "等级",
  weaponType: "武器类型",
  trait: "属性",
  damageType: "伤害类型",
  range: "范围",
  burden: "负荷",
  damage: "伤害",
  baseArmorMax: "基础护甲槽",
  baseThresholds: "伤害阈值",
  minor: "轻微阈值",
  major: "严重阈值",
  featureName: "特性名称",
  modifierContributions: "数值修正",
}

function fieldLabel(field: string | undefined) {
  return field ? FIELD_NAMES[field] ?? field : undefined
}

export function targetFromDiagnosticPath(path: string): EquipmentValidationJumpTarget | undefined {
  const weapon = path.match(/^\/equipment\/weapons\/(\d+)(?:\/(.+))?$/)
  if (weapon) return { tab: "weapons", index: Number(weapon[1]), field: weapon[2]?.split("/").at(-1) }

  const armor = path.match(/^\/equipment\/armor\/(\d+)(?:\/(.+))?$/)
  if (armor) return { tab: "armor", index: Number(armor[1]), field: armor[2]?.split("/").at(-1) }

  const metadata = path.match(/^\/(format|name|version|author|description)$/)
  if (metadata) return { tab: "metadata", field: metadata[1] }

  return undefined
}

function descriptionAndSuggestion(diagnostic: EquipmentPackImportDiagnostic) {
  if (diagnostic.code === "MISSING_FIELD") {
    return { description: "必填字段不能为空", suggestion: "请填写这个必需字段，然后重新验证" }
  }
  if (diagnostic.code === "INVALID_ENUM") {
    return { description: "选择的选项不在有效范围内", suggestion: "请从下拉选项中选择一个有效值" }
  }
  if (diagnostic.code === "DUPLICATE_ID") {
    return { description: "装备 ID 重复", suggestion: "请修改其中一个装备 ID，确保每个装备唯一" }
  }
  if (diagnostic.code === "INVALID_THRESHOLD_ORDER") {
    return { description: "严重阈值不能小于轻微阈值", suggestion: "请调整护甲阈值顺序" }
  }
  return { description: diagnostic.message, suggestion: "请检查并修正该字段内容" }
}

export function mapEquipmentDiagnosticsToFriendly(
  diagnostics: EquipmentPackImportDiagnostic[],
): FriendlyEquipmentDiagnostic[] {
  return diagnostics.map((diagnostic) => {
    const jumpTarget = targetFromDiagnosticPath(diagnostic.path)
    const field = fieldLabel(jumpTarget?.field)
    const { description, suggestion } = descriptionAndSuggestion(diagnostic)

    if (jumpTarget?.tab === "weapons") {
      return {
        title: `第${jumpTarget.index + 1}件武器${field ? `的${field}` : ""}有问题`,
        description,
        suggestion,
        severity: diagnostic.severity,
        field,
        groupType: "武器",
        specificGroup: `第${jumpTarget.index + 1}件武器`,
        diagnostic,
        jumpTarget,
      }
    }

    if (jumpTarget?.tab === "armor") {
      return {
        title: `第${jumpTarget.index + 1}件护甲${field ? `的${field}` : ""}有问题`,
        description,
        suggestion,
        severity: diagnostic.severity,
        field,
        groupType: "护甲",
        specificGroup: `第${jumpTarget.index + 1}件护甲`,
        diagnostic,
        jumpTarget,
      }
    }

    if (jumpTarget?.tab === "metadata") {
      return {
        title: `装备包基础信息${field ? `的${field}` : ""}有问题`,
        description,
        suggestion,
        severity: diagnostic.severity,
        field,
        groupType: "基础信息",
        specificGroup: "基础信息",
        diagnostic,
        jumpTarget,
      }
    }

    return {
      title: "系统问题",
      description,
      suggestion,
      severity: diagnostic.severity,
      groupType: "系统",
      specificGroup: "系统问题",
      diagnostic,
    }
  })
}

export function createEditorLocalDiagnostics(draft: EquipmentEditorDraft): EquipmentPackImportDiagnostic[] {
  return findDuplicateEquipmentIds(draft).map((id) => ({
    severity: "error",
    code: "DUPLICATE_ID",
    path: "/equipment",
    message: `装备 ID 重复：${id}`,
  }))
}

export async function validateEquipmentEditorDraft(
  draft: EquipmentEditorDraft,
  applicationService: EquipmentPackApplicationService,
): Promise<EquipmentPackApplicationImportResult> {
  const localDiagnostics = createEditorLocalDiagnostics(draft)
  const result = await applicationService.importFromSource(
    {
      origin: { kind: "object", label: "equipment-editor-draft" },
      async read() {
        return { kind: "parsedObject", value: toEquipmentExportJson(draft) }
      },
    },
    { mode: "dryRun" },
  )
  return {
    ...result,
    diagnostics: [...localDiagnostics, ...result.diagnostics],
    ok: result.ok && localDiagnostics.length === 0,
  }
}
```

- [ ] **Step 4: Run validation mapping tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-validation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit validation mapping**

```bash
git add app/card-editor/equipment/equipment-validation.ts app/card-editor/equipment/__tests__/equipment-validation.test.ts
git commit -m "feat: add equipment editor validation mapping"
```

---

## Task 6: Add Equipment Editor Store

**Files:**

- Create: `app/card-editor/equipment/equipment-editor-store.ts`
- Test: extend `app/card-editor/equipment/__tests__/equipment-draft.test.ts` or create `app/card-editor/equipment/__tests__/equipment-editor-store.test.ts`

- [ ] **Step 1: Write failing equipment store tests**

Create `app/card-editor/equipment/__tests__/equipment-editor-store.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createEquipmentEditorStore } from "../equipment-editor-store"

describe("equipment editor store", () => {
  it("starts with a default equipment draft and metadata tab", () => {
    const store = createEquipmentEditorStore()

    expect(store.getState().draft.name).toBe("未命名装备包")
    expect(store.getState().selectedTab).toBe("metadata")
  })

  it("adds weapons and selects the new weapon", () => {
    const store = createEquipmentEditorStore()

    store.getState().addWeapon()

    expect(store.getState().draft.equipment.weapons).toHaveLength(1)
    expect(store.getState().selectedTab).toBe("weapons")
    expect(store.getState().selectedWeaponIndex).toBe(0)
  })

  it("imports by replacement", () => {
    const store = createEquipmentEditorStore()

    const result = store.getState().replaceDraftFromUnknown({
      format: "daggerheart.equipment-pack.v1",
      name: "导入装备",
      equipment: { weapons: [{ id: "weapon", name: "剑" }] },
    })

    expect(result.ok).toBe(true)
    expect(store.getState().draft.name).toBe("导入装备")
    expect(store.getState().draft.equipment.weapons).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run failing equipment store tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-editor-store.test.ts
```

Expected: FAIL because `equipment-editor-store.ts` does not exist.

- [ ] **Step 3: Implement the equipment editor store**

Create `app/card-editor/equipment/equipment-editor-store.ts`:

```ts
import { create, type StoreApi, type UseBoundStore } from "zustand"
import {
  addEquipmentArmor,
  addEquipmentWeapon,
  createDefaultEquipmentDraft,
  deleteEquipmentArmor,
  deleteEquipmentWeapon,
  duplicateEquipmentArmor,
  duplicateEquipmentWeapon,
  hasEquipmentItems,
  updateEquipmentArmor,
  updateEquipmentMetadata,
  updateEquipmentWeapon,
  type ArmorEditorDraft,
  type EquipmentEditorDraft,
  type WeaponEditorDraft,
} from "./equipment-draft"
import { recoverEquipmentEditorDraft } from "./equipment-import-export"
import type { EquipmentPackApplicationImportResult } from "@/equipment/packs/application-service"

export type EquipmentEditorTab = "metadata" | "weapons" | "armor"

export interface EquipmentEditorStoreState {
  draft: EquipmentEditorDraft
  selectedTab: EquipmentEditorTab
  selectedWeaponIndex: number
  selectedArmorIndex: number
  validationResult: EquipmentPackApplicationImportResult | null
  isValidating: boolean
  setSelectedTab(tab: EquipmentEditorTab): void
  setSelectedWeaponIndex(index: number): void
  setSelectedArmorIndex(index: number): void
  updateMetadata(field: "name" | "version" | "author" | "description", value: string): void
  resetDraft(): void
  hasItems(): boolean
  addWeapon(): void
  addArmor(): void
  updateWeapon(index: number, patch: Partial<WeaponEditorDraft>): void
  updateArmor(index: number, patch: Partial<ArmorEditorDraft>): void
  duplicateWeapon(index: number): void
  duplicateArmor(index: number): void
  deleteWeapon(index: number): void
  deleteArmor(index: number): void
  replaceDraftFromUnknown(value: unknown): ReturnType<typeof recoverEquipmentEditorDraft>
  setValidationResult(result: EquipmentPackApplicationImportResult | null): void
  setIsValidating(value: boolean): void
}

export function createEquipmentEditorStore(): UseBoundStore<StoreApi<EquipmentEditorStoreState>> {
  return create<EquipmentEditorStoreState>((set, get) => ({
    draft: createDefaultEquipmentDraft(),
    selectedTab: "metadata",
    selectedWeaponIndex: 0,
    selectedArmorIndex: 0,
    validationResult: null,
    isValidating: false,
    setSelectedTab: (selectedTab) => set({ selectedTab }),
    setSelectedWeaponIndex: (selectedWeaponIndex) => set({ selectedWeaponIndex }),
    setSelectedArmorIndex: (selectedArmorIndex) => set({ selectedArmorIndex }),
    updateMetadata: (field, value) => set((state) => ({ draft: updateEquipmentMetadata(state.draft, field, value) })),
    resetDraft: () => set({ draft: createDefaultEquipmentDraft(), selectedTab: "metadata", selectedWeaponIndex: 0, selectedArmorIndex: 0 }),
    hasItems: () => hasEquipmentItems(get().draft),
    addWeapon: () => set((state) => ({
      draft: addEquipmentWeapon(state.draft),
      selectedTab: "weapons",
      selectedWeaponIndex: state.draft.equipment.weapons.length,
    })),
    addArmor: () => set((state) => ({
      draft: addEquipmentArmor(state.draft),
      selectedTab: "armor",
      selectedArmorIndex: state.draft.equipment.armor.length,
    })),
    updateWeapon: (index, patch) => set((state) => ({ draft: updateEquipmentWeapon(state.draft, index, patch) })),
    updateArmor: (index, patch) => set((state) => ({ draft: updateEquipmentArmor(state.draft, index, patch) })),
    duplicateWeapon: (index) => set((state) => ({ draft: duplicateEquipmentWeapon(state.draft, index) })),
    duplicateArmor: (index) => set((state) => ({ draft: duplicateEquipmentArmor(state.draft, index) })),
    deleteWeapon: (index) => set((state) => ({
      draft: deleteEquipmentWeapon(state.draft, index),
      selectedWeaponIndex: Math.max(0, Math.min(state.selectedWeaponIndex, state.draft.equipment.weapons.length - 2)),
    })),
    deleteArmor: (index) => set((state) => ({
      draft: deleteEquipmentArmor(state.draft, index),
      selectedArmorIndex: Math.max(0, Math.min(state.selectedArmorIndex, state.draft.equipment.armor.length - 2)),
    })),
    replaceDraftFromUnknown: (value) => {
      const result = recoverEquipmentEditorDraft(value)
      if (result.ok) {
        set({ draft: result.draft, selectedTab: "metadata", selectedWeaponIndex: 0, selectedArmorIndex: 0 })
      }
      return result
    },
    setValidationResult: (validationResult) => set({ validationResult }),
    setIsValidating: (isValidating) => set({ isValidating }),
  }))
}

export const useEquipmentEditorStore = createEquipmentEditorStore()
```

- [ ] **Step 4: Run equipment store tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/__tests__/equipment-editor-store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit equipment editor store**

```bash
git add app/card-editor/equipment/equipment-editor-store.ts app/card-editor/equipment/__tests__/equipment-editor-store.test.ts
git commit -m "feat: add equipment editor store"
```

---

## Task 7: Add Equipment Editor UI Components

**Files:**

- Create: `app/card-editor/equipment/components/equipment-tabs.tsx`
- Create: `app/card-editor/equipment/components/equipment-metadata-tab.tsx`
- Create: `app/card-editor/equipment/components/equipment-item-tab.tsx`
- Create: `app/card-editor/equipment/components/equipment-quick-switch.tsx`
- Create: `app/card-editor/equipment/components/equipment-validation-results.tsx`
- Test: `app/card-editor/equipment/components/__tests__/equipment-item-tab.test.tsx`
- Test: `app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx`

- [ ] **Step 1: Write failing component tests for equipment item editing**

Create `app/card-editor/equipment/components/__tests__/equipment-item-tab.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { ArmorEditorDraft, WeaponEditorDraft } from "../../equipment-draft"
import { ArmorItemTab, WeaponItemTab } from "../equipment-item-tab"

const baseWeapon: WeaponEditorDraft = {
  id: "weapon",
  name: "短剑",
  tier: "1",
  weaponType: "primary",
  trait: "agility",
  damageType: "physical",
  range: "melee",
  burden: "one-handed",
  damage: "d8",
  featureName: "",
  description: "",
  modifierContributions: [],
}

const baseArmor: ArmorEditorDraft = {
  id: "armor",
  name: "皮甲",
  tier: "1",
  baseArmorMax: 3,
  baseThresholds: { minor: 5, major: 10 },
  featureName: "",
  description: "",
  modifierContributions: [],
}

describe("equipment item tabs", () => {
  it("shows card-editor-like top navigation and weapon fields", () => {
    render(
      <WeaponItemTab
        items={[baseWeapon]}
        selectedIndex={0}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    )

    expect(screen.getByText(/武器编辑 当前: 1 \/ 1 件/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "上一件" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "下一件" })).toBeInTheDocument()
    expect(screen.getByLabelText("快速跳转")).toBeInTheDocument()
    expect(screen.getByLabelText("武器名称")).toBeInTheDocument()
    expect(screen.getByLabelText("装备ID")).toBeInTheDocument()
  })

  it("edits armor tier and keeps invalid numeric typing out of the draft", async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    render(
      <ArmorItemTab
        items={[baseArmor]}
        selectedIndex={0}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />,
    )

    expect(screen.getByLabelText("等级")).toBeInTheDocument()

    await user.clear(screen.getByLabelText("基础护甲槽"))
    await user.type(screen.getByLabelText("基础护甲槽"), "abc")

    expect(onUpdate).not.toHaveBeenCalledWith(0, { baseArmorMax: null })
  })
})
```

- [ ] **Step 2: Run failing UI tests**

Run:

```bash
npm run test:run -- app/card-editor/equipment/components/__tests__/equipment-item-tab.test.tsx
```

Expected: FAIL because equipment item UI does not exist.

- [ ] **Step 3: Implement equipment metadata tab**

Create `app/card-editor/equipment/components/equipment-metadata-tab.tsx` with labels matching tests:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CardPackageState } from "@/app/card-editor/types"
import type { EquipmentEditorDraft } from "../equipment-draft"

interface EquipmentMetadataTabProps {
  draft: EquipmentEditorDraft
  cardPackage: CardPackageState
  onUpdate(field: "name" | "version" | "author" | "description", value: string): void
  onCopyFromCard(): void
}

export function EquipmentMetadataTab({ draft, onUpdate, onCopyFromCard }: EquipmentMetadataTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>装备包基础信息</CardTitle>
            <CardDescription>设置装备包的名称、版本、作者和描述</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onCopyFromCard}>
            从卡包基础信息复制
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="equipment-name">装备包名称 *</Label>
            <Input id="equipment-name" value={draft.name} onChange={(event) => onUpdate("name", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipment-version">版本号 *</Label>
            <Input id="equipment-version" value={draft.version} onChange={(event) => onUpdate("version", event.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="equipment-author">作者信息</Label>
          <Input id="equipment-author" value={draft.author} onChange={(event) => onUpdate("author", event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="equipment-description">装备包描述</Label>
          <Textarea
            id="equipment-description"
            value={draft.description}
            onChange={(event) => onUpdate("description", event.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Implement quick switch and item tab components**

Create `equipment-quick-switch.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EquipmentQuickSwitchProps<TItem> {
  title: string
  items: TItem[]
  selectedIndex: number
  getTitle(item: TItem, index: number): string
  getSubtitle(item: TItem): string
  onSelect(index: number): void
}

export function EquipmentQuickSwitch<TItem>({
  title,
  items,
  selectedIndex,
  getTitle,
  getSubtitle,
  onSelect,
}: EquipmentQuickSwitchProps<TItem>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">暂无条目</p> : null}
        {items.map((item, index) => (
          <Button
            key={index}
            type="button"
            variant={index === selectedIndex ? "default" : "outline"}
            className="h-auto w-full justify-start p-3 text-left"
            onClick={() => onSelect(index)}
          >
            <span className="grid gap-1">
              <span className="font-medium">{getTitle(item, index)}</span>
              <span className="text-xs opacity-80">{getSubtitle(item)}</span>
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
```

Create `equipment-item-tab.tsx` with shared shell and basic fields:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EquipmentQuickSwitch } from "./equipment-quick-switch"
import type { ArmorEditorDraft, WeaponEditorDraft } from "../equipment-draft"
import { BURDEN_OPTIONS, DAMAGE_TYPE_OPTIONS, RANGE_OPTIONS, TIER_OPTIONS, TRAIT_OPTIONS } from "@/components/modals/custom-equipment-draft-form"
import { useEffect, useState, type ReactNode } from "react"
import { EQUIPMENT_MODIFIER_TARGETS, EQUIPMENT_TARGET_LABELS } from "@/automation/equipment/contribution-utils"

interface BaseProps<TItem> {
  items: TItem[]
  selectedIndex: number
  onSelect(index: number): void
  onAdd(): void
  onDuplicate(index: number): void
  onDelete(index: number): void
}

export function WeaponItemTab(props: BaseProps<WeaponEditorDraft> & {
  onUpdate(index: number, patch: Partial<WeaponEditorDraft>): void
}) {
  const item = props.items[props.selectedIndex]
  return (
    <EquipmentItemShell
      title={`武器编辑 当前: ${props.items.length === 0 ? 0 : props.selectedIndex + 1} / ${props.items.length} 件`}
      items={props.items}
      selectedIndex={props.selectedIndex}
      onSelect={props.onSelect}
      onAdd={props.onAdd}
      onDuplicate={props.onDuplicate}
      onDelete={props.onDelete}
      getTitle={(weapon, index) => weapon.name || `未命名武器 ${index + 1}`}
      getSubtitle={(weapon) => [weapon.tier || "未选等级", weapon.damage || "未填伤害"].join(" / ")}
    >
      {item ? (
        <div className="space-y-4">
          <TextInput label="武器名称" value={item.name} onChange={(name) => props.onUpdate(props.selectedIndex, { name })} />
          <TextInput label="装备ID" value={item.id} onChange={(id) => props.onUpdate(props.selectedIndex, { id })} />
          <EnumSelect label="等级" value={item.tier} options={TIER_OPTIONS.map((value) => ({ value, label: value }))} onChange={(tier) => props.onUpdate(props.selectedIndex, { tier: tier as WeaponEditorDraft["tier"] })} />
          <TextInput label="伤害" value={item.damage} onChange={(damage) => props.onUpdate(props.selectedIndex, { damage })} />
          <TextareaField label="特性描述" value={item.description} onChange={(description) => props.onUpdate(props.selectedIndex, { description })} />
        </div>
      ) : (
        <EmptyItemMessage label="武器" />
      )}
    </EquipmentItemShell>
  )
}

export function ArmorItemTab(props: BaseProps<ArmorEditorDraft> & {
  onUpdate(index: number, patch: Partial<ArmorEditorDraft>): void
}) {
  const item = props.items[props.selectedIndex]
  return (
    <EquipmentItemShell
      title={`护甲编辑 当前: ${props.items.length === 0 ? 0 : props.selectedIndex + 1} / ${props.items.length} 件`}
      items={props.items}
      selectedIndex={props.selectedIndex}
      onSelect={props.onSelect}
      onAdd={props.onAdd}
      onDuplicate={props.onDuplicate}
      onDelete={props.onDelete}
      getTitle={(armor, index) => armor.name || `未命名护甲 ${index + 1}`}
      getSubtitle={(armor) => `护甲 ${armor.baseArmorMax ?? "-"} / ${armor.baseThresholds.minor ?? "-"}-${armor.baseThresholds.major ?? "-"}`}
    >
      {item ? (
        <div className="space-y-4">
          <TextInput label="护甲名称" value={item.name} onChange={(name) => props.onUpdate(props.selectedIndex, { name })} />
          <TextInput label="装备ID" value={item.id} onChange={(id) => props.onUpdate(props.selectedIndex, { id })} />
          <EnumSelect label="等级" value={item.tier} options={TIER_OPTIONS.map((value) => ({ value, label: value }))} onChange={(tier) => props.onUpdate(props.selectedIndex, { tier: tier as ArmorEditorDraft["tier"] })} />
          <NumericInput label="基础护甲槽" value={item.baseArmorMax} onCommit={(baseArmorMax) => props.onUpdate(props.selectedIndex, { baseArmorMax })} />
          <NumericInput label="轻微阈值" value={item.baseThresholds.minor} onCommit={(minor) => props.onUpdate(props.selectedIndex, { baseThresholds: { ...item.baseThresholds, minor } })} />
          <NumericInput label="严重阈值" value={item.baseThresholds.major} onCommit={(major) => props.onUpdate(props.selectedIndex, { baseThresholds: { ...item.baseThresholds, major } })} />
        </div>
      ) : (
        <EmptyItemMessage label="护甲" />
      )}
    </EquipmentItemShell>
  )
}

function EquipmentItemShell<TItem>(props: BaseProps<TItem> & {
  title: string
  getTitle(item: TItem, index: number): string
  getSubtitle(item: TItem): string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{props.title}</CardTitle>
              <CardDescription>编辑当前装备条目</CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={props.items.length === 0 || props.selectedIndex <= 0}
                onClick={() => props.onSelect(props.selectedIndex - 1)}
              >
                上一件
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={props.items.length === 0 || props.selectedIndex >= props.items.length - 1}
                onClick={() => props.onSelect(props.selectedIndex + 1)}
              >
                下一件
              </Button>
              <Select value={String(props.selectedIndex)} onValueChange={(value) => props.onSelect(Number(value))}>
                <SelectTrigger aria-label="快速跳转" className="w-[180px]">
                  <SelectValue placeholder="快速跳转" />
                </SelectTrigger>
                <SelectContent>
                  {props.items.map((item, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {props.getTitle(item, index)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={props.onAdd}>新增</Button>
              <Button size="sm" variant="outline" disabled={props.items.length === 0} onClick={() => props.onDuplicate(props.selectedIndex)}>复制</Button>
              <Button size="sm" variant="destructive" disabled={props.items.length === 0} onClick={() => props.onDelete(props.selectedIndex)}>删除</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>{props.children}</CardContent>
      </Card>
      <EquipmentQuickSwitch {...props} title="快速选择" />
    </div>
  )
}

function TextInput(props: { label: string; value: string; onChange(value: string): void }) {
  const id = props.label
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{props.label}</Label>
      <Input id={id} aria-label={props.label} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </div>
  )
}

function TextareaField(props: { label: string; value: string; onChange(value: string): void }) {
  const id = props.label
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{props.label}</Label>
      <Textarea id={id} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </div>
  )
}

function NumericInput(props: { label: string; value: number | null; onCommit(value: number | null): void }) {
  const [text, setText] = useState(props.value === null ? "" : String(props.value))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(props.value === null ? "" : String(props.value))
    setError(null)
  }, [props.value])

  const commit = () => {
    const parsed = parseNullableNumberForCommit(text)
    if (parsed === undefined) {
      setError("请输入有效数字")
      return
    }
    setError(null)
    props.onCommit(parsed)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={props.label}>{props.label}</Label>
      <Input
        id={props.label}
        aria-label={props.label}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function EnumSelect(props: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange(value: string): void }) {
  return (
    <div className="space-y-2">
      <Label>{props.label}</Label>
      <Select value={props.value} onValueChange={props.onChange}>
        <SelectTrigger><SelectValue placeholder={`选择${props.label}`} /></SelectTrigger>
        <SelectContent>{props.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )
}

function EmptyItemMessage({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">暂无{label}，点击新增开始编辑。</p>
}

function parseNullableNumberForCommit(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}
```

Do not wire numeric inputs directly to `parseNullableNumberForCommit` on every keystroke. Use a small controlled numeric field wrapper:

- Empty string commits `null`.
- Valid finite number commits `number`.
- Invalid typing stays in local input state and shows/keeps a field-level error; it must not call `onUpdate` with `null` and overwrite a previously valid draft value.

Before Step 5, replace the `WeaponItemTab` field block with this complete field set so the first version covers the required weapon authoring fields:

```tsx
<div className="space-y-4">
  <TextInput label="武器名称" value={item.name} onChange={(name) => props.onUpdate(props.selectedIndex, { name })} />
  <TextInput label="装备ID" value={item.id} onChange={(id) => props.onUpdate(props.selectedIndex, { id })} />
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <EnumSelect
      label="等级"
      value={item.tier}
      options={TIER_OPTIONS.map((value) => ({ value, label: value }))}
      onChange={(tier) => props.onUpdate(props.selectedIndex, { tier: tier as WeaponEditorDraft["tier"] })}
    />
    <EnumSelect
      label="武器类型"
      value={item.weaponType}
      options={[{ value: "primary", label: "主武器" }, { value: "secondary", label: "副武器" }]}
      onChange={(weaponType) => props.onUpdate(props.selectedIndex, { weaponType: weaponType as WeaponEditorDraft["weaponType"] })}
    />
    <EnumSelect
      label="属性"
      value={item.trait}
      options={TRAIT_OPTIONS}
      onChange={(trait) => props.onUpdate(props.selectedIndex, { trait: trait as WeaponEditorDraft["trait"] })}
    />
    <EnumSelect
      label="伤害类型"
      value={item.damageType}
      options={DAMAGE_TYPE_OPTIONS}
      onChange={(damageType) => props.onUpdate(props.selectedIndex, { damageType: damageType as WeaponEditorDraft["damageType"] })}
    />
    <EnumSelect
      label="范围"
      value={item.range}
      options={RANGE_OPTIONS}
      onChange={(range) => props.onUpdate(props.selectedIndex, { range: range as WeaponEditorDraft["range"] })}
    />
    <EnumSelect
      label="负荷"
      value={item.burden}
      options={BURDEN_OPTIONS}
      onChange={(burden) => props.onUpdate(props.selectedIndex, { burden: burden as WeaponEditorDraft["burden"] })}
    />
  </div>
  <TextInput label="伤害" value={item.damage} onChange={(damage) => props.onUpdate(props.selectedIndex, { damage })} />
  <TextInput label="特性名称" value={item.featureName} onChange={(featureName) => props.onUpdate(props.selectedIndex, { featureName })} />
  <TextareaField label="特性描述" value={item.description} onChange={(description) => props.onUpdate(props.selectedIndex, { description })} />
</div>
```

Also add matching `featureName` and `description` fields to `ArmorItemTab` after the threshold fields:

```tsx
<TextInput label="特性名称" value={item.featureName} onChange={(featureName) => props.onUpdate(props.selectedIndex, { featureName })} />
<TextareaField label="特性描述" value={item.description} onChange={(description) => props.onUpdate(props.selectedIndex, { description })} />
```

Implement modifier contribution editing in this task with a repeated row section after `特性描述`: each row edits `definition.target`, `editable.label`, and `editable.value`, and writes the resulting array to `modifierContributions`. Use `EQUIPMENT_MODIFIER_TARGETS` and `EQUIPMENT_TARGET_LABELS` from `@/automation/equipment/contribution-utils`; do not introduce a different target list.

- [ ] **Step 5: Implement equipment tabs**

Create `app/card-editor/equipment/components/equipment-tabs.tsx`:

```tsx
"use client"

import { Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CardPackageState } from "@/app/card-editor/types"
import { useEquipmentEditorStore } from "../equipment-editor-store"
import { EquipmentMetadataTab } from "./equipment-metadata-tab"
import { ArmorItemTab, WeaponItemTab } from "./equipment-item-tab"

interface EquipmentTabsProps {
  cardPackage: CardPackageState
  onRequestCopyFromCard(): void
}

export function EquipmentTabs({ cardPackage, onRequestCopyFromCard }: EquipmentTabsProps) {
  const store = useEquipmentEditorStore()

  return (
    <Tabs value={store.selectedTab} onValueChange={(value) => store.setSelectedTab(value as typeof store.selectedTab)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="metadata" className="flex items-center gap-1"><Settings className="h-4 w-4" />基础信息</TabsTrigger>
        <TabsTrigger value="weapons">武器</TabsTrigger>
        <TabsTrigger value="armor">护甲</TabsTrigger>
      </TabsList>
      <TabsContent value="metadata">
        <EquipmentMetadataTab
          draft={store.draft}
          cardPackage={cardPackage}
          onUpdate={store.updateMetadata}
          onCopyFromCard={onRequestCopyFromCard}
        />
      </TabsContent>
      <TabsContent value="weapons">
        <WeaponItemTab
          items={store.draft.equipment.weapons}
          selectedIndex={store.selectedWeaponIndex}
          onSelect={store.setSelectedWeaponIndex}
          onAdd={store.addWeapon}
          onDuplicate={store.duplicateWeapon}
          onDelete={store.deleteWeapon}
          onUpdate={store.updateWeapon}
        />
      </TabsContent>
      <TabsContent value="armor">
        <ArmorItemTab
          items={store.draft.equipment.armor}
          selectedIndex={store.selectedArmorIndex}
          onSelect={store.setSelectedArmorIndex}
          onAdd={store.addArmor}
          onDuplicate={store.duplicateArmor}
          onDelete={store.deleteArmor}
          onUpdate={store.updateArmor}
        />
      </TabsContent>
    </Tabs>
  )
}
```

- [ ] **Step 6: Add equipment validation result dialog**

Create `app/card-editor/equipment/components/equipment-validation-results.tsx` by mirroring `app/card-editor/components/validation-results.tsx`:

- Use `mapEquipmentDiagnosticsToFriendly`.
- Tabs: `按优先级`, `按装备`, `按类型`, `全部`.
- Success title: `验证通过！`.
- Failure title: `需要修复一些问题`.
- Jump button label: `定位装备`.
- For `jumpTarget.tab === "weapons"`, call `onJumpToTarget({ tab: "weapons", index })`.
- For `jumpTarget.tab === "armor"`, call `onJumpToTarget({ tab: "armor", index })`.
- For metadata, call `onJumpToTarget({ tab: "metadata" })`.

Use card dialog styling and structure, but avoid emojis in newly written copy if adjusting text.

- [ ] **Step 6a: Add validation dialog component tests**

Create `app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx`:

- Import `@testing-library/jest-dom/vitest`.
- Render an error result with metadata, weapon, armor, and unmapped system diagnostics.
- Assert tabs `按优先级`, `按装备`, `按类型`, `全部` render.
- Assert weapon and armor diagnostics show `定位装备` and call `onJumpToTarget` with the mapped target.
- Assert unmapped system diagnostics do not show a jump button.
- Assert success result renders `验证通过！`.

- [ ] **Step 7: Run UI tests**

Run:

```bash
npm run test:run -- \
  app/card-editor/equipment/components/__tests__/equipment-item-tab.test.tsx \
  app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx
```

Expected: PASS. Task 7 must not leave red page integration tests for Task 8.

- [ ] **Step 8: Commit equipment UI components**

```bash
git add app/card-editor/equipment/components
git commit -m "feat: add equipment editor UI components"
```

---

## Task 8: Wire Equipment Mode Into Card Editor Page

**Files:**

- Modify: `app/card-editor/page.tsx`
- Modify: `app/card-editor/components/toolbar.tsx`
- Test: `app/card-editor/__tests__/equipment-editor-page.test.tsx`

- [ ] **Step 0: Write failing page integration tests for mode-aware behavior**

Create `app/card-editor/__tests__/equipment-editor-page.test.tsx`.

Test requirements:

- Import `@testing-library/jest-dom/vitest`.
- Use `await screen.findByRole(...)` for the first toolbar interaction because `CardEditorPage` renders a client-gated loading state first.
- Reset the card editor store and equipment editor store before each test so mode/item state does not leak between tests.
- Mock or spy the existing card export path and equipment JSON download path.

Cover at least:

- Default card mode shows card tabs and `查看关键字列表`.
- Card mode clicking `导出卡包` calls the existing card export handler and does not call equipment export.
- Switching to equipment mode shows only `基础信息 / 武器 / 护甲` and hides preview/keyword controls.
- Equipment mode clicking `导出装备包` with no items shows an error and does not download.
- Equipment mode with one weapon and one armor exports one full equipment JSON containing both arrays.
- Equipment import with an existing equipment draft asks for confirmation; cancel keeps the current draft; confirm replaces the equipment draft and does not change `packageData`.
- Equipment `新建装备包` resets only the equipment draft.
- Equipment `验证装备包` calls application service import with `{ mode: "dryRun" }`.

- [ ] **Step 1: Update toolbar props and rendering**

Modify `app/card-editor/components/toolbar.tsx` props:

```ts
type EditorMode = "cards" | "equipment"

interface ToolbarProps {
  currentPackage: CardPackageState
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  onNew: () => void
  onImport: () => void
  onExport: () => void
  onShowKeywords: () => void
  onValidate: () => void
  isValidating: boolean
}
```

Render the toolbar as a left action group and right mode switch:

```tsx
const noun = mode === "cards" ? "卡包" : "装备包"

return (
  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg">
    <div className="flex flex-wrap gap-2">
      <Button variant="default" size="sm" onClick={onNew} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        新建{noun}
      </Button>
      <Button variant="outline" size="sm" onClick={onImport} className="flex items-center gap-2">
        <Upload className="h-4 w-4" />
        导入{noun}
      </Button>
      <Button variant="outline" size="sm" onClick={onExport} className="flex items-center gap-2">
        <Download className="h-4 w-4" />
        导出{noun}
      </Button>
      <Button variant="outline" size="sm" onClick={onValidate} disabled={isValidating} className="flex items-center gap-2">
        {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        {isValidating ? "验证中..." : `验证${noun}`}
      </Button>
      {mode === "cards" ? (
        <Button variant="outline" size="sm" onClick={onShowKeywords} className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          查看关键字列表
        </Button>
      ) : null}
    </div>
    <div className="flex rounded-md border bg-background p-1">
      <Button type="button" size="sm" variant={mode === "cards" ? "default" : "ghost"} onClick={() => onModeChange("cards")}>卡牌</Button>
      <Button type="button" size="sm" variant={mode === "equipment" ? "default" : "ghost"} onClick={() => onModeChange("equipment")}>装备</Button>
    </div>
  </div>
)
```

- [ ] **Step 2: Wire mode-aware page behavior**

In `app/card-editor/page.tsx`:

- Add `const [editorMode, setEditorMode] = useState<"cards" | "equipment">("cards")`.
- Import:

```ts
import { toast } from "sonner"
import { EquipmentTabs } from "./equipment/components/equipment-tabs"
import { EquipmentValidationResults } from "./equipment/components/equipment-validation-results"
import { useEquipmentEditorStore } from "./equipment/equipment-editor-store"
import { downloadEquipmentDraftJson, importEquipmentDraftFromFile } from "./equipment/equipment-import-export"
import { validateEquipmentEditorDraft } from "./equipment/equipment-validation"
import { createDefaultEquipmentServices } from "@/equipment/services/default-equipment-services"
```

- Create default services with `useMemo`:

```ts
const equipmentServices = React.useMemo(() => createDefaultEquipmentServices(), [])
const equipmentStore = useEquipmentEditorStore()
```

Place `equipmentServices` and `equipmentStore` with the other hooks near the top of `CardEditorPage`, before any conditional return such as `if (!isClient) return ...`. Do not add hooks after the client-gate early return.

- Add handlers:

```ts
const handleNew = () => {
  if (editorMode === "cards") return newPackage()
  if (equipmentStore.hasItems()) {
    setConfirmDialog({
      open: true,
      title: "新建装备包",
      message: "新建会清空当前装备包草稿，确定继续吗？",
      onConfirm: () => {
        equipmentStore.resetDraft()
        setConfirmDialog({ open: false })
      },
    })
    return
  }
  equipmentStore.resetDraft()
}

const handleExport = () => {
  if (editorMode === "cards") return exportPackage()
  if (!equipmentStore.hasItems()) {
    toast.error("请至少新增一件武器或护甲后再导出")
    return
  }
  downloadEquipmentDraftJson(equipmentStore.draft)
}

const handleValidate = async () => {
  if (editorMode === "cards") return validatePackage()
  equipmentStore.setIsValidating(true)
  try {
    equipmentStore.setValidationResult(
      await validateEquipmentEditorDraft(equipmentStore.draft, equipmentServices.applicationService),
    )
  } finally {
    equipmentStore.setIsValidating(false)
  }
}

const handleCopyCardMetadataToEquipment = () => {
  setConfirmDialog({
    open: true,
    title: "复制卡包基础信息",
    message: "这会覆盖装备包的名称、版本、作者和描述，并可能重写标准装备 ID 前缀，确定继续吗？",
    onConfirm: () => {
      equipmentStore.updateMetadata("name", packageData.name || "")
      equipmentStore.updateMetadata("version", packageData.version || "")
      equipmentStore.updateMetadata("author", packageData.author || "")
      equipmentStore.updateMetadata("description", packageData.description || "")
      setConfirmDialog({ open: false })
    },
  })
}
```

- Add `handleImport` using a hidden input pattern like card import. Keep card import calling `importPackage()`. For equipment mode, use this concrete behavior:

```ts
const replaceEquipmentDraftFromFile = async (file: File) => {
  const result = await importEquipmentDraftFromFile(file)
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  equipmentStore.replaceDraftFromUnknown(result.draft)
  toast.success("装备包已导入编辑器")
}

const handleEquipmentImportFile = (file: File) => {
  if (!equipmentStore.hasItems()) {
    void replaceEquipmentDraftFromFile(file)
    return
  }

  setConfirmDialog({
    open: true,
    title: "导入装备包",
    message: "导入会替换当前装备包草稿，确定继续吗？",
    onConfirm: () => {
      setConfirmDialog({ open: false })
      void replaceEquipmentDraftFromFile(file)
    },
  })
}

const handleImport = () => {
  if (editorMode === "cards") return importPackage()

  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".json,application/json"
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) handleEquipmentImportFile(file)
  }
  input.click()
}
```

- [ ] **Step 3: Render mode-aware tabs and dialogs**

Replace the current toolbar call with:

```tsx
<Toolbar
  currentPackage={packageData}
  mode={editorMode}
  onModeChange={setEditorMode}
  onNew={handleNew}
  onImport={handleImport}
  onExport={handleExport}
  onShowKeywords={() => setDefinitionsDialog(true)}
  onValidate={handleValidate}
  isValidating={editorMode === "cards" ? isValidating : equipmentStore.isValidating}
/>
```

Replace the main tabs block with:

```tsx
{editorMode === "cards" ? (
  <CardTabs selectedTab={selectedTab} onSelectedTabChange={setSelectedTab} />
) : (
  <EquipmentTabs cardPackage={packageData} onRequestCopyFromCard={handleCopyCardMetadataToEquipment} />
)}
```

Render equipment validation results:

```tsx
<EquipmentValidationResults
  validationResult={equipmentStore.validationResult}
  open={!!equipmentStore.validationResult}
  onClose={() => equipmentStore.setValidationResult(null)}
  onJumpToTarget={(target) => {
    equipmentStore.setSelectedTab(target.tab)
    if (target.tab === "weapons") equipmentStore.setSelectedWeaponIndex(target.index)
    if (target.tab === "armor") equipmentStore.setSelectedArmorIndex(target.index)
    equipmentStore.setValidationResult(null)
  }}
/>
```

- [ ] **Step 4: Run equipment page tests**

Run:

```bash
npm run test:run -- app/card-editor/__tests__/equipment-editor-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run existing card editor-related tests**

Run:

```bash
npm run test:run -- \
  app/card-editor/__tests__/equipment-editor-page.test.tsx \
  components/content-pack-manager/__tests__/import-content-pack.test.ts \
  components/content-pack-manager/__tests__/card-pack-tab.test.tsx
```

Expected: PASS. The `/card-editor` page test must explicitly assert card mode still uses the existing card export/import path.

- [ ] **Step 6: Commit page wiring**

```bash
git add app/card-editor/page.tsx app/card-editor/components/toolbar.tsx app/card-editor/__tests__/equipment-editor-page.test.tsx
git commit -m "feat: wire equipment mode into card editor"
```

---

## Task 9: Final Verification and Documentation Check

**Files:**

- Verify: changed source files from Tasks 1-8
- Verify: `docs/superpowers/specs/2026-06-07-equipment-editor-json-export-scope-design.md`

- [ ] **Step 1: Run focused equipment tests**

Run:

```bash
npm run test:run -- \
  equipment/services/__tests__/default-equipment-services.test.ts \
  equipment/ui/__tests__/equipment-ui-store.test.ts \
  app/card-editor/equipment/__tests__/equipment-id.test.ts \
  app/card-editor/equipment/__tests__/equipment-draft.test.ts \
  app/card-editor/equipment/__tests__/equipment-import-export.test.ts \
  app/card-editor/equipment/__tests__/equipment-validation.test.ts \
  app/card-editor/equipment/__tests__/equipment-editor-store.test.ts \
  app/card-editor/equipment/components/__tests__/equipment-item-tab.test.tsx \
  app/card-editor/equipment/components/__tests__/equipment-validation-results.test.tsx \
  app/card-editor/__tests__/equipment-editor-page.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm run test:run
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS. If image optimization or static export assumptions fail for unrelated existing reasons, capture the exact failure and run the narrow TypeScript/build check available in this repo before reporting.

- [ ] **Step 4: Manual browser smoke test**

Run:

```bash
npm run dev
```

Open the local dev server and verify:

- `/card-editor` card mode still shows card tabs and keyword button.
- Switching to equipment mode shows only `基础信息 / 武器 / 护甲`.
- Equipment mode hides keyword button.
- `新建装备包` resets only equipment draft.
- Adding a weapon shows name and ID fields.
- Export with zero equipment items shows an error and does not download.
- Export with one equipment item downloads `<equipmentName || '装备包'>.json`.
- Importing a half-finished equipment JSON opens it in the editor.
- Validating equipment opens a card-style validation dialog.
- Existing card export still downloads `.dhcb`.

- [ ] **Step 5: Check git diff and docs consistency**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intentional source/test changes remain before final commit.

- [ ] **Step 6: Commit final verification fixes if any**

If Task 9 required fixes:

```bash
git add <changed-files>
git commit -m "fix: stabilize equipment editor integration"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Service composition boundary: Task 1.
- No localStorage dependency in new editor code: Tasks 1, 6, 8.
- Draft model and defaults: Task 3.
- ID generation and metadata rewrite: Task 2 and Task 3.
- Import recovery and replacement: Task 4 and Task 6.
- Export JSON filename and half-finished export: Task 4 and Task 8.
- Validation mapping and card-like dialog: Task 5 and Task 7.
- Equipment mode toolbar/tabs and hidden preview tab: Task 7 and Task 8.
- Existing card behavior preserved: Task 8 and Task 9.

Known implementation notes:

- Task 7 intentionally starts with minimal item fields, then expands within the same task to cover all required weapon/armor fields from the spec.
- Modifier row UI should reuse constants and behavior from `components/modals/custom-equipment-draft-form.tsx`, but should store rows as `modifierContributions` in the equipment draft shape.
- The plan does not change equipment schema semver validation; that is a documented follow-up.
