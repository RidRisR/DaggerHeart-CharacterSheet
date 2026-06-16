"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { EquipmentPackListItem, EquipmentUiDiagnosticView } from "@/equipment/ui/types"
import { Eye, Power, PowerOff, Trash2 } from "lucide-react"

interface EquipmentPackTabProps {
  packs: EquipmentPackListItem[]
  initializationError: EquipmentUiDiagnosticView | null
  onRetryInitialize(): void
  onView(packId: string): void
  onToggleDisabled(packId: string, disabled: boolean): void
  onRemove(packId: string): void
}

function formatImportedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatSourceLabel(pack: EquipmentPackListItem) {
  const sourceLabel = pack.sourceLabel?.trim()
  if (!sourceLabel) return "本地导入"
  if (sourceLabel.startsWith("导入文件：") || sourceLabel === "系统内置") return sourceLabel
  if (/\.(json|zip|dhcb)$/i.test(sourceLabel)) return `导入文件：${sourceLabel}`
  return sourceLabel
}

function EquipmentPackStatus({ disabled }: { disabled: boolean }) {
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
      <PopoverContent align="start" className="w-56">
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

function EquipmentPackActions({ pack, props }: { pack: EquipmentPackListItem; props: EquipmentPackTabProps }) {
  const toggleLabel = pack.isSystemPack
    ? "系统内置装备包不能禁用"
    : pack.disabled
      ? "启用装备包"
      : "禁用装备包"
  const removeLabel = pack.isSystemPack ? "系统内置装备包不能删除" : "删除装备包"

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="icon"
        variant="outline"
        aria-label="查看装备包"
        title="查看装备包"
        onClick={() => props.onView(pack.packId)}
        className="h-11 w-11"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        aria-label={toggleLabel}
        title={toggleLabel}
        disabled={pack.isSystemPack}
        onClick={() => props.onToggleDisabled(pack.packId, !pack.disabled)}
        className="h-11 w-11"
      >
        {pack.disabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
      </Button>
      <Button
        size="icon"
        variant="destructive"
        aria-label={removeLabel}
        title={removeLabel}
        disabled={pack.isSystemPack}
        onClick={() => props.onRemove(pack.packId)}
        className="h-11 w-11"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function EquipmentContentSummary({ pack }: { pack: EquipmentPackListItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>
        {pack.weaponCount} 武器 / {pack.armorCount} 护甲
      </span>
      <span className="text-muted-foreground">·</span>
      <CategorySummary categories={pack.categoryBadges} />
    </div>
  )
}

function EquipmentPackMobileCard({ pack, props }: { pack: EquipmentPackListItem; props: EquipmentPackTabProps }) {
  return (
    <article className="rounded-lg border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 break-words font-semibold">{pack.name}</h3>
        <EquipmentPackStatus disabled={pack.disabled} />
      </div>
      <div className="mt-2 break-words text-xs text-muted-foreground">
        {formatSourceLabel(pack)} · {formatImportedAt(pack.importedAt)}
      </div>
      <div className="mt-3 text-sm">
        <EquipmentContentSummary pack={pack} />
      </div>
      <div className="mt-4">
        <EquipmentPackActions pack={pack} props={props} />
      </div>
    </article>
  )
}

export function EquipmentPackTab(props: EquipmentPackTabProps) {
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all")

  const filteredPacks = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return props.packs.filter((pack) => {
      const sourceLabel = formatSourceLabel(pack).toLowerCase()
      const matchesSearch =
        normalizedSearch.length === 0 ||
        pack.name.toLowerCase().includes(normalizedSearch) ||
        pack.author.toLowerCase().includes(normalizedSearch) ||
        sourceLabel.includes(normalizedSearch)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "enabled" && !pack.disabled) ||
        (statusFilter === "disabled" && pack.disabled)

      return matchesSearch && matchesStatus
    })
  }, [props.packs, searchText, statusFilter])

  return (
    <section className="space-y-4">
      {props.initializationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="font-medium">装备包运行时视图初始化失败，部分装备可能无法在选择窗口显示。</div>
          {props.initializationError.message && (
            <p className="mt-1">
              详情：<span>{props.initializationError.message}</span>
            </p>
          )}
          <Button className="mt-2" size="sm" variant="outline" onClick={props.onRetryInitialize}>
            重新初始化
          </Button>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(280px,560px)_180px] lg:items-end">
        <label className="space-y-1 text-sm">
          <span className="sr-only">搜索装备包</span>
          <input
            className="w-full rounded-md border bg-white px-3 py-2 text-sm"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="搜索包名、作者或来源"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="sr-only">装备包状态筛选</span>
          <select
            className="w-full rounded-md border bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "enabled" | "disabled")}
          >
            <option value="all">全部状态</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已禁用</option>
          </select>
        </label>
      </div>

      {props.packs.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">尚未安装装备包。</div>
      ) : filteredPacks.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
          没有符合条件的装备包。
        </div>
      ) : (
        <>
          <div data-testid="equipment-pack-mobile-list" className="space-y-3 lg:hidden">
            {filteredPacks.map((pack) => (
              <EquipmentPackMobileCard key={pack.packId} pack={pack} props={props} />
            ))}
          </div>

          <div data-testid="equipment-pack-desktop-table" className="hidden overflow-hidden rounded-lg border bg-white lg:block">
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
                {filteredPacks.map((pack) => (
                  <tr key={pack.packId} className="border-t align-middle">
                    <td className="break-words p-3 font-medium">{pack.name}</td>
                    <td className="p-3">
                      <EquipmentContentSummary pack={pack} />
                    </td>
                    <td className="p-3">
                      <EquipmentPackStatus disabled={pack.disabled} />
                    </td>
                    <td className="break-words p-3 text-muted-foreground">{formatSourceLabel(pack)}</td>
                    <td className="break-words p-3 text-muted-foreground">{formatImportedAt(pack.importedAt)}</td>
                    <td className="p-3">
                      <EquipmentPackActions pack={pack} props={props} />
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
