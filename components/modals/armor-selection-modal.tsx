"use client"

import { Button } from "@/components/ui/button"
import { getEquipmentUiStore } from "@/equipment/ui/equipment-ui-store"
import type { RuntimeEquipmentTemplateWithSource } from "@/equipment/ui/types"
import type { EquipmentTier } from "@/equipment/import/types"
import type { ArmorSelectionInput } from "@/lib/sheet-store"
import { X } from "lucide-react"
import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react"
import {
  armorDraftFromTemplate,
  CustomArmorDraftForm,
  emptyArmorDraftState,
  validateArmorDraftState,
  type CustomArmorDraftState,
} from "./custom-equipment-draft-form"
import {
  ActiveFilterChips,
  createActiveFilter,
  MultiSelectDropdownFilter,
  type EquipmentFilterOption,
} from "./equipment-selection-filter-controls"

const LEVELS: EquipmentTier[] = ["T1", "T2", "T3", "T4"]
const TIER_OPTIONS: Array<EquipmentFilterOption<EquipmentTier>> = LEVELS.map((level) => ({ value: level, label: level }))

interface ArmorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (input: ArmorSelectionInput) => void
  title: string
}

function uniqueSourceOptions(templates: RuntimeEquipmentTemplateWithSource[]) {
  return Array.from(
    templates
      .reduce((sources, template) => {
        if (!sources.has(template.sourceId)) sources.set(template.sourceId, template.sourceLabel)
        return sources
      }, new Map<string, string>())
      .entries(),
  ).map(([sourceId, sourceLabel]) => ({ sourceId, sourceLabel }))
}

function TableHeader({ label }: { label: string }) {
  return <th className="whitespace-nowrap p-1 text-left text-xs sm:p-2 sm:text-sm">{label}</th>
}

function FilterableTableHeader<T extends string>({
  label,
  selected,
  options,
  onChange,
}: {
  label: string
  selected: T[]
  options: Array<EquipmentFilterOption<T>>
  onChange: (selected: T[]) => void
}) {
  return (
    <th className="whitespace-nowrap p-1 text-left text-xs sm:p-2 sm:text-sm">
      <MultiSelectDropdownFilter label={label} selected={selected} options={options} onChange={onChange} />
    </th>
  )
}

const filterControlClass = "h-10 rounded border border-gray-300 bg-white px-2 text-sm text-gray-900"

export function ArmorSelectionModal({ isOpen, onClose, onSelect, title }: ArmorModalProps) {
  const equipmentStore = getEquipmentUiStore()
  const initialized = equipmentStore((state) => state.initialized)
  const initializing = equipmentStore((state) => state.initializing)
  const initializationError = equipmentStore((state) => state.initializationError)
  const ensureInitialized = equipmentStore((state) => state.ensureInitialized)
  const refreshFromStorage = equipmentStore((state) => state.refreshFromStorage)
  const querySelectableTemplates = equipmentStore((state) => state.querySelectableTemplates)

  const [searchText, setSearchText] = useState("")
  const [tierFilters, setTierFilters] = useState<EquipmentTier[]>([])
  const [sourceFilters, setSourceFilters] = useState<string[]>([])
  const [customMode, setCustomMode] = useState(false)
  const [customDraft, setCustomDraft] = useState<CustomArmorDraftState>(() => emptyArmorDraftState())
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({})
  const [customDirty, setCustomDirty] = useState(false)

  useEffect(() => {
    if (isOpen) void ensureInitialized()
  }, [ensureInitialized, isOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (customDirty && !window.confirm("退出会丢弃当前自定义草稿。")) return
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    } else {
      setSearchText("")
      setTierFilters([])
      setSourceFilters([])
      setCustomMode(false)
      setCustomDraft(emptyArmorDraftState())
      setCustomErrors({})
      setCustomDirty(false)
    }

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [customDirty, isOpen, onClose])

  const sourceArmor = useMemo(() => {
    if (!initialized || initializationError) return []

    return querySelectableTemplates({ kind: "armor" }).filter(
      (template): template is RuntimeEquipmentTemplateWithSource & { kind: "armor" } => template.kind === "armor",
    )
  }, [initialized, initializationError, querySelectableTemplates])

  const sourceOptions = useMemo<Array<EquipmentFilterOption<string>>>(
    () => uniqueSourceOptions(sourceArmor).map((source) => ({ value: source.sourceId, label: source.sourceLabel })),
    [sourceArmor],
  )

  const filteredArmor = useMemo(() => {
    if (!initialized || initializationError) return []

    return querySelectableTemplates({
      kind: "armor",
      searchText,
      tiers: tierFilters,
      sourceIds: sourceFilters,
    }).filter((template): template is RuntimeEquipmentTemplateWithSource & { kind: "armor" } => template.kind === "armor")
  }, [initialized, initializationError, querySelectableTemplates, searchText, tierFilters, sourceFilters])

  const resetFilters = () => {
    setSearchText("")
    setTierFilters([])
    setSourceFilters([])
  }

  const openCustomMode = () => {
    setCustomMode(true)
    setCustomDraft(emptyArmorDraftState())
    setCustomErrors({})
    setCustomDirty(false)
  }

  const requestClose = () => {
    if (customDirty && !window.confirm("退出会丢弃当前自定义草稿。")) return
    onClose()
  }

  const clearSelection = () => {
    if (customDirty && !window.confirm("退出会丢弃当前自定义草稿。")) return
    onSelect({ type: "none" })
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

  const selectArmor = (armor: RuntimeEquipmentTemplateWithSource & { kind: "armor" }) => {
    if (customMode) {
      applyTemplateToCustomDraft(armor)
      return
    }

    onSelect({ type: "template", template: armor })
  }

  const activeFilters = [
    createActiveFilter({
      key: "source",
      label: "来源",
      selected: sourceFilters,
      options: sourceOptions,
      clear: () => setSourceFilters([]),
    }),
    searchText
      ? {
          key: "search",
          label: `搜索：${searchText}`,
          title: `搜索：${searchText}`,
          clear: () => setSearchText(""),
        }
      : null,
    createActiveFilter({
      key: "tier",
      label: "等级",
      selected: tierFilters,
      options: TIER_OPTIONS,
      clear: () => setTierFilters([]),
    }),
  ].filter((filter): filter is { key: string; label: string; title: string; clear: () => void } => filter !== null)

  const handleRowKeyDown = (
    event: ReactKeyboardEvent<HTMLTableRowElement>,
    armor: RuntimeEquipmentTemplateWithSource & { kind: "armor" },
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    selectArmor(armor)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={requestClose}></div>
      <div className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-lg sm:max-h-[85vh]">
        <div className="flex items-center gap-3 border-b border-gray-200 p-3 sm:p-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
            {!customMode && (
              <Button
                variant="outline"
                onClick={openCustomMode}
                className="h-10 shrink-0 bg-blue-500 px-3 text-white hover:bg-blue-600 sm:px-4"
                size="sm"
              >
                + 自定义护甲
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={clearSelection}
              className="h-10 shrink-0 bg-red-500 px-3 text-white hover:bg-red-600 sm:px-4"
              size="sm"
            >
              清除选择
            </Button>
          </div>
          <button
            type="button"
            aria-label="关闭"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            onClick={requestClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {initializing && <div className="p-4 text-sm text-muted-foreground">正在加载装备...</div>}
        {initializationError && (
          <div className="m-4 flex flex-col gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
            <span className="flex-1">装备数据初始化失败，当前列表为空。{initializationError.message}</span>
            <Button size="sm" variant="outline" onClick={() => void refreshFromStorage()}>
              重试
            </Button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {customMode && (
            <div className="border-b border-blue-200 bg-blue-50 p-3 sm:p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-blue-950">自定义模式</div>
                  <p className="text-xs text-blue-800">点击下方装备只填入草稿，不立即写入角色表。</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveCustomDraft}>保存并选择</Button>
                  <Button variant="outline" onClick={exitCustomMode}>
                    退出自定义
                  </Button>
                </div>
              </div>
              <CustomArmorDraftForm
                state={customDraft}
                errors={customErrors}
                onChange={(nextState) => {
                  setCustomDraft(nextState)
                  setCustomDirty(true)
                }}
              />
            </div>
          )}

          <div className="border-b border-gray-200 p-2 sm:p-3">
            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(10rem,14rem)_minmax(14rem,1fr)_auto]">
              <MultiSelectDropdownFilter
                label="来源"
                selected={sourceFilters}
                options={sourceOptions}
                onChange={setSourceFilters}
                variant="field"
              />
              <input
                aria-label="搜索护甲"
                className={`${filterControlClass} w-full`}
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="搜索护甲..."
              />
              <Button variant="outline" className="h-10 shrink-0 whitespace-nowrap" onClick={resetFilters}>
                重置筛选
              </Button>
            </div>
            <ActiveFilterChips filters={activeFilters} />
          </div>

          {customMode && (
            <div className="border-b border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 sm:px-4">
              当前为自定义模式。选择列表中的装备会作为自定义起点；点击“保存并选择”后才会应用。
            </div>
          )}

          <div className="min-h-[16rem] flex-1 overflow-auto">
            <div className="p-1 sm:p-2">
              <table className="w-full min-w-[56rem] border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-800 text-white">
                  <tr>
                    <TableHeader label="名称" />
                    <FilterableTableHeader
                      label="等级"
                      selected={tierFilters}
                      options={TIER_OPTIONS}
                      onChange={setTierFilters}
                    />
                    <TableHeader label="伤害阈值" />
                    <TableHeader label="护甲值" />
                    <TableHeader label="特性" />
                    <TableHeader label="描述" />
                  </tr>
                </thead>
                <tbody>
                  {filteredArmor.map((armor) => (
                    <tr
                      key={armor.id}
                      aria-label={customMode ? `选择护甲 ${armor.name}，点击套用到草稿` : `选择护甲 ${armor.name}`}
                      className="cursor-pointer border-b border-gray-200 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      role="button"
                      tabIndex={0}
                      onClick={() => selectArmor(armor)}
                      onKeyDown={(event) => handleRowKeyDown(event, armor)}
                    >
                      <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{armor.name}</td>
                      <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{armor.tier}</td>
                      <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">
                        {armor.baseThresholds.minor}/{armor.baseThresholds.major}
                      </td>
                      <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{armor.baseArmorMax}</td>
                      <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm">{armor.featureName}</td>
                      <td className="whitespace-nowrap p-1 text-xs sm:p-2 sm:text-sm" title={armor.description}>
                        {armor.description}
                      </td>
                    </tr>
                  ))}
                  {!initializing && filteredArmor.length === 0 && (
                    <tr>
                      <td className="p-4 text-center text-sm text-gray-500" colSpan={6}>
                        未找到符合条件的护甲
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
