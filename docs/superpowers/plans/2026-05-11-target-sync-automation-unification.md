# Target Sync Automation Unification Implementation Plan

> **状态：历史执行计划，已过时。** 本计划使用旧的 sync/continuous 术语，并引用已经删除的
> `evasion-editor` 迁移步骤。当前自动计算模型以 final input reconciliation 设计和代码为准。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make legacy automation stop writing modifier target final values directly; source changes update provider facts, and target sync decides whether final values change.

**Architecture:** Store actions become the boundary for source changes. Source actions update `SheetData` provider facts, then call `applyContinuousTargetSync()` as a pure post-processing step. Generic `setSheetData()` remains unsynced so ordinary field editing and manual final-value overrides are not accidentally overwritten.

**Tech Stack:** Next.js, React, Zustand, TypeScript, Vitest, existing modifier registry and target sync helpers.

---

## File Structure

- Modify `lib/sheet-store.ts`
  - Add explicit weapon source actions.
  - Remove direct final-value writes from profession, armor, level, and upgrade-related source actions.
  - Keep `setSheetData()` generic and unsynced.
- Modify `lib/modifiers/source-definitions.ts`
  - Make current profession base ids stable for the current profession slot, or otherwise ensure profession source replacement can keep the active base meaningful.
- Modify `components/character-sheet.tsx`
  - Route weapon selection through store source actions.
  - Remove duplicated weapon template conversion from the component.
- Modify `components/character-sheet-sections/weapon-section.tsx`
  - Route active weapon edits through store source actions.
- Modify `components/character-sheet-sections/inventory-weapon-section.tsx`
  - Route inventory weapon edits and swaps through store source actions.
- Modify `lib/automation/upgrade-actions.ts`
  - Return selection changes without directly mutating modifier target final values.
- Modify `components/character-sheet-page-two.tsx`
  - Stop applying rollback effects directly to final values when unchecking upgrade selections.
- Modify upgrade popover editors as needed:
  - `components/upgrade-popover/evasion-editor.tsx`
  - `components/upgrade-popover/attribute-upgrade-editor.tsx`
  - `components/upgrade-popover/experience-values-editor.tsx`
- Add or modify tests:
  - `tests/unit/automation/target-sync-unification.test.ts`
  - `tests/unit/automation/armor-automation.test.ts`
  - `tests/unit/automation/profession-automation.test.ts`
  - `tests/unit/automation/level-automation.test.ts`
  - `tests/unit/automation/upgrade-automation.test.ts`
  - `tests/unit/modifiers/source-definitions.test.ts`

---

### Task 1: Lock The New Source-Action Semantics With Failing Tests

**Files:**
- Create: `tests/unit/automation/target-sync-unification.test.ts`
- Modify: `tests/unit/automation/armor-automation.test.ts`
- Modify: `tests/unit/automation/profession-automation.test.ts`
- Modify: `tests/unit/automation/level-automation.test.ts`
- Modify: `tests/unit/automation/upgrade-automation.test.ts`

- [ ] **Step 1: Add a focused target sync unification test file**

Create `tests/unit/automation/target-sync-unification.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest"
import { createEmptyCard, type StandardCard } from "@/card/card-types"
import { armorItems } from "@/data/list/armor"
import { primaryWeapons } from "@/data/list/primary-weapon"
import { createEmptyArmorSlot, createEmptyEquipmentData } from "@/lib/equipment/defaults"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { resetSheetStore, sheet, store } from "./test-helpers"

function professionCard(id: string, evasion: number, hp: number): StandardCard {
  return {
    ...createEmptyCard("profession"),
    id,
    name: "游侠",
    type: "profession",
    professionSpecial: {
      "起始闪避": evasion,
      "起始生命": hp,
      "起始物品": "",
      "希望特性": "",
    },
  } as StandardCard
}

describe("target sync automation unification", () => {
  beforeEach(() => resetSheetStore())

  it("does not sync weapon contribution into evasion while target is manual", () => {
    const giantSword = primaryWeapons.find(item => item.id === "builtin.weapon.primary.004")
    expect(giantSword).toBeTruthy()

    resetSheetStore({
      evasion: "12",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "手动基础闪避", value: 12 },
      }],
      modifierState: {
        targetStates: {
          evasion: { activeBaseId: "user:evasion-base" },
        },
        entryStates: {},
      },
    })

    store().selectWeaponSlot({ slotType: "primary" }, giantSword!.id)

    expect(sheet().equipment.weaponSlots.primary.name).toBe("巨剑")
    expect(sheet().evasion).toBe("12")
  })

  it("syncs weapon contribution into evasion while target is continuous", () => {
    const giantSword = primaryWeapons.find(item => item.id === "builtin.weapon.primary.004")
    expect(giantSword).toBeTruthy()

    resetSheetStore({
      evasion: "12",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "手动基础闪避", value: 12 },
      }],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().selectWeaponSlot({ slotType: "primary" }, giantSword!.id)

    expect(sheet().equipment.weaponSlots.primary.name).toBe("巨剑")
    expect(sheet().evasion).toBe("11")
  })

  it("does not sync armor source into final armor targets while targets are manual", () => {
    const armor = armorItems.find(item => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()

    resetSheetStore({
      level: "3",
      armorMax: 1,
      minorThreshold: "old-minor",
      majorThreshold: "old-major",
    })

    store().selectArmor(armor!.id)

    expect(sheet().equipment.armorSlot.name).toBe(armor!.name)
    expect(sheet().armorMax).toBe(1)
    expect(sheet().minorThreshold).toBe("old-minor")
    expect(sheet().majorThreshold).toBe("old-major")
  })

  it("syncs armor source into final armor targets while targets are continuous", () => {
    const armor = armorItems.find(item => item.id === "builtin.armor.chainmail")
    expect(armor).toBeTruthy()

    resetSheetStore({
      level: "3",
      armorMax: 1,
      minorThreshold: "old-minor",
      majorThreshold: "old-major",
      modifierState: {
        targetStates: {
          armorMax: {
            activeBaseId: "equipment:armor:current:armorMax",
            syncMode: "continuous",
          },
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            syncMode: "continuous",
          },
          majorThreshold: {
            activeBaseId: "equipment:armor:current:majorThreshold",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().selectArmor(armor!.id)

    expect(sheet().armorMax).toBe(armor!.baseArmorMax)
    expect(sheet().minorThreshold).toBe(String(armor!.baseThresholds.minor + 3))
    expect(sheet().majorThreshold).toBe(String(armor!.baseThresholds.major + 3))
  })

  it("does not sync profession source into final targets while targets are manual", () => {
    resetSheetStore({
      level: "1",
      evasion: "9",
      hpMax: 6,
    })

    store().updateCard(0, professionCard("profession-ranger", 12, 7), false)
    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard("profession-ranger", 12, 7),
    )

    expect(sheet().evasion).toBe("9")
    expect(sheet().hpMax).toBe(6)
  })

  it("syncs profession source into final targets while targets are continuous", () => {
    resetSheetStore({
      level: "1",
      evasion: "9",
      hpMax: 6,
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "profession:current:evasion",
            syncMode: "continuous",
          },
          hpMax: {
            activeBaseId: "profession:current:hpMax",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().updateCard(0, professionCard("profession-ranger", 12, 7), false)
    store().handleProfessionChange(
      { id: "profession-ranger", name: "游侠" },
      professionCard("profession-ranger", 12, 7),
    )

    expect(sheet().evasion).toBe("12")
    expect(sheet().hpMax).toBe(7)
  })

  it("does not sync level source into proficiency or thresholds while targets are manual", () => {
    resetSheetStore({
      level: "1",
      proficiency: [false, false, false, false, false, false],
      minorThreshold: "manual-minor",
      majorThreshold: "manual-major",
      equipment: {
        ...createEmptyEquipmentData(),
        armorSlot: {
          ...createEmptyArmorSlot(),
          baseThresholds: { minor: 3, major: 6 },
        },
      },
    })

    store().updateLevel("5", "1")

    expect(sheet().level).toBe("5")
    expect(sheet().proficiency).toEqual([false, false, false, false, false, false])
    expect(sheet().minorThreshold).toBe("manual-minor")
    expect(sheet().majorThreshold).toBe("manual-major")
  })

  it("syncs level source into proficiency and thresholds while targets are continuous", () => {
    resetSheetStore({
      level: "1",
      proficiency: [false, false, false, false, false, false],
      minorThreshold: "",
      majorThreshold: "",
      equipment: {
        ...createEmptyEquipmentData(),
        armorSlot: {
          ...createEmptyArmorSlot(),
          baseThresholds: { minor: 3, major: 6 },
        },
      },
      modifierState: {
        targetStates: {
          proficiency: {
            activeBaseId: "level:base:proficiency",
            syncMode: "continuous",
          },
          minorThreshold: {
            activeBaseId: "equipment:armor:current:minorThreshold",
            syncMode: "continuous",
          },
          majorThreshold: {
            activeBaseId: "equipment:armor:current:majorThreshold",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().updateLevel("5", "1")

    expect(sheet().proficiency).toEqual([true, true, true, false, false, false])
    expect(sheet().minorThreshold).toBe("8")
    expect(sheet().majorThreshold).toBe("11")
  })

  it("generic setSheetData remains unsynced", () => {
    resetSheetStore({
      evasion: "10",
      userModifierContributions: [{
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "Base", value: 12 },
      }],
      modifierState: {
        targetStates: {
          evasion: {
            activeBaseId: "user:evasion-base",
            syncMode: "continuous",
          },
        },
        entryStates: {},
      },
    })

    store().setSheetData({ evasion: "15" })

    expect(sheet().evasion).toBe("15")
  })
})
```

- [ ] **Step 2: Update old baseline tests so they describe the new behavior**

In `tests/unit/automation/profession-automation.test.ts`, replace tests that expect direct final writes with manual/continuous expectations:

```ts
it("1级选择职业时不再直接写入手动模式的闪避和生命上限", () => {
  resetSheetStore({ level: "1", evasion: "", hpMax: 6 })

  store().handleProfessionChange(
    { id: "profession-ranger", name: "游侠" },
    professionCard(12, 7),
  )

  expect(sheet().evasion).toBe("")
  expect(sheet().hpMax).toBe(6)
})
```

In `tests/unit/automation/armor-automation.test.ts`, update direct sync assertions so manual mode only changes `equipment.armorSlot`. Keep separate continuous cases in the new unification test file.

In `tests/unit/automation/level-automation.test.ts`, replace direct proficiency and threshold expectations with:

```ts
it("等级变化只更新等级来源，手动模式不直接改熟练度", () => {
  resetSheetStore({
    level: "1",
    proficiency: [false, false, false, false, false, false],
  })

  store().updateLevel("8", "1")

  expect(sheet().level).toBe("8")
  expect(sheet().proficiency).toEqual([false, false, false, false, false, false])
})
```

In `tests/unit/automation/upgrade-automation.test.ts`, change hp/stress/proficiency/evasion automation expectations so `updates` is `{}` and the `selection` still records the source:

```ts
it("生命槽升级只返回 selection，不直接改 hpMax", () => {
  expect(run("永久增加一个生命槽。", { hpMax: 6 })).toMatchObject({
    kind: "setSheetData",
    updates: {},
    selection: {
      selected: true,
      params: { target: "hpMax" },
    },
  })
})
```

- [ ] **Step 3: Run focused tests and verify they fail for the expected reasons**

Run:

```bash
npm run test:run -- tests/unit/automation/target-sync-unification.test.ts tests/unit/automation/armor-automation.test.ts tests/unit/automation/profession-automation.test.ts tests/unit/automation/level-automation.test.ts tests/unit/automation/upgrade-automation.test.ts
```

Expected:

- Fails because `selectWeaponSlot` does not exist.
- Fails because old profession, armor, level, and upgrade automation still writes final values directly.

- [ ] **Step 4: Commit tests**

```bash
git add tests/unit/automation/target-sync-unification.test.ts tests/unit/automation/armor-automation.test.ts tests/unit/automation/profession-automation.test.ts tests/unit/automation/level-automation.test.ts tests/unit/automation/upgrade-automation.test.ts
git commit -m "test: define target sync automation unification"
```

---

### Task 2: Add Store Source Actions For Weapon Changes

**Files:**
- Modify: `lib/sheet-store.ts`
- Modify: `components/character-sheet.tsx`
- Modify: `components/character-sheet-sections/weapon-section.tsx`
- Modify: `components/character-sheet-sections/inventory-weapon-section.tsx`

- [ ] **Step 1: Add weapon action types and imports to the store**

In `lib/sheet-store.ts`, add imports:

```ts
import { allWeapons } from "@/data/list/all-weapons";
import { createEmptyWeaponSlot } from "@/lib/equipment/defaults";
import { swapInventoryWeaponWithActiveSlot } from "@/lib/equipment/weapon-slot-utils";
import {
    createWeaponSlotFromCustomPayload,
    createWeaponSlotFromName,
    createWeaponSlotFromTemplate,
} from "@/lib/equipment/template-to-slot";
import type { WeaponSlot } from "@/lib/equipment/types";
```

Add near the top of the file:

```ts
type WeaponSlotSelection =
    | { slotType: "primary" | "secondary" }
    | { slotType: "inventory"; index: 0 | 1 };

const createWeaponContributionId = (slotId: string, templateContributionId: string) =>
    `equipment:${slotId}:${Date.now()}:${Math.random().toString(36).slice(2)}:${templateContributionId}`;

const weaponSlotSelectionId = (selection: WeaponSlotSelection) =>
    selection.slotType === "inventory" ? `inventory-${selection.index}` : selection.slotType;

function createSelectedWeaponSlot(weaponId: string, selection: WeaponSlotSelection): WeaponSlot {
    if (weaponId === "none") {
        return createEmptyWeaponSlot();
    }

    const template = allWeapons.find((weapon) => weapon.id === weaponId);
    if (template) {
        const slotId = weaponSlotSelectionId(selection);
        return createWeaponSlotFromTemplate(template, (templateContributionId) =>
            createWeaponContributionId(slotId, templateContributionId),
        );
    }

    try {
        return createWeaponSlotFromCustomPayload(JSON.parse(weaponId));
    } catch {
        return createWeaponSlotFromName(weaponId);
    }
}
```

Add methods to `SheetState`:

```ts
selectWeaponSlot: (selection: WeaponSlotSelection, weaponId: string) => void;
updateActiveWeaponSlot: (slotType: "primary" | "secondary", updates: Partial<WeaponSlot>) => void;
updateInventoryWeaponSlot: (index: 0 | 1, updates: Partial<WeaponSlot>) => void;
swapInventoryWeaponToActiveSlot: (index: 0 | 1, targetType: "primary" | "secondary") => void;
```

- [ ] **Step 2: Implement source actions**

Add the implementation before armor actions:

```ts
selectWeaponSlot: (selection, weaponId) => set((state) => {
    const slot = createSelectedWeaponSlot(weaponId, selection);
    const weaponSlots = state.sheetData.equipment.weaponSlots;

    if (selection.slotType === "inventory") {
        const inventory = [...weaponSlots.inventory] as typeof weaponSlots.inventory;
        inventory[selection.index] = slot;

        return {
            sheetData: applyContinuousTargetSync({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    weaponSlots: {
                        ...weaponSlots,
                        inventory,
                    },
                },
            }),
        };
    }

    return {
        sheetData: applyContinuousTargetSync({
            ...state.sheetData,
            equipment: {
                ...state.sheetData.equipment,
                weaponSlots: {
                    ...weaponSlots,
                    [selection.slotType]: slot,
                },
            },
        }),
    };
}),

updateActiveWeaponSlot: (slotType, updates) => set((state) => ({
    sheetData: applyContinuousTargetSync({
        ...state.sheetData,
        equipment: {
            ...state.sheetData.equipment,
            weaponSlots: {
                ...state.sheetData.equipment.weaponSlots,
                [slotType]: {
                    ...state.sheetData.equipment.weaponSlots[slotType],
                    ...updates,
                },
            },
        },
    }),
})),

updateInventoryWeaponSlot: (index, updates) => set((state) => {
    const inventory = [...state.sheetData.equipment.weaponSlots.inventory] as typeof state.sheetData.equipment.weaponSlots.inventory;
    inventory[index] = {
        ...inventory[index],
        ...updates,
    };

    return {
        sheetData: applyContinuousTargetSync({
            ...state.sheetData,
            equipment: {
                ...state.sheetData.equipment,
                weaponSlots: {
                    ...state.sheetData.equipment.weaponSlots,
                    inventory,
                },
            },
        }),
    };
}),

swapInventoryWeaponToActiveSlot: (index, targetType) => set((state) => ({
    sheetData: applyContinuousTargetSync({
        ...state.sheetData,
        equipment: swapInventoryWeaponWithActiveSlot(state.sheetData.equipment, index, targetType),
    }),
})),
```

- [ ] **Step 3: Route weapon modal selection through the store action**

In `components/character-sheet.tsx`, remove these imports:

```ts
import { allWeapons } from "@/data/list/all-weapons"
import { createEmptyWeaponSlot } from "@/lib/equipment/defaults"
import {
  createWeaponSlotFromCustomPayload,
  createWeaponSlotFromName,
  createWeaponSlotFromTemplate,
} from "@/lib/equipment/template-to-slot"
import type { WeaponSlot } from "@/lib/equipment/types"
```

Remove local `createEquipmentContributionId`, `weaponSlotSelectionId`, and `createSelectedWeaponSlot`.

Change the store selector:

```ts
const {
  sheetData: formData,
  setSheetData: setFormData,
  updateArmorBox,
  updateProficiency,
  selectArmor,
  selectWeaponSlot,
  handleProfessionChange: autofillProfessionData,
} = useSheetStore();
```

Replace `handleWeaponChange` with:

```ts
const handleWeaponChange = (weaponId: string) => {
  selectWeaponSlot(currentWeaponSlot, weaponId)
}
```

- [ ] **Step 4: Route active weapon field edits through store actions**

In `components/character-sheet-sections/weapon-section.tsx`, change:

```ts
const { sheetData: formData, setSheetData } = useSheetStore()
```

to:

```ts
const { sheetData: formData, updateActiveWeaponSlot } = useSheetStore()
```

Replace local `updateWeaponSlot` implementation with:

```ts
const updateWeaponSlot = (updates: Partial<WeaponSlot>) => {
  updateActiveWeaponSlot(slotType, updates)
}
```

- [ ] **Step 5: Route inventory weapon field edits and swaps through store actions**

In `components/character-sheet-sections/inventory-weapon-section.tsx`, change:

```ts
const { sheetData: formData, setSheetData } = useSheetStore()
```

to:

```ts
const {
  sheetData: formData,
  updateInventoryWeaponSlot,
  swapInventoryWeaponToActiveSlot,
} = useSheetStore()
```

Replace local `updateInventoryWeaponSlot` with:

```ts
const updateInventorySlot = (updates: Partial<WeaponSlot>) => {
  updateInventoryWeaponSlot(index, updates)
}
```

Update call sites:

```ts
updateInventorySlot({ [name]: value } as Partial<WeaponSlot>)
updateInventorySlot({ name: value })
```

Replace `handleWeaponSwap` body:

```ts
const handleWeaponSwap = (targetType: 'primary' | 'secondary') => {
  swapInventoryWeaponToActiveSlot(index, targetType)

  showFadeNotification({
    message: targetType === 'primary' ? '已设为主手武器' : '已设为副手武器',
    type: 'success',
    duration: 2000
  })
}
```

Remove unused imports:

```ts
import { swapInventoryWeaponWithActiveSlot } from "@/lib/equipment/weapon-slot-utils"
```

- [ ] **Step 6: Run weapon-focused tests**

Run:

```bash
npm run test:run -- tests/unit/automation/target-sync-unification.test.ts tests/unit/equipment/weapon-slot-swap.test.ts tests/unit/modifiers/source-definitions.test.ts
```

Expected:

- Weapon source action tests pass.
- Existing weapon slot swap utility tests remain green.

- [ ] **Step 7: Commit weapon source action work**

```bash
git add lib/sheet-store.ts components/character-sheet.tsx components/character-sheet-sections/weapon-section.tsx components/character-sheet-sections/inventory-weapon-section.tsx tests/unit/automation/target-sync-unification.test.ts
git commit -m "feat: route weapon sources through target sync"
```

---

### Task 3: Stop Profession, Armor, And Level Actions From Writing Final Targets Directly

**Files:**
- Modify: `lib/sheet-store.ts`
- Modify: `lib/modifiers/source-definitions.ts`
- Modify: `tests/unit/modifiers/source-definitions.test.ts`

- [ ] **Step 1: Make current profession base entry ids stable**

In `lib/modifiers/source-definitions.ts`, replace profession source/id construction:

```ts
const professionCard = sheetData.cards?.find(card => card?.type === "profession")
const professionId = professionCard?.id || sheetData.professionRef?.id || sheetData.profession || "current"
const professionName = professionCard?.name || sheetData.professionRef?.name || sheetData.profession || "职业"
```

with:

```ts
const professionCard = sheetData.cards?.find(card => card?.type === "profession")
const professionSourceId = "profession:current"
const professionName = professionCard?.name || sheetData.professionRef?.name || sheetData.profession || "职业"
```

Then replace profession entry ids/source ids:

```ts
id: `profession:${professionId}:evasion`,
sourceId: `profession:${professionId}`,
```

with:

```ts
id: "profession:current:evasion",
sourceId: professionSourceId,
```

And:

```ts
id: `profession:${professionId}:hpMax`,
sourceId: `profession:${professionId}`,
```

with:

```ts
id: "profession:current:hpMax",
sourceId: professionSourceId,
```

Update `tests/unit/modifiers/source-definitions.test.ts` expected profession ids to `profession:current:evasion` and `profession:current:hpMax`.

- [ ] **Step 2: Remove direct final writes from `updateLevel`**

In `lib/sheet-store.ts`, replace `updateLevel` with:

```ts
updateLevel: (level) => set((state) => ({
    sheetData: applyContinuousTargetSync({
        ...state.sheetData,
        level,
    }),
})),
```

Remove now-unused level-side proficiency increment logic from `updateLevel`. Do not reset attribute `checked` flags here; that was part of the old direct automation path, not target sync.

- [ ] **Step 3: Remove direct final writes from armor source actions**

In `updateArmorBaseThresholds`, remove:

```ts
const thresholdUpdates = finalThresholdUpdatesFromArmorSlot(armorSlot, state.sheetData.level);
...
...thresholdUpdates,
```

Use:

```ts
const updates: Partial<SheetData> = {
    equipment: {
        ...state.sheetData.equipment,
        armorSlot,
    },
};
```

In `updateArmorBaseMax`, remove:

```ts
armorMax: baseArmorMax ?? 0,
```

In `selectArmor`, remove all direct assignments to:

```ts
updates.minorThreshold
updates.majorThreshold
updates.armorMax
```

Keep only the equipment source update:

```ts
return {
    sheetData: applyContinuousTargetSync({
        ...state.sheetData,
        equipment: {
            ...state.sheetData.equipment,
            armorSlot,
        },
    })
};
```

Update notifications so they no longer claim final values were automatically written. Use neutral source messages:

```ts
showFadeNotification({
    message: "护甲来源已更新",
    type: "success"
});
```

- [ ] **Step 4: Remove direct final writes from profession source sync**

Replace `handleProfessionChange` with a sync-only action:

```ts
handleProfessionChange: (newProfessionRef, newProfessionCard) => {
    set((state) => ({
        sheetData: applyContinuousTargetSync(state.sheetData),
    }));

    if (!newProfessionRef || !newProfessionRef.id) {
        showFadeNotification({
            message: "职业来源已清空",
            type: "info"
        });
        return;
    }

    if (newProfessionCard?.professionSpecial) {
        showFadeNotification({
            message: "职业来源已更新",
            type: "success"
        });
    }
},
```

This action assumes the caller has already updated `cards`, `profession`, and `professionRef`. That matches the current `components/character-sheet.tsx` flow.

- [ ] **Step 5: Remove dead helper if unused**

After the above edits, run:

```bash
rg -n "finalThresholdUpdatesFromArmorSlot" lib/sheet-store.ts
```

If the only match is the function definition, delete the function.

- [ ] **Step 6: Run focused automation tests**

Run:

```bash
npm run test:run -- tests/unit/automation/target-sync-unification.test.ts tests/unit/automation/armor-automation.test.ts tests/unit/automation/profession-automation.test.ts tests/unit/automation/level-automation.test.ts tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/store-actions.test.ts
```

Expected:

- Manual source changes leave final values unchanged.
- Continuous targets sync from reference totals.
- Generic modifier store actions still sync.

- [ ] **Step 7: Commit profession, armor, and level unification**

```bash
git add lib/sheet-store.ts lib/modifiers/source-definitions.ts tests/unit/automation/target-sync-unification.test.ts tests/unit/automation/armor-automation.test.ts tests/unit/automation/profession-automation.test.ts tests/unit/automation/level-automation.test.ts tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/store-actions.test.ts
git commit -m "refactor: unify source automation with target sync"
```

---

### Task 4: Stop Upgrade Automation From Writing Final Targets Directly

**Files:**
- Modify: `lib/automation/upgrade-actions.ts`
- Modify: `components/character-sheet-page-two.tsx`
- Modify: `components/upgrade-popover/evasion-editor.tsx`
- Modify: `components/upgrade-popover/attribute-upgrade-editor.tsx`
- Modify: `components/upgrade-popover/experience-values-editor.tsx`
- Modify: `tests/unit/automation/upgrade-automation.test.ts`
- Modify: `tests/unit/automation/component-smoke.test.tsx`

- [ ] **Step 1: Replace direct upgrade final mutations with selection-only results**

In `lib/automation/upgrade-actions.ts`, replace `addTargetResult` with:

```ts
function selectionOnlyTargetResult(
  currentlyChecked: boolean,
  target: ModifierTargetId,
  messageLabel: string,
): UpgradeAutomationResult {
  const selected = !currentlyChecked
  return {
    kind: "setSheetData",
    updates: {},
    warnings: [],
    selection: {
      selected,
      params: { target },
    },
    message: selected
      ? `${messageLabel}升级已记录`
      : `${messageLabel}升级已取消`,
  }
}
```

Update call sites:

```ts
if (label.includes("闪避值")) {
  return selectionOnlyTargetResult(currentlyChecked, "evasion", "闪避值")
}

if (label.includes("生命槽")) {
  return selectionOnlyTargetResult(currentlyChecked, "hpMax", "生命槽上限")
}

if (label.includes("压力槽")) {
  return selectionOnlyTargetResult(currentlyChecked, "stressMax", "压力槽上限")
}

if (label.includes("熟练度+1")) {
  return selectionOnlyTargetResult(currentlyChecked, "proficiency", "熟练度")
}
```

Remove imports that become unused:

```ts
import { applyEffects, revertEffects } from "@/lib/modifiers/effect-executor"
import { readTargetValue } from "@/lib/modifiers/target-accessors"
```

Keep `createUpgradeRevertEffects` only until component rollback code is removed. Delete it once no call sites remain.

- [ ] **Step 2: Remove rollback effects from page-two checkbox handling**

In `components/character-sheet-page-two.tsx`, replace the `result.selection?.selected === false && !result.selection.params` branch with selection clearing only:

```ts
if (result.kind === "setSheetData") {
  setFormData(result.updates)
  if (result.selection) {
    const sourceId = `upgrade:${checkKeyOrTier}`
    const setAutomationSelection = useSheetStore.getState().setAutomationSelection
    setAutomationSelection(sourceId, result.selection.selected, result.selection.params)
  }

  result.warnings?.forEach(warning => {
    showFadeNotification({
      message: warning,
      type: "info",
      position: "middle"
    })
  })

  if (result.message) {
    showFadeNotification({
      message: result.message,
      type: "success",
      position: "middle"
    })
  }
}
```

Remove unused imports from the component:

```ts
createUpgradeRevertEffects
revertEffects
isUpgradeAttributeKey
```

- [ ] **Step 3: Make evasion upgrade editor selection-only**

In `components/upgrade-popover/evasion-editor.tsx`, remove direct `setSheetData({ evasion: finalValue })`.

Replace `handleConfirm` with:

```ts
const handleConfirm = () => {
  const setAutomationSelection = useSheetStore.getState().setAutomationSelection
  setAutomationSelection(`upgrade:${checkKey}`, true, { target: "evasion" })

  showFadeNotification({
    message: "闪避值升级已记录",
    type: "success",
    position: "middle"
  })

  toggleUpgradeCheckbox(checkKey, optionIndex, true)
  onClose?.()
}
```

Then simplify the UI in this file in the smallest possible way:

- Keep the title and confirm button.
- Remove increment/decrement controls and final-value input from this component.
- Do not create a new target sync UI here; the modifier panel owns sync.

- [ ] **Step 4: Make attribute and experience upgrade editors selection-first**

In `components/upgrade-popover/attribute-upgrade-editor.tsx`, remove direct calls to:

```ts
updateAttribute(...)
toggleAttributeChecked(...)
```

In `handleApply`, only record selected attributes:

```ts
const selectedAttributes = Object.entries(selected)
  .filter(([, isSelected]) => isSelected)
  .map(([key]) => key)

const setAutomationSelection = useSheetStore.getState().setAutomationSelection
setAutomationSelection(`upgrade:${checkKey}`, true, {
  attributes: selectedAttributes,
})

toggleUpgradeCheckbox(checkKey, optionIndex, true)

showFadeNotification({
  message: `已记录属性升级：${upgradedAttributes.join('、')}`,
  type: "success",
  position: "middle"
})

onClose?.()
```

In `components/upgrade-popover/experience-values-editor.tsx`, remove direct calls to:

```ts
updateExperienceValues(...)
```

In `handleConfirm`, only record selected experience indexes:

```ts
const setAutomationSelection = useSheetStore.getState().setAutomationSelection
setAutomationSelection(`upgrade:${checkKey}`, true, {
  experienceIndexes: Array.from(selected),
})

toggleUpgradeCheckbox(checkKey, optionIndex, true)

showFadeNotification({
  message: `已记录 ${selected.size} 项经历升级`,
  type: "success",
  position: "middle"
})

onClose?.()
```

Keep existing selection constraints: attribute upgrade still requires two unupgraded attributes; experience upgrade still requires two existing experiences.

- [ ] **Step 5: Delete unused rollback helpers**

After component edits, run:

```bash
rg -n "createUpgradeRevertEffects|revertEffects|applyEffects|readTargetValue" lib/automation components/character-sheet-page-two.tsx
```

If `createUpgradeRevertEffects` has no production call sites, remove it from `lib/automation/upgrade-actions.ts` and update tests that covered rollback behavior.

- [ ] **Step 6: Run upgrade tests**

Run:

```bash
npm run test:run -- tests/unit/automation/upgrade-automation.test.ts tests/unit/automation/component-smoke.test.tsx tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/target-sync.test.ts
```

Expected:

- Upgrade automation produces provider selections.
- `collectSystemModifierEntries()` turns selected upgrades into modifier entries.
- `applyContinuousTargetSync()` determines whether final values change.

- [ ] **Step 7: Commit upgrade unification**

```bash
git add lib/automation/upgrade-actions.ts components/character-sheet-page-two.tsx components/upgrade-popover/evasion-editor.tsx components/upgrade-popover/attribute-upgrade-editor.tsx components/upgrade-popover/experience-values-editor.tsx tests/unit/automation/upgrade-automation.test.ts tests/unit/automation/component-smoke.test.tsx tests/unit/modifiers/source-definitions.test.ts tests/unit/modifiers/target-sync.test.ts
git commit -m "refactor: make upgrade automation selection-based"
```

---

### Task 5: Regression Verification And Documentation Cleanup

**Files:**
- Modify if needed: `docs/superpowers/specs/2026-05-10-target-sync-automation-design.md`
- Modify if needed: `docs/superpowers/plans/2026-05-11-target-sync-automation-unification.md`

- [ ] **Step 1: Run modifier and automation unit tests**

Run:

```bash
npm run test:run -- tests/unit/modifiers tests/unit/automation
```

Expected:

- All modifier and automation tests pass.
- Existing known stderr about missing `../card-types`, if still present, does not fail the run.

- [ ] **Step 2: Run migration and equipment regression tests**

Run:

```bash
npm run test:run -- tests/unit/migration-versioning.test.ts tests/unit/storage-migration.test.ts tests/unit/equipment tests/unit/character-data-validator.test.ts
```

Expected:

- Versioned migration tests still pass.
- Equipment migration and validator tests still pass.

- [ ] **Step 3: Run full unit suite**

Run:

```bash
npm run test:unit
```

Expected:

- Full unit suite passes.

- [ ] **Step 4: Manual Playwright smoke check**

Run the dev server:

```bash
npm run dev
```

Then verify in the browser:

1. Open a character.
2. Turn on continuous sync for `evasion`.
3. Select `巨剑` as the primary weapon.
4. Confirm `evasion` decreases by 1.
5. Turn continuous sync off.
6. Select another weapon that changes `evasion`.
7. Confirm final `evasion` stays unchanged while the modifier panel reference changes.
8. Turn on continuous sync for `armorMax`, `minorThreshold`, and `majorThreshold`.
9. Select armor and confirm final armor targets sync.
10. Turn sync off for those targets, select another armor, and confirm final values stay unchanged.

- [ ] **Step 5: Update docs if implementation exposed a narrower boundary**

If implementation leaves upgrade UI simplification partially deferred, update `docs/superpowers/specs/2026-05-10-target-sync-automation-design.md` with a short note:

```md
Implementation note: upgrade provider selection has been unified with target sync. Upgrade popover visual simplification remains a UI polish task unless it directly writes target final values.
```

- [ ] **Step 6: Commit verification/doc cleanup**

```bash
git add docs/superpowers/specs/2026-05-10-target-sync-automation-design.md docs/superpowers/plans/2026-05-11-target-sync-automation-unification.md
git commit -m "docs: record target sync unification plan"
```

---

## Self-Review

Spec coverage:

- Source changes trigger continuous sync through explicit store actions: Tasks 2 and 3.
- Generic `setSheetData()` remains unsynced: Task 1 test locks this.
- Weapon source changes sync correctly: Task 2.
- Profession, armor, and level no longer directly write final values: Task 3.
- Upgrade automation no longer directly writes final values: Task 4.
- Manual vs continuous behavior is covered: Task 1.
- Infinite loop avoidance remains in existing `applyContinuousTargetSync()` pure helper and equality checks; no React effect or store recursion is introduced.

Placeholder scan:

- No `TBD` / `TODO` placeholders.
- Every implementation task includes exact files, code shape, and verification command.

Type consistency:

- New store action names are consistent across tests, store, and components:
  - `selectWeaponSlot`
  - `updateActiveWeaponSlot`
  - `updateInventoryWeaponSlot`
  - `swapInventoryWeaponToActiveSlot`
- Stable profession ids are consistently `profession:current:evasion` and `profession:current:hpMax`.
