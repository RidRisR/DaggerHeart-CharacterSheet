# Custom Equipment One-off Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-off custom weapon and armor draft mode to the equipment selection modals, including multi-row modifier authoring and template-based draft fill.

**Architecture:** Extend the structured equipment selection inputs with `custom` drafts, convert those drafts into normal `WeaponSlot`/`ArmorSlot` values in the sheet store, and keep the UI draft state local to the weapon/armor modal. The custom draft UI is a current-modal mode, not a new route, nested modal, or persistent template system.

**Tech Stack:** Next.js/React, TypeScript, Zustand sheet store, Vitest, Testing Library, existing shadcn-style UI primitives.

---

## File Structure

- Modify `lib/sheet-store.ts`
  - Add `CustomWeaponDraft` and `CustomArmorDraft` input types.
  - Extend `WeaponSelectionInput` and `ArmorSelectionInput` with `{ type: "custom" }`.
  - Route custom drafts through new conversion functions.

- Modify `automation/equipment/template-to-slot.ts`
  - Add `createWeaponSlotFromCustomDraft`.
  - Add `createArmorSlotFromCustomDraft`.
  - Reuse existing Chinese display conversion and contribution instantiation.

- Modify `tests/unit/equipment/template-to-slot.test.ts`
  - Cover conversion from custom drafts to slots.

- Modify `tests/unit/modifiers/store-actions.test.ts`
  - Cover store-level custom weapon/armor selection and modifier recalculation.

- Create `components/modals/custom-equipment-draft-form.tsx`
  - Shared custom draft form controls for weapon and armor.
  - Modifier list editor.
  - Validation helpers used by the form.

- Modify `components/modals/weapon-selection-modal.tsx`
  - Add custom draft mode.
  - In custom mode, row click fills draft instead of selecting.
  - Save emits `{ type: "custom", draft }`.

- Modify `components/modals/armor-selection-modal.tsx`
  - Same custom draft mode for armor.

- Modify `components/modals/__tests__/equipment-selection-modal.test.tsx`
  - Cover custom mode behavior for weapon and armor.

---

### Task 1: Custom Draft Data Layer

**Files:**
- Modify: `automation/equipment/template-to-slot.ts`
- Modify: `lib/sheet-store.ts`
- Test: `tests/unit/equipment/template-to-slot.test.ts`
- Test: `tests/unit/modifiers/store-actions.test.ts`

- [ ] **Step 1: Add failing conversion tests**

Add these cases to `tests/unit/equipment/template-to-slot.test.ts` inside `describe("runtime equipment template slot instantiation", ...)`.

```ts
it("creates a weapon slot from a one-off custom weapon draft", () => {
  const slot = createWeaponSlotFromCustomDraft({
    name: "自定义塔盾",
    tier: "T1",
    weaponType: "secondary",
    trait: "strength",
    damageType: "physical",
    range: "melee",
    burden: "offHand",
    damage: "d6",
    featureName: "壁垒",
    description: "+2 护甲值，-1 闪避值",
    modifierContributions: [
      {
        id: "armor",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "壁垒", value: 2 },
      },
      {
        id: "evasion",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "壁垒", value: -1 },
      },
    ],
  }, (id) => `custom:${id}`)

  expect(slot).toEqual({
    name: "自定义塔盾",
    trait: "物理/副手/近战",
    damage: "力量: d6",
    feature: "壁垒: +2 护甲值，-1 闪避值",
    modifierContributions: [
      {
        id: "custom:armor",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "壁垒", value: 2 },
      },
      {
        id: "custom:evasion",
        definition: { target: "evasion", kind: "modifier" },
        editable: { label: "壁垒", value: -1 },
      },
    ],
  })
})

it("creates an armor slot from a one-off custom armor draft", () => {
  const slot = createArmorSlotFromCustomDraft({
    name: "自定义链甲",
    tier: "T1",
    baseArmorMax: 4,
    baseThresholds: { minor: 7, major: 14 },
    featureName: "稳固",
    description: "护甲值+1。",
    modifierContributions: [
      {
        id: "armor",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "稳固", value: 1 },
      },
    ],
  }, (id) => `custom:${id}`)

  expect(slot).toEqual({
    name: "自定义链甲",
    baseArmorMax: 4,
    baseThresholds: { minor: 7, major: 14 },
    feature: "稳固: 护甲值+1。",
    modifierContributions: [
      {
        id: "custom:armor",
        definition: { target: "armorMax", kind: "modifier" },
        editable: { label: "稳固", value: 1 },
      },
    ],
  })
})
```

Update the import block in that test to include:

```ts
createArmorSlotFromCustomDraft,
createWeaponSlotFromCustomDraft,
```

- [ ] **Step 2: Run conversion tests and verify they fail**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts
```

Expected: fail because `createWeaponSlotFromCustomDraft` and `createArmorSlotFromCustomDraft` are not exported.

- [ ] **Step 3: Implement custom draft types and conversion functions**

In `automation/equipment/template-to-slot.ts`, import normalized template types:

```ts
import type {
  NormalizedEquipmentArmorTemplate,
  NormalizedEquipmentWeaponTemplate,
} from "@/equipment/import/types"
```

Add exported draft types after `type CustomPayload = Record<string, unknown>`:

```ts
export type CustomWeaponDraft = Omit<NormalizedEquipmentWeaponTemplate, "id">
export type CustomArmorDraft = Omit<NormalizedEquipmentArmorTemplate, "id">
```

Add these functions near the runtime template conversion functions:

```ts
export function createWeaponSlotFromCustomDraft(
  draft: CustomWeaponDraft,
  idFactory: IdFactory,
): WeaponSlot {
  return createWeaponSlotFromSharedTemplate(draft, idFactory)
}

export function createArmorSlotFromCustomDraft(
  draft: CustomArmorDraft,
  idFactory: IdFactory,
): ArmorSlot {
  return createArmorSlotFromSharedTemplate(draft, idFactory)
}
```

- [ ] **Step 4: Extend sheet store selection inputs**

In `lib/sheet-store.ts`, update the template-to-slot import:

```ts
import {
    createArmorSlotFromCustomDraft,
    createArmorSlotFromRuntimeTemplate,
    createArmorSlotFromTemplate,
    createWeaponSlotFromCustomDraft,
    createWeaponSlotFromName,
    createWeaponSlotFromRuntimeTemplate,
    createWeaponSlotFromTemplate,
} from "@/automation/equipment/template-to-slot";
```

Update the type import to include draft types:

```ts
import type {
    CustomArmorDraft,
    CustomWeaponDraft,
} from "@/automation/equipment/template-to-slot";
```

Extend the input types:

```ts
export type WeaponSelectionInput =
    | { type: "none" }
    | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "weapon" } }
    | { type: "custom"; draft: CustomWeaponDraft }

export type ArmorSelectionInput =
    | { type: "none" }
    | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "armor" } }
    | { type: "custom"; draft: CustomArmorDraft }
```

Update `createSelectedRuntimeWeaponSlot`:

```ts
function createSelectedRuntimeWeaponSlot(selection: WeaponSlotSelection, input: WeaponSelectionInput): WeaponSlot {
    if (input.type === "none") {
        return createEmptyWeaponSlot()
    }

    if (input.type === "custom") {
        return createWeaponSlotFromCustomDraft(input.draft, (templateContributionId) =>
            createWeaponContributionId(selection, templateContributionId),
        )
    }

    return createWeaponSlotFromRuntimeTemplate(input.template, (templateContributionId) =>
        createWeaponContributionId(selection, templateContributionId),
    )
}
```

Update `selectArmorSlot`:

```ts
selectArmorSlot: (input) => set((state) => {
    const armorSlot = input.type === "none"
        ? createEmptyArmorSlot()
        : input.type === "custom"
            ? createArmorSlotFromCustomDraft(input.draft, createEquipmentContributionId)
            : createArmorSlotFromRuntimeTemplate(input.template, createEquipmentContributionId);

    return {
        sheetData: applyAutoCalculationForTargets({
            ...state.sheetData,
            equipment: {
                ...state.sheetData.equipment,
                armorSlot,
            },
        }),
    };
}),
```

- [ ] **Step 5: Add store-level custom selection tests**

In `tests/unit/modifiers/store-actions.test.ts`, add this test inside `describe("structured runtime equipment selection", ...)`:

```ts
it("selects one-off custom weapon and armor drafts with modifier contributions", () => {
  resetSheetStore({
    evasion: "12",
    armorMax: "6",
    userModifierContributions: [
      {
        id: "user:evasion-base",
        definition: { target: "evasion", kind: "base" },
        editable: { label: "Base", value: 12 },
      },
      {
        id: "user:armor-base",
        definition: { target: "armorMax", kind: "base" },
        editable: { label: "Armor Base", value: 6 },
      },
    ],
    modifierState: {
      targetStates: {
        evasion: { activeBaseId: "user:evasion-base", autoCalculation: true },
        armorMax: { activeBaseId: "user:armor-base", autoCalculation: true },
      },
      entryStates: {},
    },
  })

  store().selectWeapon({ slotType: "primary" }, {
    type: "custom",
    draft: {
      name: "自定义塔盾",
      tier: "T1",
      weaponType: "secondary",
      trait: "strength",
      damageType: "physical",
      range: "melee",
      burden: "offHand",
      damage: "d6",
      featureName: "壁垒",
      description: "+2 护甲值，-1 闪避值",
      modifierContributions: [
        {
          id: "armor",
          definition: { target: "armorMax", kind: "modifier" },
          editable: { label: "壁垒", value: 2 },
        },
        {
          id: "evasion",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "壁垒", value: -1 },
        },
      ],
    },
  })

  expect(sheet().equipment.weaponSlots.primary).toMatchObject({
    name: "自定义塔盾",
    trait: "物理/副手/近战",
    damage: "力量: d6",
    feature: "壁垒: +2 护甲值，-1 闪避值",
  })
  expect(sheet().evasion).toBe("11")
  expect(sheet().armorMax).toBe("8")

  store().selectArmorSlot({
    type: "custom",
    draft: {
      name: "自定义链甲",
      tier: "T1",
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 14 },
      featureName: "稳固",
      description: "闪避值+1。",
      modifierContributions: [
        {
          id: "evasion",
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "稳固", value: 1 },
        },
      ],
    },
  })

  expect(sheet().equipment.armorSlot).toMatchObject({
    name: "自定义链甲",
    baseArmorMax: 4,
    baseThresholds: { minor: 7, major: 14 },
    feature: "稳固: 闪避值+1。",
  })
  expect(sheet().evasion).toBe("12")
})
```

- [ ] **Step 6: Run focused data-layer tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/store-actions.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Commit Task 1**

```bash
git add automation/equipment/template-to-slot.ts lib/sheet-store.ts tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/store-actions.test.ts
git commit -m "feat: support one-off custom equipment drafts"
```

---

### Task 2: Shared Custom Draft Form

**Files:**
- Create: `components/modals/custom-equipment-draft-form.tsx`
- Test indirectly in Task 3 and Task 4 modal tests.

- [ ] **Step 1: Create shared form module**

Create `components/modals/custom-equipment-draft-form.tsx` with these exports:

```ts
export type DraftModifierInput = {
  id: string
  target: EquipmentModifierTargetId | ""
  label: string
  value: string
}

export type CustomWeaponDraftState = {
  name: string
  tier: EquipmentTier | ""
  weaponType: "primary" | "secondary"
  trait: EquipmentTrait | ""
  damageType: EquipmentDamageType | ""
  burden: EquipmentBurden | ""
  range: EquipmentRange | ""
  damage: string
  featureName: string
  description: string
  modifierRows: DraftModifierInput[]
}

export type CustomArmorDraftState = {
  name: string
  tier: EquipmentTier | ""
  baseArmorMax: string
  minorThreshold: string
  majorThreshold: string
  featureName: string
  description: string
  modifierRows: DraftModifierInput[]
}
```

The file must import:

```ts
import type {
  EquipmentBurden,
  EquipmentDamageType,
  EquipmentRange,
  EquipmentTier,
  EquipmentTrait,
} from "@/equipment/import/types"
import type {
  CustomArmorDraft,
  CustomWeaponDraft,
} from "@/automation/equipment/template-to-slot"
import {
  EQUIPMENT_MODIFIER_TARGETS,
  EQUIPMENT_TARGET_LABELS,
  isEquipmentModifierTargetId,
} from "@/automation/equipment/contribution-utils"
import type { EquipmentModifierTargetId } from "@/automation/equipment/types"
import type { RuntimeEquipmentTemplateWithSource } from "@/equipment/ui/types"
```

- [ ] **Step 2: Add option constants**

Add exported option arrays:

```ts
export const TIER_OPTIONS: EquipmentTier[] = ["T1", "T2", "T3", "T4"]
export const TRAIT_OPTIONS = [
  { value: "agility", label: "敏捷" },
  { value: "finesse", label: "灵巧" },
  { value: "knowledge", label: "知识" },
  { value: "strength", label: "力量" },
  { value: "instinct", label: "本能" },
  { value: "presence", label: "风度" },
] as const satisfies Array<{ value: EquipmentTrait; label: string }>
export const DAMAGE_TYPE_OPTIONS = [
  { value: "physical", label: "物理" },
  { value: "magic", label: "魔法" },
] as const satisfies Array<{ value: EquipmentDamageType; label: string }>
export const RANGE_OPTIONS = [
  { value: "melee", label: "近战" },
  { value: "veryClose", label: "邻近" },
  { value: "close", label: "近距离" },
  { value: "far", label: "远距离" },
  { value: "veryFar", label: "极远" },
] as const satisfies Array<{ value: EquipmentRange; label: string }>
export const BURDEN_OPTIONS = [
  { value: "oneHanded", label: "单手" },
  { value: "twoHanded", label: "双手" },
  { value: "offHand", label: "副手" },
] as const satisfies Array<{ value: EquipmentBurden; label: string }>
```

- [ ] **Step 3: Add draft factory helpers**

Add:

```ts
let draftRowCounter = 0

function nextDraftRowId(prefix: string) {
  draftRowCounter += 1
  return `${prefix}:${Date.now()}:${draftRowCounter}`
}

export function emptyWeaponDraftState(defaultWeaponType: "primary" | "secondary"): CustomWeaponDraftState {
  return {
    name: "",
    tier: "",
    weaponType: defaultWeaponType,
    trait: "",
    damageType: "",
    burden: "",
    range: "",
    damage: "",
    featureName: "",
    description: "",
    modifierRows: [],
  }
}

export function emptyArmorDraftState(): CustomArmorDraftState {
  return {
    name: "",
    tier: "",
    baseArmorMax: "",
    minorThreshold: "",
    majorThreshold: "",
    featureName: "",
    description: "",
    modifierRows: [],
  }
}
```

Add template copy helpers:

```ts
export function weaponDraftFromTemplate(template: RuntimeEquipmentTemplateWithSource & { kind: "weapon" }): CustomWeaponDraftState {
  return {
    name: template.name,
    tier: template.tier,
    weaponType: template.weaponType,
    trait: template.trait,
    damageType: template.damageType,
    burden: template.burden,
    range: template.range,
    damage: template.damage,
    featureName: template.featureName ?? "",
    description: template.description ?? "",
    modifierRows: template.modifierContributions.map((contribution) => ({
      id: nextDraftRowId(contribution.id),
      target: contribution.definition.target,
      label: contribution.editable.label,
      value: String(contribution.editable.value),
    })),
  }
}

export function armorDraftFromTemplate(template: RuntimeEquipmentTemplateWithSource & { kind: "armor" }): CustomArmorDraftState {
  return {
    name: template.name,
    tier: template.tier,
    baseArmorMax: String(template.baseArmorMax),
    minorThreshold: String(template.baseThresholds.minor),
    majorThreshold: String(template.baseThresholds.major),
    featureName: template.featureName ?? "",
    description: template.description ?? "",
    modifierRows: template.modifierContributions.map((contribution) => ({
      id: nextDraftRowId(contribution.id),
      target: contribution.definition.target,
      label: contribution.editable.label,
      value: String(contribution.editable.value),
    })),
  }
}
```

- [ ] **Step 4: Add validation helpers**

Add:

```ts
export type DraftValidationResult<T> =
  | { ok: true; draft: T }
  | { ok: false; errors: Record<string, string> }

function parseRequiredInteger(value: string): number | undefined {
  const trimmed = value.trim()
  if (!/^[+-]?\d+$/.test(trimmed)) return undefined
  return Number(trimmed)
}

function buildModifierContributions(
  rows: DraftModifierInput[],
  fallbackLabel: string,
  errors: Record<string, string>,
) {
  return rows.flatMap((row, index) => {
    const value = parseRequiredInteger(row.value)
    if (!row.target || !isEquipmentModifierTargetId(row.target)) {
      errors[`modifier-${row.id}-target`] = "请选择修正目标"
    }
    if (value === undefined) {
      errors[`modifier-${row.id}-value`] = "请输入整数"
    }
    if (!row.target || !isEquipmentModifierTargetId(row.target) || value === undefined) {
      return []
    }
    return [{
      id: row.id,
      definition: { target: row.target, kind: "modifier" as const },
      editable: {
        label: row.label.trim() || fallbackLabel,
        value,
      },
    }]
  })
}
```

Add `validateWeaponDraftState(state)` and `validateArmorDraftState(state)`:

```ts
export function validateWeaponDraftState(state: CustomWeaponDraftState): DraftValidationResult<CustomWeaponDraft> {
  const errors: Record<string, string> = {}
  if (!state.name.trim()) errors.name = "请输入名称"
  if (!state.trait) errors.trait = "请选择属性"
  if (!state.damageType) errors.damageType = "请选择伤害类型"
  if (!state.burden) errors.burden = "请选择负荷"
  if (!state.range) errors.range = "请选择范围"
  if (!state.damage.trim()) errors.damage = "请输入伤害"

  const fallbackLabel = state.featureName.trim() || state.name.trim() || "自定义装备"
  const modifierContributions = buildModifierContributions(state.modifierRows, fallbackLabel, errors)

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    draft: {
      name: state.name.trim(),
      tier: state.tier || "T1",
      weaponType: state.weaponType,
      trait: state.trait,
      damageType: state.damageType,
      burden: state.burden,
      range: state.range,
      damage: state.damage.trim(),
      featureName: state.featureName.trim(),
      description: state.description.trim(),
      modifierContributions,
    },
  }
}

export function validateArmorDraftState(state: CustomArmorDraftState): DraftValidationResult<CustomArmorDraft> {
  const errors: Record<string, string> = {}
  const baseArmorMax = parseRequiredInteger(state.baseArmorMax)
  const minor = parseRequiredInteger(state.minorThreshold)
  const major = parseRequiredInteger(state.majorThreshold)

  if (!state.name.trim()) errors.name = "请输入名称"
  if (baseArmorMax === undefined) errors.baseArmorMax = "请输入整数护甲值"
  if (minor === undefined) errors.minorThreshold = "请输入轻微阈值"
  if (major === undefined) errors.majorThreshold = "请输入严重阈值"
  if (minor !== undefined && major !== undefined && major <= minor) {
    errors.majorThreshold = "严重阈值必须大于轻微阈值"
  }

  const fallbackLabel = state.featureName.trim() || state.name.trim() || "自定义装备"
  const modifierContributions = buildModifierContributions(state.modifierRows, fallbackLabel, errors)

  if (Object.keys(errors).length > 0 || baseArmorMax === undefined || minor === undefined || major === undefined) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    draft: {
      name: state.name.trim(),
      tier: state.tier || "T1",
      baseArmorMax,
      baseThresholds: { minor, major },
      featureName: state.featureName.trim(),
      description: state.description.trim(),
      modifierContributions,
    },
  }
}
```

- [ ] **Step 5: Add shared React form components**

In the same file, export:

```ts
export function newModifierRow(label = ""): DraftModifierInput {
  return {
    id: nextDraftRowId("draft-modifier"),
    target: "evasion",
    label,
    value: "0",
  }
}
```

Create and export:

- `CustomWeaponDraftForm`
- `CustomArmorDraftForm`

Required props:

```ts
type DraftFormProps<TState> = {
  state: TState
  errors: Record<string, string>
  onChange: (state: TState) => void
}
```

Each form must:

- Render base fields.
- Render feature and description fields.
- Render modifier rows with target select, label input, integer value input, delete button.
- Render `+ 添加修正`.
- Use `aria-label` values matching visible field names, e.g. `名称`, `属性`, `伤害类型`, `修正目标`, `修正名称`, `修正数值`.
- Show field errors as small red text near fields.

Use existing plain inputs/selects and `Button`; do not introduce new dependencies.

- [ ] **Step 6: Run type check for shared form**

Run:

```bash
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 7: Commit Task 2**

```bash
git add components/modals/custom-equipment-draft-form.tsx
git commit -m "feat: add custom equipment draft form"
```

---

### Task 3: Weapon Modal Custom Draft Mode

**Files:**
- Modify: `components/modals/weapon-selection-modal.tsx`
- Modify: `components/modals/__tests__/equipment-selection-modal.test.tsx`

- [ ] **Step 1: Add failing weapon modal tests**

Add a second weapon test template in `components/modals/__tests__/equipment-selection-modal.test.tsx`:

```ts
const weaponWithModifier: RuntimeEquipmentTemplateWithSource & { kind: "weapon" } = {
  ...weapon,
  id: "builtin.weapon.tower-shield",
  name: "测试塔盾",
  weaponType: "secondary",
  burden: "offHand",
  damage: "d6",
  featureName: "壁垒",
  description: "+2 护甲值，-1 闪避值",
  modifierContributions: [
    {
      id: "armor",
      definition: { target: "armorMax", kind: "modifier" },
      editable: { label: "壁垒", value: 2 },
    },
  ],
}
```

Update `storeState.querySelectableTemplates` so weapon queries return `[weapon, weaponWithModifier]`.

Add tests:

```ts
it("fills a custom weapon draft from a clicked template instead of selecting immediately", async () => {
  const onSelect = vi.fn()
  render(
    <WeaponSelectionModal
      isOpen
      onClose={vi.fn()}
      onSelect={onSelect}
      title="选择备用武器"
      weaponSlotType="inventory"
    />,
  )

  await userEvent.click(screen.getByRole("button", { name: "+ 自定义武器" }))
  expect(screen.getByText(/自定义模式/)).toBeInTheDocument()

  await userEvent.click(screen.getByText("测试塔盾"))

  expect(onSelect).not.toHaveBeenCalled()
  expect(screen.getByDisplayValue("测试塔盾")).toBeInTheDocument()
  expect(screen.getByDisplayValue("+2 护甲值，-1 闪避值")).toBeInTheDocument()
  expect(screen.getByDisplayValue("2")).toBeInTheDocument()
})

it("saves a custom weapon draft with modifier rows", async () => {
  const onSelect = vi.fn()
  render(
    <WeaponSelectionModal
      isOpen
      onClose={vi.fn()}
      onSelect={onSelect}
      title="选择备用武器"
      weaponSlotType="inventory"
    />,
  )

  await userEvent.click(screen.getByRole("button", { name: "+ 自定义武器" }))
  await userEvent.click(screen.getByText("测试塔盾"))
  await userEvent.clear(screen.getByLabelText("名称"))
  await userEvent.type(screen.getByLabelText("名称"), "改造塔盾")
  await userEvent.click(screen.getByRole("button", { name: "保存并选择" }))

  expect(onSelect).toHaveBeenCalledWith({
    type: "custom",
    draft: expect.objectContaining({
      name: "改造塔盾",
      weaponType: "secondary",
      modifierContributions: [
        expect.objectContaining({
          definition: { target: "armorMax", kind: "modifier" },
          editable: { label: "壁垒", value: 2 },
        }),
      ],
    }),
  })
})
```

- [ ] **Step 2: Run modal tests and verify they fail**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: fail because custom weapon UI is not present.

- [ ] **Step 3: Integrate custom mode state in weapon modal**

In `components/modals/weapon-selection-modal.tsx`, import shared helpers:

```ts
import {
  CustomWeaponDraftForm,
  emptyWeaponDraftState,
  validateWeaponDraftState,
  weaponDraftFromTemplate,
  type CustomWeaponDraftState,
} from "./custom-equipment-draft-form"
```

Add state:

```ts
const defaultCustomWeaponType = weaponSlotType === "secondary" ? "secondary" : "primary"
const [customMode, setCustomMode] = useState(false)
const [customDraft, setCustomDraft] = useState<CustomWeaponDraftState>(() => emptyWeaponDraftState(defaultCustomWeaponType))
const [customErrors, setCustomErrors] = useState<Record<string, string>>({})
const [customDirty, setCustomDirty] = useState(false)
```

When modal closes, reset these states:

```ts
setCustomMode(false)
setCustomDraft(emptyWeaponDraftState(defaultCustomWeaponType))
setCustomErrors({})
setCustomDirty(false)
```

- [ ] **Step 4: Add custom mode handlers**

Add:

```ts
const openCustomMode = () => {
  setCustomMode(true)
  setCustomDraft(emptyWeaponDraftState(defaultCustomWeaponType))
  setCustomErrors({})
  setCustomDirty(false)
}

const exitCustomMode = () => {
  if (customDirty && !window.confirm("退出会丢弃当前自定义草稿。")) return
  setCustomMode(false)
  setCustomDraft(emptyWeaponDraftState(defaultCustomWeaponType))
  setCustomErrors({})
  setCustomDirty(false)
}

const applyTemplateToCustomDraft = (template: RuntimeEquipmentTemplateWithSource & { kind: "weapon" }) => {
  if (customDirty && !window.confirm("套用此模板会替换当前自定义草稿，是否继续？")) return
  setCustomDraft(weaponDraftFromTemplate(template))
  setCustomErrors({})
  setCustomDirty(false)
}

const saveCustomDraft = () => {
  const result = validateWeaponDraftState(customDraft)
  if (!result.ok) {
    setCustomErrors(result.errors)
    return
  }
  onSelect({ type: "custom", draft: result.draft })
}
```

- [ ] **Step 5: Add custom mode UI**

In the title row, add `+ 自定义武器` button near `清除选择` when not in custom mode.

Render the custom draft panel above the filter area when `customMode` is true:

```tsx
{customMode && (
  <div className="border-b border-blue-200 bg-blue-50 p-3 sm:p-4">
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-semibold text-blue-950">自定义模式</div>
        <p className="text-xs text-blue-800">点击下方装备会填入草稿，不会立即写入角色表。</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={saveCustomDraft}>保存并选择</Button>
        <Button variant="outline" onClick={exitCustomMode}>退出自定义</Button>
      </div>
    </div>
    <CustomWeaponDraftForm
      state={customDraft}
      errors={customErrors}
      onChange={(nextState) => {
        setCustomDraft(nextState)
        setCustomDirty(true)
      }}
    />
  </div>
)}
```

Render a list behavior hint between filters and table when `customMode` is true.

- [ ] **Step 6: Change row click behavior**

In weapon row click and keyboard handlers:

```ts
if (customMode) {
  applyTemplateToCustomDraft(weapon)
} else {
  onSelect({ type: "template", template: weapon })
}
```

Update row `aria-label` or title in custom mode to include `点击套用到草稿`.

- [ ] **Step 7: Run weapon modal tests**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: pass.

- [ ] **Step 8: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 9: Commit Task 3**

```bash
git add components/modals/weapon-selection-modal.tsx components/modals/__tests__/equipment-selection-modal.test.tsx
git commit -m "feat: add custom weapon draft mode"
```

---

### Task 4: Armor Modal Custom Draft Mode

**Files:**
- Modify: `components/modals/armor-selection-modal.tsx`
- Modify: `components/modals/__tests__/equipment-selection-modal.test.tsx`

- [ ] **Step 1: Add failing armor modal tests**

Add this armor template in `components/modals/__tests__/equipment-selection-modal.test.tsx`:

```ts
const armorWithModifier: RuntimeEquipmentTemplateWithSource & { kind: "armor" } = {
  ...armor,
  id: "builtin.armor.sturdy",
  name: "测试重甲",
  baseArmorMax: 4,
  baseThresholds: { minor: 7, major: 14 },
  featureName: "稳固",
  description: "闪避值+1。",
  modifierContributions: [
    {
      id: "evasion",
      definition: { target: "evasion", kind: "modifier" },
      editable: { label: "稳固", value: 1 },
    },
  ],
}
```

Update armor queries to return `[armor, armorWithModifier]`.

Add tests:

```ts
it("fills a custom armor draft from a clicked template instead of selecting immediately", async () => {
  const onSelect = vi.fn()
  render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={onSelect} title="选择护甲" />)

  await userEvent.click(screen.getByRole("button", { name: "+ 自定义护甲" }))
  expect(screen.getByText(/自定义模式/)).toBeInTheDocument()

  await userEvent.click(screen.getByText("测试重甲"))

  expect(onSelect).not.toHaveBeenCalled()
  expect(screen.getByDisplayValue("测试重甲")).toBeInTheDocument()
  expect(screen.getByDisplayValue("4")).toBeInTheDocument()
  expect(screen.getByDisplayValue("7")).toBeInTheDocument()
  expect(screen.getByDisplayValue("14")).toBeInTheDocument()
})

it("saves a custom armor draft with modifier rows", async () => {
  const onSelect = vi.fn()
  render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={onSelect} title="选择护甲" />)

  await userEvent.click(screen.getByRole("button", { name: "+ 自定义护甲" }))
  await userEvent.click(screen.getByText("测试重甲"))
  await userEvent.clear(screen.getByLabelText("名称"))
  await userEvent.type(screen.getByLabelText("名称"), "改造重甲")
  await userEvent.click(screen.getByRole("button", { name: "保存并选择" }))

  expect(onSelect).toHaveBeenCalledWith({
    type: "custom",
    draft: expect.objectContaining({
      name: "改造重甲",
      baseArmorMax: 4,
      baseThresholds: { minor: 7, major: 14 },
      modifierContributions: [
        expect.objectContaining({
          definition: { target: "evasion", kind: "modifier" },
          editable: { label: "稳固", value: 1 },
        }),
      ],
    }),
  })
})
```

- [ ] **Step 2: Run modal tests and verify armor tests fail**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: fail because custom armor UI is not present.

- [ ] **Step 3: Integrate custom mode state in armor modal**

In `components/modals/armor-selection-modal.tsx`, import:

```ts
import {
  CustomArmorDraftForm,
  armorDraftFromTemplate,
  emptyArmorDraftState,
  validateArmorDraftState,
  type CustomArmorDraftState,
} from "./custom-equipment-draft-form"
```

Add state:

```ts
const [customMode, setCustomMode] = useState(false)
const [customDraft, setCustomDraft] = useState<CustomArmorDraftState>(() => emptyArmorDraftState())
const [customErrors, setCustomErrors] = useState<Record<string, string>>({})
const [customDirty, setCustomDirty] = useState(false)
```

Reset these when modal closes.

- [ ] **Step 4: Add armor handlers**

Add:

```ts
const openCustomMode = () => {
  setCustomMode(true)
  setCustomDraft(emptyArmorDraftState())
  setCustomErrors({})
  setCustomDirty(false)
}

const exitCustomMode = () => {
  if (customDirty && !window.confirm("退出会丢弃当前自定义草稿。")) return
  setCustomMode(false)
  setCustomDraft(emptyArmorDraftState())
  setCustomErrors({})
  setCustomDirty(false)
}

const applyTemplateToCustomDraft = (template: RuntimeEquipmentTemplateWithSource & { kind: "armor" }) => {
  if (customDirty && !window.confirm("套用此模板会替换当前自定义草稿，是否继续？")) return
  setCustomDraft(armorDraftFromTemplate(template))
  setCustomErrors({})
  setCustomDirty(false)
}

const saveCustomDraft = () => {
  const result = validateArmorDraftState(customDraft)
  if (!result.ok) {
    setCustomErrors(result.errors)
    return
  }
  onSelect({ type: "custom", draft: result.draft })
}
```

- [ ] **Step 5: Add armor custom mode UI**

Mirror the weapon modal UI:

- Title row includes `+ 自定义护甲` when not custom mode.
- Custom panel renders `CustomArmorDraftForm`.
- Custom mode hint appears above list.
- `保存并选择` emits custom draft after validation.

- [ ] **Step 6: Change armor row click behavior**

In armor row click and keyboard handlers:

```ts
if (customMode) {
  applyTemplateToCustomDraft(armor)
} else {
  onSelect({ type: "template", template: armor })
}
```

- [ ] **Step 7: Run modal tests**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: pass.

- [ ] **Step 8: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 9: Commit Task 4**

```bash
git add components/modals/armor-selection-modal.tsx components/modals/__tests__/equipment-selection-modal.test.tsx
git commit -m "feat: add custom armor draft mode"
```

---

### Task 5: Final Verification and Polish

**Files:**
- Modify only if verification reveals small bugs.
- Review: `docs/superpowers/specs/2026-06-06-custom-equipment-one-off-draft-design.md`

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test:run -- tests/unit/equipment/template-to-slot.test.ts tests/unit/modifiers/store-actions.test.ts components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: all tests pass.

- [ ] **Step 2: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 3: Run final diff review**

Run:

```bash
git diff --stat HEAD
git status --short
```

Expected: either clean after task commits, or only intentional final polish changes.

- [ ] **Step 4: Check spec coverage manually**

Confirm the implementation satisfies:

- Weapon and armor both have custom entry points.
- Custom mode changes row click to fill draft.
- UI has explicit custom mode warning text.
- Template click replaces the draft and prompts if dirty.
- Exit prompts if dirty.
- Save emits `{ type: "custom", draft }`.
- Data layer converts custom drafts into normal slots.
- Modifier rows support target, label, value, delete, and multiple rows.
- No persistent custom templates were added.

- [ ] **Step 5: Commit any final polish**

If Step 1-4 required edits:

```bash
git add <changed-files>
git commit -m "fix: polish custom equipment drafts"
```

If no edits were needed, do not create an empty commit.
