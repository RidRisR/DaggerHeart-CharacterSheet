import { getDefaultCardPackApplicationService } from "@/card/packs/default-card-pack-services"
import { getEquipmentUiStore } from "@/equipment/ui/equipment-ui-store"
import {
  createContentPackGroupApplicationService,
  type ContentPackGroupApplicationService,
} from "./application-service"
import {
  createBrowserContentPackGroupStorageAdapter,
  createInMemoryContentPackGroupStorageAdapter,
} from "./local-storage-adapter"
import { createLocalStorageContentPackGroupRepository } from "./local-storage-repository"

type ContentPackGroupServiceFactory = () => ContentPackGroupApplicationService

let defaultFactory: ContentPackGroupServiceFactory = createBrowserContentPackGroupApplicationService
let cardLifecycleQueue: Promise<unknown> = Promise.resolve()

function enqueueCardLifecycle<T>(operation: () => Promise<T>): Promise<T> {
  const run = cardLifecycleQueue.then(operation, operation)
  cardLifecycleQueue = run.catch(() => undefined)
  return run
}

export function getDefaultContentPackGroupApplicationService(): ContentPackGroupApplicationService {
  return defaultFactory()
}

export function setDefaultContentPackGroupServiceFactoryForTests(factory: ContentPackGroupServiceFactory) {
  defaultFactory = factory
}

export function resetDefaultContentPackGroupServiceFactoryForTests() {
  defaultFactory = createBrowserContentPackGroupApplicationService
}

function createBrowserContentPackGroupApplicationService(): ContentPackGroupApplicationService {
  const storage =
    typeof window === "undefined"
      ? createInMemoryContentPackGroupStorageAdapter()
      : createBrowserContentPackGroupStorageAdapter(window.localStorage)

  return createContentPackGroupApplicationService({
    repository: createLocalStorageContentPackGroupRepository(storage),
    lifecycle: {
      async setCardPackDisabled(packId, disabled) {
        return enqueueCardLifecycle(async () => {
          const service = await getDefaultCardPackApplicationService()
          const result = await service.setPackDisabled(packId, disabled)
          return {
            ok: result.success,
            message: result.diagnostics[0]?.message,
          }
        })
      },
      async removeCardPack(packId) {
        return enqueueCardLifecycle(async () => {
          const service = await getDefaultCardPackApplicationService()
          const result = await service.removePack(packId)
          const alreadyDeletedFromStorage =
            result.storageCommitted === true ||
            result.diagnostics.some((diagnostic) => diagnostic.code === "PACK_NOT_FOUND")
          return {
            ok: result.success || alreadyDeletedFromStorage,
            message: result.diagnostics[0]?.message,
          }
        })
      },
      async setEquipmentPackDisabled(packId, disabled) {
        const result = await getEquipmentUiStore().getState().setPackDisabled(packId, disabled)
        return {
          ok: result.success,
          message: result.diagnostics[0]?.message,
        }
      },
      async removeEquipmentPack(packId) {
        const result = await getEquipmentUiStore().getState().removePack(packId)
        const alreadyDeletedFromStorage =
          result.storageCommitted === true ||
          result.diagnostics.some((diagnostic) => diagnostic.code === "PACK_NOT_FOUND")
        return {
          ok: result.success || alreadyDeletedFromStorage,
          message: result.diagnostics[0]?.message,
        }
      },
    },
  })
}
