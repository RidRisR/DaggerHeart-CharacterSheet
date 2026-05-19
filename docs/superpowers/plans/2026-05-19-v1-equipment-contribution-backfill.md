# V1 Equipment Contribution Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backfill template equipment modifier contributions only during v1 -> v2 migration when a legacy equipment slot matches a built-in template by name and feature text.

**Architecture:** Add a migration-only helper in `lib/sheet-data-migration.ts` after v1 equipment slots are created and before legacy Final Value preservation runs. The helper reuses existing template-to-slot conversion so feature text and runtime contribution id behavior stay aligned with normal template selection. Current-schema normalization remains unchanged and never matches templates.

**Tech Stack:** TypeScript, Vitest, existing equipment template data and sheet migration utilities.

---

## Specs

- `docs/superpowers/specs/2026-05-19-v1-equipment-contribution-backfill-design.md`
- `docs/superpowers/specs/2026-05-07-equipment-data-migration-design.md`
- `CONTEXT.md`

## File Map

- Modify `tests/unit/equipment/equipment-migration.test.ts`: add regression tests for v1-only backfill, non-overwrite behavior, mismatch behavior, and Final Value preservation.
- Modify `lib/sheet-data-migration.ts`: import built-in equipment templates and template conversion helpers; add migration-only matching/backfill helpers; call them inside `migrateV1ToV2` before `preserveLegacyModifierFinals`.

---

### Task 1: Migration Backfill Regression Tests

**Files:**
- Modify: `tests/unit/equipment/equipment-migration.test.ts`

- [ ] **Step 1: Write failing tests**

Add these tests inside the existing `describe("equipment data migration", () => { ... })` block:

```ts
  it("backfills v1 equipment contributions from exact name and feature matches", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      primaryWeaponName: "巨剑",
      primaryWeaponTrait: "物理/双手/近战",
      primaryWeaponDamage: "力量: d10+3",
      primaryWeaponFeature: "巨型: 闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
      secondaryWeaponName: "塔盾",
      secondaryWeaponTrait: "物理/副手/近战",
      secondaryWeaponDamage: "力量: d6",
      secondaryWeaponFeature: "壁垒: +2 护甲值，-1 闪避值",
      inventoryWeapon1Name: "短剑",
      inventoryWeapon1Trait: "物理/副手/近战",
      inventoryWeapon1Damage: "敏捷: d8",
      inventoryWeapon1Feature: "双持: 近战时主武器伤害+2",
      armorName: "链甲",
      armorBaseScore: "4",
      armorThreshold: "7/15",
      armorFeature: "重型: 闪避值-1",
    }))

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "巨型", value: -1 },
      },
    ])
    expect(migrated.equipment.weaponSlots.secondary.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:armor-max:/),
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "壁垒", value: 2 },
      },
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "壁垒", value: -1 },
      },
    ])
    expect(migrated.equipment.weaponSlots.inventory[0].modifierContributions).toEqual([])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "重型", value: -1 },
      },
    ])
  })

  it("does not backfill v2 equipment contributions during current-schema normalization", () => {
    const migrated = migrateSheetData({
      schemaVersion: 2,
      equipment: {
        weaponSlots: {
          primary: {
            name: "巨剑",
            trait: "物理/双手/近战",
            damage: "力量: d10+3",
            feature: "巨型: 闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
            modifierContributions: [],
          },
          secondary: { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          inventory: [
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          ],
        },
        armorSlot: {
          name: "链甲",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
          feature: "重型: 闪避值-1",
          modifierContributions: [],
        },
      },
    } as any)

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([])
  })

  it("does not backfill when the feature text does not exactly match", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      primaryWeaponName: "巨剑",
      primaryWeaponFeature: "巨型: 用户改过的文本",
      armorName: "链甲",
      armorBaseScore: "4",
      armorThreshold: "7/15",
      armorFeature: "重型",
    }))

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([])
  })

  it("keeps existing valid v1 equipment contributions instead of overwriting from templates", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      equipment: {
        weaponSlots: {
          primary: {
            name: "巨剑",
            trait: "物理/双手/近战",
            damage: "力量: d10+3",
            feature: "巨型: 闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
            modifierContributions: [
              {
                id: "existing-evasion",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "已有", value: -2 },
              },
            ],
          },
          secondary: { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          inventory: [
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
            { name: "", trait: "", damage: "", feature: "", modifierContributions: [] },
          ],
        },
        armorSlot: {
          name: "",
          baseArmorMax: null,
          baseThresholds: { minor: null, major: null },
          feature: "",
          modifierContributions: [],
        },
      },
    }))

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: "existing-evasion",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "已有", value: -2 },
      },
    ])
  })

  it("preserves legacy final values after backfilled equipment sources are added", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      evasion: "12",
      cards: [{
        id: "profession.guardian",
        name: "守护者",
        type: "profession",
        professionSpecial: {
          "起始闪避": 10,
          "起始生命": 7,
        },
      }],
      primaryWeaponName: "巨剑",
      primaryWeaponTrait: "物理/双手/近战",
      primaryWeaponDamage: "力量: d10+3",
      primaryWeaponFeature: "巨型: 闪避值-1，额外掷一个伤害骰并去掉其中最小的一个。",
    }))

    expect(migrated.evasion).toBe("12")
    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "巨型", value: -1 },
      },
    ])
    expect(migrated.otherAdjustments).toContainEqual(
      expect.objectContaining({
        target: "evasion",
        kind: "unknownMigrationDifference",
        value: 3,
      }),
    )
  })
```

Update existing assertions in `migrates legacy weapon and armor fields into equipment` so matched legacy template equipment now expects backfilled contributions:

```ts
    expect(migrated.equipment.weaponSlots.secondary.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:armor-max:/),
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "壁垒", value: 2 },
      },
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "壁垒", value: -1 },
      },
    ])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([
      {
        id: expect.stringMatching(/^equipment:evasion:/),
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "重型", value: -1 },
      },
    ])
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm run test:run -- tests/unit/equipment/equipment-migration.test.ts
```

Expected: the new backfill tests fail because v1 migration still leaves legacy equipment `modifierContributions` empty.

---

### Task 2: Migration-Only Backfill Implementation

**Files:**
- Modify: `lib/sheet-data-migration.ts`

- [ ] **Step 1: Add imports**

Add these imports near the existing equipment imports:

```ts
import { armorItems } from "@/data/list/armor"
import { allWeapons, type AllWeapon } from "@/data/list/all-weapons"
import { primaryWeapons, type Weapon } from "@/data/list/primary-weapon"
import { secondaryWeapons } from "@/data/list/secondary-weapon"
import { createEquipmentContributionId } from "@/lib/equipment/contribution-utils"
import {
  createArmorSlotFromTemplate,
  createWeaponSlotFromTemplate,
} from "@/lib/equipment/template-to-slot"
```

- [ ] **Step 2: Add helper functions**

Add these helpers after `migrateEquipment`:

```ts
function hasValidEquipmentContributions(slot: WeaponSlot | ArmorSlot): boolean {
  return sanitizeEquipmentModifierContributions(slot.modifierContributions).length > 0
}

function matchingWeaponSlotFromTemplates(
  slot: WeaponSlot,
  templates: readonly (Weapon | AllWeapon)[],
): WeaponSlot | undefined {
  if (hasValidEquipmentContributions(slot)) return undefined

  const matches = templates
    .map(template => createWeaponSlotFromTemplate(template, createEquipmentContributionId))
    .filter(templateSlot => templateSlot.name === slot.name && templateSlot.feature === slot.feature)

  return matches.length === 1 ? matches[0] : undefined
}

function matchingArmorSlotFromTemplates(slot: ArmorSlot): ArmorSlot | undefined {
  if (hasValidEquipmentContributions(slot)) return undefined

  const matches = armorItems
    .map(template => createArmorSlotFromTemplate(template, createEquipmentContributionId))
    .filter(templateSlot => templateSlot.name === slot.name && templateSlot.feature === slot.feature)

  return matches.length === 1 ? matches[0] : undefined
}

function backfillV1EquipmentContributions(data: SheetData): SheetData {
  const equipment = data.equipment
  const primaryMatch = matchingWeaponSlotFromTemplates(equipment.weaponSlots.primary, primaryWeapons)
  const secondaryMatch = matchingWeaponSlotFromTemplates(equipment.weaponSlots.secondary, secondaryWeapons)
  const inventoryMatches = equipment.weaponSlots.inventory.map(slot =>
    matchingWeaponSlotFromTemplates(slot, allWeapons),
  ) as [WeaponSlot | undefined, WeaponSlot | undefined]
  const armorMatch = matchingArmorSlotFromTemplates(equipment.armorSlot)

  return {
    ...data,
    equipment: {
      weaponSlots: {
        primary: primaryMatch
          ? { ...equipment.weaponSlots.primary, modifierContributions: primaryMatch.modifierContributions }
          : equipment.weaponSlots.primary,
        secondary: secondaryMatch
          ? { ...equipment.weaponSlots.secondary, modifierContributions: secondaryMatch.modifierContributions }
          : equipment.weaponSlots.secondary,
        inventory: [
          inventoryMatches[0]
            ? { ...equipment.weaponSlots.inventory[0], modifierContributions: inventoryMatches[0].modifierContributions }
            : equipment.weaponSlots.inventory[0],
          inventoryMatches[1]
            ? { ...equipment.weaponSlots.inventory[1], modifierContributions: inventoryMatches[1].modifierContributions }
            : equipment.weaponSlots.inventory[1],
        ],
      },
      armorSlot: armorMatch
        ? { ...equipment.armorSlot, modifierContributions: armorMatch.modifierContributions }
        : equipment.armorSlot,
    },
  }
}
```

- [ ] **Step 3: Call helper in v1 migration**

Update `migrateV1ToV2` so the backfill happens after equipment and modifier state migration, before legacy Final Value preservation:

```ts
  migrated = migrateEquipment(migrated, hasInputEquipment)
  migrated = migrateModifierState(migrated)
  migrated = backfillV1EquipmentContributions(migrated)
  migrated = migrateLegacyUpgradeStates(migrated)
  migrated = preserveLegacyModifierFinals(migrated, legacyExplicitFinals)
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test:run -- tests/unit/equipment/equipment-migration.test.ts
```

Expected: PASS.

---

### Task 3: Focused Regression Run

**Files:**
- Verify only.

- [ ] **Step 1: Run migration and equipment-focused tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/equipment-migration.test.ts tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/target-sync.test.ts tests/unit/migration-versioning.test.ts tests/unit/migration-regression-baseline.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full unit suite**

Run:

```bash
npm run test:unit
```

Expected: PASS.

- [ ] **Step 3: Commit implementation**

Run:

```bash
git add lib/sheet-data-migration.ts tests/unit/equipment/equipment-migration.test.ts docs/superpowers/plans/2026-05-19-v1-equipment-contribution-backfill.md
git commit -m "fix: backfill v1 equipment contributions"
```
