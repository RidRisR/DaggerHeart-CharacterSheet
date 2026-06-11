# Equipment Selection Multi-Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade equipment runtime queries and weapon/armor selection modals from single-value filters to multi-select criterion groups.

**Architecture:** Change the runtime reader contract so filterable fields are arrays: same-field values are ORed, different fields are ANDed, and empty arrays mean unconstrained. Keep `kind` as the single-value selector boundary. Add small modal-local filter UI helpers for checkbox dropdowns and active filter chips, then wire both weapon and armor modals through the same conventions.

**Tech Stack:** TypeScript, React client components, shadcn/Radix dropdown menu primitives, Zustand UI store adapter, Vitest, Testing Library.

---

## Source Design

Primary specs:

- `docs/superpowers/specs/2026-06-04-custom-equipment-pack-runtime-cache-view-design.md`
- `docs/superpowers/specs/2026-06-06-custom-equipment-pack-ui-integration-design.md`

Glossary:

- `docs/contexts/content-pack-import/CONTEXT.md`

Confirmed decisions:

- Use `Runtime Source` for selection/query source buckets.
- Replace `sourceId`, `tier`, `trait`, `weaponType`, `damageType`, `range`, and `burden` query fields with collection fields.
- Single criterion group values are ORed; different criterion groups are ANDed.
- Empty or omitted arrays are unconstrained and equivalent to all values.
- `kind` remains single-value.
- Source options are derived from current selectable templates, not management pack list.
- Multi-select menus are immediately applied and remain open for consecutive toggles.
- Active filter state is shown in one `已筛选` line, not in table headers.
- Filter state is component-local and resets when the modal closes.

## File Map

Modify:

- `equipment/runtime-cache/types.ts`: change `EquipmentRuntimeQueryCriteria` to collection fields.
- `equipment/runtime-cache/readers.ts`: implement collection criterion matching and stable candidate union.
- `equipment/runtime-cache/__tests__/readers.test.ts`: update single-value tests and add multi-value ordering/empty-array coverage.
- `equipment/ui/__tests__/equipment-ui-store.test.ts`: update criteria assertions from singular fields to collection fields where needed.
- `components/modals/weapon-selection-modal.tsx`: replace single filter state with array filter state and use shared multi-select UI helpers.
- `components/modals/armor-selection-modal.tsx`: same as weapon, scoped to armor fields.
- `components/modals/__tests__/equipment-selection-modal.test.tsx`: update source filter test and add multi-source / multi-tier behavior checks.

Create:

- `components/modals/equipment-selection-filter-controls.tsx`: modal-specific multi-select dropdown and active filter chip helpers.

Do not modify:

- Equipment import schema.
- Equipment storage format.
- Content pack manager list layout.
- One-off custom draft data model.
- Existing `components/modals/filters/MultiSelectFilter.tsx`; it has `全选/反选` semantics used elsewhere and should not be changed for this modal-specific behavior.

---

## Task 1: Runtime Query Contract

**Files:**

- Modify: `equipment/runtime-cache/types.ts`
- Modify: `equipment/runtime-cache/readers.ts`
- Modify: `equipment/runtime-cache/__tests__/readers.test.ts`

- [ ] **Step 1: Update failing runtime reader tests for collection criteria**

In `equipment/runtime-cache/__tests__/readers.test.ts`, change the primary filter test criteria from singular fields to array fields:

```ts
const criteria = {
  searchText: "shadow",
  kind: "weapon",
  tiers: ["T2"],
  traits: ["finesse"],
  weaponTypes: ["primary"],
  damageTypes: ["physical"],
  ranges: ["melee"],
  burdens: ["oneHanded"],
  sourceIds: ["pack_shadow"],
} as const
```

Change the one-field-off table to use array fields:

```ts
for (const [field, value] of [
  ["searchText", "sun"],
  ["kind", "armor"],
  ["tiers", ["T1"]],
  ["traits", ["strength"]],
  ["weaponTypes", ["secondary"]],
  ["damageTypes", ["magic"]],
  ["ranges", ["close"]],
  ["burdens", ["offHand"]],
  ["sourceIds", ["pack_other"]],
] as const) {
  const oneFieldOffCriteria = { ...criteria, [field]: value }
  const ids = readers.runtime.querySelectableTemplates(oneFieldOffCriteria).map((template) => template.id)
  expect(ids).not.toContain("weapon:shadow-blade")
}
```

Add a multi-value source/tier test:

```ts
it("runtime reader ORs values inside one criterion group and preserves global order", () => {
  const readers = createReadersFromView(
    makeViewWithTemplates(
      [
        makeRuntimeWeapon({ id: "weapon:pack-a-t1", sourceId: "pack_a", tier: "T1" }),
        makeRuntimeWeapon({ id: "weapon:pack-b-t2", sourceId: "pack_b", tier: "T2" }),
        makeRuntimeWeapon({ id: "weapon:pack-c-t3", sourceId: "pack_c", tier: "T3" }),
      ],
      [makeRuntimeWeapon({ id: "weapon:builtin-t1", tier: "T1" })],
    ),
  )

  const result = readers.runtime.querySelectableTemplates({
    kind: "weapon",
    sourceIds: ["pack_b", "builtin", "pack_a"],
    tiers: ["T1", "T2"],
  })

  expect(result.map((template) => template.id)).toEqual([
    "weapon:builtin-t1",
    "weapon:pack-a-t1",
    "weapon:pack-b-t2",
  ])
})
```

Add empty-array semantics coverage:

```ts
it("runtime reader treats empty criterion groups as unconstrained", () => {
  const readers = createReadersFromView(
    makeViewWithTemplates(
      [makeRuntimeWeapon({ id: "weapon:pack-a", sourceId: "pack_a" })],
      [makeRuntimeWeapon({ id: "weapon:builtin" })],
    ),
  )

  const result = readers.runtime.querySelectableTemplates({
    kind: "weapon",
    sourceIds: [],
    tiers: [],
  })

  expect(result.map((template) => template.id)).toEqual(["weapon:builtin", "weapon:pack-a"])
})
```

Add armor + weapon-only criteria coverage:

```ts
it("runtime reader returns no armor when weapon-only criterion groups are constrained", () => {
  const readers = createReadersFromView(makeViewWithTemplates([makeRuntimeArmor({ id: "armor:shadow" })]))

  expect(readers.runtime.querySelectableTemplates({ kind: "armor", burdens: ["oneHanded"] })).toEqual([])
  expect(readers.runtime.querySelectableTemplates({ kind: "armor", damageTypes: ["physical"] })).toEqual([])
})
```

- [ ] **Step 2: Run runtime reader tests and verify failure**

Run:

```bash
npm run test:run -- equipment/runtime-cache/__tests__/readers.test.ts
```

Expected: TypeScript/test failure because `sourceId`, `tier`, and other singular fields still exist in the implementation contract.

- [ ] **Step 3: Change the query criteria type**

In `equipment/runtime-cache/types.ts`, replace `EquipmentRuntimeQueryCriteria` with:

```ts
export interface EquipmentRuntimeQueryCriteria {
  searchText?: string
  kind?: "weapon" | "armor"
  tiers?: EquipmentTier[]
  traits?: EquipmentTrait[]
  weaponTypes?: Array<"primary" | "secondary">
  damageTypes?: EquipmentDamageType[]
  ranges?: EquipmentRange[]
  burdens?: EquipmentBurden[]
  sourceIds?: RuntimeEquipmentSourceId[]
}
```

Do not keep singular compatibility aliases. Single selection is represented as a one-element array.

- [ ] **Step 4: Implement stable collection candidate selection**

In `equipment/runtime-cache/readers.ts`, add helpers near `chooseCandidateIds`:

```ts
function hasValues<T>(values: readonly T[] | undefined): values is readonly T[] {
  return Boolean(values && values.length > 0)
}

function idsForCriterionGroup<T>(
  selectableIds: readonly string[],
  values: readonly T[] | undefined,
  index: Map<T, string[]>,
): string[] | undefined {
  if (!hasValues(values)) return undefined

  const allowed = new Set<string>()
  for (const value of values) {
    for (const id of index.get(value) ?? []) {
      allowed.add(id)
    }
  }

  return selectableIds.filter((id) => allowed.has(id))
}
```

Replace the criteria access in `chooseCandidateIds` with collection fields:

```ts
const selectableIds = indexes.selectableTemplateIds
const candidates = [
  criteria.kind === "weapon" ? indexes.weaponTemplateIds : undefined,
  criteria.kind === "armor" ? indexes.armorTemplateIds : undefined,
  idsForCriterionGroup(selectableIds, criteria.tiers, indexes.templateIdsByTier),
  idsForCriterionGroup(selectableIds, criteria.traits, indexes.templateIdsByTrait),
  idsForCriterionGroup(selectableIds, criteria.weaponTypes, indexes.templateIdsByWeaponType),
  idsForCriterionGroup(selectableIds, criteria.damageTypes, indexes.templateIdsByDamageType),
  idsForCriterionGroup(selectableIds, criteria.ranges, indexes.templateIdsByRange),
  idsForCriterionGroup(selectableIds, criteria.burdens, indexes.templateIdsByBurden),
  idsForCriterionGroup(selectableIds, criteria.sourceIds, indexes.templateIdsBySource),
].filter((candidate): candidate is string[] => Boolean(candidate))
```

Keep the narrowest-candidate behavior:

```ts
if (candidates.length === 0) {
  return indexes.selectableTemplateIds
}

return candidates.reduce((narrowest, candidate) => (candidate.length < narrowest.length ? candidate : narrowest))
```

- [ ] **Step 5: Implement collection matching**

In `equipment/runtime-cache/readers.ts`, add:

```ts
function matchesCriterionGroup<T>(actual: T, values: readonly T[] | undefined): boolean {
  return !hasValues(values) || values.includes(actual)
}

function hasWeaponOnlyCriteria(criteria: EquipmentRuntimeQueryCriteria): boolean {
  return (
    hasValues(criteria.traits) ||
    hasValues(criteria.weaponTypes) ||
    hasValues(criteria.damageTypes) ||
    hasValues(criteria.ranges) ||
    hasValues(criteria.burdens)
  )
}
```

Update `matchesCriteria`:

```ts
if (!matchesCriterionGroup(template.tier, criteria.tiers)) {
  return false
}

const sourceId = view.relationIndexes.templateToPackId.get(template.id)
if (hasValues(criteria.sourceIds) && (!sourceId || !criteria.sourceIds.includes(sourceId))) {
  return false
}

if (criteria.searchText && !matchesSearchText(template, criteria.searchText)) {
  return false
}

if (template.kind !== "weapon") {
  return !hasWeaponOnlyCriteria(criteria)
}

return (
  matchesCriterionGroup(template.trait, criteria.traits) &&
  matchesCriterionGroup(template.weaponType, criteria.weaponTypes) &&
  matchesCriterionGroup(template.damageType, criteria.damageTypes) &&
  matchesCriterionGroup(template.range, criteria.ranges) &&
  matchesCriterionGroup(template.burden, criteria.burdens)
)
```

Keep the existing `kind` check before these checks.

- [ ] **Step 6: Update disabled source test**

In `equipment/runtime-cache/__tests__/readers.test.ts`, replace:

```ts
expect(readers.runtime.querySelectableTemplates({ sourceId: "pack_disabled" })).toEqual([])
```

with:

```ts
expect(readers.runtime.querySelectableTemplates({ sourceIds: ["pack_disabled"] })).toEqual([])
```

- [ ] **Step 7: Run runtime reader tests**

Run:

```bash
npm run test:run -- equipment/runtime-cache/__tests__/readers.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit runtime query contract**

```bash
git add equipment/runtime-cache/types.ts equipment/runtime-cache/readers.ts equipment/runtime-cache/__tests__/readers.test.ts
git commit -m "refactor: support equipment query criterion groups"
```

---

## Task 2: Update Store and Application Call Sites

**Files:**

- Modify: `equipment/ui/__tests__/equipment-ui-store.test.ts`
- Modify: `equipment/packs/__tests__/application-service.test.ts`
- Modify: any remaining files found by `rg "sourceId:|tier:|damageType:|range:|burden:|weaponType:|trait:" equipment components lib tests`

- [ ] **Step 1: Search old query criteria usage**

Run:

```bash
rg -n "querySelectableTemplates\\([^\\n]*\\{|sourceId:|tier:|trait:|weaponType:|damageType:|range:|burden:" equipment components lib tests
```

Use this search to find query criteria objects, not equipment template declarations. Template declarations still use singular canonical fields and should not be changed.

- [ ] **Step 2: Update UI store test assertions**

In `equipment/ui/__tests__/equipment-ui-store.test.ts`, update any query call that used singular criteria. Example:

```ts
const result = store.getState().querySelectableTemplates({ kind: "weapon", searchText: "长剑" })
```

remains unchanged, but any source/tier criteria become:

```ts
store.getState().querySelectableTemplates({ kind: "weapon", sourceIds: [customPack.packId], tiers: ["T1"] })
```

Expected mocked reader assertion:

```ts
expect(runtimeReader.querySelectableTemplates).toHaveBeenCalledWith({
  kind: "weapon",
  sourceIds: [customPack.packId],
  tiers: ["T1"],
})
```

- [ ] **Step 3: Update application service tests**

In `equipment/packs/__tests__/application-service.test.ts`, replace runtime reader calls:

```ts
app.runtimeReader.querySelectableTemplates({ kind: "armor", sourceId: result.summary.packId })
```

with:

```ts
app.runtimeReader.querySelectableTemplates({ kind: "armor", sourceIds: [result.summary.packId] })
```

Replace all disabled/remove assertions similarly:

```ts
expect(app.runtimeReader.querySelectableTemplates({ sourceIds: [packId] })).toEqual([])
```

- [ ] **Step 4: Run affected non-UI tests**

Run:

```bash
npm run test:run -- equipment/ui/__tests__/equipment-ui-store.test.ts equipment/packs/__tests__/application-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit call site migration**

```bash
git add equipment/ui/__tests__/equipment-ui-store.test.ts equipment/packs/__tests__/application-service.test.ts
git commit -m "test: migrate equipment queries to criterion groups"
```

---

## Task 3: Modal Filter Controls

**Files:**

- Create: `components/modals/equipment-selection-filter-controls.tsx`

- [ ] **Step 1: Create shared modal-specific filter helper file**

Create `components/modals/equipment-selection-filter-controls.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ChevronDown, X } from "lucide-react"

export interface EquipmentFilterOption<T extends string = string> {
  value: T
  label: string
}

export interface ActiveEquipmentFilter {
  key: string
  label: string
  title: string
  clear: () => void
}

export function toggleSelectedValue<T extends string>(selected: T[], value: T): T[] {
  return selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]
}

export function summarizeSelectedLabels(labels: string[]): string {
  if (labels.length <= 2) return labels.join("、")
  return `${labels.slice(0, 2).join("、")} +${labels.length - 2}`
}

export function createActiveFilter<T extends string>(input: {
  key: string
  label: string
  selected: T[]
  options: Array<EquipmentFilterOption<T>>
  clear: () => void
}): ActiveEquipmentFilter | null {
  if (input.selected.length === 0) return null

  const labelByValue = new Map(input.options.map((option) => [option.value, option.label]))
  const labels = input.selected.map((value) => labelByValue.get(value) ?? value)
  const title = `${input.label}：${labels.join("、")}`

  return {
    key: input.key,
    label: `${input.label}：${summarizeSelectedLabels(labels)}`,
    title,
    clear: input.clear,
  }
}

export function MultiSelectDropdownFilter<T extends string>({
  label,
  selected,
  options,
  onChange,
  className,
}: {
  label: string
  selected: T[]
  options: Array<EquipmentFilterOption<T>>
  onChange: (selected: T[]) => void
  className?: string
}) {
  const hasSelection = selected.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60",
            hasSelection && "bg-white/15 text-blue-100",
            className,
          )}
          aria-label={`${label}筛选`}
        >
          <span>{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuLabel>{label}筛选</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => onChange(toggleSelectedValue(selected, option.value))}
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">暂无可选来源</div>}
        <DropdownMenuSeparator />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          disabled={selected.length === 0}
          onClick={() => onChange([])}
        >
          清除此字段筛选
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ActiveFilterChips({ filters }: { filters: ActiveEquipmentFilter[] }) {
  if (filters.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500">已筛选</span>
      {filters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-gray-100 px-2 text-xs font-medium text-gray-700"
          title={filter.title}
        >
          {filter.label}
          <button
            type="button"
            aria-label={`移除${filter.label}`}
            className="rounded-full text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
            onClick={filter.clear}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck to catch import/export errors**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS or unrelated failures only. If this fails on the new file, fix the exported component/types before continuing.

- [ ] **Step 3: Commit shared controls**

```bash
git add components/modals/equipment-selection-filter-controls.tsx
git commit -m "feat: add equipment selection filter controls"
```

---

## Task 4: Weapon Modal Multi-Select Filters

**Files:**

- Modify: `components/modals/weapon-selection-modal.tsx`
- Modify: `components/modals/__tests__/equipment-selection-modal.test.tsx`

- [ ] **Step 1: Update modal tests for collection queries and multi-source behavior**

In `components/modals/__tests__/equipment-selection-modal.test.tsx`, expand fixtures:

```ts
const customWeapon: RuntimeEquipmentTemplateWithSource & { kind: "weapon" } = {
  ...weapon,
  id: "custom.weapon.test",
  name: "导入短剑",
  tier: "T2",
  sourceId: "pack_custom",
  sourceLabel: "导入装备包",
}
```

Update mock criteria type:

```ts
querySelectableTemplates: vi.fn((criteria?: {
  kind?: "weapon" | "armor"
  sourceIds?: string[]
  tiers?: string[]
  weaponTypes?: string[]
  traits?: string[]
  damageTypes?: string[]
  ranges?: string[]
  burdens?: string[]
}) => {
  const base = criteria?.kind === "armor" ? [armor, armorWithModifier] : [weapon, weaponWithModifier, customWeapon]
  return base.filter((template) => {
    if (criteria?.sourceIds?.length && !criteria.sourceIds.includes(template.sourceId)) return false
    if (criteria?.tiers?.length && !criteria.tiers.includes(template.tier)) return false
    return true
  })
}),
```

Add test:

```ts
it("filters weapons by multiple runtime sources without closing the menu", async () => {
  render(
    <WeaponSelectionModal
      isOpen
      onClose={vi.fn()}
      onSelect={vi.fn()}
      title="选择备用武器"
      weaponSlotType="inventory"
    />,
  )

  await userEvent.click(screen.getByRole("button", { name: "来源筛选" }))
  await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "内置" }))
  await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "导入装备包" }))

  expect(screen.getByText("来源：内置、导入装备包")).toBeInTheDocument()
  expect(storeState.querySelectableTemplates).toHaveBeenCalledWith(
    expect.objectContaining({ kind: "weapon", sourceIds: ["builtin", "pack_custom"] }),
  )
})
```

Add tier multi-select test:

```ts
it("filters weapons by multiple tiers", async () => {
  render(
    <WeaponSelectionModal
      isOpen
      onClose={vi.fn()}
      onSelect={vi.fn()}
      title="选择备用武器"
      weaponSlotType="inventory"
    />,
  )

  await userEvent.click(screen.getByRole("button", { name: "等级筛选" }))
  await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T1" }))
  await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T2" }))

  expect(screen.getByText("等级：T1、T2")).toBeInTheDocument()
  expect(storeState.querySelectableTemplates).toHaveBeenCalledWith(
    expect.objectContaining({ kind: "weapon", tiers: ["T1", "T2"] }),
  )
})
```

- [ ] **Step 2: Run modal tests and verify failure**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: FAIL because modal still uses single `sourceFilter` and singular query criteria.

- [ ] **Step 3: Replace singular weapon filter state**

In `components/modals/weapon-selection-modal.tsx`, import helpers:

```ts
import {
  ActiveFilterChips,
  createActiveFilter,
  MultiSelectDropdownFilter,
  type EquipmentFilterOption,
} from "./equipment-selection-filter-controls"
```

Replace state:

```ts
const [tierFilters, setTierFilters] = useState<EquipmentTier[]>([])
const [traitFilters, setTraitFilters] = useState<EquipmentTrait[]>([])
const [damageTypeFilters, setDamageTypeFilters] = useState<EquipmentDamageType[]>([])
const [rangeFilters, setRangeFilters] = useState<EquipmentRange[]>([])
const [burdenFilters, setBurdenFilters] = useState<EquipmentBurden[]>([])
const [sourceFilters, setSourceFilters] = useState<string[]>([])
const [weaponTypeFilters, setWeaponTypeFilters] = useState<Array<"primary" | "secondary">>([])
```

Remove old `sourceFilter`, `tierFilter`, `traitFilter`, `damageTypeFilter`, `rangeFilter`, `burdenFilter`, and `weaponTypeFilter`.

- [ ] **Step 4: Update reset and close cleanup**

Update the modal close reset block and `resetFilters`:

```ts
setTierFilters([])
setTraitFilters([])
setDamageTypeFilters([])
setRangeFilters([])
setBurdenFilters([])
setSourceFilters([])
setWeaponTypeFilters([])
```

- [ ] **Step 5: Update source options**

Keep source derivation from `sourceWeapons`, but type it as filter options:

```ts
const sourceOptions = useMemo<Array<EquipmentFilterOption<string>>>(
  () => uniqueSourceOptions(sourceWeapons).map((source) => ({ value: source.sourceId, label: source.sourceLabel })),
  [sourceWeapons],
)
```

- [ ] **Step 6: Update weapon runtime query**

Change the filtered query:

```ts
return querySelectableTemplates({
  kind: "weapon",
  searchText,
  tiers: tierFilters,
  traits: traitFilters,
  damageTypes: damageTypeFilters,
  ranges: rangeFilters,
  burdens: burdenFilters,
  weaponTypes: weaponSlotType === "inventory" ? weaponTypeFilters : [weaponSlotType],
  sourceIds: sourceFilters,
}).filter((template): template is RuntimeEquipmentTemplateWithSource & { kind: "weapon" } => template.kind === "weapon")
```

For `sourceWeapons`, update inventory/non-inventory weapon type criteria:

```ts
return querySelectableTemplates({
  kind: "weapon",
  weaponTypes: weaponSlotType === "inventory" ? undefined : [weaponSlotType],
})
```

- [ ] **Step 7: Replace active filter construction**

Create options arrays near existing constants:

```ts
const TIER_OPTIONS = LEVELS.map((level) => ({ value: level, label: level }))
const WEAPON_TYPE_OPTIONS: Array<{ value: "primary" | "secondary"; label: string }> = [
  { value: "primary", label: "主武器" },
  { value: "secondary", label: "副武器" },
]
```

Build active filters:

```ts
const activeFilters = [
  createActiveFilter({ key: "source", label: "来源", selected: sourceFilters, options: sourceOptions, clear: () => setSourceFilters([]) }),
  searchText ? { key: "search", label: `搜索：${searchText}`, title: `搜索：${searchText}`, clear: () => setSearchText("") } : null,
  createActiveFilter({ key: "tier", label: "等级", selected: tierFilters, options: TIER_OPTIONS, clear: () => setTierFilters([]) }),
  createActiveFilter({ key: "weaponType", label: "类型", selected: weaponTypeFilters, options: WEAPON_TYPE_OPTIONS, clear: () => setWeaponTypeFilters([]) }),
  createActiveFilter({ key: "damageType", label: "伤害类型", selected: damageTypeFilters, options: DAMAGE_TYPE_OPTIONS, clear: () => setDamageTypeFilters([]) }),
  createActiveFilter({ key: "burden", label: "负荷", selected: burdenFilters, options: BURDEN_OPTIONS, clear: () => setBurdenFilters([]) }),
  createActiveFilter({ key: "range", label: "范围", selected: rangeFilters, options: RANGE_OPTIONS, clear: () => setRangeFilters([]) }),
  createActiveFilter({ key: "trait", label: "属性", selected: traitFilters, options: TRAIT_OPTIONS, clear: () => setTraitFilters([]) }),
].filter((filter): filter is { key: string; label: string; title: string; clear: () => void } => filter !== null)
```

- [ ] **Step 8: Replace source select and active chip rendering**

Remove the `<select aria-label="来源筛选">...</select>` block.

Use a top-row source dropdown:

```tsx
<MultiSelectDropdownFilter label="来源" selected={sourceFilters} options={sourceOptions} onChange={setSourceFilters} />
```

Replace the active chip markup with:

```tsx
<ActiveFilterChips filters={activeFilters} />
```

- [ ] **Step 9: Replace table header filters**

Replace `FilterableTableHeader` usage with `MultiSelectDropdownFilter` inside header cells:

```tsx
<th className="whitespace-nowrap p-1 text-left text-xs sm:p-2 sm:text-sm">
  <MultiSelectDropdownFilter label="等级" selected={tierFilters} options={TIER_OPTIONS} onChange={setTierFilters} />
</th>
```

Use the same pattern for `weaponTypeFilters`, `damageTypeFilters`, `burdenFilters`, `rangeFilters`, and `traitFilters`.

Keep plain `TableHeader` for non-filtered columns.

- [ ] **Step 10: Run weapon modal tests**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: PASS.

- [ ] **Step 11: Commit weapon modal multi-select**

```bash
git add components/modals/weapon-selection-modal.tsx components/modals/__tests__/equipment-selection-modal.test.tsx
git commit -m "feat: add weapon selection multi-filters"
```

---

## Task 5: Armor Modal Multi-Select Filters

**Files:**

- Modify: `components/modals/armor-selection-modal.tsx`
- Modify: `components/modals/__tests__/equipment-selection-modal.test.tsx`

- [ ] **Step 1: Add armor multi-source test**

In `components/modals/__tests__/equipment-selection-modal.test.tsx`, add:

```ts
const customArmor: RuntimeEquipmentTemplateWithSource & { kind: "armor" } = {
  ...armor,
  id: "custom.armor.test",
  name: "导入皮甲",
  tier: "T2",
  sourceId: "pack_custom",
  sourceLabel: "导入装备包",
}
```

Include `customArmor` in the mocked armor result.

Add test:

```ts
it("filters armor by multiple runtime sources and tiers", async () => {
  render(<ArmorSelectionModal isOpen onClose={vi.fn()} onSelect={vi.fn()} title="选择护甲" />)

  await userEvent.click(screen.getByRole("button", { name: "来源筛选" }))
  await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "内置" }))
  await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "导入装备包" }))

  await userEvent.click(screen.getByRole("button", { name: "等级筛选" }))
  await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T1" }))
  await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "T2" }))

  expect(screen.getByText("来源：内置、导入装备包")).toBeInTheDocument()
  expect(screen.getByText("等级：T1、T2")).toBeInTheDocument()
  expect(storeState.querySelectableTemplates).toHaveBeenCalledWith(
    expect.objectContaining({ kind: "armor", sourceIds: ["builtin", "pack_custom"], tiers: ["T1", "T2"] }),
  )
})
```

- [ ] **Step 2: Run modal tests and verify armor failure**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: FAIL until armor modal uses collection filters.

- [ ] **Step 3: Replace singular armor filter state**

In `components/modals/armor-selection-modal.tsx`, import the shared helpers:

```ts
import {
  ActiveFilterChips,
  createActiveFilter,
  MultiSelectDropdownFilter,
  type EquipmentFilterOption,
} from "./equipment-selection-filter-controls"
```

Replace state:

```ts
const [tierFilters, setTierFilters] = useState<EquipmentTier[]>([])
const [sourceFilters, setSourceFilters] = useState<string[]>([])
```

Remove `tierFilter` and `sourceFilter`.

- [ ] **Step 4: Update armor reset and query**

Reset:

```ts
setTierFilters([])
setSourceFilters([])
```

Query:

```ts
return querySelectableTemplates({
  kind: "armor",
  searchText,
  tiers: tierFilters,
  sourceIds: sourceFilters,
}).filter((template): template is RuntimeEquipmentTemplateWithSource & { kind: "armor" } => template.kind === "armor")
```

- [ ] **Step 5: Update armor source options and active filters**

Use:

```ts
const TIER_OPTIONS = LEVELS.map((level) => ({ value: level, label: level }))

const sourceOptions = useMemo<Array<EquipmentFilterOption<string>>>(
  () => uniqueSourceOptions(sourceArmor).map((source) => ({ value: source.sourceId, label: source.sourceLabel })),
  [sourceArmor],
)

const activeFilters = [
  createActiveFilter({ key: "source", label: "来源", selected: sourceFilters, options: sourceOptions, clear: () => setSourceFilters([]) }),
  searchText ? { key: "search", label: `搜索：${searchText}`, title: `搜索：${searchText}`, clear: () => setSearchText("") } : null,
  createActiveFilter({ key: "tier", label: "等级", selected: tierFilters, options: TIER_OPTIONS, clear: () => setTierFilters([]) }),
].filter((filter): filter is { key: string; label: string; title: string; clear: () => void } => filter !== null)
```

- [ ] **Step 6: Replace armor source select and header filter**

Use in the toolbar:

```tsx
<MultiSelectDropdownFilter label="来源" selected={sourceFilters} options={sourceOptions} onChange={setSourceFilters} />
```

Replace active filter markup:

```tsx
<ActiveFilterChips filters={activeFilters} />
```

Replace the tier `FilterableTableHeader` with a header cell containing:

```tsx
<MultiSelectDropdownFilter label="等级" selected={tierFilters} options={TIER_OPTIONS} onChange={setTierFilters} />
```

- [ ] **Step 7: Run modal tests**

Run:

```bash
npm run test:run -- components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit armor modal multi-select**

```bash
git add components/modals/armor-selection-modal.tsx components/modals/__tests__/equipment-selection-modal.test.tsx
git commit -m "feat: add armor selection multi-filters"
```

---

## Task 6: Final Verification and Documentation Sync

**Files:**

- Review: `docs/superpowers/specs/2026-06-04-custom-equipment-pack-runtime-cache-view-design.md`
- Review: `docs/superpowers/specs/2026-06-06-custom-equipment-pack-ui-integration-design.md`
- Review: `docs/contexts/content-pack-import/CONTEXT.md`

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test:run -- equipment/runtime-cache/__tests__/readers.test.ts equipment/ui/__tests__/equipment-ui-store.test.ts equipment/packs/__tests__/application-service.test.ts components/modals/__tests__/equipment-selection-modal.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Search for obsolete query criteria**

Run:

```bash
rg -n "sourceId:|tier:|trait:|weaponType:|damageType:|range:|burden:" equipment/runtime-cache equipment/ui equipment/packs components/modals lib tests
```

Expected: Remaining matches are canonical template fields, draft fields, or non-query data. No remaining `querySelectableTemplates({ ... sourceId: ... })` style calls.

- [ ] **Step 4: Verify docs match implementation**

Check these statements still match the final code:

- Runtime query criteria only exposes `tiers`, `traits`, `weaponTypes`, `damageTypes`, `ranges`, `burdens`, and `sourceIds`.
- Empty arrays are unconstrained.
- Source is a runtime source, not import origin.
- Weapon and armor modals show selected values in a unified `已筛选` line.
- Modal filter state does not persist outside the open modal.

If implementation deviates, update the relevant spec line immediately.

- [ ] **Step 5: Commit final sync if docs changed**

If Step 4 changed docs:

```bash
git add docs/contexts/content-pack-import/CONTEXT.md docs/superpowers/specs/2026-06-04-custom-equipment-pack-runtime-cache-view-design.md docs/superpowers/specs/2026-06-06-custom-equipment-pack-ui-integration-design.md
git commit -m "docs: sync equipment multi-filter design"
```

If no docs changed, skip this commit.

- [ ] **Step 6: Report final status**

Report:

- Commits created.
- Tests run and passed.
- Any skipped verification.
- Any follow-up design questions.

---

## Self-Review

- Spec coverage: Covers collection query contract, OR/AND semantics, empty-array unconstrained behavior, runtime source, stable ordering, source option derivation, active filter chips, immediate apply, modal-local lifecycle, and custom mode reuse.
- Placeholder scan: No unresolved placeholder markers or unspecified test placeholders.
- Type consistency: Plan uses `tiers`, `traits`, `weaponTypes`, `damageTypes`, `ranges`, `burdens`, and `sourceIds` consistently; `kind` remains singular.
