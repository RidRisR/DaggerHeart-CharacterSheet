# Equipment Provider Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add provider-side popovers for weapon and armor slots so users can manage equipment-owned modifier contributions.

**Architecture:** Equipment contributions remain stored on their owning `WeaponSlot`/`ArmorSlot`. A small equipment contribution utility module owns validation, ids, target labels, and default contribution creation. Store actions mutate slot contributions and always re-run modifier auto calculation; UI components call only those actions.

**Tech Stack:** Next.js/React 19, Zustand store, Vitest + Testing Library, TypeScript.

---

## File Map

- Create `lib/equipment/contribution-utils.ts`: equipment target allowlist, labels, sanitizers, id helpers, default contribution factories.
- Modify `lib/equipment/types.ts`: add a first-phase `EquipmentModifierContribution` type with `kind: "modifier"` and target restricted to `EquipmentModifierTargetId`.
- Modify `lib/sheet-data-migration.ts`: use equipment-specific sanitizer for `WeaponSlot`/`ArmorSlot.modifierContributions`.
- Modify `lib/modifiers/registry.ts`: filter equipment slot contributions through the same sanitizer before converting to runtime entries.
- Modify `lib/sheet-store.ts`: add equipment contribution actions for add/update/remove/change target; clear old entry state when target/id changes.
- Create `components/modifiers/equipment-provider-popover.tsx`: popover UI for a specific equipment slot.
- Modify `components/character-sheet-sections/weapon-section.tsx`: add provider entry for primary/secondary weapons.
- Modify `components/character-sheet-sections/inventory-weapon-section.tsx`: add provider entry for inventory weapons.
- Modify `components/character-sheet-sections/armor-section.tsx`: add provider entry for armor and show armor summary in popover.
- Test `tests/unit/equipment/equipment-contributions.test.ts`: sanitizer/id/default helper tests.
- Modify `tests/unit/equipment/equipment-migration.test.ts`: legacy/current-schema equipment contribution migration tests.
- Modify `tests/unit/modifiers/source-definitions.test.ts`: registry filters invalid equipment entries and keeps inventory inactive.
- Modify `tests/unit/modifiers/store-actions.test.ts`: store actions and auto calculation tests.
- Create `tests/unit/modifiers/equipment-provider-popover.test.tsx`: popover UI behavior tests.

---

### Task 1: Equipment Contribution Utilities

**Files:**
- Create: `lib/equipment/contribution-utils.ts`
- Modify: `lib/equipment/types.ts`
- Test: `tests/unit/equipment/equipment-contributions.test.ts`

- [ ] **Step 1: Write failing utility tests**

Add `tests/unit/equipment/equipment-contributions.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  createDefaultEquipmentModifierContribution,
  createEquipmentContributionId,
  EQUIPMENT_TARGET_LABELS,
  sanitizeEquipmentModifierContributions,
} from "@/lib/equipment/contribution-utils"

describe("equipment contribution utilities", () => {
  it("creates default modifier contributions with empty label placeholders stored as data", () => {
    const contribution = createDefaultEquipmentModifierContribution("weapon:primary")

    expect(contribution).toMatchObject({
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "", value: 0 },
    })
    expect(contribution.id).toMatch(/^equipment:weapon:primary:/)
  })

  it("creates unique ids for the same slot", () => {
    const first = createEquipmentContributionId("weapon:primary")
    const second = createEquipmentContributionId("weapon:primary")

    expect(first).not.toBe(second)
    expect(first).toMatch(/^equipment:weapon:primary:/)
    expect(second).toMatch(/^equipment:weapon:primary:/)
  })

  it("keeps only equipment modifier targets and modifier kind", () => {
    const sanitized = sanitizeEquipmentModifierContributions([
      {
        id: "valid",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "保护", value: 1 },
      },
      {
        id: "experience",
        definition: { target: "experienceValues.0", kind: "modifier" },
        editable: { label: "经历", value: 1 },
      },
      {
        id: "base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "基础", value: 12 },
      },
      {
        id: "bad-value",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "坏值", value: "1" },
      },
    ])

    expect(sanitized).toEqual([
      {
        id: "valid",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "保护", value: 1 },
      },
    ])
  })

  it("exposes user-facing target labels", () => {
    expect(EQUIPMENT_TARGET_LABELS.evasion).toBe("闪避")
    expect(EQUIPMENT_TARGET_LABELS["agility.value"]).toBe("敏捷")
    expect(EQUIPMENT_TARGET_LABELS.armorMax).toBe("护甲值")
  })
})
```

- [ ] **Step 2: Run failing utility tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/equipment-contributions.test.ts
```

Expected: FAIL because `@/lib/equipment/contribution-utils` does not exist.

- [ ] **Step 3: Add equipment contribution type**

In `lib/equipment/types.ts`, add this type after `EquipmentModifierTargetId`:

```ts
export interface EquipmentModifierContribution extends ModifierContribution {
  definition: {
    target: EquipmentModifierTargetId
    kind: "modifier"
  }
}
```

Leave `WeaponSlot.modifierContributions` and `ArmorSlot.modifierContributions` as `ModifierContribution[]` for compatibility; the sanitizer narrows runtime data.

- [ ] **Step 4: Implement utility module**

Create `lib/equipment/contribution-utils.ts`:

```ts
import type {
  EquipmentModifierContribution,
  EquipmentModifierTargetId,
} from "@/lib/equipment/types"

const equipmentModifierTargets = [
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
  "knowledge.value",
] as const satisfies readonly EquipmentModifierTargetId[]

export const EQUIPMENT_MODIFIER_TARGETS = equipmentModifierTargets

export const EQUIPMENT_TARGET_LABELS: Record<EquipmentModifierTargetId, string> = {
  evasion: "闪避",
  armorMax: "护甲值",
  minorThreshold: "重伤阈值",
  majorThreshold: "严重阈值",
  hpMax: "生命上限",
  stressMax: "压力上限",
  proficiency: "熟练度",
  "agility.value": "敏捷",
  "strength.value": "力量",
  "finesse.value": "灵巧",
  "instinct.value": "本能",
  "presence.value": "风度",
  "knowledge.value": "知识",
}

const targetSet = new Set<string>(equipmentModifierTargets)
let generatedIdCounter = 0

export function isEquipmentModifierTargetId(target: unknown): target is EquipmentModifierTargetId {
  return typeof target === "string" && targetSet.has(target)
}

export function createEquipmentContributionId(sourceId: string): string {
  generatedIdCounter += 1
  return `equipment:${sourceId}:${Date.now()}:${generatedIdCounter}`
}

export function createDefaultEquipmentModifierContribution(sourceId: string): EquipmentModifierContribution {
  return {
    id: createEquipmentContributionId(sourceId),
    definition: { target: "evasion", kind: "modifier" },
    editable: { label: "", value: 0 },
  }
}

export function sanitizeEquipmentModifierContributions(value: unknown): EquipmentModifierContribution[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item): EquipmentModifierContribution[] => {
    if (!item || typeof item !== "object") {
      return []
    }

    const contribution = item as {
      id?: unknown
      definition?: { target?: unknown; kind?: unknown }
      editable?: { label?: unknown; value?: unknown }
    }

    if (
      typeof contribution.id !== "string" ||
      !isEquipmentModifierTargetId(contribution.definition?.target) ||
      contribution.definition?.kind !== "modifier" ||
      typeof contribution.editable?.value !== "number"
    ) {
      return []
    }

    return [{
      id: contribution.id,
      definition: {
        target: contribution.definition.target,
        kind: "modifier",
      },
      editable: {
        label: String(contribution.editable.label ?? ""),
        value: contribution.editable.value,
      },
    }]
  })
}
```

- [ ] **Step 5: Run utility tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/equipment-contributions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit utilities**

Run:

```bash
git add lib/equipment/types.ts lib/equipment/contribution-utils.ts tests/unit/equipment/equipment-contributions.test.ts
git commit -m "Add equipment contribution utilities"
```

---

### Task 2: Migration and Registry Validation

**Files:**
- Modify: `lib/sheet-data-migration.ts`
- Modify: `lib/modifiers/registry.ts`
- Modify: `tests/unit/equipment/equipment-migration.test.ts`
- Modify: `tests/unit/modifiers/source-definitions.test.ts`

- [ ] **Step 1: Write failing migration tests**

Append to `tests/unit/equipment/equipment-migration.test.ts`:

```ts
  it("preserves valid current-schema equipment contributions and filters invalid ones", () => {
    const migrated = migrateSheetData(v1EquipmentInput({
      equipment: {
        weaponSlots: {
          primary: {
            name: "Existing",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "valid-weapon",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "灵巧", value: -1 },
              },
              {
                id: "experience-weapon",
                definition: { target: "experienceValues.0", kind: "modifier" },
                editable: { label: "经历", value: 1 },
              },
              {
                id: "base-weapon",
                definition: { target: "evasion", kind: "base" },
                editable: { label: "基础", value: 12 },
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
          name: "Armor",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
          feature: "",
          modifierContributions: [
            {
              id: "valid-armor",
              definition: { target: "armorMax", kind: "modifier" },
              editable: { label: "保护", value: 1 },
            },
          ],
        },
      },
    }))

    expect(migrated.equipment.weaponSlots.primary.modifierContributions).toEqual([
      {
        id: "valid-weapon",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "灵巧", value: -1 },
      },
    ])
    expect(migrated.equipment.armorSlot.modifierContributions).toEqual([
      {
        id: "valid-armor",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "保护", value: 1 },
      },
    ])
  })
```

- [ ] **Step 2: Write failing registry tests**

Append to `tests/unit/modifiers/source-definitions.test.ts` inside the existing `describe`:

```ts
  it("filters invalid equipment contribution targets and kinds before registry collection", () => {
    const entries = collectModifierEntries({
      ...defaultSheetData,
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            name: "奇怪武器",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "valid-equipment",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "灵巧", value: 1 },
              },
              {
                id: "experience-equipment",
                definition: { target: "experienceValues.0", kind: "modifier" },
                editable: { label: "经历", value: 99 },
              },
              {
                id: "base-equipment",
                definition: { target: "armorMax", kind: "base" },
                editable: { label: "基础", value: 99 },
              },
            ],
          },
        },
      },
    } as any)

    expect(entries).toContainEqual(expect.objectContaining({ id: "valid-equipment" }))
    expect(entries.some(entry => entry.id === "experience-equipment")).toBe(false)
    expect(entries.some(entry => entry.id === "base-equipment")).toBe(false)
  })
```

- [ ] **Step 3: Run failing migration/registry tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/equipment-migration.test.ts tests/unit/modifiers/source-definitions.test.ts
```

Expected: FAIL because current migration and registry use generic contribution handling.

- [ ] **Step 4: Use equipment sanitizer in migration**

In `lib/sheet-data-migration.ts`, import the sanitizer:

```ts
import { sanitizeEquipmentModifierContributions } from "@/lib/equipment/contribution-utils"
```

Change `normalizeModifierContributions`:

```ts
function normalizeModifierContributions(value: unknown): ModifierContribution[] {
  return sanitizeEquipmentModifierContributions(value)
}
```

- [ ] **Step 5: Use equipment sanitizer in registry**

In `lib/modifiers/registry.ts`, import the sanitizer:

```ts
import { sanitizeEquipmentModifierContributions } from "@/lib/equipment/contribution-utils"
```

Change `collectEquipmentModifierEntries` mapping:

```ts
  return sources.flatMap(({ slot, sourceId, priority }) =>
    sanitizeEquipmentModifierContributions(slot.modifierContributions).map(contribution =>
      contributionToEntry(contribution, {
        sourceType: "equipment",
        sourceId,
        priority,
        formatLabel: label => `${slot.name || "装备"}：${label}`,
      }),
    ),
  )
```

- [ ] **Step 6: Run migration/registry tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/equipment-migration.test.ts tests/unit/modifiers/source-definitions.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit validation changes**

Run:

```bash
git add lib/sheet-data-migration.ts lib/modifiers/registry.ts tests/unit/equipment/equipment-migration.test.ts tests/unit/modifiers/source-definitions.test.ts
git commit -m "Validate equipment modifier contributions"
```

---

### Task 3: Store Actions for Equipment Contributions

**Files:**
- Modify: `lib/sheet-store.ts`
- Test: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Write failing store action tests**

Append to `tests/unit/modifiers/store-actions.test.ts`:

```ts
  it("adds equipment contributions and applies auto calculation for active weapon slots", () => {
    resetSheetStore({
      evasion: "12",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "基础", value: 12 },
        },
      ],
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: true } },
        entryStates: {},
      },
    })

    store().addEquipmentModifierContribution({ type: "weapon", slot: "primary" })
    const contribution = sheet().equipment.weaponSlots.primary.modifierContributions[0]

    expect(contribution).toMatchObject({
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "", value: 0 },
    })
    expect(sheet().evasion).toBe("12")
  })

  it("updates equipment contribution value and recalculates active target", () => {
    resetSheetStore({
      evasion: "0",
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "基础", value: 12 },
        },
      ],
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            name: "盾",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "equipment:weapon:primary:shield",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "格挡", value: 1 },
              },
            ],
          },
        },
      },
      modifierState: {
        targetStates: { evasion: { activeBaseId: "user:evasion-base", autoCalculation: true } },
        entryStates: {},
      },
    })

    store().updateEquipmentModifierContribution(
      { type: "weapon", slot: "primary" },
      "equipment:weapon:primary:shield",
      { editable: { label: "格挡", value: 2 } },
    )

    expect(sheet().equipment.weaponSlots.primary.modifierContributions[0].editable).toEqual({
      label: "格挡",
      value: 2,
    })
    expect(sheet().evasion).toBe("14")
  })

  it("changes equipment contribution target by replacing id and clearing old entry state", () => {
    resetSheetStore({
      evasion: "1",
      armorMax: 0,
      userModifierContributions: [
        {
          id: "user:evasion-base",
          definition: { target: "evasion", kind: "base" },
          editable: { label: "基础", value: 0 },
        },
      ],
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            name: "盾",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "equipment:weapon:primary:shield",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "保护", value: 2 },
              },
            ],
          },
        },
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          name: "护甲",
          baseArmorMax: 0,
        },
      },
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base", autoCalculation: true },
          armorMax: { autoCalculation: true },
        },
        entryStates: {
          "equipment:weapon:primary:shield": { order: 2 },
        },
      },
    })

    store().changeEquipmentModifierContributionTarget(
      { type: "weapon", slot: "primary" },
      "equipment:weapon:primary:shield",
      "armorMax",
    )

    const [contribution] = sheet().equipment.weaponSlots.primary.modifierContributions
    expect(contribution.id).not.toBe("equipment:weapon:primary:shield")
    expect(contribution.definition).toEqual({ target: "armorMax", kind: "modifier" })
    expect(contribution.editable).toEqual({ label: "保护", value: 2 })
    expect(sheet().modifierState?.entryStates["equipment:weapon:primary:shield"]).toBeUndefined()
    expect(sheet().evasion).toBe("0")
    expect(sheet().armorMax).toBe(2)
  })

  it("removes equipment contributions and does not let inventory contributions affect registry until swapped active", () => {
    resetSheetStore({
      armorMax: 0,
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          name: "护甲",
          baseArmorMax: 0,
        },
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          inventory: [
            {
              name: "备用盾",
              trait: "",
              damage: "",
              feature: "",
              modifierContributions: [
                {
                  id: "equipment:inventory:0:shield",
                  definition: { target: "armorMax", kind: "modifier" },
                  editable: { label: "保护", value: 3 },
                },
              ],
            },
            defaultSheetData.equipment.weaponSlots.inventory[1],
          ],
        },
      },
      modifierState: {
        targetStates: { armorMax: { autoCalculation: true } },
        entryStates: {},
      },
    })

    store().updateInventoryWeaponSlot(0, { name: "备用盾改名" })
    expect(sheet().armorMax).toBe(0)

    store().swapInventoryWeaponToActiveSlot(0, "primary")
    expect(sheet().equipment.weaponSlots.primary.modifierContributions[0].id).toBe("equipment:inventory:0:shield")
    expect(sheet().armorMax).toBe(3)

    store().removeEquipmentModifierContribution({ type: "weapon", slot: "primary" }, "equipment:inventory:0:shield")
    expect(sheet().equipment.weaponSlots.primary.modifierContributions).toEqual([])
    expect(sheet().armorMax).toBe(0)
  })
```

- [ ] **Step 2: Run failing store tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts
```

Expected: FAIL because the store actions do not exist.

- [ ] **Step 3: Add store action types and imports**

In `lib/sheet-store.ts`, import equipment utilities and target type:

```ts
import {
    createDefaultEquipmentModifierContribution,
    createEquipmentContributionId,
    isEquipmentModifierTargetId,
    sanitizeEquipmentModifierContributions,
} from "@/lib/equipment/contribution-utils";
import type { EquipmentModifierTargetId } from "@/lib/equipment/types";
```

Add near the store interface:

```ts
type EquipmentSlotRef =
    | { type: "weapon"; slot: "primary" | "secondary" }
    | { type: "inventoryWeapon"; index: 0 | 1 }
    | { type: "armor" };

type EquipmentContributionUpdates = {
    editable?: { label: string; value: number }
};
```

Add to `SheetState`:

```ts
    addEquipmentModifierContribution: (slotRef: EquipmentSlotRef) => void;
    updateEquipmentModifierContribution: (slotRef: EquipmentSlotRef, entryId: ModifierEntryId, updates: EquipmentContributionUpdates) => void;
    changeEquipmentModifierContributionTarget: (slotRef: EquipmentSlotRef, entryId: ModifierEntryId, target: EquipmentModifierTargetId) => void;
    removeEquipmentModifierContribution: (slotRef: EquipmentSlotRef, entryId: ModifierEntryId) => void;
```

- [ ] **Step 4: Add slot update helpers**

Add helper functions above `export const useSheetStore`:

```ts
function equipmentSourceId(slotRef: EquipmentSlotRef): string {
    if (slotRef.type === "weapon") return `weapon:${slotRef.slot}`;
    if (slotRef.type === "inventoryWeapon") return `inventory:${slotRef.index}`;
    return "armor:current";
}

function updateEquipmentSlot(
    sheetData: SheetData,
    slotRef: EquipmentSlotRef,
    update: (slot: WeaponSlot | ArmorSlot) => WeaponSlot | ArmorSlot,
): SheetData {
    const equipment = sheetData.equipment;

    if (slotRef.type === "armor") {
        return {
            ...sheetData,
            equipment: {
                ...equipment,
                armorSlot: update(equipment.armorSlot) as ArmorSlot,
            },
        };
    }

    if (slotRef.type === "inventoryWeapon") {
        const inventory = [...equipment.weaponSlots.inventory] as typeof equipment.weaponSlots.inventory;
        inventory[slotRef.index] = update(inventory[slotRef.index]) as WeaponSlot;
        return {
            ...sheetData,
            equipment: {
                ...equipment,
                weaponSlots: {
                    ...equipment.weaponSlots,
                    inventory,
                },
            },
        };
    }

    return {
        ...sheetData,
        equipment: {
            ...equipment,
            weaponSlots: {
                ...equipment.weaponSlots,
                [slotRef.slot]: update(equipment.weaponSlots[slotRef.slot]) as WeaponSlot,
            },
        },
    };
}

function removeEntryState(sheetData: SheetData, entryId: ModifierEntryId): SheetData {
    const modifierState = ensureModifierState(sheetData);
    delete modifierState.entryStates[entryId];
    return { ...sheetData, modifierState };
}
```

- [ ] **Step 5: Implement store actions**

Add these actions near existing equipment actions in `useSheetStore`:

```ts
    addEquipmentModifierContribution: (slotRef) => set((state) => {
        const sourceId = equipmentSourceId(slotRef);
        const nextSheetData = updateEquipmentSlot(state.sheetData, slotRef, (slot) => ({
            ...slot,
            modifierContributions: [
                ...sanitizeEquipmentModifierContributions(slot.modifierContributions),
                createDefaultEquipmentModifierContribution(sourceId),
            ],
        }));

        return { sheetData: applyAutoCalculationForTargets(nextSheetData) };
    }),

    updateEquipmentModifierContribution: (slotRef, entryId, updates) => set((state) => {
        const nextSheetData = updateEquipmentSlot(state.sheetData, slotRef, (slot) => ({
            ...slot,
            modifierContributions: sanitizeEquipmentModifierContributions(slot.modifierContributions).map((contribution) =>
                contribution.id === entryId
                    ? {
                        ...contribution,
                        editable: updates.editable ?? contribution.editable,
                    }
                    : contribution,
            ),
        }));

        return { sheetData: applyAutoCalculationForTargets(nextSheetData) };
    }),

    changeEquipmentModifierContributionTarget: (slotRef, entryId, target) => set((state) => {
        if (!isEquipmentModifierTargetId(target)) {
            return state;
        }

        const sourceId = equipmentSourceId(slotRef);
        const nextSheetData = updateEquipmentSlot(state.sheetData, slotRef, (slot) => ({
            ...slot,
            modifierContributions: sanitizeEquipmentModifierContributions(slot.modifierContributions).map((contribution) => {
                if (contribution.id !== entryId) return contribution;
                return {
                    ...contribution,
                    id: createEquipmentContributionId(sourceId),
                    definition: { target, kind: "modifier" },
                };
            }),
        }));
        const withoutOldEntryState = removeEntryState(nextSheetData, entryId);

        return {
            sheetData: applyAutoCalculationForTargets(withoutOldEntryState),
        };
    }),

    removeEquipmentModifierContribution: (slotRef, entryId) => set((state) => {
        const nextSheetData = updateEquipmentSlot(state.sheetData, slotRef, (slot) => ({
            ...slot,
            modifierContributions: sanitizeEquipmentModifierContributions(slot.modifierContributions).filter(
                (contribution) => contribution.id !== entryId,
            ),
        }));

        return {
            sheetData: applyAutoCalculationForTargets(removeEntryState(nextSheetData, entryId)),
        };
    }),
```

- [ ] **Step 6: Run store tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit store actions**

Run:

```bash
git add lib/sheet-store.ts tests/unit/modifiers/store-actions.test.ts
git commit -m "Add equipment contribution store actions"
```

---

### Task 4: Equipment Provider Popover Component

**Files:**
- Create: `components/modifiers/equipment-provider-popover.tsx`
- Test: `tests/unit/modifiers/equipment-provider-popover.test.tsx`

- [ ] **Step 1: Write failing popover tests**

Create `tests/unit/modifiers/equipment-provider-popover.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { sheet, store, resetSheetStore } from "../automation/test-helpers"

describe("EquipmentProviderAnchor", () => {
  it("opens a weapon provider panel with fallback title and creates an empty-label modifier", async () => {
    resetSheetStore()

    render(<EquipmentProviderAnchor slotRef={{ type: "weapon", slot: "primary" }} fallbackLabel="主武器" />)

    await userEvent.click(screen.getByRole("button", { name: "查看主武器来源" }))
    expect(screen.getByRole("dialog", { name: "主武器来源" })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "新增修正" }))

    expect(screen.getByPlaceholderText("未命名修正")).toHaveValue("")
    expect(sheet().equipment.weaponSlots.primary.modifierContributions[0]).toMatchObject({
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "", value: 0 },
    })
  })

  it("edits label, value, and target from the provider panel", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            name: "塔盾",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "equipment:weapon:primary:shield",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "灵巧", value: -1 },
              },
            ],
          },
        },
      },
    })

    render(<EquipmentProviderAnchor slotRef={{ type: "weapon", slot: "primary" }} fallbackLabel="主武器" />)

    await userEvent.click(screen.getByRole("button", { name: "查看塔盾来源" }))
    await userEvent.clear(screen.getByRole("textbox", { name: "编辑灵巧名称" }))
    await userEvent.type(screen.getByRole("textbox", { name: "编辑灵巧名称" }), "保护")
    await userEvent.clear(screen.getByRole("textbox", { name: "编辑保护数值" }))
    await userEvent.type(screen.getByRole("textbox", { name: "编辑保护数值" }), "2")
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "选择保护目标" }), "armorMax")

    const [contribution] = sheet().equipment.weaponSlots.primary.modifierContributions
    expect(contribution.id).not.toBe("equipment:weapon:primary:shield")
    expect(contribution.definition).toEqual({ target: "armorMax", kind: "modifier" })
    expect(contribution.editable).toEqual({ label: "保护", value: 2 })
  })

  it("deletes slot-owned contributions", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          ...defaultSheetData.equipment.armorSlot,
          name: "锁子甲",
          modifierContributions: [
            {
              id: "equipment:armor:current:heavy",
              definition: { target: "evasion", kind: "modifier" },
              editable: { label: "笨重", value: -1 },
            },
          ],
        },
      },
    })

    render(<EquipmentProviderAnchor slotRef={{ type: "armor" }} fallbackLabel="护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "查看锁子甲来源" }))
    await userEvent.click(screen.getByRole("button", { name: "删除笨重" }))

    expect(sheet().equipment.armorSlot.modifierContributions).toEqual([])
  })

  it("shows armor base summary without editing armor base fields", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          name: "锁子甲",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
          feature: "",
          modifierContributions: [],
        },
      },
    })

    render(<EquipmentProviderAnchor slotRef={{ type: "armor" }} fallbackLabel="护甲" />)

    await userEvent.click(screen.getByRole("button", { name: "查看锁子甲来源" }))

    expect(screen.getByText("护甲值 4")).toBeInTheDocument()
    expect(screen.getByText("重伤 7")).toBeInTheDocument()
    expect(screen.getByText("严重 15")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "编辑护甲值" })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run failing popover tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/equipment-provider-popover.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement component**

Create `components/modifiers/equipment-provider-popover.tsx`:

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  EQUIPMENT_MODIFIER_TARGETS,
  EQUIPMENT_TARGET_LABELS,
  sanitizeEquipmentModifierContributions,
} from "@/lib/equipment/contribution-utils"
import type { EquipmentModifierTargetId } from "@/lib/equipment/types"
import { useSheetStore } from "@/lib/sheet-store"
import { parseNumberExpressionOr } from "@/lib/number-utils"

export type EquipmentSlotRef =
  | { type: "weapon"; slot: "primary" | "secondary" }
  | { type: "inventoryWeapon"; index: 0 | 1 }
  | { type: "armor" }

interface EquipmentProviderAnchorProps {
  slotRef: EquipmentSlotRef
  fallbackLabel: string
}

function useEquipmentSlot(slotRef: EquipmentSlotRef) {
  const { sheetData } = useSheetStore()
  if (slotRef.type === "armor") return sheetData.equipment.armorSlot
  if (slotRef.type === "inventoryWeapon") return sheetData.equipment.weaponSlots.inventory[slotRef.index]
  return sheetData.equipment.weaponSlots[slotRef.slot]
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

export function EquipmentProviderAnchor({ slotRef, fallbackLabel }: EquipmentProviderAnchorProps) {
  const slot = useEquipmentSlot(slotRef)
  const {
    addEquipmentModifierContribution,
    updateEquipmentModifierContribution,
    changeEquipmentModifierContributionTarget,
    removeEquipmentModifierContribution,
  } = useSheetStore()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const title = `${slot.name || fallbackLabel}来源`
  const contributions = sanitizeEquipmentModifierContributions(slot.modifierContributions)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const buttonLabel = `查看${slot.name || fallbackLabel}来源`

  return (
    <span className="relative inline-flex print:hidden" ref={rootRef}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        aria-label={buttonLabel}
        className="inline-flex h-5 w-5 items-center justify-center rounded border border-gray-300 bg-white text-[11px] text-gray-600 hover:bg-gray-50"
      >
        源
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-label={title}
          className="fixed z-50 w-[360px] rounded border border-gray-300 bg-white p-2 text-xs shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">{title}</h3>
            <button type="button" onClick={() => setOpen(false)} aria-label="关闭来源面板">×</button>
          </div>

          {slotRef.type === "armor" && "baseArmorMax" in slot && (
            <div className="mb-2 grid grid-cols-3 gap-1 text-[11px] text-gray-700">
              <div className="rounded border border-gray-200 px-1 py-0.5">护甲值 {slot.baseArmorMax ?? ""}</div>
              <div className="rounded border border-gray-200 px-1 py-0.5">重伤 {slot.baseThresholds.minor ?? ""}</div>
              <div className="rounded border border-gray-200 px-1 py-0.5">严重 {slot.baseThresholds.major ?? ""}</div>
            </div>
          )}

          <div className="space-y-1">
            {contributions.map((contribution) => {
              const label = contribution.editable.label || "未命名修正"
              return (
                <div key={contribution.id} className="grid grid-cols-[80px_1fr_64px_24px] items-center gap-1">
                  <select
                    aria-label={`选择${label}目标`}
                    value={contribution.definition.target}
                    onChange={(event) => changeEquipmentModifierContributionTarget(
                      slotRef,
                      contribution.id,
                      event.target.value as EquipmentModifierTargetId,
                    )}
                    className="h-6 rounded border border-gray-300 bg-white px-1 text-[11px]"
                  >
                    {EQUIPMENT_MODIFIER_TARGETS.map((target) => (
                      <option key={target} value={target}>{EQUIPMENT_TARGET_LABELS[target]}</option>
                    ))}
                  </select>
                  <input
                    aria-label={`编辑${label}名称`}
                    value={contribution.editable.label}
                    placeholder="未命名修正"
                    onChange={(event) => updateEquipmentModifierContribution(slotRef, contribution.id, {
                      editable: { ...contribution.editable, label: event.target.value },
                    })}
                    className="h-6 rounded border border-gray-300 px-1"
                  />
                  <input
                    aria-label={`编辑${label}数值`}
                    value={formatSigned(contribution.editable.value)}
                    onChange={(event) => updateEquipmentModifierContribution(slotRef, contribution.id, {
                      editable: {
                        ...contribution.editable,
                        value: parseNumberExpressionOr(event.target.value, 0),
                      },
                    })}
                    className="h-6 rounded border border-gray-300 px-1 text-right"
                  />
                  <button
                    type="button"
                    aria-label={`删除${label}`}
                    onClick={() => removeEquipmentModifierContribution(slotRef, contribution.id)}
                    className="h-6 rounded text-red-600 hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => addEquipmentModifierContribution(slotRef)}
            className="mt-2 rounded-full border border-gray-300 px-2 py-0.5 text-[11px] hover:bg-gray-50"
          >
            新增修正
          </button>
        </div>,
        document.body,
      )}
    </span>
  )
}
```

- [ ] **Step 4: Run popover tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/equipment-provider-popover.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit popover component**

Run:

```bash
git add components/modifiers/equipment-provider-popover.tsx tests/unit/modifiers/equipment-provider-popover.test.tsx
git commit -m "Add equipment provider popover"
```

---

### Task 5: Integrate Provider Entrances in Equipment Sections

**Files:**
- Modify: `components/character-sheet-sections/weapon-section.tsx`
- Modify: `components/character-sheet-sections/inventory-weapon-section.tsx`
- Modify: `components/character-sheet-sections/armor-section.tsx`
- Test: `tests/unit/modifiers/equipment-provider-popover.test.tsx`

- [ ] **Step 1: Add integration tests**

Append to `tests/unit/modifiers/equipment-provider-popover.test.tsx`:

```tsx
import { vi } from "vitest"
import { WeaponSection } from "@/components/character-sheet-sections/weapon-section"
import { InventoryWeaponSection } from "@/components/character-sheet-sections/inventory-weapon-section"
import { ArmorSection } from "@/components/character-sheet-sections/armor-section"

describe("equipment provider section integration", () => {
  it("opens weapon provider panel without opening the weapon template modal", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            name: "阔剑",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [],
          },
        },
      },
    })
    const onOpenWeaponModal = vi.fn()

    render(<WeaponSection isPrimary slotType="primary" onOpenWeaponModal={onOpenWeaponModal} />)

    await userEvent.click(screen.getByRole("button", { name: "查看阔剑来源" }))

    expect(screen.getByRole("dialog", { name: "阔剑来源" })).toBeInTheDocument()
    expect(onOpenWeaponModal).not.toHaveBeenCalled()
  })

  it("opens inventory weapon provider panel", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          inventory: [
            {
              name: "备用短剑",
              trait: "",
              damage: "",
              feature: "",
              modifierContributions: [],
            },
            defaultSheetData.equipment.weaponSlots.inventory[1],
          ],
        },
      },
    })

    render(<InventoryWeaponSection index={0} onOpenWeaponModal={vi.fn()} />)

    await userEvent.click(screen.getByRole("button", { name: "查看备用短剑来源" }))
    expect(screen.getByRole("dialog", { name: "备用短剑来源" })).toBeInTheDocument()
  })

  it("opens armor provider panel without opening the armor template modal", async () => {
    resetSheetStore({
      equipment: {
        ...defaultSheetData.equipment,
        armorSlot: {
          name: "锁子甲",
          baseArmorMax: 4,
          baseThresholds: { minor: 7, major: 15 },
          feature: "",
          modifierContributions: [],
        },
      },
    })
    const onOpenArmorModal = vi.fn()

    render(<ArmorSection onOpenArmorModal={onOpenArmorModal} />)

    await userEvent.click(screen.getByRole("button", { name: "查看锁子甲来源" }))

    expect(screen.getByRole("dialog", { name: "锁子甲来源" })).toBeInTheDocument()
    expect(onOpenArmorModal).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run failing integration tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/equipment-provider-popover.test.tsx
```

Expected: FAIL because sections do not render provider anchors.

- [ ] **Step 3: Integrate active weapon anchors**

In `components/character-sheet-sections/weapon-section.tsx`, import:

```ts
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
```

Inside the non-editing name control, after the edit-name button, add:

```tsx
              <div className="w-px bg-gray-300 hidden group-hover:block"></div>
              <div className="hidden group-hover:flex items-center justify-center px-1 print:hidden">
                <EquipmentProviderAnchor
                  slotRef={{ type: "weapon", slot: slotType }}
                  fallbackLabel={isPrimary ? "主武器" : "副武器"}
                />
              </div>
```

- [ ] **Step 4: Integrate inventory weapon anchors**

In `components/character-sheet-sections/inventory-weapon-section.tsx`, import:

```ts
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
```

Inside the non-editing name control, after the edit-name button, add:

```tsx
              <div className="w-px bg-gray-300 hidden group-hover:block"></div>
              <div className="hidden group-hover:flex items-center justify-center px-1 print:hidden">
                <EquipmentProviderAnchor
                  slotRef={{ type: "inventoryWeapon", index }}
                  fallbackLabel={`备用武器 ${index + 1}`}
                />
              </div>
```

- [ ] **Step 5: Integrate armor anchor**

In `components/character-sheet-sections/armor-section.tsx`, import:

```ts
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
```

Inside the non-editing name control, after the edit-name button, add:

```tsx
              <div className="w-px bg-gray-300 hidden group-hover:block"></div>
              <div className="hidden group-hover:flex items-center justify-center px-1 print:hidden">
                <EquipmentProviderAnchor
                  slotRef={{ type: "armor" }}
                  fallbackLabel="护甲"
                />
              </div>
```

- [ ] **Step 6: Run integration tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/equipment-provider-popover.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit integration**

Run:

```bash
git add components/character-sheet-sections/weapon-section.tsx components/character-sheet-sections/inventory-weapon-section.tsx components/character-sheet-sections/armor-section.tsx tests/unit/modifiers/equipment-provider-popover.test.tsx
git commit -m "Add equipment provider entrances"
```

---

### Task 6: End-to-End Regression Coverage

**Files:**
- Modify: `tests/unit/modifiers/equipment-provider-popover.test.tsx`
- Modify: `tests/unit/modifiers/source-definitions.test.ts`

- [ ] **Step 1: Add target-panel dynamic source label regression**

Append to `tests/unit/modifiers/equipment-provider-popover.test.tsx`:

```tsx
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"

describe("equipment provider target panel regression", () => {
  it("target panel source label follows equipment name changes", async () => {
    resetSheetStore({
      evasion: "0",
      equipment: {
        ...defaultSheetData.equipment,
        weaponSlots: {
          ...defaultSheetData.equipment.weaponSlots,
          primary: {
            name: "旧名",
            trait: "",
            damage: "",
            feature: "",
            modifierContributions: [
              {
                id: "equipment:weapon:primary:evasion",
                definition: { target: "evasion", kind: "modifier" },
                editable: { label: "灵巧", value: 1 },
              },
            ],
          },
        },
      },
    })

    render(<ModifierFieldAnchor target="evasion" label="闪避" />)

    await userEvent.click(screen.getByRole("button", { name: "查看闪避来源" }))
    expect(screen.getByText("旧名：灵巧")).toBeInTheDocument()

    store().updateActiveWeaponSlot("primary", { name: "新名" })

    expect(screen.getByText("新名：灵巧")).toBeInTheDocument()
    expect(screen.queryByText("旧名：灵巧")).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers/equipment-provider-popover.test.tsx tests/unit/modifiers/source-definitions.test.ts tests/unit/equipment/equipment-migration.test.ts tests/unit/modifiers/store-actions.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full unit suite**

Run:

```bash
npm run test:run
```

Expected: PASS. Existing known warning `Cannot find module '../card-types'` may still print; it is tracked separately in GitHub issue #10 and is not caused by this feature.

- [ ] **Step 4: Final diff check**

Run:

```bash
git diff --check
git status --short
```

Expected: `git diff --check` prints nothing. `git status --short` lists only intended files.

- [ ] **Step 5: Commit regression coverage**

Run:

```bash
git add tests/unit/modifiers/equipment-provider-popover.test.tsx tests/unit/modifiers/source-definitions.test.ts
git commit -m "Cover equipment provider regressions"
```

---

## Self-Review

Spec coverage:

- Provider panel for primary/secondary/inventory weapons and armor: Tasks 4 and 5.
- Armor core fields external with read-only summary: Task 4.
- Target editable with id replacement and old state cleanup: Task 3.
- Kind fixed to modifier and invalid equipment targets filtered: Tasks 1 and 2.
- Empty label stored as `""` with placeholder: Tasks 1 and 4.
- No legacy name matching / no silent template contribution migration: Task 2.
- Existing current-schema legal contributions preserved: Task 2.
- Backup weapons inactive until swap: Tasks 2 and 3.
- Template instances deep copied: existing `template-to-slot.ts` already copies objects; Task 6 keeps regression area focused. If a mutation bug appears during implementation, add a small assertion to `tests/unit/equipment/template-to-slot.test.ts`.

Placeholder scan:

- No placeholder markers or open-ended catch-all steps.
- Each task has explicit files, commands, and expected outcomes.

Type consistency:

- `EquipmentSlotRef` is used by store and UI.
- `EquipmentModifierTargetId` is used by utility, store, and UI.
- `sanitizeEquipmentModifierContributions` is the single runtime validation path for equipment contributions.
