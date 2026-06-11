"use client"

import { Button } from "@/components/ui/button"
import type {
  EquipmentBurden,
  EquipmentDamageType,
  EquipmentRange,
  EquipmentTier,
  EquipmentTrait,
} from "@/equipment/import/types"
import type { CustomArmorDraft, CustomWeaponDraft } from "@/automation/equipment/template-to-slot"
import {
  EQUIPMENT_MODIFIER_TARGETS,
  EQUIPMENT_TARGET_LABELS,
  isEquipmentModifierTargetId,
} from "@/automation/equipment/contribution-utils"
import type { EquipmentModifierTargetId } from "@/automation/equipment/types"
import type { RuntimeEquipmentTemplateWithSource } from "@/equipment/ui/types"

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

export const TIER_OPTIONS: EquipmentTier[] = ["T1", "T2", "T3", "T4"]

export const TRAIT_OPTIONS: Array<{ value: EquipmentTrait; label: string }> = [
  { value: "agility", label: "敏捷" },
  { value: "finesse", label: "灵巧" },
  { value: "knowledge", label: "知识" },
  { value: "strength", label: "力量" },
  { value: "instinct", label: "本能" },
  { value: "presence", label: "风度" },
]

export const DAMAGE_TYPE_OPTIONS: Array<{ value: EquipmentDamageType; label: string }> = [
  { value: "physical", label: "物理" },
  { value: "magic", label: "魔法" },
]

export const RANGE_OPTIONS: Array<{ value: EquipmentRange; label: string }> = [
  { value: "melee", label: "近战" },
  { value: "veryClose", label: "邻近" },
  { value: "close", label: "近距离" },
  { value: "far", label: "远距离" },
  { value: "veryFar", label: "极远" },
]

export const BURDEN_OPTIONS: Array<{ value: EquipmentBurden; label: string }> = [
  { value: "oneHanded", label: "单手" },
  { value: "twoHanded", label: "双手" },
  { value: "offHand", label: "副手" },
]

const WEAPON_TYPE_OPTIONS: Array<{ value: "primary" | "secondary"; label: string }> = [
  { value: "primary", label: "主武器" },
  { value: "secondary", label: "副武器" },
]

function optionValueSet<T extends string>(options: ReadonlyArray<{ value: T }>) {
  return new Set(options.map((option) => option.value))
}

const TIER_OPTION_VALUES = new Set(TIER_OPTIONS)
const WEAPON_TYPE_OPTION_VALUES = optionValueSet(WEAPON_TYPE_OPTIONS)
const TRAIT_OPTION_VALUES = optionValueSet(TRAIT_OPTIONS)
const DAMAGE_TYPE_OPTION_VALUES = optionValueSet(DAMAGE_TYPE_OPTIONS)
const RANGE_OPTION_VALUES = optionValueSet(RANGE_OPTIONS)
const BURDEN_OPTION_VALUES = optionValueSet(BURDEN_OPTIONS)

function isOptionValue<T extends string>(value: string, options: ReadonlySet<T>): value is T {
  return options.has(value as T)
}

let draftRowCounter = 0

function nextDraftRowId(prefix: string) {
  draftRowCounter += 1
  return `${prefix}:${Date.now()}:${draftRowCounter}`
}

export function newModifierRow(label = ""): DraftModifierInput {
  return { id: nextDraftRowId("draft-modifier"), target: "evasion", label, value: "0" }
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

function modifierRowsFromTemplate(
  template: Pick<CustomWeaponDraft | CustomArmorDraft, "modifierContributions">,
): DraftModifierInput[] {
  return template.modifierContributions.map((contribution) => ({
    id: nextDraftRowId("draft-modifier"),
    target: contribution.definition.target,
    label: contribution.editable.label,
    value: String(contribution.editable.value),
  }))
}

export function weaponDraftFromTemplate(
  template: RuntimeEquipmentTemplateWithSource & { kind: "weapon" },
): CustomWeaponDraftState {
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
    modifierRows: modifierRowsFromTemplate(template),
  }
}

export function armorDraftFromTemplate(
  template: RuntimeEquipmentTemplateWithSource & { kind: "armor" },
): CustomArmorDraftState {
  return {
    name: template.name,
    tier: template.tier,
    baseArmorMax: String(template.baseArmorMax),
    minorThreshold: String(template.baseThresholds.minor),
    majorThreshold: String(template.baseThresholds.major),
    featureName: template.featureName ?? "",
    description: template.description ?? "",
    modifierRows: modifierRowsFromTemplate(template),
  }
}

export type DraftValidationResult<T> =
  | { ok: true; draft: T }
  | { ok: false; errors: Record<string, string> }

const INTEGER_PATTERN = /^[+-]?\d+$/

function parseInteger(value: string) {
  const trimmed = value.trim()
  return INTEGER_PATTERN.test(trimmed) ? Number.parseInt(trimmed, 10) : null
}

function buildModifierContributions(
  rows: DraftModifierInput[],
  fallbackLabel: string,
  errors: Record<string, string>,
) {
  return rows.map((row) => {
    const value = parseInteger(row.value)

    if (!isEquipmentModifierTargetId(row.target)) {
      errors[`${row.id}.target`] = "请选择修正目标"
    }

    if (value === null) {
      errors[`${row.id}.value`] = "修正数值必须是整数"
    }

    return {
      id: row.id,
      definition: {
        target: isEquipmentModifierTargetId(row.target) ? row.target : "evasion",
        kind: "modifier" as const,
      },
      editable: {
        label: row.label.trim() || fallbackLabel,
        value: value ?? 0,
      },
    }
  })
}

function modifierFallbackLabel(featureName: string, name: string) {
  return featureName.trim() || name.trim() || "自定义装备"
}

export function validateWeaponDraftState(
  state: CustomWeaponDraftState,
): DraftValidationResult<CustomWeaponDraft> {
  const errors: Record<string, string> = {}
  const name = state.name.trim()
  const featureName = state.featureName.trim()
  const description = state.description.trim()
  const damage = state.damage.trim()
  const tierCandidate = state.tier || "T1"
  const tier = isOptionValue(tierCandidate, TIER_OPTION_VALUES) ? tierCandidate : null
  const weaponType = isOptionValue(state.weaponType, WEAPON_TYPE_OPTION_VALUES) ? state.weaponType : null
  const trait = isOptionValue(state.trait, TRAIT_OPTION_VALUES) ? state.trait : null
  const damageType = isOptionValue(state.damageType, DAMAGE_TYPE_OPTION_VALUES) ? state.damageType : null
  const burden = isOptionValue(state.burden, BURDEN_OPTION_VALUES) ? state.burden : null
  const range = isOptionValue(state.range, RANGE_OPTION_VALUES) ? state.range : null

  if (!name) errors.name = "请输入名称"
  if (!tier) errors.tier = "请选择有效等级"
  if (!weaponType) errors.weaponType = "请选择有效类型"
  if (!trait) errors.trait = "请选择属性"
  if (!damageType) errors.damageType = "请选择伤害类型"
  if (!burden) errors.burden = "请选择负荷"
  if (!range) errors.range = "请选择范围"
  if (!damage) errors.damage = "请输入伤害"

  const modifierContributions = buildModifierContributions(
    state.modifierRows,
    modifierFallbackLabel(featureName, name),
    errors,
  )

  if (Object.keys(errors).length > 0 || !tier || !weaponType || !trait || !damageType || !burden || !range) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    draft: {
      name,
      tier,
      weaponType,
      trait,
      damageType,
      burden,
      range,
      damage,
      featureName,
      description,
      modifierContributions,
    },
  }
}

export function validateArmorDraftState(state: CustomArmorDraftState): DraftValidationResult<CustomArmorDraft> {
  const errors: Record<string, string> = {}
  const name = state.name.trim()
  const featureName = state.featureName.trim()
  const description = state.description.trim()
  const baseArmorMax = parseInteger(state.baseArmorMax)
  const minorThreshold = parseInteger(state.minorThreshold)
  const majorThreshold = parseInteger(state.majorThreshold)
  const tierCandidate = state.tier || "T1"
  const tier = isOptionValue(tierCandidate, TIER_OPTION_VALUES) ? tierCandidate : null
  const validatedBaseArmorMax = baseArmorMax !== null && baseArmorMax >= 0 ? baseArmorMax : null
  const validatedMinorThreshold = minorThreshold !== null && minorThreshold >= 0 ? minorThreshold : null
  const validatedMajorThreshold = majorThreshold !== null && majorThreshold >= 0 ? majorThreshold : null

  if (!name) errors.name = "请输入名称"
  if (!tier) errors.tier = "请选择有效等级"
  if (validatedBaseArmorMax === null) errors.baseArmorMax = "护甲值必须是非负整数"
  if (validatedMinorThreshold === null) errors.minorThreshold = "轻微阈值必须是非负整数"
  if (validatedMajorThreshold === null) errors.majorThreshold = "严重阈值必须是非负整数"
  if (
    validatedMinorThreshold !== null &&
    validatedMajorThreshold !== null &&
    validatedMajorThreshold <= validatedMinorThreshold
  ) {
    errors.majorThreshold = "严重阈值必须大于轻微阈值"
  }

  const modifierContributions = buildModifierContributions(
    state.modifierRows,
    modifierFallbackLabel(featureName, name),
    errors,
  )

  if (
    Object.keys(errors).length > 0 ||
    !tier ||
    validatedBaseArmorMax === null ||
    validatedMinorThreshold === null ||
    validatedMajorThreshold === null
  ) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    draft: {
      name,
      tier,
      baseArmorMax: validatedBaseArmorMax,
      baseThresholds: {
        minor: validatedMinorThreshold,
        major: validatedMajorThreshold,
      },
      featureName,
      description,
      modifierContributions,
    },
  }
}

const fieldClass = "h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm"
const textareaClass = "min-h-20 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm"
const errorClass = "mt-1 text-xs text-red-600"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className={errorClass}>{message}</p>
}

function FieldShell({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block space-y-1 text-sm font-medium text-gray-700">
      <span>{label}</span>
      {children}
      <FieldError message={error} />
    </label>
  )
}

function ModifierRows({
  rows,
  errors,
  onChange,
}: {
  rows: DraftModifierInput[]
  errors: Record<string, string>
  onChange: (rows: DraftModifierInput[]) => void
}) {
  const updateRow = (rowId: string, patch: Partial<DraftModifierInput>) => {
    onChange(rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-800">修正</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, newModifierRow()])}>
          + 添加修正
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded border border-dashed border-gray-300 px-3 py-3 text-center text-xs text-gray-500">
          暂无修正
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded border border-gray-200 bg-gray-50 p-2">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_auto]">
                <select
                  aria-label="修正目标"
                  className={fieldClass}
                  value={row.target}
                  onChange={(event) =>
                    updateRow(row.id, { target: event.target.value as EquipmentModifierTargetId | "" })
                  }
                >
                  {EQUIPMENT_MODIFIER_TARGETS.map((target) => (
                    <option key={target} value={target}>
                      {EQUIPMENT_TARGET_LABELS[target]}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="修正名称"
                  className={fieldClass}
                  type="text"
                  value={row.label}
                  onChange={(event) => updateRow(row.id, { label: event.target.value })}
                />
                <input
                  aria-label="修正数值"
                  className={`${fieldClass} text-right font-semibold`}
                  type="text"
                  value={row.value}
                  onChange={(event) => updateRow(row.id, { value: event.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 border-red-200 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label={`删除修正 ${row.label || EQUIPMENT_TARGET_LABELS[row.target || "evasion"]}`}
                  onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                >
                  删除
                </Button>
              </div>
              <div className="grid gap-x-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_auto]">
                <FieldError message={errors[`${row.id}.target`]} />
                <span />
                <FieldError message={errors[`${row.id}.value`]} />
                <span />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CustomWeaponDraftForm(props: {
  state: CustomWeaponDraftState
  errors: Record<string, string>
  onChange: (state: CustomWeaponDraftState) => void
}) {
  const { state, errors, onChange } = props
  const setField = <K extends keyof CustomWeaponDraftState>(field: K, value: CustomWeaponDraftState[K]) => {
    onChange({ ...state, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldShell label="名称" error={errors.name}>
          <input
            aria-label="名称"
            className={fieldClass}
            type="text"
            value={state.name}
            onChange={(event) => setField("name", event.target.value)}
          />
        </FieldShell>
        <FieldShell label="类型" error={errors.weaponType}>
          <select
            aria-label="类型"
            className={fieldClass}
            value={state.weaponType}
            onChange={(event) => setField("weaponType", event.target.value as "primary" | "secondary")}
          >
            {WEAPON_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="等级" error={errors.tier}>
          <select
            aria-label="等级"
            className={fieldClass}
            value={state.tier}
            onChange={(event) => setField("tier", event.target.value as EquipmentTier | "")}
          >
            <option value="">默认 T1</option>
            {TIER_OPTIONS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="属性" error={errors.trait}>
          <select
            aria-label="属性"
            className={fieldClass}
            value={state.trait}
            onChange={(event) => setField("trait", event.target.value as EquipmentTrait | "")}
          >
            <option value="">请选择</option>
            {TRAIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="伤害类型" error={errors.damageType}>
          <select
            aria-label="伤害类型"
            className={fieldClass}
            value={state.damageType}
            onChange={(event) => setField("damageType", event.target.value as EquipmentDamageType | "")}
          >
            <option value="">请选择</option>
            {DAMAGE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="负荷" error={errors.burden}>
          <select
            aria-label="负荷"
            className={fieldClass}
            value={state.burden}
            onChange={(event) => setField("burden", event.target.value as EquipmentBurden | "")}
          >
            <option value="">请选择</option>
            {BURDEN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="范围" error={errors.range}>
          <select
            aria-label="范围"
            className={fieldClass}
            value={state.range}
            onChange={(event) => setField("range", event.target.value as EquipmentRange | "")}
          >
            <option value="">请选择</option>
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="伤害" error={errors.damage}>
          <input
            aria-label="伤害"
            className={fieldClass}
            type="text"
            value={state.damage}
            onChange={(event) => setField("damage", event.target.value)}
          />
        </FieldShell>
      </div>

      <FieldShell label="特性" error={errors.featureName}>
        <input
          aria-label="特性"
          className={fieldClass}
          type="text"
          value={state.featureName}
          onChange={(event) => setField("featureName", event.target.value)}
        />
      </FieldShell>

      <FieldShell label="描述" error={errors.description}>
        <textarea
          aria-label="描述"
          className={textareaClass}
          value={state.description}
          onChange={(event) => setField("description", event.target.value)}
        />
      </FieldShell>

      <ModifierRows
        rows={state.modifierRows}
        errors={errors}
        onChange={(modifierRows) => setField("modifierRows", modifierRows)}
      />
    </div>
  )
}

export function CustomArmorDraftForm(props: {
  state: CustomArmorDraftState
  errors: Record<string, string>
  onChange: (state: CustomArmorDraftState) => void
}) {
  const { state, errors, onChange } = props
  const setField = <K extends keyof CustomArmorDraftState>(field: K, value: CustomArmorDraftState[K]) => {
    onChange({ ...state, [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldShell label="名称" error={errors.name}>
          <input
            aria-label="名称"
            className={fieldClass}
            type="text"
            value={state.name}
            onChange={(event) => setField("name", event.target.value)}
          />
        </FieldShell>
        <FieldShell label="等级" error={errors.tier}>
          <select
            aria-label="等级"
            className={fieldClass}
            value={state.tier}
            onChange={(event) => setField("tier", event.target.value as EquipmentTier | "")}
          >
            <option value="">默认 T1</option>
            {TIER_OPTIONS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="护甲值" error={errors.baseArmorMax}>
          <input
            aria-label="护甲值"
            className={fieldClass}
            type="text"
            value={state.baseArmorMax}
            onChange={(event) => setField("baseArmorMax", event.target.value)}
          />
        </FieldShell>
        <FieldShell label="轻微阈值" error={errors.minorThreshold}>
          <input
            aria-label="轻微阈值"
            className={fieldClass}
            type="text"
            value={state.minorThreshold}
            onChange={(event) => setField("minorThreshold", event.target.value)}
          />
        </FieldShell>
        <FieldShell label="严重阈值" error={errors.majorThreshold}>
          <input
            aria-label="严重阈值"
            className={fieldClass}
            type="text"
            value={state.majorThreshold}
            onChange={(event) => setField("majorThreshold", event.target.value)}
          />
        </FieldShell>
      </div>

      <FieldShell label="特性" error={errors.featureName}>
        <input
          aria-label="特性"
          className={fieldClass}
          type="text"
          value={state.featureName}
          onChange={(event) => setField("featureName", event.target.value)}
        />
      </FieldShell>

      <FieldShell label="描述" error={errors.description}>
        <textarea
          aria-label="描述"
          className={textareaClass}
          value={state.description}
          onChange={(event) => setField("description", event.target.value)}
        />
      </FieldShell>

      <ModifierRows
        rows={state.modifierRows}
        errors={errors}
        onChange={(modifierRows) => setField("modifierRows", modifierRows)}
      />
    </div>
  )
}
