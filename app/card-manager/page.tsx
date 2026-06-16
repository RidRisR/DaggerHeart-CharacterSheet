"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, Edit3, Home } from "lucide-react"
import { AdvancedMaintenance } from "@/components/content-pack-manager/advanced-maintenance"
import { CardPackTab, type CardPackListItem } from "@/components/content-pack-manager/card-pack-tab"
import { summarizeCardPacks } from "@/components/content-pack-manager/content-pack-summary"
import { ContentPackStats } from "@/components/content-pack-manager/content-pack-stats"
import { EquipmentPackTab } from "@/components/content-pack-manager/equipment-pack-tab"
import { GlobalImportPanel, type ContentPackImportResultView } from "@/components/content-pack-manager/global-import-panel"
import { importContentPackFiles } from "@/components/content-pack-manager/import-content-pack"
import { ViewCardsModal } from "@/components/modals/view-cards-modal"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getAllBatches,
  getCardsByBatchId,
  importCustomCards,
  removeCustomCardBatch,
  toggleBatchDisabled,
  type ExtendedStandardCard,
} from "@/card/index"
import { importDhcbCardPackage } from "@/card/utils/dhcb-importer"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"
import { getEquipmentUiStore } from "@/equipment/ui/equipment-ui-store"
import { toDiagnosticView, type EquipmentPackDetailView, type RuntimeEquipmentTemplateWithSource } from "@/equipment/ui/types"
import { navigateToPage } from "@/lib/utils"

type ContentPackTabValue = "cards" | "equipment"

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
                <DetailField label="damageType" value={template.damageType} />
                <DetailField label="range" value={template.range} />
                <DetailField label="burden" value={template.burden} />
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
  const [batches, setBatches] = useState<CardPackListItem[]>([])
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingCards, setViewingCards] = useState<ExtendedStandardCard[]>([])
  const [viewingEquipmentPackId, setViewingEquipmentPackId] = useState<string | null>(null)

  const cardPackSummary = useMemo(() => summarizeCardPacks(batches), [batches])
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

  function refreshCardData() {
    if (typeof window === "undefined") return
    setBatches(
      getAllBatches().map((batch) => {
        const rawBatch = batch as typeof batch & {
          id?: string
          name?: string
          author?: string
          version?: string
          fileName?: string
          disabled?: boolean
          isSystemBatch?: boolean
        }

        return {
          id: rawBatch.id ?? "",
          name: rawBatch.name ?? "未命名卡牌包",
          author: rawBatch.author ?? "未知作者",
          version: rawBatch.version ?? "-",
          fileName: rawBatch.fileName ?? "",
          importTime: batch.importTime,
          cardCount: batch.cardCount,
          cardTypes: batch.cardTypes,
          disabled: rawBatch.disabled ?? false,
          isSystemBatch: rawBatch.isSystemBatch ?? false,
        }
      }),
    )
  }

  useEffect(() => {
    async function initializeData() {
      const cardStore = useUnifiedCardStore.getState()
      if (!cardStore.initialized) {
        await cardStore.initializeSystem()
      }
      await getEquipmentUiStore().getState().ensureInitialized()
      refreshCardData()
    }

    void initializeData()
  }, [])

  async function handleMultiFileImport(files: File[]) {
    if (files.length === 0) return

    setImportStatus({ isImporting: true, error: null })
    setGlobalImportResults([])

    const store = getEquipmentUiStore()
    try {
      const result = await importContentPackFiles(files, {
        importEquipmentFile: (file) => store.getState().importPackFromFile(file),
        importCardJson: importCustomCards,
        importDhcb: importDhcbCardPackage,
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
          refreshCardData()
          await store.getState().refreshFromStorage()
        } catch (refreshError) {
          const message = refreshError instanceof Error ? refreshError.message : "刷新数据失败"
          error = error ? `${error}；${message}` : `导入完成，但刷新数据失败：${message}`
        }
      }

      setImportStatus({ isImporting: false, error })
    } catch (error) {
      setImportStatus({
        isImporting: false,
        error: error instanceof Error ? error.message : "导入失败",
      })
    }
  }

  function handleViewCards(batchId?: string) {
    const cardsToView = batchId ? getCardsByBatchId(batchId) : useUnifiedCardStore.getState().loadAllCards()
    setViewingCards(cardsToView)
    setViewModalOpen(true)
  }

  async function handleToggleBatchDisabled(batchId: string) {
    try {
      const success = await toggleBatchDisabled(batchId)
      if (!success) {
        alert("切换卡牌包状态失败")
        return
      }
      refreshCardData()
    } catch (error) {
      console.error("切换卡牌包状态时出错:", error)
      alert("切换卡牌包状态时出错")
    }
  }

  function handleRemoveBatch(batchId: string) {
    if (!confirm("确定要删除这个卡牌包吗？这将删除卡牌包中的所有卡牌。")) return

    const success = removeCustomCardBatch(batchId)
    if (success) {
      refreshCardData()
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
    }
    if (viewingEquipmentPackId === packId) setViewingEquipmentPackId(null)
    refreshCardData()
  }

  async function handleToggleEquipmentPack(packId: string, disabled: boolean) {
    const result = await getEquipmentUiStore().getState().setPackDisabled(packId, disabled)
    if (!result.success) {
      alert(result.diagnostics[0]?.message ?? "装备包状态更新失败")
    }
    refreshCardData()
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
      await cardStore.resetSystem()
      localStorage.clear()
      await cardStore.initializeSystem()
      await getEquipmentUiStore().getState().refreshFromStorage()
      refreshCardData()
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
              创作指南
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
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="cards">卡牌包</TabsTrigger>
          <TabsTrigger value="equipment">装备包</TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="mt-4">
          <CardPackTab
            batches={batches}
            totalCards={cardPackSummary.enabledCardCount}
            onViewCards={handleViewCards}
            onToggleBatchDisabled={handleToggleBatchDisabled}
            onRemoveBatch={handleRemoveBatch}
          />
        </TabsContent>
        <TabsContent value="equipment" className="mt-4">
          <EquipmentPackTab
            packs={equipmentPacks}
            initializationError={equipmentInitializationError}
            onRetryInitialize={() => void handleRetryEquipmentInitialize()}
            onView={setViewingEquipmentPackId}
            onToggleDisabled={(packId, disabled) => void handleToggleEquipmentPack(packId, disabled)}
            onRemove={(packId) => void handleRemoveEquipmentPack(packId)}
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
