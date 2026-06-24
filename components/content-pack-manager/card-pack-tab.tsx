"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Eye, Power, PowerOff, XCircle } from "lucide-react"
import type { CardRuntimeSourceListItem } from "@/card/runtime/card-pack-view-model"

export type CardPackListItem = CardRuntimeSourceListItem

interface CardPackTabProps {
  batches: CardPackListItem[]
  totalCards: number
  onViewCards(sourceId?: string): void
  onToggleBatchDisabled(sourceId: string, nextDisabled: boolean): void
  onRemoveBatch(sourceId: string): void
}

function formatImportedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function CardPackStatus({ disabled }: { disabled: boolean }) {
  return (
    <Badge variant={disabled ? "secondary" : "default"} className="shrink-0 whitespace-nowrap">
      {disabled ? "已禁用" : "已启用"}
    </Badge>
  )
}

function CategorySummary({ categories }: { categories: string[] }) {
  if (categories.length === 0) {
    return <span className="text-muted-foreground">无类别标记</span>
  }

  const title = categories.join(" / ")

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 rounded-full px-3 text-xs font-semibold"
          title={title}
        >
          {categories.length} 类别
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="text-sm font-medium">类别明细</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge key={category} variant="outline" className="rounded-full">
              {category}
            </Badge>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function CardPackActions({ batch, props }: { batch: CardPackListItem; props: CardPackTabProps }) {
  const viewLabel = batch.canViewCards ? "查看卡牌包" : "已禁用卡牌包不能查看"
  const deleteLabel = batch.canRemove ? "删除卡牌包" : "此卡牌来源不能删除"

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="icon"
        variant="outline"
        aria-label={viewLabel}
        title={viewLabel}
        disabled={!batch.canViewCards}
        onClick={() => props.onViewCards(batch.sourceId)}
        className="h-11 w-11"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        aria-label={batch.disabled ? "启用卡牌包" : "禁用卡牌包"}
        title={batch.disabled ? "启用卡牌包" : "禁用卡牌包"}
        disabled={!batch.canDisable}
        onClick={() => props.onToggleBatchDisabled(batch.sourceId, !batch.disabled)}
        className="h-11 w-11"
      >
        {batch.disabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
      </Button>
      <Button
        size="icon"
        variant="destructive"
        aria-label={deleteLabel}
        title={deleteLabel}
        disabled={!batch.canRemove}
        onClick={() => props.onRemoveBatch(batch.sourceId)}
        className="h-11 w-11"
      >
        <XCircle className="h-4 w-4" />
      </Button>
    </div>
  )
}

function CardPackContentSummary({ batch }: { batch: CardPackListItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{batch.cardCount} 卡牌</span>
      <span className="text-muted-foreground">·</span>
      <CategorySummary categories={batch.cardTypes} />
    </div>
  )
}

function CardPackMobileCard({ batch, props }: { batch: CardPackListItem; props: CardPackTabProps }) {
  return (
    <article className="rounded-lg border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words font-semibold">{batch.name}</h3>
        <CardPackStatus disabled={batch.disabled} />
      </div>
      <div className="mt-2 break-words text-xs text-muted-foreground">
        {batch.sourceLabel} · {formatImportedAt(batch.importTime)}
      </div>
      <div className="mt-3 text-sm">
        <CardPackContentSummary batch={batch} />
      </div>
      <div className="mt-4">
        <CardPackActions batch={batch} props={props} />
      </div>
    </article>
  )
}

export function CardPackTab(props: CardPackTabProps) {
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all")

  const filteredBatches = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return props.batches.filter((batch) => {
      const sourceLabel = batch.sourceLabel.toLowerCase()
      const matchesSearch =
        normalizedSearch.length === 0 ||
        batch.name.toLowerCase().includes(normalizedSearch) ||
        batch.fileName.toLowerCase().includes(normalizedSearch) ||
        sourceLabel.includes(normalizedSearch)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" && !batch.disabled) ||
        (statusFilter === "disabled" && batch.disabled)

      return matchesSearch && matchesStatus
    })
  }, [props.batches, searchText, statusFilter])

  return (
    <section className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(280px,560px)_180px_auto] lg:items-end">
        <label className="space-y-1 text-sm">
          <span className="sr-only">搜索卡牌包</span>
          <input
            className="h-10 w-full rounded-md border bg-white px-3 text-sm"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="搜索包名或来源"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="sr-only">卡牌包状态筛选</span>
          <select
            className="h-10 w-full rounded-md border bg-white px-3 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "enabled" | "disabled")}
          >
            <option value="all">全部状态</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已禁用</option>
          </select>
        </label>
        <Button
          variant="outline"
          onClick={() => props.onViewCards()}
          disabled={props.totalCards === 0}
          className="h-10 w-full md:w-auto"
        >
          <Eye className="mr-2 h-4 w-4" />
          查看所有卡牌
          <Badge variant="secondary" className="ml-2">
            {props.totalCards}
          </Badge>
        </Button>
      </div>

      {props.batches.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
          暂无已安装卡牌包。
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
          没有符合条件的卡牌包。
        </div>
      ) : (
        <>
          <div data-testid="card-pack-mobile-list" className="space-y-3 lg:hidden">
            {filteredBatches.map((batch) => (
              <CardPackMobileCard key={batch.sourceId} batch={batch} props={props} />
            ))}
          </div>

          <div data-testid="card-pack-desktop-table" className="hidden overflow-hidden rounded-lg border bg-white lg:block">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="w-[22%] p-3">包名</th>
                  <th className="w-[16%] p-3">内容摘要</th>
                  <th className="w-[8%] p-3">状态</th>
                  <th className="w-[24%] p-3">来源</th>
                  <th className="w-[14%] p-3">导入时间</th>
                  <th className="w-[16%] p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={batch.sourceId} className="border-t align-middle">
                    <td className="break-words p-3 font-medium">{batch.name}</td>
                    <td className="p-3">
                      <CardPackContentSummary batch={batch} />
                    </td>
                    <td className="p-3">
                      <CardPackStatus disabled={batch.disabled} />
                    </td>
                    <td className="break-words p-3 text-muted-foreground">{batch.sourceLabel}</td>
                    <td className="break-words p-3 text-muted-foreground">{formatImportedAt(batch.importTime)}</td>
                    <td className="p-3">
                      <CardPackActions batch={batch} props={props} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

    </section>
  )
}
