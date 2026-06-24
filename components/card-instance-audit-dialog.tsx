"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye } from "lucide-react"
import type { CardInstanceAuditItem } from "@/automation/actions/card-instance-audit"
import type { StandardCard } from "@/card/card-types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CardContent } from "@/components/ui/card-content"

type CardInstanceAuditDialogProps = {
  open: boolean
  items: CardInstanceAuditItem[]
  onConfirm: (items: CardInstanceAuditItem[]) => void
  onOpenChange: (open: boolean) => void
}

function auditItemLabel(item: CardInstanceAuditItem): string {
  return item.cardName
}

function auditReasonMessages(item: CardInstanceAuditItem): string[] {
  const messages: Array<string | undefined> = item.reasons.map(reason => {
    switch (reason) {
      case "CARD_CONTENT_DRIFT":
        return "文本内容不同。"
      case "AUTOMATION_REVISION_DRIFT":
        return item.willClearAutomationSettings
          ? "自动化脚本不同。更新会清空这张卡已填写的自动化设置。"
          : "自动化脚本不同。"
      case "MISSING_INSTANCE_AUTOMATION":
        return "这张卡还没有自动化脚本，可以和卡包同步。"
      case "MISSING_INSTANCE_ID":
        return "这张卡来自旧版存档，可以和卡包同步。"
      default:
        return undefined
    }
  })

  return messages.filter((message): message is string => Boolean(message))
}

export function CardInstanceAuditDialog({
  open,
  items,
  onConfirm,
  onOpenChange,
}: CardInstanceAuditDialogProps) {
  const updatableIds = useMemo(
    () => new Set(items.filter(item => item.updatable).map(item => item.id)),
    [items],
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(updatableIds)
  const [previewCard, setPreviewCard] = useState<StandardCard | null>(null)

  useEffect(() => {
    setSelectedIds(updatableIds)
  }, [updatableIds])

  const selectedItems = items.filter(item => item.updatable && selectedIds.has(item.id))
  const allUpdatableSelected =
    updatableIds.size > 0 &&
    Array.from(updatableIds).every(id => selectedIds.has(id))
  const description =
    items.length === 0
      ? "当前没有发现需要用卡包数据更新的卡牌。"
      : `发现 ${items.length} 张卡牌和当前卡包中的同名卡牌不同。你可以用卡包数据更新选中的卡牌。`

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-200 px-5 pb-3 pt-5">
            <DialogTitle>更新卡牌</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {items.length === 0 ? (
            <div className="mx-5 my-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              当前没有发现需要更新的卡牌。
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-5 py-2.5 text-sm">
                <label className="flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={allUpdatableSelected}
                    onChange={(event) => {
                      setSelectedIds(event.currentTarget.checked ? updatableIds : new Set())
                    }}
                  />
                  全选
                </label>
                <span className="text-xs text-gray-500">已选 {selectedItems.length} 张</span>
              </div>

              <div className="max-h-80 overflow-auto">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-gray-100 px-5 py-3 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      aria-label={`选择更新：${item.cardName}`}
                      disabled={!item.updatable}
                      checked={item.updatable && selectedIds.has(item.id)}
                      onChange={(event) => {
                        const next = new Set(selectedIds)
                        if (event.currentTarget.checked) {
                          next.add(item.id)
                        } else {
                          next.delete(item.id)
                        }
                        setSelectedIds(next)
                      }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-900">
                        {auditItemLabel(item)}
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs leading-5 text-gray-600">
                        {auditReasonMessages(item).map(message => (
                          <div key={message}>{message}</div>
                        ))}
                      </div>
                    </div>
                    {item.sourceCard && (
                      <button
                        type="button"
                        aria-label={`查看卡牌：${item.cardName}`}
                        onClick={() => setPreviewCard(item.sourceCard ?? null)}
                        className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <DialogFooter className="border-t border-gray-200 px-5 py-3 sm:justify-between">
            <span className="text-xs text-gray-500">未选中的卡牌会保持原样。</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                暂不更新
              </button>
              <button
                type="button"
                disabled={selectedItems.length === 0}
                onClick={() => onConfirm(selectedItems)}
                className="rounded bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                更新选中卡牌
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewCard)} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setPreviewCard(null)
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewCard ? `查看卡牌：${previewCard.name}` : "查看卡牌"}</DialogTitle>
            <DialogDescription>当前角色卡组里的这张卡牌。</DialogDescription>
          </DialogHeader>
          {previewCard && (
            <div className="max-h-[60vh] min-h-60 overflow-auto rounded border border-gray-200 bg-white p-4">
              <CardContent card={previewCard} />
            </div>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setPreviewCard(null)}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              关闭预览
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
