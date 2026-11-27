"use client"

import { useMemo, useState } from "react"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  FolderArchive,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ContentPackGroupStatus } from "@/content-packs/groups/types"
import type { CardPackListItem } from "./card-pack-tab"
import type { EquipmentPackListItem } from "@/equipment/ui/types"

export interface ImportGroupMemberView {
  kind: "card" | "equipment"
  packId: string
  name: string
  disabled: boolean
  summary: string
  sourceLabel: string
  canView: boolean
  canDisable: boolean
  canRemove: boolean
}

export interface ImportGroupView {
  groupId: string
  name: string
  sourceFileName: string
  importedAt: string
  status: ContentPackGroupStatus
  cardPackCount: number
  equipmentPackCount: number
  totalCardCount: number
  totalWeaponCount: number
  totalArmorCount: number
  members: ImportGroupMemberView[]
}

export interface ImportGroupTabProps {
  groups: ImportGroupView[]
  busyGroupIds?: ReadonlySet<string>
  storageError?: string | null
  onRetryLoad?(): void
  onRenameGroup(groupId: string, nextName: string): void
  onSetGroupDisabled(groupId: string, disabled: boolean): void
  onRemoveGroup(groupId: string): void
  onViewCardPack(packId: string): void
  onToggleCardPack(packId: string, nextDisabled: boolean): void
  onRemoveCardPack(packId: string): void
  onViewEquipmentPack(packId: string): void
  onToggleEquipmentPack(packId: string, nextDisabled: boolean): void
  onRemoveEquipmentPack(packId: string): void
}

function formatMemberSourceLabel(sourceLabel: string | undefined) {
  const trimmed = sourceLabel?.trim()
  if (!trimmed) return "本地导入"
  if (trimmed.startsWith("导入文件：") || trimmed === "系统内置") return trimmed
  if (/\.(json|zip|dhcb)$/i.test(trimmed)) return `导入文件：${trimmed}`
  return trimmed
}

export function buildImportGroupViews(input: {
  groups: ReadonlyArray<{
    groupId: string
    name: string
    sourceFileName: string
    importedAt: string
    members: ReadonlyArray<{ kind: "card" | "equipment"; packId: string }>
  }>
  cardPacks: ReadonlyArray<CardPackListItem>
  equipmentPacks: ReadonlyArray<EquipmentPackListItem>
}): ImportGroupView[] {
  const cardPackById = new Map(input.cardPacks.map((pack) => [pack.sourceId, pack]))
  const equipmentPackById = new Map(input.equipmentPacks.map((pack) => [pack.packId, pack]))

  const views: ImportGroupView[] = []

  for (const group of input.groups) {
    const members: ImportGroupMemberView[] = []
    let cardPackCount = 0
    let equipmentPackCount = 0
    let totalCardCount = 0
    let totalWeaponCount = 0
    let totalArmorCount = 0

    for (const member of group.members) {
      if (member.kind === "card") {
        const cardPack = cardPackById.get(member.packId)
        if (!cardPack) continue
        cardPackCount += 1
        totalCardCount += cardPack.cardCount
        members.push({
          kind: "card",
          packId: cardPack.sourceId,
          name: cardPack.name,
          disabled: cardPack.disabled,
          summary: `${cardPack.cardCount} 张卡牌`,
          sourceLabel: formatMemberSourceLabel(cardPack.sourceLabel),
          canView: cardPack.canViewCards,
          canDisable: cardPack.canDisable,
          canRemove: cardPack.canRemove,
        })
      } else {
        const equipmentPack = equipmentPackById.get(member.packId)
        if (!equipmentPack) continue
        equipmentPackCount += 1
        totalWeaponCount += equipmentPack.weaponCount
        totalArmorCount += equipmentPack.armorCount
        members.push({
          kind: "equipment",
          packId: equipmentPack.packId,
          name: equipmentPack.name,
          disabled: equipmentPack.disabled,
          summary: `${equipmentPack.weaponCount} 武器 / ${equipmentPack.armorCount} 护甲`,
          sourceLabel: formatMemberSourceLabel(equipmentPack.sourceLabel),
          canView: true,
          canDisable: equipmentPack.canDisable,
          canRemove: equipmentPack.canRemove,
        })
      }
    }

    if (members.length === 0) continue

    const disabledCount = members.filter((member) => member.disabled).length
    const status: ContentPackGroupStatus =
      disabledCount === 0 ? "enabled" : disabledCount === members.length ? "disabled" : "partial"

    views.push({
      groupId: group.groupId,
      name: group.name,
      sourceFileName: group.sourceFileName,
      importedAt: group.importedAt,
      status,
      cardPackCount,
      equipmentPackCount,
      totalCardCount,
      totalWeaponCount,
      totalArmorCount,
      members,
    })
  }

  return views
}

function formatImportedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function GroupStatusBadge({ status }: { status: ContentPackGroupStatus }) {
  if (status === "enabled") {
    return (
      <Badge variant="default" className="shrink-0 whitespace-nowrap">
        全部启用
      </Badge>
    )
  }

  if (status === "disabled") {
    return (
      <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
        全部禁用
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="shrink-0 whitespace-nowrap border-amber-300 bg-amber-50 text-amber-800">
      部分启用
    </Badge>
  )
}

function GroupSummaryText({ group }: { group: ImportGroupView }) {
  const packParts: string[] = []
  if (group.cardPackCount > 0) packParts.push(`${group.cardPackCount} 个卡牌包`)
  if (group.equipmentPackCount > 0) packParts.push(`${group.equipmentPackCount} 个装备包`)

  const contentParts: string[] = []
  if (group.totalCardCount > 0) contentParts.push(`${group.totalCardCount} 张卡牌`)
  if (group.totalWeaponCount > 0 || group.totalArmorCount > 0) {
    contentParts.push(`${group.totalWeaponCount} 武器 / ${group.totalArmorCount} 护甲`)
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span>{packParts.join(" · ")}</span>
      {contentParts.length > 0 && (
        <>
          <span>·</span>
          <span>{contentParts.join(" · ")}</span>
        </>
      )}
    </div>
  )
}

function ImportGroupCard({
  group,
  busy,
  expanded,
  onToggleExpand,
  props,
}: {
  group: ImportGroupView
  busy: boolean
  expanded: boolean
  onToggleExpand(): void
  props: ImportGroupTabProps
}) {
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(group.name)

  const canEnableAll = !busy && group.members.some((member) => member.disabled)
  const canDisableAll = !busy && group.members.some((member) => !member.disabled)

  function handleSaveName() {
    const trimmed = draftName.trim()
    if (!trimmed) return
    props.onRenameGroup(group.groupId, trimmed)
    setEditingName(false)
  }

  return (
    <article className="rounded-lg border bg-white shadow-sm" data-testid={`import-group-card-${group.groupId}`}>
      <div className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={expanded ? `收起整合包 ${group.name}` : `展开整合包 ${group.name}`}
                onClick={onToggleExpand}
                className="h-8 w-8 shrink-0"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <FolderArchive className="h-4 w-4 shrink-0 text-muted-foreground" />

              {editingName ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    aria-label="编辑整合包名称"
                    className="h-8 rounded-md border bg-white px-2.5 text-sm font-medium"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSaveName()
                      if (event.key === "Escape") {
                        setDraftName(group.name)
                        setEditingName(false)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="保存整合包名称"
                    className="h-8 w-8"
                    disabled={draftName.trim().length === 0}
                    onClick={handleSaveName}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="取消重命名"
                    className="h-8 w-8"
                    onClick={() => {
                      setDraftName(group.name)
                      setEditingName(false)
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="min-w-0 break-words text-base font-semibold text-gray-900">{group.name}</h3>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`重命名整合包 ${group.name}`}
                    title="重命名整合包"
                    className="h-7 w-7 shrink-0"
                    disabled={busy}
                    onClick={() => {
                      setDraftName(group.name)
                      setEditingName(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              <GroupStatusBadge status={group.status} />
            </div>

            <div className="space-y-1 pl-10">
              <GroupSummaryText group={group} />
              <div className="break-words text-xs text-muted-foreground">
                来源压缩包：{group.sourceFileName} · {formatImportedAt(group.importedAt)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-10 lg:pl-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canEnableAll}
              onClick={() => props.onSetGroupDisabled(group.groupId, false)}
            >
              <Power className="mr-1.5 h-3.5 w-3.5" />
              全部启用
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canDisableAll}
              onClick={() => props.onSetGroupDisabled(group.groupId, true)}
            >
              <PowerOff className="mr-1.5 h-3.5 w-3.5" />
              全部禁用
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => props.onRemoveGroup(group.groupId)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              删除整组
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/20 p-4">
          <div className="space-y-2">
            {group.members.map((member) => {
              const typeLabel = member.kind === "card" ? "卡牌包" : "装备包"
              const viewLabel =
                member.kind === "card"
                  ? member.canView
                    ? `查看卡牌包 ${member.name}`
                    : "已禁用卡牌包不能查看"
                  : `查看装备包 ${member.name}`
              const toggleLabel = member.disabled
                ? `启用${typeLabel} ${member.name}`
                : `禁用${typeLabel} ${member.name}`
              const removeLabel = `删除${typeLabel} ${member.name}`

              return (
                <div
                  key={`${member.kind}:${member.packId}`}
                  className="flex flex-col gap-3 rounded-md border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="shrink-0">
                        {typeLabel}
                      </Badge>
                      <span className="min-w-0 break-words text-sm font-medium">{member.name}</span>
                      <Badge variant={member.disabled ? "secondary" : "default"} className="shrink-0">
                        {member.disabled ? "已禁用" : "已启用"}
                      </Badge>
                    </div>
                    <div className="break-words text-xs text-muted-foreground">
                      {member.summary} · {member.sourceLabel}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label={viewLabel}
                      title={viewLabel}
                      disabled={busy || !member.canView}
                      onClick={() =>
                        member.kind === "card"
                          ? props.onViewCardPack(member.packId)
                          : props.onViewEquipmentPack(member.packId)
                      }
                      className="h-9 w-9"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label={toggleLabel}
                      title={toggleLabel}
                      disabled={busy || !member.canDisable}
                      onClick={() =>
                        member.kind === "card"
                          ? props.onToggleCardPack(member.packId, !member.disabled)
                          : props.onToggleEquipmentPack(member.packId, !member.disabled)
                      }
                      className="h-9 w-9"
                    >
                      {member.disabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      aria-label={removeLabel}
                      title={removeLabel}
                      disabled={busy || !member.canRemove}
                      onClick={() =>
                        member.kind === "card"
                          ? props.onRemoveCardPack(member.packId)
                          : props.onRemoveEquipmentPack(member.packId)
                      }
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </article>
  )
}

export function ImportGroupTab(props: ImportGroupTabProps) {
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ContentPackGroupStatus>("all")
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({})

  const filteredGroups = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return props.groups.filter((group) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        group.name.toLowerCase().includes(normalizedSearch) ||
        group.sourceFileName.toLowerCase().includes(normalizedSearch) ||
        group.members.some((member) => member.name.toLowerCase().includes(normalizedSearch))
      const matchesStatus = statusFilter === "all" || group.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [props.groups, searchText, statusFilter])

  return (
    <section className="space-y-4">
      {props.storageError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <div className="font-medium">整合包索引读取或保存失败，单个卡牌包与装备包仍可在各自标签页管理。</div>
          <p className="mt-1">详情：{props.storageError}</p>
          {props.onRetryLoad && (
            <Button className="mt-2" size="sm" variant="outline" onClick={props.onRetryLoad}>
              重新加载
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(280px,560px)_180px] lg:items-end">
        <label className="space-y-1 text-sm">
          <span className="sr-only">搜索整合包</span>
          <input
            className="h-10 w-full rounded-md border bg-white px-3 text-sm"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="搜索整合包名、压缩包名或包内内容"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="sr-only">整合包状态筛选</span>
          <select
            className="h-10 w-full rounded-md border bg-white px-3 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | ContentPackGroupStatus)}
          >
            <option value="all">全部状态</option>
            <option value="enabled">全部启用</option>
            <option value="partial">部分启用</option>
            <option value="disabled">全部禁用</option>
          </select>
        </label>
      </div>

      {props.groups.length === 0 ? (
        props.storageError ? null : (
          <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
            暂无整合包。将多个卡牌包或装备包打包成 .zip 压缩包并导入后，会自动在此生成可批量管理的整合包。
          </div>
        )
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
          没有符合条件的整合包。
        </div>
      ) : (
        <div className="space-y-3" data-testid="import-group-list">
          {filteredGroups.map((group) => {
            const expanded = !(collapsedGroupIds[group.groupId] ?? false)
            return (
              <ImportGroupCard
                key={group.groupId}
                group={group}
                busy={props.busyGroupIds?.has(group.groupId) ?? false}
                expanded={expanded}
                onToggleExpand={() =>
                  setCollapsedGroupIds((current) => ({
                    ...current,
                    [group.groupId]: expanded,
                  }))
                }
                props={props}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
