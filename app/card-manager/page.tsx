"use client"

import { useEffect, useMemo, useState } from "react"
import { BURDEN_LABELS, DAMAGE_TYPE_LABELS } from "@/equipment/weapon-labels"
import { BookOpen, Edit3, Home } from "lucide-react"
import { AdvancedMaintenance } from "@/components/content-pack-manager/advanced-maintenance"
import { CardPackTab } from "@/components/content-pack-manager/card-pack-tab"
import { summarizeCardPacks } from "@/components/content-pack-manager/content-pack-summary"
import { ContentPackStats } from "@/components/content-pack-manager/content-pack-stats"
import { EquipmentPackTab } from "@/components/content-pack-manager/equipment-pack-tab"
import { GlobalImportPanel, type ContentPackImportResultView } from "@/components/content-pack-manager/global-import-panel"
import { buildImportGroupViews, ImportGroupTab } from "@/components/content-pack-manager/import-group-tab"
import { clearAllCharacterImages } from "@/character/storage/character-image-repository"
import { importContentPackFiles } from "@/components/content-pack-manager/import-content-pack"
import { importContentPackArchive } from "@/content-packs/archive/archive-import-service"
import { MAX_ARCHIVE_TOTAL_BYTES } from "@/content-packs/archive/inspect-zip-archive"
import { getDefaultContentPackGroupApplicationService } from "@/content-packs/groups/default-group-services"
import type { ContentPackGroupRecord } from "@/content-packs/groups/types"
import { ViewCardsModal } from "@/components/modals/view-cards-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { removeCustomCardBatch, toggleBatchDisabled } from "@/card/index"
import type { ExtendedStandardCard } from "@/card/card-types"
import type { ImportData } from "@/card/card-types"
import { createCardDhcbSource, createCardObjectSource } from "@/card/import/source"
import { getDefaultCardPackApplicationService } from "@/card/packs/default-card-pack-services"
import { toCardRuntimeSourceListItem } from "@/card/runtime/card-pack-view-model"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import { getEquipmentUiStore } from "@/equipment/ui/equipment-ui-store"
import { toDiagnosticView, type EquipmentPackDetailView, type RuntimeEquipmentTemplateWithSource } from "@/equipment/ui/types"
import { navigateToPage } from "@/lib/utils"

type ContentPackTabValue = "cards" | "equipment" | "groups"

interface ImportStatus {
  isImporting: boolean
  error: string | null
}

function formatDisplayDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function DetailField({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value === undefined || value === "" ? "-" : value}</dd>
    </div>
  )
}

function formatWeaponType(value: "primary" | "secondary") {
  return value === "primary" ? "主武器" : "副手"
}

async function importCardJsonForManager(importData: ImportData, fileName: string) {
  const service = await getDefaultCardPackApplicationService()
  return service.importFromSource(createCardObjectSource(importData, fileName), { mode: "commit" })
}

async function importCardDhcbForManager(file: File) {
  const service = await getDefaultCardPackApplicationService()
  const bytes = await file.arrayBuffer()
  return service.importFromSource(createCardDhcbSource(bytes, file.name), {
    mode: "commit",
  })
}

async function importZipArchiveForManager(file: File) {
  if (file.size > MAX_ARCHIVE_TOTAL_BYTES) {
    return {
      kind: "archive" as const,
      archiveName: file.name,
      success: false,
      blockedByPreflight: true,
      entryResults: [],
      ignoredFiles: [],
      archiveError: {
        code: "ARCHIVE_LIMIT_EXCEEDED" as const,
        message: "压缩包文件体积超过限制，请拆分后再导入",
        value: { sizeBytes: file.size, maxTotalBytes: MAX_ARCHIVE_TOTAL_BYTES },
      },
    }
  }

  const bytes = await file.arrayBuffer()
  const equipmentStore = getEquipmentUiStore()
  const groupService = getDefaultContentPackGroupApplicationService()

  return importContentPackArchive(
    { fileName: file.name, bytes },
    {
      async getCardConflictContext() {
        const cardService = await getDefaultCardPackApplicationService()
        const snapshot = await cardService.loadSnapshot()
        return cardService.buildConflictContext(snapshot)
      },
      async getEquipmentConflictContext() {
        return equipmentStore.getState().getImportConflictContext()
      },
      async commitCardPack(source) {
        const cardService = await getDefaultCardPackApplicationService()
        return cardService.importFromSource(source, { mode: "commit" })
      },
      async commitEquipmentPack(source) {
        return equipmentStore.getState().importPackFromSource(source)
      },
      async removeCardPack(packId) {
        const cardService = await getDefaultCardPackApplicationService()
        const result = await cardService.removePack(packId)
        const removedFromStorage =
          result.storageCommitted === true ||
          result.diagnostics.some((diagnostic) => diagnostic.code === "PACK_NOT_FOUND")
        return { ok: result.success || removedFromStorage, message: result.diagnostics[0]?.message }
      },
      async removeEquipmentPack(packId) {
        const result = await equipmentStore.getState().removePack(packId)
        const removedFromStorage =
          result.storageCommitted === true ||
          result.diagnostics.some((diagnostic) => diagnostic.code === "PACK_NOT_FOUND")
        return { ok: result.success || removedFromStorage, message: result.diagnostics[0]?.message }
      },
      createGroup(input) {
        return groupService.createGroup(input)
      },
    },
  )
}

function WeaponTemplateList({ templates }: { templates: RuntimeEquipmentTemplateWithSource[] }) {
  const weapons = templates.filter((template) => template.kind === "weapon")

  return (
    <section>
      <h3 className="text-sm font-semibold">武器模板</h3>
      {weapons.length === 0 ? (
        <p className="mt-2 rounded border bg-muted/30 p-3 text-sm text-muted-foreground">无模板。</p>
      ) : (
        <div className="mt-2 space-y-2">
          {weapons.map((template) => (
            <article key={template.id} className="rounded border p-3 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="template id" value={template.id} />
                <DetailField label="name" value={template.name} />
                <DetailField label="tier" value={template.tier} />
                <DetailField label="weaponType" value={formatWeaponType(template.weaponType)} />
                <DetailField label="trait" value={template.trait} />
                <DetailField label="damageType" value={DAMAGE_TYPE_LABELS[template.damageType]} />
                <DetailField label="range" value={template.range} />
                <DetailField label="burden" value={BURDEN_LABELS[template.burden]} />
                <DetailField label="damage" value={template.damage} />
                <DetailField label="featureName" value={template.featureName} />
                <div className="sm:col-span-2 lg:col-span-3">
                  <DetailField label="description" value={template.description} />
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function ArmorTemplateList({ templates }: { templates: RuntimeEquipmentTemplateWithSource[] }) {
  const armor = templates.filter((template) => template.kind === "armor")

  return (
    <section>
      <h3 className="text-sm font-semibold">护甲模板</h3>
      {armor.length === 0 ? (
        <p className="mt-2 rounded border bg-muted/30 p-3 text-sm text-muted-foreground">无模板。</p>
      ) : (
        <div className="mt-2 space-y-2">
          {armor.map((template) => (
            <article key={template.id} className="rounded border p-3 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="template id" value={template.id} />
                <DetailField label="name" value={template.name} />
                <DetailField label="tier" value={template.tier} />
                <DetailField
                  label="baseThresholds"
                  value={`minor ${template.baseThresholds.minor} / major ${template.baseThresholds.major}`}
                />
                <DetailField label="baseArmorMax" value={template.baseArmorMax} />
                <DetailField label="featureName" value={template.featureName} />
                <div className="sm:col-span-2 lg:col-span-3">
                  <DetailField label="description" value={template.description} />
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function EquipmentPackDetailModal({
  detail,
  open,
  onOpenChange,
}: {
  detail: EquipmentPackDetailView | undefined
  open: boolean
  onOpenChange(open: boolean): void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detail?.pack.name ?? "装备包详情"}</DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.pack.author}${detail.pack.contentVersion ? ` / ${detail.pack.contentVersion}` : ""}`
              : "未找到装备包。"}
          </DialogDescription>
        </DialogHeader>

        {detail && (
          <div className="space-y-4">
            <dl className="grid gap-3 rounded border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="pack id" value={detail.pack.packId} />
              <DetailField label="importedAt" value={formatDisplayDate(detail.pack.importedAt)} />
              <DetailField label="source" value={detail.pack.sourceLabel ?? "未知"} />
              <DetailField label="状态" value={detail.pack.disabled ? "已禁用" : "已启用"} />
              <DetailField label="weapon templates" value={detail.weapons.length} />
              <DetailField label="armor templates" value={detail.armor.length} />
            </dl>

            <WeaponTemplateList templates={detail.weapons} />
            <ArmorTemplateList templates={detail.armor} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function CardManagerPage() {
  const equipmentStore = getEquipmentUiStore()
  const cardRuntimeInitialized = useUnifiedCardStore((state) => state.initialized)
  const runtimeBatches = useUnifiedCardStore((state) => state.batches)
  const runtimeCards = useUnifiedCardStore((state) => state.cards)
  const initializeCardSystem = useUnifiedCardStore((state) => state.initializeSystem)
  const equipmentInitialized = equipmentStore((state) => state.initialized)
  const equipmentStorageSnapshot = equipmentStore((state) => state.storageSnapshot)
  const equipmentLastResult = equipmentStore((state) => state.lastResult)
  const equipmentInitializationError = equipmentStore((state) => state.initializationError)
  const equipmentPacks = useMemo(
    () => equipmentStore.getState().getPackSummaries(),
    [equipmentStore, equipmentInitialized, equipmentStorageSnapshot, equipmentLastResult, equipmentInitializationError],
  )

  const [activeTab, setActiveTab] = useState<ContentPackTabValue>("cards")
  const [importStatus, setImportStatus] = useState<ImportStatus>({ isImporting: false, error: null })
  const [globalImportResults, setGlobalImportResults] = useState<ContentPackImportResultView[]>([])
  const [importGroups, setImportGroups] = useState<ContentPackGroupRecord[]>([])
  const [groupStorageError, setGroupStorageError] = useState<string | null>(null)
  const [busyGroupIds, setBusyGroupIds] = useState<Set<string>>(() => new Set())
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingCardSourceId, setViewingCardSourceId] = useState<string | undefined>(undefined)
  const [viewingEquipmentPackId, setViewingEquipmentPackId] = useState<string | null>(null)

  const batches = useMemo(
    () => Array.from(runtimeBatches.values()).map(toCardRuntimeSourceListItem),
    [runtimeBatches],
  )
  const importGroupViews = useMemo(
    () =>
      buildImportGroupViews({
        groups: importGroups,
        cardPacks: batches,
        equipmentPacks,
      }),
    [importGroups, batches, equipmentPacks],
  )
  const cardGroupNameByPackId = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of importGroupViews) {
      for (const member of group.members) {
        if (member.kind === "card") map.set(member.packId, group.name)
      }
    }
    return map
  }, [importGroupViews])
  const equipmentGroupNameByPackId = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of importGroupViews) {
      for (const member of group.members) {
        if (member.kind === "equipment") map.set(member.packId, group.name)
      }
    }
    return map
  }, [importGroupViews])
  const cardPackSummary = useMemo(() => summarizeCardPacks(batches), [batches])
  const viewingCards = useMemo(() => {
    if (!viewModalOpen) return []

    if (viewingCardSourceId) {
      const batch = runtimeBatches.get(viewingCardSourceId)
      if (!batch || batch.disabled) return []

      return batch.cardIds
        .map((cardId) => runtimeCards.get(cardId))
        .filter((card): card is ExtendedStandardCard => Boolean(card))
    }

    return Array.from(runtimeCards.values()).filter((card) => {
      if (!card.batchId) return true
      return runtimeBatches.get(card.batchId)?.disabled !== true
    })
  }, [runtimeBatches, runtimeCards, viewModalOpen, viewingCardSourceId])
  const enabledEquipmentPackCount = useMemo(
    () => equipmentPacks.filter((pack) => !pack.disabled).length,
    [equipmentPacks],
  )
  const weaponTemplateCount = useMemo(
    () => equipmentPacks.reduce((total, pack) => total + pack.weaponCount, 0),
    [equipmentPacks],
  )
  const armorTemplateCount = useMemo(
    () => equipmentPacks.reduce((total, pack) => total + pack.armorCount, 0),
    [equipmentPacks],
  )

  const viewingEquipmentPack = viewingEquipmentPackId
    ? equipmentStore.getState().getPackDetail(viewingEquipmentPackId)
    : undefined

  useEffect(() => {
    async function initializeData() {
      if (!cardRuntimeInitialized) {
        await initializeCardSystem()
      }
      await getEquipmentUiStore().getState().ensureInitialized()
    }

    void initializeData()
  }, [cardRuntimeInitialized, initializeCardSystem])

  function syncImportGroupsFromStorage() {
    const groupService = getDefaultContentPackGroupApplicationService()
    const result = groupService.listGroups()
    if (result.ok) {
      setImportGroups(result.groups)
      setGroupStorageError(null)
    } else {
      setGroupStorageError(result.errors[0]?.message ?? "无法读取本地整合包索引。")
    }
  }

  useEffect(() => {
    syncImportGroupsFromStorage()
  }, [])

  async function handleMultiFileImport(files: File[]) {
    if (files.length === 0) return

    setImportStatus({ isImporting: true, error: null })
    setGlobalImportResults([])

    const store = getEquipmentUiStore()
    try {
      const result = await importContentPackFiles(files, {
        importEquipmentFile: (file) => store.getState().importPackFromFile(file),
        importCardJson: importCardJsonForManager,
        importDhcb: importCardDhcbForManager,
        importZipArchive: importZipArchiveForManager,
        toEquipmentDiagnosticView: toDiagnosticView,
      })

      setGlobalImportResults(result.results)
      if (result.nextTab) setActiveTab(result.nextTab)

      let error =
        result.aggregateStatus === "success"
          ? null
          : result.aggregateStatus === "partialFailure"
            ? "部分文件导入失败，请检查导入结果。"
            : "导入失败，请检查导入结果。"

      if (result.results.some((item) => item.success)) {
        try {
          await store.getState().refreshFromStorage()
        } catch (refreshError) {
          const message = refreshError instanceof Error ? refreshError.message : "刷新数据失败"
          error = error ? `${error}；${message}` : `导入完成，但刷新数据失败：${message}`
        }
        syncImportGroupsFromStorage()
      }

      setImportStatus({ isImporting: false, error })
    } catch (error) {
      setImportStatus({
        isImporting: false,
        error: error instanceof Error ? error.message : "导入失败",
      })
    }
  }

  function handleViewCards(sourceId?: string) {
    setViewingCardSourceId(sourceId)
    setViewModalOpen(true)
  }

  async function handleToggleBatchDisabled(sourceId: string) {
    try {
      const success = await toggleBatchDisabled(sourceId)
      if (!success) {
        alert("切换卡牌包状态失败")
      }
    } catch (error) {
      console.error("切换卡牌包状态时出错:", error)
      alert("切换卡牌包状态时出错")
    }
  }

  async function handleRemoveBatch(sourceId: string) {
    if (!confirm("确定要删除这个卡牌包吗？这将删除卡牌包中的所有卡牌。")) return

    const success = await removeCustomCardBatch(sourceId)
    if (success) {
      const updated = getDefaultContentPackGroupApplicationService().removeMember({ kind: "card", packId: sourceId })
      if (updated.ok) {
        setImportGroups(updated.groups)
        setGroupStorageError(null)
      } else {
        setGroupStorageError(updated.errors[0]?.message ?? "更新整合包索引失败。")
      }
      if (viewingCardSourceId === sourceId) {
        setViewModalOpen(false)
        setViewingCardSourceId(undefined)
      }
      alert("卡牌包删除成功")
    } else {
      alert("卡牌包删除失败")
    }
  }

  async function handleRemoveEquipmentPack(packId: string) {
    if (equipmentPacks.some((pack) => pack.packId === packId && !pack.canRemove)) {
      alert("系统内置装备包不能删除")
      return
    }

    if (!confirm("确定要删除这个装备包吗？")) return

    const result = await getEquipmentUiStore().getState().removePack(packId)
    if (!result.success) {
      alert(result.diagnostics[0]?.message ?? "装备包删除失败")
    } else {
      const updated = getDefaultContentPackGroupApplicationService().removeMember({ kind: "equipment", packId })
      if (updated.ok) {
        setImportGroups(updated.groups)
        setGroupStorageError(null)
      } else {
        setGroupStorageError(updated.errors[0]?.message ?? "更新整合包索引失败。")
      }
    }
    if (viewingEquipmentPackId === packId) setViewingEquipmentPackId(null)
  }

  async function handleToggleEquipmentPack(packId: string, disabled: boolean) {
    const result = await getEquipmentUiStore().getState().setPackDisabled(packId, disabled)
    if (!result.success) {
      alert(result.diagnostics[0]?.message ?? "装备包状态更新失败")
    }
  }

  function setGroupBusy(groupId: string, busy: boolean) {
    setBusyGroupIds((current) => {
      const next = new Set(current)
      if (busy) {
        next.add(groupId)
      } else {
        next.delete(groupId)
      }
      return next
    })
  }

  function handleRenameGroup(groupId: string, nextName: string) {
    const result = getDefaultContentPackGroupApplicationService().renameGroup(groupId, nextName)
    if (result.ok) {
      setImportGroups(result.groups)
      setGroupStorageError(null)
    } else {
      const message = result.errors[0]?.message ?? "重命名整合包失败"
      setGroupStorageError(message)
      alert(message)
    }
  }

  async function handleSetGroupDisabled(groupId: string, disabled: boolean) {
    if (busyGroupIds.has(groupId)) return

    setGroupBusy(groupId, true)
    try {
      const result = await getDefaultContentPackGroupApplicationService().setGroupDisabled(groupId, disabled)
      if (!result.ok) {
        if (result.failedMembers.length > 0) {
          alert(
            `${disabled ? "批量禁用" : "批量启用"}部分失败（${result.failedMembers.length} 个内容包未更新）：${result.failedMembers[0]?.message ?? ""}`,
          )
        } else {
          const message = result.errors[0]?.message ?? `${disabled ? "批量禁用" : "批量启用"}失败`
          setGroupStorageError(message)
          alert(message)
        }
      }
    } finally {
      setGroupBusy(groupId, false)
    }
  }

  async function handleRemoveGroup(groupId: string) {
    if (busyGroupIds.has(groupId)) return

    const groupView = importGroupViews.find((item) => item.groupId === groupId)
    if (!groupView) return

    const parts: string[] = []
    if (groupView.cardPackCount > 0) parts.push(`${groupView.cardPackCount} 个卡牌包`)
    if (groupView.equipmentPackCount > 0) parts.push(`${groupView.equipmentPackCount} 个装备包`)

    if (!confirm(`确定要删除整合包「${groupView.name}」吗？这将一并删除包内的 ${parts.join("和")}。`)) {
      return
    }

    setGroupBusy(groupId, true)
    try {
      const result = await getDefaultContentPackGroupApplicationService().removeGroup(groupId)
      if (result.ok) {
        setImportGroups(result.groups)
        setGroupStorageError(null)
      } else if (result.groups.length > 0 || result.failedMembers.length > 0) {
        setImportGroups(result.groups)
      }

      if (
        viewingCardSourceId &&
        result.succeededMembers.some((member) => member.kind === "card" && member.packId === viewingCardSourceId)
      ) {
        setViewModalOpen(false)
        setViewingCardSourceId(undefined)
      }
      if (
        viewingEquipmentPackId &&
        result.succeededMembers.some(
          (member) => member.kind === "equipment" && member.packId === viewingEquipmentPackId,
        )
      ) {
        setViewingEquipmentPackId(null)
      }

      if (!result.ok) {
        if (result.failedMembers.length > 0) {
          alert(
            `删除整合包部分失败（${result.failedMembers.length} 个内容包未删除）：${result.failedMembers[0]?.message ?? ""}`,
          )
        } else {
          const message = result.errors[0]?.message ?? "包内内容已删除，但更新整合包索引失败"
          setGroupStorageError(message)
          alert(`更新整合包索引失败：${message}`)
        }
      }
    } finally {
      setGroupBusy(groupId, false)
    }
  }

  async function handleRetryEquipmentInitialize() {
    await getEquipmentUiStore().getState().refreshFromStorage()
  }

  async function handleResetAllData() {
    if (
      !confirm(
        "危险操作确认\n\n确定要清空所有本地数据吗？\n\n这将删除角色存档、自定义卡牌包、装备包、图片缓存和系统设置。\n\n此操作不可恢复，请确保您已备份重要数据。",
      )
    ) {
      return
    }

    try {
      const cardStore = useUnifiedCardStore.getState()
      await clearAllCharacterImages()
      await cardStore.resetSystem()
      localStorage.clear()
      await cardStore.initializeSystem()
      await getEquipmentUiStore().getState().refreshFromStorage()
      setImportGroups([])
      setGroupStorageError(null)
      alert("所有本地数据已清空。页面将自动刷新。")
      window.setTimeout(() => window.location.reload(), 1000)
    } catch (error) {
      alert(`清空数据失败: ${error instanceof Error ? error.message : String(error)}`)
      console.error("清空本地数据失败:", error)
    }
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">内容包管理</h1>
            <p className="mt-1 text-sm text-muted-foreground">管理本地安装的卡牌包和装备包。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => navigateToPage("/")} className="justify-center">
              <Home className="mr-2 h-4 w-4" />
              返回主站
            </Button>
            <Button variant="outline" onClick={() => navigateToPage("/card-pack-guide")} className="justify-center">
              <BookOpen className="mr-2 h-4 w-4" />
              AI 提示词与创作指南
            </Button>
            <Button variant="outline" onClick={() => navigateToPage("/card-editor")} className="justify-center">
              <Edit3 className="mr-2 h-4 w-4" />
              内容包编辑器
            </Button>
          </div>
        </div>
      </header>

      <ContentPackStats
        cardPackCount={cardPackSummary.cardPackCount}
        enabledCardPackCount={cardPackSummary.enabledCardPackCount}
        equipmentPackCount={equipmentPacks.length}
        enabledEquipmentPackCount={enabledEquipmentPackCount}
        cardCount={cardPackSummary.installedCardCount}
        weaponTemplateCount={weaponTemplateCount}
        armorTemplateCount={armorTemplateCount}
      />

      <GlobalImportPanel
        importing={importStatus.isImporting}
        results={globalImportResults}
        onImportFiles={handleMultiFileImport}
      />

      {importStatus.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{importStatus.error}</div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentPackTabValue)}>
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="cards">卡牌包</TabsTrigger>
          <TabsTrigger value="equipment">装备包</TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5">
            <span>整合包</span>
            {importGroupViews.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                {importGroupViews.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="mt-4">
          <CardPackTab
            batches={batches}
            totalCards={cardPackSummary.enabledCardCount}
            groupNameByPackId={cardGroupNameByPackId}
            onViewCards={handleViewCards}
            onToggleBatchDisabled={handleToggleBatchDisabled}
            onRemoveBatch={handleRemoveBatch}
          />
        </TabsContent>
        <TabsContent value="equipment" className="mt-4">
          <EquipmentPackTab
            packs={equipmentPacks}
            initializationError={equipmentInitializationError}
            groupNameByPackId={equipmentGroupNameByPackId}
            onRetryInitialize={() => void handleRetryEquipmentInitialize()}
            onView={setViewingEquipmentPackId}
            onToggleDisabled={(packId, disabled) => void handleToggleEquipmentPack(packId, disabled)}
            onRemove={(packId) => void handleRemoveEquipmentPack(packId)}
          />
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <ImportGroupTab
            groups={importGroupViews}
            busyGroupIds={busyGroupIds}
            storageError={groupStorageError}
            onRetryLoad={syncImportGroupsFromStorage}
            onRenameGroup={handleRenameGroup}
            onSetGroupDisabled={(groupId, disabled) => void handleSetGroupDisabled(groupId, disabled)}
            onRemoveGroup={(groupId) => void handleRemoveGroup(groupId)}
            onViewCardPack={handleViewCards}
            onToggleCardPack={(packId) => void handleToggleBatchDisabled(packId)}
            onRemoveCardPack={(packId) => void handleRemoveBatch(packId)}
            onViewEquipmentPack={setViewingEquipmentPackId}
            onToggleEquipmentPack={(packId, disabled) => void handleToggleEquipmentPack(packId, disabled)}
            onRemoveEquipmentPack={(packId) => void handleRemoveEquipmentPack(packId)}
          />
        </TabsContent>
      </Tabs>

      <AdvancedMaintenance onResetAll={() => void handleResetAllData()} />

      <ViewCardsModal
        cards={viewingCards}
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`卡牌详情（${viewingCards.length} 张）`}
      />

      <EquipmentPackDetailModal
        detail={viewingEquipmentPack}
        open={viewingEquipmentPackId !== null}
        onOpenChange={(open) => {
          if (!open) setViewingEquipmentPackId(null)
        }}
      />
    </div>
  )
}
