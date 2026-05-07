# Equipment Data Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate weapons and armor from legacy top-level `SheetData` fields into `SheetData.equipment`, while preserving current UI behavior and connecting active equipment contributions to the modifier registry.

**Architecture:** Add focused equipment types and helpers, then migrate legacy inputs into `equipment`. Runtime UI/store/registry code reads equipment slots only; legacy top-level equipment fields are retained only as import/migration input. Equipment registry entries are derived from active primary/secondary weapon slots and the current armor slot.

**Tech Stack:** TypeScript, React, Zustand, Vitest, Next.js.

---

## Reference Spec

Primary spec:

- `docs/superpowers/specs/2026-05-07-equipment-data-migration-design.md`

Important decisions from the spec:

- Runtime `SheetData` uses `equipment`.
- Legacy top-level equipment fields are removed from runtime `SheetData`.
- Migration/import must preserve legacy fields until after equipment migration.
- Weapons keep current Chinese template fields, with added stable template `id`.
- Armor templates move to English fields.
- Old inventory weapon checkbox state is discarded, even when `true`.
- Armor automation keeps current behavior but reads equipment armor slot.
- Equipment source entries use `source.type === "equipment"`.
- No equipment contribution editor UI in this phase.

## File Structure

- Create `lib/equipment/types.ts`  
  Equipment runtime slot types, template contribution type, and helper type aliases.
- Create `lib/equipment/defaults.ts`  
  Empty equipment/slot factory helpers.
- Create `lib/equipment/armor-utils.ts`  
  Parse/format armor max and threshold values.
- Create `lib/equipment/template-to-slot.ts`  
  Convert weapon/armor templates or custom payloads into runtime slots.
- Modify `lib/sheet-data.ts`  
  Add `equipment`, remove legacy runtime equipment fields.
- Modify `lib/default-sheet-data.ts`  
  Add empty equipment defaults, remove legacy top-level equipment defaults.
- Modify `data/list/primary-weapon.ts`, `data/list/secondary-weapon.ts`, `data/list/all-weapons.ts`  
  Add stable weapon template ids, preserve Chinese fields.
- Modify `data/list/armor.ts`  
  Convert armor templates to English fields and add stable ids.
- Modify `lib/sheet-data-migration.ts`  
  Migrate legacy top-level equipment fields into `equipment`, drop legacy fields afterward.
- Modify `lib/character-data-validator.ts`  
  Preserve legacy equipment input before migration, emit runtime data without legacy fields.
- Modify `lib/modifiers/source-definitions.ts` and `lib/modifiers/registry.ts`  
  Read armor base entries from `equipment.armorSlot`; collect active equipment contributions.
- Modify `lib/sheet-store.ts`  
  Update armor and weapon selection/swap actions to mutate equipment slots.
- Modify `components/character-sheet.tsx`  
  Replace top-level weapon handler logic with equipment slot selection.
- Modify `components/character-sheet-sections/weapon-section.tsx`  
  Read/write active weapon slots.
- Modify `components/character-sheet-sections/inventory-weapon-section.tsx`  
  Read/write inventory slots and swap whole slots.
- Modify `components/character-sheet-sections/armor-section.tsx`  
  Read/write armor slot.
- Modify `components/character-sheet-sections/hit-points-section.tsx` and `components/guide/guide-content.ts`  
  Replace old armor field reads with equipment armor helpers.
- Modify `components/modals/weapon-selection-modal.tsx`, `components/modals/armor-selection-modal.tsx`  
  Return stable template ids for built-in templates; keep custom payload support.
- Update tests under `tests/unit/equipment`, `tests/unit/automation`, `tests/unit/modifiers`, `tests/unit/character-data-validator.test.ts`.

---

### Task 1: Add Equipment Runtime Types And Helpers

**Files:**
- Create: `lib/equipment/types.ts`
- Create: `lib/equipment/defaults.ts`
- Create: `lib/equipment/armor-utils.ts`
- Modify: `lib/sheet-data.ts`
- Modify: `lib/default-sheet-data.ts`
- Test: `tests/unit/equipment/equipment-defaults.test.ts`

- [ ] **Step 1: Write failing equipment defaults tests**

Create `tests/unit/equipment/equipment-defaults.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { createEmptyArmorSlot, createEmptyEquipmentData, createEmptyWeaponSlot } from "@/lib/equipment/defaults"
import { parseArmorMax, parseArmorThreshold } from "@/lib/equipment/armor-utils"
import { defaultSheetData } from "@/lib/default-sheet-data"

describe("equipment defaults", () => {
  it("creates empty weapon slots", () => {
    expect(createEmptyWeaponSlot()).toEqual({
      name: "",
      trait: "",
      damage: "",
      feature: "",
      modifierContributions: [],
    })
  })

  it("creates empty armor slots", () => {
    expect(createEmptyArmorSlot()).toEqual({
      name: "",
      baseArmorMax: null,
      baseThresholds: { minor: null, major: null },
      feature: "",
      modifierContributions: [],
    })
  })

  it("creates two fixed inventory weapon slots", () => {
    const equipment = createEmptyEquipmentData()

    expect(equipment.weaponSlots.inventory).toHaveLength(2)
    expect(equipment.weaponSlots.primary).toEqual(createEmptyWeaponSlot())
    expect(equipment.weaponSlots.secondary).toEqual(createEmptyWeaponSlot())
  })

  it("default sheet data has equipment and no legacy equipment fields", () => {
    const data = defaultSheetData as Record<string, unknown>

    expect(data.equipment).toEqual(createEmptyEquipmentData())
    expect("primaryWeaponName" in data).toBe(false)
    expect("secondaryWeaponName" in data).toBe(false)
    expect("armorName" in data).toBe(false)
    expect("armorBaseScore" in data).toBe(false)
    expect("armorThreshold" in data).toBe(false)
    expect("inventoryWeapon1Primary" in data).toBe(false)
  })
})

describe("armor parsing helpers", () => {
  it("parses numeric armor max values", () => {
    expect(parseArmorMax("4")).toBe(4)
    expect(parseArmorMax(5)).toBe(5)
    expect(parseArmorMax("bad")).toBeNull()
    expect(parseArmorMax("")).toBeNull()
  })

  it("parses slash-separated thresholds", () => {
    expect(parseArmorThreshold("7/15")).toEqual({ minor: 7, major: 15 })
    expect(parseArmorThreshold("(7 / 15)")).toEqual({ minor: 7, major: 15 })
    expect(parseArmorThreshold("bad")).toEqual({ minor: null, major: null })
    expect(parseArmorThreshold("7")).toEqual({ minor: null, major: null })
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/equipment/equipment-defaults.test.ts
```

Expected: FAIL because `lib/equipment/*` does not exist and `defaultSheetData.equipment` is missing.

- [ ] **Step 3: Add equipment types**

Create `lib/equipment/types.ts`:

```ts
import type {
  ExperienceTargetId,
  ModifierContribution,
  ModifierEntryKind,
  ModifierTargetId,
} from "@/lib/modifiers/types"

export type EquipmentModifierTargetId = Exclude<ModifierTargetId, ExperienceTargetId>

export interface EquipmentModifierContributionTemplate {
  id: string
  definition: {
    target: EquipmentModifierTargetId
    kind: ModifierEntryKind
  }
  editable: {
    label: string
    value: number
  }
}

export interface WeaponSlot {
  name: string
  trait: string
  damage: string
  feature: string
  modifierContributions: ModifierContribution[]
}

export interface ArmorSlot {
  name: string
  baseArmorMax: number | null
  baseThresholds: {
    minor: number | null
    major: number | null
  }
  feature: string
  modifierContributions: ModifierContribution[]
}

export interface EquipmentData {
  weaponSlots: {
    primary: WeaponSlot
    secondary: WeaponSlot
    inventory: [WeaponSlot, WeaponSlot]
  }
  armorSlot: ArmorSlot
}
```

- [ ] **Step 4: Add equipment defaults**

Create `lib/equipment/defaults.ts`:

```ts
import type { ArmorSlot, EquipmentData, WeaponSlot } from "./types"

export function createEmptyWeaponSlot(): WeaponSlot {
  return {
    name: "",
    trait: "",
    damage: "",
    feature: "",
    modifierContributions: [],
  }
}

export function createEmptyArmorSlot(): ArmorSlot {
  return {
    name: "",
    baseArmorMax: null,
    baseThresholds: { minor: null, major: null },
    feature: "",
    modifierContributions: [],
  }
}

export function createEmptyEquipmentData(): EquipmentData {
  return {
    weaponSlots: {
      primary: createEmptyWeaponSlot(),
      secondary: createEmptyWeaponSlot(),
      inventory: [createEmptyWeaponSlot(), createEmptyWeaponSlot()],
    },
    armorSlot: createEmptyArmorSlot(),
  }
}
```

- [ ] **Step 5: Add armor parse helpers**

Create `lib/equipment/armor-utils.ts`:

```ts
import { tryParseNumber } from "@/lib/number-utils"

export function parseArmorMax(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = tryParseNumber(value)
  return parsed === undefined ? null : parsed
}

export function parseArmorThreshold(value: unknown): { minor: number | null; major: number | null } {
  const text = String(value ?? "").replace(/[()]/g, "")
  const [minorRaw, majorRaw] = text.split("/")

  if (majorRaw === undefined) {
    return { minor: null, major: null }
  }

  const minor = tryParseNumber(minorRaw)
  const major = tryParseNumber(majorRaw)

  return {
    minor: minor === undefined ? null : minor,
    major: major === undefined ? null : major,
  }
}

export function formatArmorThreshold(thresholds: { minor: number | null; major: number | null }): string {
  const { minor, major } = thresholds
  return minor === null || major === null ? "" : `${minor}/${major}`
}
```

- [ ] **Step 6: Update SheetData type and defaults**

Modify `lib/sheet-data.ts`:

- Import `EquipmentData`:

```ts
import type { EquipmentData } from "@/lib/equipment/types"
```

- Add to `SheetData`:

```ts
equipment: EquipmentData
```

- Remove these runtime fields from `SheetData`:

```ts
armorValue?: string
primaryWeaponName?: string
primaryWeaponTrait?: string
primaryWeaponDamage?: string
primaryWeaponFeature?: string
secondaryWeaponName?: string
secondaryWeaponTrait?: string
secondaryWeaponDamage?: string
secondaryWeaponFeature?: string
armorName?: string
armorBaseScore?: string
armorThreshold?: string
armorFeature?: string
inventoryWeapon1Name?: string
inventoryWeapon1Trait?: string
inventoryWeapon1Damage?: string
inventoryWeapon1Feature?: string
inventoryWeapon1Primary?: boolean
inventoryWeapon1Secondary?: boolean
inventoryWeapon2Name?: string
inventoryWeapon2Trait?: string
inventoryWeapon2Damage?: string
inventoryWeapon2Feature?: string
inventoryWeapon2Primary?: boolean
inventoryWeapon2Secondary?: boolean
```

Modify `lib/default-sheet-data.ts`:

- Import `createEmptyEquipmentData`.
- Add:

```ts
equipment: createEmptyEquipmentData(),
```

- Remove old top-level equipment defaults, including `armorValue`.

- [ ] **Step 7: Run focused test**

Run:

```bash
pnpm exec vitest run tests/unit/equipment/equipment-defaults.test.ts
```

Expected: PASS.

- [ ] **Step 8: Run type check to reveal next integration failures**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: FAIL because UI/store/migration still read removed legacy fields. Save key failures for later tasks; do not fix them in this task.

- [ ] **Step 9: Commit**

Run:

```bash
git add lib/equipment lib/sheet-data.ts lib/default-sheet-data.ts tests/unit/equipment/equipment-defaults.test.ts
git commit -m "refactor: add equipment runtime data model"
```

---

### Task 2: Add Stable Equipment Template IDs And Slot Builders

**Files:**
- Modify: `data/list/primary-weapon.ts`
- Modify: `data/list/secondary-weapon.ts`
- Modify: `data/list/all-weapons.ts`
- Modify: `data/list/armor.ts`
- Create: `lib/equipment/template-to-slot.ts`
- Test: `tests/unit/equipment/template-to-slot.test.ts`

- [ ] **Step 1: Write failing template conversion tests**

Create `tests/unit/equipment/template-to-slot.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { armorItems } from "@/data/list/armor"
import { allWeapons } from "@/data/list/all-weapons"
import {
  createArmorSlotFromCustomPayload,
  createArmorSlotFromTemplate,
  createWeaponSlotFromTemplate,
} from "@/lib/equipment/template-to-slot"

describe("equipment template ids", () => {
  it("weapon templates expose stable builtin ids", () => {
    expect(allWeapons[0].id).toMatch(/^builtin\.weapon\.(primary|secondary)\./)
    expect(allWeapons[0].id).not.toBe(allWeapons[0].名称)
  })

  it("armor templates use English structured fields and stable ids", () => {
    const armor = armorItems[0]

    expect(armor.id).toMatch(/^builtin\.armor\./)
    expect(armor.name).toBeTruthy()
    expect(armor.baseArmorMax).toEqual(expect.any(Number))
    expect(armor.baseThresholds).toEqual({
      minor: expect.any(Number),
      major: expect.any(Number),
    })
    expect("名称" in armor).toBe(false)
    expect("护甲值" in armor).toBe(false)
    expect("伤害阈值" in armor).toBe(false)
  })
})

describe("template to slot conversion", () => {
  it("creates weapon slots from Chinese-field weapon templates", () => {
    const template = allWeapons.find((weapon) => weapon.id === "builtin.weapon.secondary.tower-shield")
    expect(template).toBeTruthy()

    const slot = createWeaponSlotFromTemplate(template!, () => "generated-id")

    expect(slot.name).toBe(template!.名称)
    expect(slot.trait).toContain(template!.伤害类型)
    expect(slot.damage).toContain(template!.伤害)
    expect(slot.feature).toContain(template!.特性名称)
    expect(slot.modifierContributions.every((entry) => entry.id.startsWith("generated-id"))).toBe(true)
  })

  it("creates armor slots from structured armor templates", () => {
    const template = armorItems.find((armor) => armor.id === "builtin.armor.full-plate")
    expect(template).toBeTruthy()

    const slot = createArmorSlotFromTemplate(template!, () => "armor-contribution")

    expect(slot.name).toBe(template!.name)
    expect(slot.baseArmorMax).toBe(template!.baseArmorMax)
    expect(slot.baseThresholds).toEqual(template!.baseThresholds)
    expect(slot.feature).toContain(template!.featureName)
  })

  it("keeps custom Chinese armor payload compatible", () => {
    const slot = createArmorSlotFromCustomPayload({
      名称: "自定义护甲",
      护甲值: "4",
      伤害阈值: "9/21",
      特性名称: "自定义",
      描述: "测试描述",
    })

    expect(slot).toMatchObject({
      name: "自定义护甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 9, major: 21 },
      feature: "自定义: 测试描述",
      modifierContributions: [],
    })
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/equipment/template-to-slot.test.ts
```

Expected: FAIL because stable ids and conversion helpers do not exist.

- [ ] **Step 3: Add stable weapon template ids**

Modify `data/list/primary-weapon.ts` and `data/list/secondary-weapon.ts`:

- Add `id: string` to `Weapon`.
- Add optional `modifierContributions?: EquipmentModifierContributionTemplate[]`.
- Add a stable id to every item.

Example item shape:

```ts
{
  id: "builtin.weapon.primary.broadsword",
  名称: "阔剑",
  等级: "T1",
  属性: "敏捷",
  伤害类型: "物理",
  范围: "近战",
  伤害: "d8",
  负荷: "单手",
  特性名称: "可靠",
  描述: "你的攻击掷骰+1。",
  modifierContributions: [],
}
```

For clearly long-term unconditional entries, add template contributions. At minimum:

```ts
// Tower shield / 塔盾
modifierContributions: [
  {
    id: "armor-max",
    definition: { target: "armorMax", kind: "modifier" },
    editable: { label: "壁垒", value: 2 },
  },
  {
    id: "evasion",
    definition: { target: "evasion", kind: "modifier" },
    editable: { label: "壁垒", value: -1 },
  },
]
```

- [ ] **Step 4: Stop all-weapons from overriding ids**

Modify `data/list/all-weapons.ts` so it preserves each template id:

```ts
export const allWeapons: Weapon[] = [
  ...primaryWeapons.map((weapon) => ({
    ...weapon,
    weaponType: "primary" as const,
  })),
  ...secondaryWeapons.map((weapon) => ({
    ...weapon,
    weaponType: "secondary" as const,
  })),
]
```

- [ ] **Step 5: Convert armor templates to English fields**

Modify `data/list/armor.ts`:

```ts
import type { EquipmentModifierContributionTemplate } from "@/lib/equipment/types"

export interface ArmorItem {
  id: string
  name: string
  tier: "T1" | "T2" | "T3" | "T4"
  baseThresholds: {
    minor: number
    major: number
  }
  baseArmorMax: number
  featureName: string
  description: string
  modifierContributions?: EquipmentModifierContributionTemplate[]
}
```

Convert each item:

```ts
{
  id: "builtin.armor.padded",
  name: "填充布甲",
  tier: "T1",
  baseThresholds: { minor: 5, major: 11 },
  baseArmorMax: 3,
  featureName: "灵活",
  description: "闪避值+1",
  modifierContributions: [
    {
      id: "evasion",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "灵活", value: 1 },
    },
  ],
}
```

Only add obvious long-term unconditional contributions. Examples:

- `灵活`: `evasion +1`
- `重型`: `evasion -1`
- `极重`: `evasion -2`, `agility.value -1`
- `鎏金`: `presence.value +1`
- `困难`: all six attributes `-1` and `evasion -1`

Do not encode conditional entries such as attack dice, spell rolls, armor-slot-triggered effects, or damage mitigation.

- [ ] **Step 6: Add template-to-slot helpers**

Create `lib/equipment/template-to-slot.ts`:

```ts
import type { ArmorItem } from "@/data/list/armor"
import type { Weapon } from "@/data/list/primary-weapon"
import { createEmptyArmorSlot, createEmptyWeaponSlot } from "./defaults"
import { parseArmorMax, parseArmorThreshold } from "./armor-utils"
import type { ArmorSlot, EquipmentModifierContributionTemplate, WeaponSlot } from "./types"

type IdFactory = (templateId: string) => string

function splitFeatureText(featureText: string): string {
  return featureText.trim()
}

function instantiateContributions(
  templates: EquipmentModifierContributionTemplate[] | undefined,
  idFactory: IdFactory,
) {
  return (templates ?? []).map((template) => ({
    id: idFactory(template.id),
    definition: { ...template.definition },
    editable: { ...template.editable },
  }))
}

export function createWeaponSlotFromTemplate(template: Weapon, idFactory: IdFactory): WeaponSlot {
  return {
    name: template.名称,
    trait: `${template.伤害类型 || ""}/${template.负荷 || ""}/${template.范围 || ""}`,
    damage: `${template.属性 || ""}: ${template.伤害 || ""}`,
    feature: template.特性名称 ? `${template.特性名称}: ${template.描述}` : template.描述,
    modifierContributions: instantiateContributions(template.modifierContributions, idFactory),
  }
}

export function createWeaponSlotFromCustomPayload(payload: any): WeaponSlot {
  const empty = createEmptyWeaponSlot()
  if (!payload || typeof payload !== "object") {
    return empty
  }

  return {
    name: String(payload.名称 ?? payload.name ?? ""),
    trait: `${payload.伤害类型 ?? ""}/${payload.负荷 ?? ""}/${payload.范围 ?? ""}`.replace(/\/+$/, "").replace(/^\/+/, ""),
    damage: payload.属性 && payload.伤害 ? `${payload.属性}: ${payload.伤害}` : String(payload.伤害 ?? payload.damage ?? ""),
    feature: `${payload.特性名称 ? `${payload.特性名称}: ` : ""}${payload.描述 ?? payload.description ?? ""}`.trim(),
    modifierContributions: [],
  }
}

export function createWeaponSlotFromName(name: string): WeaponSlot {
  return {
    ...createEmptyWeaponSlot(),
    name,
  }
}

export function createArmorSlotFromTemplate(template: ArmorItem, idFactory: IdFactory): ArmorSlot {
  const feature = `${template.featureName ? `${template.featureName}: ` : ""}${template.description ?? ""}`.trim()
  return {
    name: template.name,
    baseArmorMax: template.baseArmorMax,
    baseThresholds: { ...template.baseThresholds },
    feature: splitFeatureText(feature),
    modifierContributions: instantiateContributions(template.modifierContributions, idFactory),
  }
}

export function createArmorSlotFromCustomPayload(payload: any): ArmorSlot {
  if (!payload || typeof payload !== "object") {
    return createEmptyArmorSlot()
  }

  const featureName = payload.特性名称 ?? payload.featureName ?? ""
  const description = payload.描述 ?? payload.description ?? ""
  return {
    name: String(payload.名称 ?? payload.name ?? ""),
    baseArmorMax: parseArmorMax(payload.护甲值 ?? payload.baseArmorMax),
    baseThresholds: parseArmorThreshold(payload.伤害阈值 ?? payload.thresholds ?? payload.baseThresholds),
    feature: `${featureName ? `${featureName}: ` : ""}${description}`.trim(),
    modifierContributions: [],
  }
}
```

Also export an `AllWeapon` type from `data/list/all-weapons.ts`:

```ts
export type AllWeapon = Weapon & { weaponType: "primary" | "secondary" }
```

Use `AllWeapon` in `createWeaponSlotFromTemplate` if the helper needs the `weaponType` field.

- [ ] **Step 7: Run focused tests**

Run:

```bash
pnpm exec vitest run tests/unit/equipment/template-to-slot.test.ts tests/unit/equipment/equipment-defaults.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add data/list lib/equipment tests/unit/equipment
git commit -m "refactor: add stable equipment templates"
```

---

### Task 3: Migrate Legacy Equipment Data And Import Validation

**Files:**
- Modify: `lib/sheet-data-migration.ts`
- Modify: `lib/character-data-validator.ts`
- Test: `tests/unit/equipment/equipment-migration.test.ts`
- Test: `tests/unit/character-data-validator.test.ts`

- [ ] **Step 1: Write failing migration tests**

Create `tests/unit/equipment/equipment-migration.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { migrateSheetData } from "@/lib/sheet-data-migration"

describe("equipment data migration", () => {
  it("migrates legacy weapon and armor fields into equipment", () => {
    const migrated = migrateSheetData({
      name: "Legacy",
      primaryWeaponName: "阔剑",
      primaryWeaponTrait: "物理/单手/近战",
      primaryWeaponDamage: "敏捷: d8",
      primaryWeaponFeature: "可靠: 你的攻击掷骰+1。",
      secondaryWeaponName: "塔盾",
      secondaryWeaponTrait: "物理/副手/近战",
      secondaryWeaponDamage: "力量: d6",
      secondaryWeaponFeature: "壁垒: +2 护甲值，-1 闪避值",
      inventoryWeapon1Name: "短剑",
      inventoryWeapon1Trait: "物理/副手/近战",
      inventoryWeapon1Damage: "敏捷: d8",
      inventoryWeapon1Feature: "双持: 近战时主武器伤害+2",
      inventoryWeapon1Primary: true,
      inventoryWeapon2Name: "手弩",
      inventoryWeapon2Trait: "物理/副手/远距离",
      inventoryWeapon2Damage: "灵巧: d6+1",
      inventoryWeapon2Feature: "",
      inventoryWeapon2Secondary: true,
      armorName: "链甲",
      armorBaseScore: "4",
      armorThreshold: "7/15",
      armorFeature: "重型: 闪避值-1",
    } as any)

    expect(migrated.equipment.weaponSlots.primary).toMatchObject({
      name: "阔剑",
      trait: "物理/单手/近战",
      damage: "敏捷: d8",
      feature: "可靠: 你的攻击掷骰+1。",
      modifierContributions: [],
    })
    expect(migrated.equipment.weaponSlots.secondary.name).toBe("塔盾")
    expect(migrated.equipment.weaponSlots.inventory[0].name).toBe("短剑")
    expect(migrated.equipment.weaponSlots.inventory[1].name).toBe("手弩")
    expect(migrated.equipment.armorSlot).toMatchObject({
      name: "链甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 15 },
      feature: "重型: 闪避值-1",
      modifierContributions: [],
    })

    const runtime = migrated as any
    expect("primaryWeaponName" in runtime).toBe(false)
    expect("inventoryWeapon1Primary" in runtime).toBe(false)
    expect("armorName" in runtime).toBe(false)
    expect("armorValue" in runtime).toBe(false)
  })

  it("normalizes invalid armor rule fields to null", () => {
    const migrated = migrateSheetData({
      armorName: "奇怪护甲",
      armorBaseScore: "heavy",
      armorThreshold: "seven/fifteen",
    } as any)

    expect(migrated.equipment.armorSlot).toMatchObject({
      name: "奇怪护甲",
      baseArmorMax: null,
      baseThresholds: { minor: null, major: null },
    })
  })

  it("preserves existing equipment over legacy fields", () => {
    const migrated = migrateSheetData({
      equipment: {
        weaponSlots: {
          primary: { name: "Existing", trait: "", damage: "", feature: "", modifierContributions: [] },
          secondary: { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          inventory: [
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          ],
        },
        armorSlot: {
          name: "Existing Armor",
          baseArmorMax: 9,
          baseThresholds: { minor: 1, major: 2 },
          feature: "",
          modifierContributions: [],
        },
      },
      primaryWeaponName: "Legacy",
      armorName: "Legacy Armor",
    } as any)

    expect(migrated.equipment.weaponSlots.primary.name).toBe("Existing")
    expect(migrated.equipment.armorSlot.name).toBe("Existing Armor")
  })
})
```

- [ ] **Step 2: Extend import validator test**

Modify `tests/unit/character-data-validator.test.ts` to include:

```ts
it("preserves legacy equipment fields until migration", () => {
  const result = validateJSONCharacterData({
    name: "Imported",
    primaryWeaponName: "阔剑",
    primaryWeaponTrait: "物理/单手/近战",
    primaryWeaponDamage: "敏捷: d8",
    primaryWeaponFeature: "可靠",
    armorName: "链甲",
    armorBaseScore: "4",
    armorThreshold: "7/15",
    armorFeature: "重型",
  } as any)

  expect(result.isValid).toBe(true)
  expect(result.data?.equipment.weaponSlots.primary.name).toBe("阔剑")
  expect(result.data?.equipment.armorSlot).toMatchObject({
    name: "链甲",
    baseArmorMax: 4,
    baseThresholds: { minor: 7, major: 15 },
  })
  expect("primaryWeaponName" in (result.data as any)).toBe(false)
  expect("armorName" in (result.data as any)).toBe(false)
})
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/equipment/equipment-migration.test.ts tests/unit/character-data-validator.test.ts
```

Expected: FAIL because equipment migration is not implemented.

- [ ] **Step 4: Implement equipment migration**

Modify `lib/sheet-data-migration.ts`:

- Add a legacy input type near imports:

```ts
type LegacyEquipmentInput = Partial<SheetData> & {
  primaryWeaponName?: string
  primaryWeaponTrait?: string
  primaryWeaponDamage?: string
  primaryWeaponFeature?: string
  secondaryWeaponName?: string
  secondaryWeaponTrait?: string
  secondaryWeaponDamage?: string
  secondaryWeaponFeature?: string
  inventoryWeapon1Name?: string
  inventoryWeapon1Trait?: string
  inventoryWeapon1Damage?: string
  inventoryWeapon1Feature?: string
  inventoryWeapon1Primary?: boolean
  inventoryWeapon1Secondary?: boolean
  inventoryWeapon2Name?: string
  inventoryWeapon2Trait?: string
  inventoryWeapon2Damage?: string
  inventoryWeapon2Feature?: string
  inventoryWeapon2Primary?: boolean
  inventoryWeapon2Secondary?: boolean
  armorName?: string
  armorBaseScore?: string
  armorThreshold?: string
  armorFeature?: string
  armorValue?: string
}
```

- Add helpers:

```ts
function legacyWeaponSlot(data: LegacyEquipmentInput, prefix: string) {
  return {
    name: String((data as any)[`${prefix}Name`] ?? ""),
    trait: String((data as any)[`${prefix}Trait`] ?? ""),
    damage: String((data as any)[`${prefix}Damage`] ?? ""),
    feature: String((data as any)[`${prefix}Feature`] ?? ""),
    modifierContributions: [],
  }
}
```

- Add `migrateEquipment(data)`:

```ts
function migrateEquipment(data: SheetData | LegacyEquipmentInput): SheetData {
  if ((data as SheetData).equipment) {
    return stripLegacyEquipmentFields(data as SheetData)
  }

  const legacy = data as LegacyEquipmentInput
  const migrated: any = {
    ...data,
    equipment: {
      weaponSlots: {
        primary: legacyWeaponSlot(legacy, "primaryWeapon"),
        secondary: legacyWeaponSlot(legacy, "secondaryWeapon"),
        inventory: [
          legacyWeaponSlot(legacy, "inventoryWeapon1"),
          legacyWeaponSlot(legacy, "inventoryWeapon2"),
        ],
      },
      armorSlot: {
        name: String(legacy.armorName ?? ""),
        baseArmorMax: parseArmorMax(legacy.armorBaseScore),
        baseThresholds: parseArmorThreshold(legacy.armorThreshold),
        feature: String(legacy.armorFeature ?? ""),
        modifierContributions: [],
      },
    },
  }

  return stripLegacyEquipmentFields(migrated)
}
```

- Add `stripLegacyEquipmentFields(data)` that deletes every legacy equipment key listed in Step 1.
- Remove or stop calling `migrateWeaponCheckboxes`.
- Call `migrateEquipment` after default merge and before `reconcileModifierState`.
- Ensure `migrateSheetData` accepts raw legacy objects without losing fields before migration.

- [ ] **Step 5: Update import validation cleanup**

Modify `lib/character-data-validator.ts`:

- Keep legacy fields in cleaned data before `migrateSheetData`.
- After migration, do not re-add legacy equipment fields.
- Prefer not to use `undefined` for legacy equipment fields in `cleanedData`; only include them if present in raw data.

Implement a helper:

```ts
function copyLegacyEquipmentInput(cleanedData: any, data: any) {
  const legacyKeys = [
    "primaryWeaponName",
    "primaryWeaponTrait",
    "primaryWeaponDamage",
    "primaryWeaponFeature",
    "secondaryWeaponName",
    "secondaryWeaponTrait",
    "secondaryWeaponDamage",
    "secondaryWeaponFeature",
    "inventoryWeapon1Name",
    "inventoryWeapon1Trait",
    "inventoryWeapon1Damage",
    "inventoryWeapon1Feature",
    "inventoryWeapon1Primary",
    "inventoryWeapon1Secondary",
    "inventoryWeapon2Name",
    "inventoryWeapon2Trait",
    "inventoryWeapon2Damage",
    "inventoryWeapon2Feature",
    "inventoryWeapon2Primary",
    "inventoryWeapon2Secondary",
    "armorName",
    "armorBaseScore",
    "armorThreshold",
    "armorFeature",
    "armorValue",
  ]

  legacyKeys.forEach((key) => {
    if (key in data) {
      cleanedData[key] = typeof data[key] === "boolean" ? data[key] : String(data[key] ?? "")
    }
  })
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
pnpm exec vitest run tests/unit/equipment/equipment-migration.test.ts tests/unit/character-data-validator.test.ts tests/unit/equipment/equipment-defaults.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add lib/sheet-data-migration.ts lib/character-data-validator.ts tests/unit/equipment/equipment-migration.test.ts tests/unit/character-data-validator.test.ts
git commit -m "refactor: migrate legacy equipment data"
```

---

### Task 4: Collect Equipment Modifier Entries

**Files:**
- Modify: `lib/modifiers/source-definitions.ts`
- Modify: `lib/modifiers/registry.ts`
- Test: `tests/unit/modifiers/source-definitions.test.ts`

- [ ] **Step 1: Add failing registry tests**

Modify `tests/unit/modifiers/source-definitions.test.ts` to add:

```ts
it("derives armor base entries from equipment armor slot", () => {
  const entries = collectModifierEntries({
    ...defaultSheetData,
    equipment: {
      ...defaultSheetData.equipment,
      armorSlot: {
        name: "链甲",
        baseArmorMax: 4,
        baseThresholds: { minor: 7, major: 15 },
        feature: "重型",
        modifierContributions: [],
      },
    },
  })

  expect(entries).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: "equipment:armor:current:armorMax",
      definition: { target: "armorMax", kind: "base" },
      presentation: { label: "链甲：基础护甲值", value: 4 },
      source: { type: "equipment", id: "armor:current" },
    }),
    expect.objectContaining({
      id: "equipment:armor:current:minorThreshold",
      definition: { target: "minorThreshold", kind: "base" },
      presentation: { label: "链甲：基础重伤阈值", value: 7 },
      source: { type: "equipment", id: "armor:current" },
    }),
  ]))
})

it("collects active equipment contributions but not inventory weapon contributions", () => {
  const entries = collectModifierEntries({
    ...defaultSheetData,
    equipment: {
      ...defaultSheetData.equipment,
      weaponSlots: {
        primary: {
          name: "塔盾",
          trait: "",
          damage: "",
          feature: "",
          modifierContributions: [
            {
              id: "primary-armor",
              definition: { target: "armorMax", kind: "modifier" },
              editable: { label: "壁垒", value: 2 },
            },
          ],
        },
        secondary: defaultSheetData.equipment.weaponSlots.secondary,
        inventory: [
          {
            name: "备用塔盾",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "inventory-armor",
                definition: { target: "armorMax", kind: "modifier" },
                editable: { label: "不应生效", value: 99 },
              },
            ],
          },
          defaultSheetData.equipment.weaponSlots.inventory[1],
        ],
      },
    },
  }, "armorMax")

  expect(entries).toEqual(expect.arrayContaining([
    expect.objectContaining({
      id: "primary-armor",
      presentation: { label: "塔盾：壁垒", value: 2 },
      source: { type: "equipment", id: "weapon:primary" },
    }),
  ]))
  expect(entries.some((entry) => entry.id === "inventory-armor")).toBe(false)
})
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts
```

Expected: FAIL because registry/source definitions still read old armor fields and do not collect equipment.

- [ ] **Step 3: Update armor source definitions**

Modify `lib/modifiers/source-definitions.ts`:

- Replace old reads from `sheetData.armorName`, `sheetData.armorBaseScore`, `sheetData.armorThreshold`.
- Read from `sheetData.equipment.armorSlot`.
- Emit ids:

```ts
equipment:armor:current:armorMax
equipment:armor:current:minorThreshold
equipment:armor:current:majorThreshold
```

- Emit source:

```ts
sourceType: "equipment"
sourceId: "armor:current"
```

- Skip entries when value is `null`.

- [ ] **Step 4: Add equipment contribution collection**

Modify `lib/modifiers/registry.ts`:

- Add helper:

```ts
function collectEquipmentModifierEntries(sheetData: SheetData): ModifierEntry[] {
  const equipment = sheetData.equipment
  const sources = [
    { slot: equipment.weaponSlots.primary, sourceId: "weapon:primary", priority: 90 },
    { slot: equipment.weaponSlots.secondary, sourceId: "weapon:secondary", priority: 90 },
    { slot: equipment.armorSlot, sourceId: "armor:current", priority: 90 },
  ]

  return sources.flatMap(({ slot, sourceId, priority }) =>
    (slot.modifierContributions ?? []).map((contribution) => {
      const entry = contributionToEntry(contribution, {
        sourceType: "equipment",
        sourceId,
        priority,
      })
      return {
        ...entry,
        presentation: {
          ...entry.presentation,
          label: `${slot.name || "装备"}：${entry.presentation.label}`,
        },
      }
    }),
  )
}
```

- Include equipment entries before user entries:

```ts
const entries = [...systemEntries, ...equipmentModifierEntries, ...userModifierEntries]
```

- [ ] **Step 5: Run focused modifier tests**

Run:

```bash
pnpm exec vitest run tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/reference-calculator.test.ts tests/unit/modifiers/reconcile.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add lib/modifiers/source-definitions.ts lib/modifiers/registry.ts tests/unit/modifiers/source-definitions.test.ts
git commit -m "feat: collect equipment modifier entries"
```

---

### Task 5: Update Store Armor Automation And Selection

**Files:**
- Modify: `lib/sheet-store.ts`
- Modify: `components/modals/armor-selection-modal.tsx`
- Test: `tests/unit/automation/armor-automation.test.ts`
- Test: `tests/unit/automation/level-automation.test.ts`

- [ ] **Step 1: Update failing armor automation tests**

Modify `tests/unit/automation/armor-automation.test.ts`:

- Replace `store().selectArmor(armor.名称)` with `store().selectArmor(armor.id)`.
- Update expectations to inspect `sheetData.equipment.armorSlot`.
- Keep final target expectations for `armorMax`, `minorThreshold`, `majorThreshold`.

Add:

```ts
it("selects built-in armor by stable template id and syncs final targets", () => {
  const armor = armorItems.find((item) => item.id === "builtin.armor.chainmail")
  expect(armor).toBeTruthy()

  store().selectArmor(armor!.id)

  const data = store().sheetData
  expect(data.equipment.armorSlot).toMatchObject({
    name: armor!.name,
    baseArmorMax: armor!.baseArmorMax,
    baseThresholds: armor!.baseThresholds,
  })
  expect(data.armorMax).toBe(armor!.baseArmorMax)
  expect(data.minorThreshold).toBe(String(armor!.baseThresholds.minor + Number(data.level)))
  expect(data.majorThreshold).toBe(String(armor!.baseThresholds.major + Number(data.level)))
})
```

Add custom armor compatibility test:

```ts
it("keeps custom Chinese armor payload compatible", () => {
  store().selectArmor(JSON.stringify({
    名称: "自定义护甲",
    护甲值: 4,
    伤害阈值: "8/18",
    特性名称: "自定义",
    描述: "测试",
  }))

  expect(store().sheetData.equipment.armorSlot).toMatchObject({
    name: "自定义护甲",
    baseArmorMax: 4,
    baseThresholds: { minor: 8, major: 18 },
  })
  expect(store().sheetData.armorMax).toBe(4)
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/automation/armor-automation.test.ts tests/unit/automation/level-automation.test.ts
```

Expected: FAIL because store still uses legacy armor fields.

- [ ] **Step 3: Update store armor actions**

Modify `lib/sheet-store.ts`:

- `updateLevel()` reads `state.sheetData.equipment.armorSlot.baseThresholds`.
- Replace `updateArmorThresholdWithDamage()` internals so it parses the input string into `equipment.armorSlot.baseThresholds`, then syncs final thresholds.
- `updateArmorBaseScore()` parses input into `equipment.armorSlot.baseArmorMax`, then syncs `armorMax`.
- `selectArmor("none")` writes `createEmptyArmorSlot()` and clears final thresholds / `armorMax`.
- `selectArmor(templateId)` finds `armorItems.find((armor) => armor.id === templateId)`.
- Custom JSON payload uses `createArmorSlotFromCustomPayload`.
- Do not write `armorName`, `armorBaseScore`, `armorThreshold`, `armorFeature`, or `armorValue`.

Use this sync helper in the store file:

```ts
function finalThresholdUpdatesFromArmorSlot(armorSlot: ArmorSlot, level: string): Partial<SheetData> {
  const levelNum = parseInt(level)
  if (Number.isNaN(levelNum) || levelNum < 1 || levelNum > 10) {
    return {}
  }
  const { minor, major } = armorSlot.baseThresholds
  if (minor === null || major === null) {
    return {}
  }
  return {
    minorThreshold: String(minor + levelNum),
    majorThreshold: String(major + levelNum),
  }
}
```

- [ ] **Step 4: Update armor modal selection ids**

Modify `components/modals/armor-selection-modal.tsx`:

- Built-in rows call `onSelect(armor.id)`.
- Display uses `armor.name`, `armor.tier`, `armor.baseArmorMax`, `armor.baseThresholds`, `armor.featureName`, `armor.description`.
- Custom armor payload can remain Chinese-key JSON for compatibility.

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm exec vitest run tests/unit/automation/armor-automation.test.ts tests/unit/automation/level-automation.test.ts tests/unit/modifiers/source-definitions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add lib/sheet-store.ts components/modals/armor-selection-modal.tsx tests/unit/automation/armor-automation.test.ts tests/unit/automation/level-automation.test.ts
git commit -m "refactor: move armor automation to equipment slot"
```

---

### Task 6: Update Weapon Selection And Slot Swap

**Files:**
- Modify: `components/character-sheet.tsx`
- Modify: `components/modals/weapon-selection-modal.tsx`
- Modify: `components/character-sheet-sections/weapon-section.tsx`
- Modify: `components/character-sheet-sections/inventory-weapon-section.tsx`
- Test: `tests/unit/equipment/weapon-slot-swap.test.ts`

- [ ] **Step 1: Write slot swap unit tests**

Create `tests/unit/equipment/weapon-slot-swap.test.ts` for the pure helper function added in Step 3.

```ts
import { describe, expect, it } from "vitest"
import { createEmptyEquipmentData } from "@/lib/equipment/defaults"
import { swapInventoryWeaponWithActiveSlot } from "@/lib/equipment/weapon-slot-utils"

describe("weapon slot swap", () => {
  it("swaps an inventory slot with primary including contributions", () => {
    const equipment = createEmptyEquipmentData()
    equipment.weaponSlots.primary = {
      name: "Primary",
      trait: "",
      damage: "",
      feature: "",
      modifierContributions: [{ id: "primary", definition: { target: "armorMax", kind: "modifier" }, editable: { label: "p", value: 1 } }],
    }
    equipment.weaponSlots.inventory[0] = {
      name: "Inventory",
      trait: "",
      damage: "",
      feature: "",
      modifierContributions: [{ id: "inventory", definition: { target: "armorMax", kind: "modifier" }, editable: { label: "i", value: 2 } }],
    }

    const swapped = swapInventoryWeaponWithActiveSlot(equipment, 0, "primary")

    expect(swapped.weaponSlots.primary.name).toBe("Inventory")
    expect(swapped.weaponSlots.primary.modifierContributions[0].id).toBe("inventory")
    expect(swapped.weaponSlots.inventory[0].name).toBe("Primary")
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
pnpm exec vitest run tests/unit/equipment/weapon-slot-swap.test.ts
```

Expected: FAIL because helper does not exist.

- [ ] **Step 3: Add weapon slot helper**

Create `lib/equipment/weapon-slot-utils.ts`:

```ts
import type { EquipmentData } from "./types"

export function swapInventoryWeaponWithActiveSlot(
  equipment: EquipmentData,
  inventoryIndex: 0 | 1,
  target: "primary" | "secondary",
): EquipmentData {
  const inventory = [...equipment.weaponSlots.inventory] as EquipmentData["weaponSlots"]["inventory"]
  const activeSlot = equipment.weaponSlots[target]
  const inventorySlot = inventory[inventoryIndex]

  inventory[inventoryIndex] = activeSlot

  return {
    ...equipment,
    weaponSlots: {
      ...equipment.weaponSlots,
      [target]: inventorySlot,
      inventory,
    },
  }
}
```

- [ ] **Step 4: Update weapon modal ids and display**

Modify `components/modals/weapon-selection-modal.tsx`:

- Built-in row selection calls `onSelect(weapon.id, weapon.weaponType)`.
- Search/filter/display still uses current Chinese fields.
- Custom weapon payload remains Chinese-key JSON.
- Existing table display should continue showing Chinese labels.

- [ ] **Step 5: Move weapon selection into equipment slots**

Modify `components/character-sheet.tsx`:

- Replace `handleWeaponChange(field, weaponId, weaponType)` legacy field updates.
- Determine slot path from `currentWeaponField` or replace `currentWeaponField` with an explicit slot descriptor.
- For built-in template ids, lookup by `id`, then call `createWeaponSlotFromTemplate`.
- For `none`, write `createEmptyWeaponSlot()`.
- For custom JSON, call `createWeaponSlotFromCustomPayload`.
- For plain custom name, call `createWeaponSlotFromName`.
- Add and use this local contribution id helper in `components/character-sheet.tsx`:

```ts
const createEquipmentContributionId = (slotId: string, templateContributionId: string) =>
  `equipment:${slotId}:${Date.now()}:${Math.random().toString(36).slice(2)}:${templateContributionId}`
```

- [ ] **Step 6: Update weapon section components**

Modify `components/character-sheet-sections/weapon-section.tsx`:

- Props should identify `slotType: "primary" | "secondary"` instead of `fieldPrefix`.
- Read `formData.equipment.weaponSlots[slotType]`.
- Write `name`, `trait`, `damage`, `feature` back into that slot.
- Keep current UI layout.

Modify `components/character-sheet-sections/inventory-weapon-section.tsx`:

- Props use `index: 0 | 1` internally while display can still show two rows.
- Read `formData.equipment.weaponSlots.inventory[index]`.
- On “设为主手/副手”, call `swapInventoryWeaponWithActiveSlot`.
- Remove checkbox `checked` dependence on legacy fields; use button-like checkbox controls only as trigger if keeping visuals.
- Keep `value={slot.trait ?? ""}` and `value={slot.damage ?? ""}` to avoid controlled/uncontrolled warnings.

- [ ] **Step 7: Run focused tests and type check**

Run:

```bash
pnpm exec vitest run tests/unit/equipment/weapon-slot-swap.test.ts tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/source-definitions.test.ts
pnpm exec tsc --noEmit
```

Expected: Vitest PASS. TypeScript may still fail in unrelated pre-existing files noted before; it should not fail on equipment migration files.

- [ ] **Step 8: Commit**

Run:

```bash
git add lib/equipment/weapon-slot-utils.ts components/character-sheet.tsx components/modals/weapon-selection-modal.tsx components/character-sheet-sections/weapon-section.tsx components/character-sheet-sections/inventory-weapon-section.tsx tests/unit/equipment/weapon-slot-swap.test.ts
git commit -m "refactor: move weapons to equipment slots"
```

---

### Task 7: Update Armor UI, Guide Reads, And Final Cleanup

**Files:**
- Modify: `components/character-sheet-sections/armor-section.tsx`
- Modify: `components/character-sheet-sections/hit-points-section.tsx`
- Modify: `components/guide/guide-content.ts`
- Modify: remaining files found by `rg`.

- [ ] **Step 1: Search for legacy equipment field reads**

Run:

```bash
rg -n "primaryWeapon|secondaryWeapon|inventoryWeapon|armorName|armorBaseScore|armorThreshold|armorFeature|armorValue" lib components tests data -g '*.{ts,tsx}'
```

Expected: Only migration/import legacy input tests may still reference legacy fields. Runtime code is updated in this task.

- [ ] **Step 2: Update armor section**

Modify `components/character-sheet-sections/armor-section.tsx`:

- Read `formData.equipment.armorSlot`.
- Name edit writes `equipment.armorSlot.name`.
- Armor value input displays `armorSlot.baseArmorMax === null ? "" : String(armorSlot.baseArmorMax)`.
- Threshold input displays `formatArmorThreshold(armorSlot.baseThresholds)`.
- Feature editor writes `equipment.armorSlot.feature`.
- Existing store actions can still be called for base value and threshold so final targets sync.

- [ ] **Step 3: Update hit point placeholders**

Modify `components/character-sheet-sections/hit-points-section.tsx`:

- Replace `formData.armorThreshold` placeholder logic with:

```ts
const armorThresholds = formData.equipment.armorSlot.baseThresholds
```

- Use `minor` / `major` plus `level` to compute placeholders.

- [ ] **Step 4: Update guide content**

Modify `components/guide/guide-content.ts`:

- Replace armor checks with `formData.equipment.armorSlot.name`, `baseArmorMax`, `baseThresholds`.
- Preserve user-facing Chinese text.

- [ ] **Step 5: Remove runtime legacy references**

Run:

```bash
rg -n "primaryWeapon|secondaryWeapon|inventoryWeapon|armorName|armorBaseScore|armorThreshold|armorFeature|armorValue" lib components data -g '*.{ts,tsx}'
```

Expected allowed matches:

- `lib/sheet-data-migration.ts`
- `lib/character-data-validator.ts`
- tests that intentionally verify legacy migration
- string literals in documentation comments if unavoidable

No runtime UI/store/registry code should read legacy fields.

- [ ] **Step 6: Run broad focused tests**

Run:

```bash
pnpm exec vitest run tests/unit/equipment tests/unit/automation tests/unit/modifiers tests/unit/character-data-validator.test.ts tests/unit/seal-dice-exporter.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run type check**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: No equipment-related type errors. If existing unrelated errors remain, document exact files/lines in task final response.

- [ ] **Step 8: Commit**

Run:

```bash
git add components/character-sheet-sections/armor-section.tsx components/character-sheet-sections/hit-points-section.tsx components/guide/guide-content.ts lib/seal-dice-exporter.ts
git commit -m "refactor: update armor UI for equipment data"
```

---

### Task 8: End-To-End Import Verification And Final Review

**Files:**
- Modify tests only if gaps are found.
- No planned production code unless verification reveals a bug.

- [ ] **Step 1: Run full focused unit suite**

Run:

```bash
pnpm exec vitest run tests/unit/equipment tests/unit/automation tests/unit/modifiers tests/unit/character-data-validator.test.ts tests/unit/seal-dice-exporter.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: no equipment-related errors. If the known unrelated `currentCharacterId` / `ProfessionCard` errors remain, record them.

- [ ] **Step 3: Verify old HTML import manually with Playwright**

Use the known old save:

```text
/Users/zhonghanzhen/Desktop/卡卡-吟游诗人-人类-人类-漂泊之民-LV1.html
```

Start the dev server:

```bash
pnpm exec next dev
```

Then use Playwright to:

1. Open app.
2. Import the HTML save.
3. Capture browser console.
4. Confirm no controlled/uncontrolled input warning.
5. Inspect localStorage active character and confirm:

```ts
data.equipment.weaponSlots.primary
data.equipment.weaponSlots.secondary
data.equipment.weaponSlots.inventory.length === 2
data.equipment.armorSlot
"primaryWeaponName" in data === false
"armorName" in data === false
```

- [ ] **Step 4: Run final legacy reference scan**

Run:

```bash
rg -n "primaryWeapon|secondaryWeapon|inventoryWeapon|armorName|armorBaseScore|armorThreshold|armorFeature|armorValue" lib components data -g '*.{ts,tsx}'
```

Expected: only migration/import/test legacy input references remain.

- [ ] **Step 5: Confirm verification did not create uncommitted changes**

Run:

```bash
git status --short
```

Expected: no equipment migration files are modified. The pre-existing `.DS_Store` change may still appear and must not be committed.

If verification reveals an implementation bug, stop this task and report the failing command plus the observed output. The controller will create a dedicated fix task rather than hiding new implementation work inside final verification.

---

## Execution Notes

- Do not touch `.DS_Store`.
- Use TDD inside each task: failing test first, implementation second.
- Do not preserve old inventory weapon checkbox state.
- Do not add equipment contribution editor UI.
- Do not add speculative template contributions for conditional effects.
- Before each task commit, run the task's focused tests.
- After each task, request two reviews through subagents:
  - spec compliance review
  - code quality review
