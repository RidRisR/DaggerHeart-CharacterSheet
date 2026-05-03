"use client"

import { useState } from "react"
import { tryParseNumberExpression } from "@/lib/number-utils"
import { getReferenceSummary } from "@/lib/modifiers/registry"
import { readTargetValue } from "@/lib/modifiers/target-accessors"
import type { ModifierEntryKind, ModifierTargetId, UserModifierEntry } from "@/lib/modifiers/types"
import type { SheetData } from "@/lib/sheet-data"
import { useSheetStore } from "@/lib/sheet-store"

interface ModifierPopoverProps {
  sheetData: SheetData
  target: ModifierTargetId
  label: string
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}

function createUserEntryId(target: ModifierTargetId, kind: ModifierEntryKind): string {
  return `user:${target}:${kind}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`
}

export function ModifierPopover({ sheetData, target, label }: ModifierPopoverProps) {
  const summary = getReferenceSummary(sheetData, target)
  const setActiveModifierBase = useSheetStore(state => state.setActiveModifierBase)
  const setModifierEntryDisabled = useSheetStore(state => state.setModifierEntryDisabled)
  const upsertUserModifierEntry = useSheetStore(state => state.upsertUserModifierEntry)
  const removeUserModifierEntry = useSheetStore(state => state.removeUserModifierEntry)
  const [baseName, setBaseName] = useState("")
  const [baseValue, setBaseValue] = useState("")
  const [baseError, setBaseError] = useState("")
  const [modifierName, setModifierName] = useState("")
  const [modifierValue, setModifierValue] = useState("")
  const [modifierError, setModifierError] = useState("")
  const disabledIds = new Set(summary.disabledEntries.map(entry => entry.id))
  const finalValue = readTargetValue(sheetData, target)

  const addUserEntry = (kind: ModifierEntryKind) => {
    const name = kind === "base" ? baseName : modifierName
    const rawValue = kind === "base" ? baseValue : modifierValue
    const setError = kind === "base" ? setBaseError : setModifierError
    const parsedValue = tryParseNumberExpression(rawValue)

    if (parsedValue === undefined) {
      setError("请输入数字")
      return
    }

    const id = createUserEntryId(target, kind)
    const entry: UserModifierEntry = {
      id,
      sourceId: id,
      target,
      kind,
      label: name.trim() || (kind === "base" ? "手动基础值" : "手动加值"),
      value: parsedValue,
      sourceType: "user",
      priority: 10,
    }

    upsertUserModifierEntry(entry)
    if (kind === "base" && !summary.activeBase) {
      setActiveModifierBase(target, id)
    }

    setError("")
    if (kind === "base") {
      setBaseName("")
      setBaseValue("")
    } else {
      setModifierName("")
      setModifierValue("")
    }
  }

  return (
    <div
      role="dialog"
      aria-label={`${label}来源`}
      className="w-80 rounded border border-gray-300 bg-white p-3 text-xs shadow-lg"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="font-semibold text-gray-900">{label}来源</div>
        <div className="text-[11px] text-gray-500">当前：{String(finalValue ?? "未知")}</div>
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[11px] font-medium text-gray-500">基础值</div>
        {summary.bases.length > 0 ? (
          <div className="space-y-1">
            {summary.bases.map(entry => (
              <div key={entry.id} className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1">
                <label className="flex min-w-0 flex-1 items-center gap-1.5">
                  <input
                    type="radio"
                    name={`${target}-active-base`}
                    checked={summary.activeBase?.id === entry.id}
                    aria-label={`${entry.label} ${entry.value}`}
                    onChange={() => setActiveModifierBase(target, entry.id)}
                  />
                  <span className="truncate">{entry.label}</span>
                </label>
                <span className="font-semibold">{entry.value}</span>
                {entry.sourceType === "user" && (
                  <button
                    type="button"
                    aria-label={`删除${entry.label}`}
                    className="text-[11px] text-gray-400 hover:text-red-600"
                    onClick={() => removeUserModifierEntry(target, entry.id)}
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">未知基础值</div>
        )}
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[11px] font-medium text-gray-500">加值</div>
        {summary.modifiers.length > 0 ? (
          <div className="space-y-1">
            {summary.modifiers.map(entry => {
              const checked = !disabledIds.has(entry.id)
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-1 ${checked ? "" : "text-gray-400"}`}
                >
                  <label className="flex min-w-0 flex-1 items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      aria-label={`${entry.label} ${formatSigned(entry.value)}`}
                      onChange={() => setModifierEntryDisabled(target, entry.id, checked)}
                    />
                    <span className="truncate">{entry.label}</span>
                  </label>
                  <span className="font-semibold">{formatSigned(entry.value)}</span>
                  {entry.sourceType === "user" && (
                    <button
                      type="button"
                      aria-label={`删除${entry.label}`}
                      className="text-[11px] text-gray-400 hover:text-red-600"
                      onClick={() => removeUserModifierEntry(target, entry.id)}
                    >
                      删除
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded bg-gray-50 px-2 py-1 text-gray-500">无加值</div>
        )}
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

      <div className="mt-3 space-y-2 border-t border-gray-200 pt-2">
        <div className="grid grid-cols-[1fr_4rem_auto] items-end gap-1">
          <label className="grid gap-0.5">
            <span className="text-[11px] text-gray-500">基值名称</span>
            <input
              type="text"
              value={baseName}
              onChange={event => setBaseName(event.target.value)}
              className="h-7 rounded border border-gray-300 px-1 text-xs"
            />
          </label>
          <label className="grid gap-0.5">
            <span className="text-[11px] text-gray-500">基值数值</span>
            <input
              type="text"
              value={baseValue}
              onChange={event => setBaseValue(event.target.value)}
              className="h-7 rounded border border-gray-300 px-1 text-xs"
            />
          </label>
          <button
            type="button"
            className="h-7 rounded border border-gray-300 px-2 text-xs hover:bg-gray-50"
            onClick={() => addUserEntry("base")}
          >
            添加基值
          </button>
        </div>
        {baseError && <div className="text-[11px] text-red-600">{baseError}</div>}

        <div className="grid grid-cols-[1fr_4rem_auto] items-end gap-1">
          <label className="grid gap-0.5">
            <span className="text-[11px] text-gray-500">加值名称</span>
            <input
              type="text"
              value={modifierName}
              onChange={event => setModifierName(event.target.value)}
              className="h-7 rounded border border-gray-300 px-1 text-xs"
            />
          </label>
          <label className="grid gap-0.5">
            <span className="text-[11px] text-gray-500">加值数值</span>
            <input
              type="text"
              value={modifierValue}
              onChange={event => setModifierValue(event.target.value)}
              className="h-7 rounded border border-gray-300 px-1 text-xs"
            />
          </label>
          <button
            type="button"
            className="h-7 rounded border border-gray-300 px-2 text-xs hover:bg-gray-50"
            onClick={() => addUserEntry("modifier")}
          >
            添加加值
          </button>
        </div>
        {modifierError && <div className="text-[11px] text-red-600">{modifierError}</div>}
      </div>
    </div>
  )
}
