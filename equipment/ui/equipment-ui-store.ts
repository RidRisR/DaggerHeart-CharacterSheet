"use client"

import { create, type StoreApi, type UseBoundStore } from "zustand"
import type { EquipmentPackApplicationService } from "@/equipment/packs/application-service"
import type { EquipmentPackImportSource } from "@/equipment/import/types"
import type { EquipmentPackStorageSnapshot } from "@/equipment/packs/storage-types"
import type {
  EquipmentRuntimeCacheService,
  EquipmentRuntimeQueryCriteria,
  RuntimeEquipmentTemplate,
  RuntimePackDetail,
  RuntimePackSummary,
} from "@/equipment/runtime-cache/types"
import type {
  EquipmentPackCategoryBadge,
  EquipmentPackDetailView,
  EquipmentPackListItem,
  EquipmentUiStoreState,
  RuntimeEquipmentTemplateWithSource,
} from "./types"
import { toDiagnosticView } from "./types"
import { createDefaultEquipmentServices } from "@/equipment/services/default-equipment-services"

interface CreateEquipmentUiStoreInput {
  applicationService: EquipmentPackApplicationService
  runtimeCacheService: EquipmentRuntimeCacheService
}

function sourceLabelForTemplate(
  template: RuntimeEquipmentTemplate,
  runtimeCacheService: EquipmentRuntimeCacheService,
): { sourceId: string; sourceLabel: string } {
  const view = runtimeCacheService.getCurrentView()
  const sourceId = view.relationIndexes.templateToPackId.get(template.id) ?? "builtin"
  if (sourceId === "builtin") return { sourceId, sourceLabel: "内置" }

  const pack = view.packsById.get(sourceId)
  return { sourceId, sourceLabel: pack?.name ?? sourceId }
}

function withSource(
  template: RuntimeEquipmentTemplate,
  runtimeCacheService: EquipmentRuntimeCacheService,
): RuntimeEquipmentTemplateWithSource {
  return { ...template, ...sourceLabelForTemplate(template, runtimeCacheService) }
}

function categoryBadgesFromTemplates(templates: RuntimeEquipmentTemplate[]): EquipmentPackCategoryBadge[] {
  const badges: EquipmentPackCategoryBadge[] = []
  if (templates.some((template) => template.kind === "weapon" && template.weaponType === "primary")) {
    badges.push("主武器")
  }
  if (templates.some((template) => template.kind === "weapon" && template.weaponType === "secondary")) {
    badges.push("副手")
  }
  if (templates.some((template) => template.kind === "armor")) badges.push("护甲")
  return badges
}

function sourceLabel(source: { fileName?: string; label?: string; originKind?: string } | undefined) {
  return source?.fileName ?? source?.label ?? source?.originKind
}

function toPackListItem(summary: RuntimePackSummary, detail: RuntimePackDetail | undefined): EquipmentPackListItem {
  const item: EquipmentPackListItem = {
    packId: summary.packId,
    name: summary.name,
    author: summary.author,
    contentVersion: summary.version,
    importedAt: summary.importedAt,
    disabled: summary.disabled,
    sourceLabel: sourceLabel(detail?.pack.source),
    weaponCount: summary.weaponCount,
    armorCount: summary.armorCount,
    categoryBadges: detail ? categoryBadgesFromTemplates(detail.templates) : [],
    canDisable: true,
    canRemove: !summary.isSystemPack,
  }

  if (summary.isSystemPack) item.isSystemPack = true
  return item
}

function listItemsFromSnapshot(snapshot: EquipmentPackStorageSnapshot | null): EquipmentPackListItem[] {
  if (!snapshot) return []

  return Array.from(snapshot.packs.values()).map((entry) => {
    const runtimeTemplates: RuntimeEquipmentTemplate[] = [
      ...entry.pack.weapons.map((weapon) => ({ kind: "weapon" as const, ...weapon })),
      ...entry.pack.armor.map((armor) => ({ kind: "armor" as const, ...armor })),
    ]

    return {
      packId: entry.packId,
      name: entry.pack.metadata.name,
      author: entry.pack.metadata.author,
      contentVersion: entry.pack.metadata.version,
      importedAt: entry.importedAt,
      disabled: entry.disabled,
      sourceLabel: sourceLabel(entry.source),
      weaponCount: entry.pack.weapons.length,
      armorCount: entry.pack.armor.length,
      categoryBadges: categoryBadgesFromTemplates(runtimeTemplates),
      canDisable: true,
      canRemove: true,
    }
  })
}

function detailFromSnapshot(
  snapshot: EquipmentPackStorageSnapshot | null,
  packId: string,
): EquipmentPackDetailView | undefined {
  const entry = snapshot?.packs.get(packId)
  if (!entry) return undefined

  const pack = listItemsFromSnapshot(snapshot).find((item) => item.packId === packId)
  if (!pack) return undefined

  return {
    pack,
    weapons: entry.pack.weapons.map((weapon) => ({
      kind: "weapon" as const,
      ...weapon,
      sourceId: entry.packId,
      sourceLabel: entry.pack.metadata.name,
    })),
    armor: entry.pack.armor.map((armor) => ({
      kind: "armor" as const,
      ...armor,
      sourceId: entry.packId,
      sourceLabel: entry.pack.metadata.name,
    })),
  }
}

function fileToImportSource(file: File): EquipmentPackImportSource {
  return {
    origin: {
      kind: "file",
      fileName: file.name,
      label: file.name,
    },
    async read() {
      return {
        kind: "jsonText",
        text: await file.text(),
        sizeBytes: file.size,
      }
    },
  }
}

export function createEquipmentUiStore(
  input: CreateEquipmentUiStoreInput,
): UseBoundStore<StoreApi<EquipmentUiStoreState>> {
  let lifecycleQueue: Promise<unknown> = Promise.resolve()

  function enqueueLifecycle<T>(operation: () => Promise<T>): Promise<T> {
    const run = lifecycleQueue.then(operation, operation)
    lifecycleQueue = run.catch(() => undefined)
    return run
  }

  return create<EquipmentUiStoreState>((set, get) => ({
    initialized: false,
    initializing: false,
    storageSnapshot: null,
    initializationError: null,
    lastResult: null,
    lastDiagnostics: [],

    async ensureInitialized() {
      return enqueueLifecycle(async () => {
        if (get().initialized || get().initializationError) return

        set({ initializing: true, initializationError: null })
        try {
          const result = await input.applicationService.initialize()
          const diagnostics = result.diagnostics.map(toDiagnosticView)
          set({
            initialized: result.success,
            initializing: false,
            storageSnapshot: result.snapshot,
            initializationError: result.success ? null : diagnostics[0] ?? null,
            lastResult: result,
            lastDiagnostics: diagnostics,
          })
        } catch (error) {
          set({ initializing: false })
          throw error
        }
      })
    },

    async refreshFromStorage() {
      return enqueueLifecycle(async () => {
        set({ initialized: false, initializing: true, initializationError: null })
        try {
          const result = await input.applicationService.initialize()
          const diagnostics = result.diagnostics.map(toDiagnosticView)
          set({
            initialized: result.success,
            initializing: false,
            storageSnapshot: result.snapshot,
            initializationError: result.success ? null : diagnostics[0] ?? null,
            lastResult: result,
            lastDiagnostics: diagnostics,
          })
        } catch (error) {
          set({ initializing: false })
          throw error
        }
      })
    },

    querySelectableTemplates(criteria: EquipmentRuntimeQueryCriteria = {}) {
      if (get().initializationError) return []

      return input.runtimeCacheService
        .getRuntimeReader()
        .querySelectableTemplates(criteria)
        .map((template) => withSource(template, input.runtimeCacheService))
    },

    getSelectableTemplateById(templateId) {
      if (get().initializationError) return undefined

      const template = input.runtimeCacheService.getRuntimeReader().getSelectableTemplateById(templateId)
      return template ? withSource(template, input.runtimeCacheService) : undefined
    },

    getPackSummaries() {
      if (get().initializationError) return listItemsFromSnapshot(get().storageSnapshot)

      const management = input.runtimeCacheService.getManagementReader()
      return management
        .listPacks()
        .map((summary) => toPackListItem(summary, management.getPackDetail(summary.packId)))
    },

    getPackDetail(packId) {
      if (get().initializationError) return detailFromSnapshot(get().storageSnapshot, packId)

      const detail = input.runtimeCacheService.getManagementReader().getPackDetail(packId)
      if (!detail) return undefined

      return {
        pack: toPackListItem(detail.pack, detail),
        weapons: detail.templates
          .filter((template): template is RuntimeEquipmentTemplate & { kind: "weapon" } => template.kind === "weapon")
          .map((template) => withSource(template, input.runtimeCacheService)),
        armor: detail.templates
          .filter((template): template is RuntimeEquipmentTemplate & { kind: "armor" } => template.kind === "armor")
          .map((template) => withSource(template, input.runtimeCacheService)),
      }
    },

    async importPackFromFile(file) {
      return enqueueLifecycle(async () => {
        const result = await input.applicationService.importFromSource(fileToImportSource(file), { mode: "commit" })
        set({
          initialized: result.success ? true : get().initialized,
          initializationError: result.success ? null : get().initializationError,
          lastResult: result,
          lastDiagnostics: result.diagnostics.map(toDiagnosticView),
        })
        return result
      })
    },

    async removePack(packId) {
      return enqueueLifecycle(async () => {
        const result = await input.applicationService.removePack(packId)
        set({
          initialized: result.success ? true : get().initialized,
          initializationError: result.success ? null : get().initializationError,
          lastResult: result,
          lastDiagnostics: result.diagnostics.map(toDiagnosticView),
        })
        return result
      })
    },

    async setPackDisabled(packId, disabled) {
      return enqueueLifecycle(async () => {
        const result = await input.applicationService.setPackDisabled(packId, disabled)
        set({
          initialized: result.success ? true : get().initialized,
          initializationError: result.success ? null : get().initializationError,
          lastResult: result,
          lastDiagnostics: result.diagnostics.map(toDiagnosticView),
        })
        return result
      })
    },
  }))
}

function createBrowserEquipmentUiStore() {
  return createEquipmentUiStore(createDefaultEquipmentServices())
}

let browserStore: UseBoundStore<StoreApi<EquipmentUiStoreState>> | null = null

export function useEquipmentUiStore() {
  if (!browserStore) browserStore = createBrowserEquipmentUiStore()
  return browserStore()
}

export function getEquipmentUiStore() {
  if (!browserStore) browserStore = createBrowserEquipmentUiStore()
  return browserStore
}
