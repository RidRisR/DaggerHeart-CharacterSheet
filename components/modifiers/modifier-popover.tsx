"use client"

import { useEffect, useState } from "react"
import { tryParseNumberExpression } from "@/lib/number-utils"
import { entryKind, entryLabel, entryValue } from "@/lib/modifiers/entry-utils"
import { getReferenceSummary } from "@/lib/modifiers/registry"
import { readTargetValue } from "@/lib/modifiers/target-accessors"
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
  const [value, setValue] = useState(String(currentValue))

  useEffect(() => {
    setValue(String(currentValue))
  }, [currentValue])

  const commit = () => {
    const parsedValue = tryParseNumberExpression(value)
    if (parsedValue === undefined || parsedValue === currentValue) {
      setValue(String(currentValue))
      return
    }
    onCommit(entry.id, parsedValue)
  }

  return (
    <span className="flex items-center gap-0.5">
      {signed && currentValue >= 0 && <span className="font-semibold">+</span>}
      <input
        type="number"
        aria-label={`编辑${currentLabel}数值`}
        value={value}
        className="h-7 w-16 rounded border border-gray-300 px-1 text-right text-xs font-semibold"
        onChange={event => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === "Enter") {
            commit()
            event.currentTarget.blur()
          }
        }}
      />
      {signed && <span aria-hidden="true" className="sr-only">{formatSigned(currentValue)}</span>}
    </span>
  )
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

interface AddEntryFormProps {
  kind: ModifierEntryKind
  name: string
  value: string
  error: string
  onNameChange: (value: string) => void
  onValueChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

function AddEntryForm({
  kind,
  name,
  value,
  error,
  onNameChange,
  onValueChange,
  onConfirm,
  onCancel,
}: AddEntryFormProps) {
  const noun = kind === "base" ? "基值" : "加值"

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-2">
      <div className="grid grid-cols-[1fr_4.5rem] gap-2">
        <label className="grid gap-0.5">
          <span className="text-[11px] text-gray-500">{noun}名称</span>
          <input
            type="text"
            value={name}
            onChange={event => onNameChange(event.target.value)}
            className="h-7 rounded border border-gray-300 px-1 text-xs"
          />
        </label>
        <label className="grid gap-0.5">
          <span className="text-[11px] text-gray-500">{noun}数值</span>
          <input
            type="text"
            value={value}
            onChange={event => onValueChange(event.target.value)}
            className="h-7 rounded border border-gray-300 px-1 text-xs"
          />
        </label>
      </div>
      {error && <div className="mt-1 text-[11px] text-red-600">{error}</div>}
      <div className="mt-2 flex justify-end gap-1">
        <button
          type="button"
          className="h-7 rounded border border-gray-300 px-2 text-xs hover:bg-white"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="h-7 rounded border border-gray-300 bg-white px-2 text-xs hover:bg-gray-100"
          onClick={onConfirm}
        >
          确认添加{noun}
        </button>
      </div>
    </div>
  )
}

export function ModifierPopover({ sheetData, target, label }: ModifierPopoverProps) {
  const summary = getReferenceSummary(sheetData, target)
  const setActiveModifierBase = useSheetStore(state => state.setActiveModifierBase)
  const setModifierEntryEnabled = useSheetStore(state => state.setModifierEntryEnabled)
  const setTargetSyncMode = useSheetStore(state => state.setTargetSyncMode)
  const syncModifierTargetOnce = useSheetStore(state => state.syncModifierTargetOnce)
  const upsertUserModifierContribution = useSheetStore(state => state.upsertUserModifierContribution)
  const removeUserModifierContribution = useSheetStore(state => state.removeUserModifierContribution)
  const [addingBase, setAddingBase] = useState(false)
  const [baseName, setBaseName] = useState("")
  const [baseValue, setBaseValue] = useState("")
  const [baseError, setBaseError] = useState("")
  const [addingModifier, setAddingModifier] = useState(false)
  const [modifierName, setModifierName] = useState("")
  const [modifierValue, setModifierValue] = useState("")
  const [modifierError, setModifierError] = useState("")
  const finalValue = readTargetValue(sheetData, target)
  const targetState = sheetData.modifierState?.targetStates?.[target]
  const continuousSync = targetState?.syncMode === "continuous"

  const findUserContribution = (id: string) => (
    (sheetData.userModifierContributions ?? []).find(contribution => contribution.id === id)
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
    const activeBaseId = sheetData.modifierState?.targetStates?.[target]?.activeBaseId
    const isActiveBase = entryKind(entry) === "base"
      && (summary.activeBase?.id === entry.id || activeBaseId === entry.id)

    if (isActiveBase) {
      setActiveModifierBase(target, undefined)
    }
    removeUserModifierContribution(entry.id)
  }

  const addUserEntry = (kind: ModifierEntryKind) => {
    const name = kind === "base" ? baseName : modifierName
    const rawValue = kind === "base" ? baseValue : modifierValue
    const setError = kind === "base" ? setBaseError : setModifierError
    const parsedValue = tryParseNumberExpression(rawValue)

    if (parsedValue === undefined) {
      setError("请输入数字")
      return
    }

    const id = createUserEntryId(target)
    const contribution: UserModifierContribution = {
      id,
      definition: { target, kind },
      editable: {
        label: name.trim() || (kind === "base" ? "手动基础值" : "手动加值"),
        value: parsedValue,
      },
    }

    upsertUserModifierContribution(contribution)
    if (kind === "base" && !summary.activeBase) {
      setActiveModifierBase(target, id)
    }

    setError("")
    if (kind === "base") {
      setBaseName("")
      setBaseValue("")
      setAddingBase(false)
    } else {
      setModifierName("")
      setModifierValue("")
      setAddingModifier(false)
    }
  }

  const cancelAddBase = () => {
    setBaseName("")
    setBaseValue("")
    setBaseError("")
    setAddingBase(false)
  }

  const cancelAddModifier = () => {
    setModifierName("")
    setModifierValue("")
    setModifierError("")
    setAddingModifier(false)
  }

  return (
    <div className="max-h-[28rem] w-80 overflow-y-auto rounded border border-gray-300 bg-white p-3 text-xs shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="font-semibold text-gray-900">{label}来源</div>
        <div className="text-[11px] text-gray-500">当前：{String(finalValue ?? "未知")}</div>
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[11px] font-medium text-gray-500">基础值</div>
        {summary.bases.length > 0 ? (
          <div className="space-y-1">
            {summary.bases.map(entry => {
              const currentLabel = entryLabel(entry)
              const currentValue = entryValue(entry)
              const isUserEntry = entry.source.type === "user"

              return (
                <div key={entry.id} className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <input
                      type="radio"
                      name={`${target}-active-base`}
                      checked={summary.activeBase?.id === entry.id}
                      aria-label={`${currentLabel} ${currentValue}`}
                      onChange={() => setActiveModifierBase(target, entry.id)}
                    />
                    {isUserEntry ? (
                      <EditableLabelInput entry={entry} onCommit={updateUserContributionLabel} />
                    ) : (
                      <span className="truncate">{currentLabel}</span>
                    )}
                  </div>
                  {isUserEntry ? (
                    <EditableValueInput entry={entry} onCommit={updateUserContributionValue} />
                  ) : (
                    <span className="font-semibold">{currentValue}</span>
                  )}
                  {isUserEntry && (
                    <button
                      type="button"
                      aria-label={`删除${currentLabel}`}
                      className="text-[11px] text-gray-400 hover:text-red-600"
                      onClick={() => deleteUserContribution(entry)}
                    >
                      删除
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">未知基础值</div>
        )}
        <div className="mt-1">
          {addingBase ? (
            <AddEntryForm
              kind="base"
              name={baseName}
              value={baseValue}
              error={baseError}
              onNameChange={setBaseName}
              onValueChange={setBaseValue}
              onConfirm={() => addUserEntry("base")}
              onCancel={cancelAddBase}
            />
          ) : (
            <button
              type="button"
              className="rounded px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setAddingBase(true)}
            >
              + 自定义基值
            </button>
          )}
        </div>
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[11px] font-medium text-gray-500">加值</div>
        {summary.modifiers.length > 0 ? (
          <div className="space-y-1">
            {summary.modifiers.map(entry => {
              const currentLabel = entryLabel(entry)
              const currentValue = entryValue(entry)
              const isUserEntry = entry.source.type === "user"
              const checked = sheetData.modifierState?.entryStates?.[entry.id]?.enabled !== false
              const kind = entryKind(entry)
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1 ${checked ? "" : "text-gray-400 line-through"}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      aria-label={`${currentLabel} ${formatSigned(currentValue)}`}
                      onChange={event => setModifierEntryEnabled(entry.id, event.target.checked)}
                    />
                    {isUserEntry ? (
                      <EditableLabelInput entry={entry} onCommit={updateUserContributionLabel} />
                    ) : (
                      <span className="truncate">{currentLabel}</span>
                    )}
                  </div>
                  {isUserEntry ? (
                    <EditableValueInput entry={entry} signed onCommit={updateUserContributionValue} />
                  ) : (
                    <span className="font-semibold">{formatSigned(currentValue)}</span>
                  )}
                  {isUserEntry && (
                    <button
                      type="button"
                      aria-label={`删除${currentLabel}`}
                      className="text-[11px] text-gray-400 hover:text-red-600"
                      onClick={() => deleteUserContribution(entry)}
                    >
                      删除{kind === "base" ? "基值" : ""}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">无加值</div>
        )}
        <div className="mt-1">
          {addingModifier ? (
            <AddEntryForm
              kind="modifier"
              name={modifierName}
              value={modifierValue}
              error={modifierError}
              onNameChange={setModifierName}
              onValueChange={setModifierValue}
              onConfirm={() => addUserEntry("modifier")}
              onCancel={cancelAddModifier}
            />
          ) : (
            <button
              type="button"
              className="rounded px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setAddingModifier(true)}
            >
              + 自定义加值
            </button>
          )}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
        <button
          type="button"
          className="h-7 rounded border border-emerald-700 bg-emerald-600 px-3 text-[11px] text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-80"
          disabled={summary.referenceTotal === undefined}
          onClick={() => syncModifierTargetOnce(target)}
        >
          同步
        </button>
        <label className="flex items-center gap-1 text-[11px] text-gray-600">
          <input
            type="checkbox"
            checked={continuousSync}
            aria-label="持续同步"
            onChange={event => setTargetSyncMode(target, event.target.checked ? "continuous" : "manual")}
          />
          持续同步
        </label>
      </div>

      {summary.referenceTotal !== undefined && (
        <div className="flex justify-between border-t border-gray-200 pt-2">
          <span className="text-gray-500">参考合计</span>
          <span className="font-semibold">{summary.referenceTotal}</span>
        </div>
      )}

      {summary.unattributedDelta !== undefined && summary.unattributedDelta !== 0 && (
        <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-800">
          未归因差额 {formatSigned(summary.unattributedDelta)}
        </div>
      )}

    </div>
  )
}
