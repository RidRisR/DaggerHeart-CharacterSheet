"use client"

import { useEffect, useState } from "react"
import { tryParseNumberExpression } from "@/lib/number-utils"
import { entryKind, entryLabel, entryValue } from "@/lib/modifiers/entry-utils"
import {
  getUnattributedDeltaId,
  isTargetOwnedSpecialContribution,
} from "@/lib/modifiers/special-contributions"
import { getReferenceSummary } from "@/lib/modifiers/registry"
import { readTargetValue } from "@/lib/modifiers/target-accessors"
import { isTargetAutoCalculationEnabled } from "@/lib/modifiers/target-sync"
import type {
  ModifierEntry,
  ModifierEntryKind,
  ModifierTargetId,
  UserModifierContribution,
} from "@/lib/modifiers/types"
import type { SheetData } from "@/lib/sheet-data"
import { useSheetStore } from "@/lib/sheet-store"

interface ModifierPopoverProps {
  sheetData: SheetData
  target: ModifierTargetId
  label: string
  onClose?: () => void
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}

function createUserEntryId(target: ModifierTargetId): string {
  return `user:${target}:${Date.now()}`
}

interface EditableValueInputProps {
  entry: ModifierEntry
  onCommit: (id: string, value: number) => void
  signed?: boolean
}

function EditableValueInput({ entry, onCommit, signed = false }: EditableValueInputProps) {
  const currentValue = entryValue(entry)
  const currentLabel = entryLabel(entry)
  const displayValue = signed ? formatSigned(currentValue) : String(currentValue)
  const [value, setValue] = useState(displayValue)

  useEffect(() => {
    setValue(displayValue)
  }, [displayValue])

  const commit = () => {
    const parsedValue = tryParseNumberExpression(value)
    if (parsedValue === undefined || parsedValue === currentValue) {
      setValue(displayValue)
      return
    }
    onCommit(entry.id, parsedValue)
  }

  return (
    <span className="flex w-12 shrink-0 items-center justify-end">
      <input
        type="text"
        aria-label={`编辑${currentLabel}数值`}
        value={value}
        className="h-6 w-full rounded border border-transparent bg-transparent px-1 text-right text-xs font-semibold hover:border-gray-300 focus:border-gray-300 focus:bg-white"
        onChange={event => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === "Enter") {
            commit()
            event.currentTarget.blur()
          }
        }}
      />
    </span>
  )
}

function ReadonlyValueBox({ value }: { value: string | number }) {
  return (
    <span className="flex h-6 w-12 shrink-0 items-center justify-end rounded border border-transparent bg-transparent px-1 text-right text-xs font-semibold">
      {value}
    </span>
  )
}

function ReadonlyLabelBox({ label }: { label: string }) {
  return (
    <span className="flex h-7 min-w-0 flex-1 items-center rounded border border-transparent bg-transparent px-1 text-xs">
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded bg-white px-1 py-0.5 text-[10px] text-gray-500">
      {label}
    </span>
  )
}

function SourceBadgeWithDelete({
  label,
  deleteLabel,
  onDelete,
}: {
  label: string
  deleteLabel?: string
  onDelete?: () => void
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <SourceBadge label={label} />
      {deleteLabel && onDelete && (
        <button
          type="button"
          aria-label={deleteLabel}
          className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/80 text-[9px] leading-none text-white opacity-0 shadow-sm transition-opacity hover:bg-red-600 group-hover:opacity-100 focus:opacity-100"
          onClick={onDelete}
        >
          ×
        </button>
      )}
    </span>
  )
}

function AddSourceButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] leading-none text-gray-600 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900"
      onClick={onClick}
    >
      +
    </button>
  )
}

function sourceBadgeLabel(entry: ModifierEntry, isSpecialEntry: boolean): string {
  if (isSpecialEntry) return "同步"

  switch (entry.source.type) {
    case "profession":
      return "职业"
    case "equipment":
      if (entry.source.id.startsWith("weapon:")) return "武器"
      if (entry.source.id.startsWith("armor:")) return "护甲"
      return "装备"
    case "armor":
      return "护甲"
    case "level":
      return "等级"
    case "upgrade":
      return "升级"
    case "user":
      return "用户"
    default:
      return "系统"
  }
}

function displayEntryLabel(entry: ModifierEntry): string {
  const label = entryLabel(entry)
  if (entry.source.type !== "upgrade") return label
  return label.replace(/^升级[:：]\s*/, "")
}

interface EditableLabelInputProps {
  entry: ModifierEntry
  onCommit: (id: string, label: string) => void
}

function EditableLabelInput({ entry, onCommit }: EditableLabelInputProps) {
  const currentLabel = entryLabel(entry)
  const [label, setLabel] = useState(currentLabel)

  useEffect(() => {
    setLabel(currentLabel)
  }, [currentLabel])

  const commit = () => {
    const nextLabel = label.trim()
    if (!nextLabel || nextLabel === currentLabel) {
      setLabel(currentLabel)
      return
    }
    onCommit(entry.id, nextLabel)
  }

  return (
    <input
      type="text"
      aria-label={`编辑${currentLabel}名称`}
      value={label}
      className="h-7 min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-xs hover:border-gray-300 focus:border-gray-300 focus:bg-white"
      onChange={event => setLabel(event.target.value)}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === "Enter") {
          commit()
          event.currentTarget.blur()
        }
      }}
    />
  )
}

export function ModifierPopover({ sheetData, target, label }: ModifierPopoverProps) {
  const summary = getReferenceSummary(sheetData, target)
  const setActiveModifierBase = useSheetStore(state => state.setActiveModifierBase)
  const setTargetAutoCalculation = useSheetStore(state => state.setTargetAutoCalculation)
  const upsertUserModifierContribution = useSheetStore(state => state.upsertUserModifierContribution)
  const removeUserModifierContribution = useSheetStore(state => state.removeUserModifierContribution)
  const removeSpecialBaseContribution = useSheetStore(state => state.removeSpecialBaseContribution)
  const finalValue = readTargetValue(sheetData, target)
  const targetState = sheetData.modifierState?.targetStates?.[target]
  const autoCalculation = isTargetAutoCalculationEnabled(targetState)

  const findUserContribution = (id: string) => (
    (sheetData.userModifierContributions ?? []).find(contribution => contribution.id === id)
  )

  const isTargetOwnedSpecialEntry = (entry: ModifierEntry) => {
    const contribution = findUserContribution(entry.id)
    return contribution ? isTargetOwnedSpecialContribution(contribution) : false
  }

  const hasMaterializedUnattributedDelta = (sheetData.userModifierContributions ?? []).some(
    contribution => contribution.id === getUnattributedDeltaId(target),
  )

  const updateUserContributionValue = (id: string, value: number) => {
    const contribution = findUserContribution(id)
    if (!contribution) return

    upsertUserModifierContribution({
      ...contribution,
      editable: {
        ...contribution.editable,
        value,
      },
    })
  }

  const updateUserContributionLabel = (id: string, label: string) => {
    const contribution = findUserContribution(id)
    if (!contribution) return

    upsertUserModifierContribution({
      ...contribution,
      editable: {
        ...contribution.editable,
        label,
      },
    })
  }

  const deleteUserContribution = (entry: ModifierEntry) => {
    if (isTargetOwnedSpecialEntry(entry)) {
      if (entryKind(entry) === "base") {
        removeSpecialBaseContribution(target, entry.id)
        return
      }

      removeUserModifierContribution(entry.id)
      return
    }

    const activeBaseId = sheetData.modifierState?.targetStates?.[target]?.activeBaseId
    const isActiveBase = entryKind(entry) === "base"
      && (summary.activeBase?.id === entry.id || activeBaseId === entry.id)

    if (isActiveBase) {
      setActiveModifierBase(target, undefined)
    }
    removeUserModifierContribution(entry.id)
  }

  const addUserEntry = (kind: ModifierEntryKind) => {
    const id = createUserEntryId(target)
    const contribution: UserModifierContribution = {
      id,
      definition: { target, kind },
      editable: {
        label: kind === "base" ? "未命名基值" : "未命名修正值",
        value: 0,
      },
    }

    upsertUserModifierContribution(contribution)
    if (kind === "base" && !summary.activeBase) {
      setActiveModifierBase(target, id)
    }
  }

  return (
    <div className="max-h-[28rem] w-80 overflow-y-auto rounded border border-gray-300 bg-white p-3 text-xs shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="font-semibold text-gray-900">
          {label}来源（{autoCalculation ? "同步中" : "暂停同步"}）
        </div>
        <div className="text-[11px] text-gray-500">当前：{String(finalValue ?? "未知")}</div>
      </div>

      <div className="mb-2">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
          <span>基础值</span>
          <AddSourceButton label="+ 自定义基值" onClick={() => addUserEntry("base")} />
        </div>
        {summary.bases.length > 0 ? (
          <div className="space-y-1">
            {summary.bases.map(entry => {
              const currentLabel = displayEntryLabel(entry)
              const currentValue = entryValue(entry)
              const isUserEntry = entry.source.type === "user"
              const isSpecialEntry = isTargetOwnedSpecialEntry(entry)
              const canEditLabel = isUserEntry && !isSpecialEntry
              const canEditValue = isUserEntry
              const canDelete = isUserEntry
              const sourceHint = sourceBadgeLabel(entry, isSpecialEntry)

              return (
                <div key={entry.id} className="group relative flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <input
                      type="radio"
                      name={`${target}-active-base`}
                      checked={summary.activeBase?.id === entry.id}
                      aria-label={`${currentLabel} ${currentValue}`}
                      onChange={() => setActiveModifierBase(target, entry.id)}
                    />
                    <SourceBadgeWithDelete
                      label={sourceHint}
                      deleteLabel={canDelete ? `删除${currentLabel}` : undefined}
                      onDelete={canDelete ? () => deleteUserContribution(entry) : undefined}
                    />
                    {canEditLabel ? (
                      <EditableLabelInput entry={entry} onCommit={updateUserContributionLabel} />
                    ) : (
                      <ReadonlyLabelBox label={currentLabel} />
                    )}
                  </div>
                  {canEditValue ? (
                    <EditableValueInput entry={entry} onCommit={updateUserContributionValue} />
                  ) : (
                    <ReadonlyValueBox value={currentValue} />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">未知基础值</div>
        )}
      </div>

      <div className="mb-2">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
          <span>修正值</span>
          <AddSourceButton label="+ 自定义修正值" onClick={() => addUserEntry("modifier")} />
        </div>
        {summary.modifiers.length > 0 ? (
          <div className="space-y-1">
            {summary.modifiers.map(entry => {
              const currentLabel = displayEntryLabel(entry)
              const currentValue = entryValue(entry)
              const isUserEntry = entry.source.type === "user"
              const isSpecialEntry = isTargetOwnedSpecialEntry(entry)
              const canEditLabel = isUserEntry && !isSpecialEntry
              const canEditValue = isUserEntry
              const canDelete = isUserEntry
              const sourceHint = sourceBadgeLabel(entry, isSpecialEntry)

              return (
                <div
                  key={entry.id}
                  className={[
                    "group relative flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <SourceBadgeWithDelete
                      label={sourceHint}
                      deleteLabel={canDelete ? `删除${currentLabel}` : undefined}
                      onDelete={canDelete ? () => deleteUserContribution(entry) : undefined}
                    />
                    {canEditLabel ? (
                      <EditableLabelInput entry={entry} onCommit={updateUserContributionLabel} />
                    ) : (
                      <ReadonlyLabelBox label={currentLabel} />
                    )}
                  </div>
                  {canEditValue ? (
                    <EditableValueInput entry={entry} signed onCommit={updateUserContributionValue} />
                  ) : (
                    <ReadonlyValueBox value={formatSigned(currentValue)} />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">无修正值</div>
        )}
      </div>

      {(summary.referenceTotal !== undefined || (
        summary.unattributedDelta !== undefined
          && summary.unattributedDelta !== 0
          && !(autoCalculation && hasMaterializedUnattributedDelta)
      )) && (
        <div className="mb-2">
          <div className="mb-1 text-[11px] font-medium text-gray-500">总值</div>
          <div className="space-y-1">
            {summary.referenceTotal !== undefined && (
              <div className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                <span className="text-gray-500">当前来源合计</span>
                <ReadonlyValueBox value={summary.referenceTotal} />
              </div>
            )}
            {summary.unattributedDelta !== undefined
              && summary.unattributedDelta !== 0
              && !(autoCalculation && hasMaterializedUnattributedDelta) && (
              <div className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                <span className="text-gray-500">未归因差额</span>
                <ReadonlyValueBox value={formatSigned(summary.unattributedDelta)} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
        <button
          type="button"
          className={[
            "rounded border px-2 py-1 text-[11px] font-medium",
            autoCalculation
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
          ].join(" ")}
          onClick={() => setTargetAutoCalculation(target, !autoCalculation)}
        >
          {autoCalculation ? "关闭自动计算" : "开启自动计算"}
        </button>
      </div>

    </div>
  )
}
