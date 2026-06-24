import { createCardPackApplicationService, type CardPackApplicationService } from "./application-service"
import { createDexieCardPackImageBackend, type CardImageTablePort } from "./image-backend"
import { createBrowserCardPackStorageAdapter } from "./local-storage-adapter"
import { createLocalStorageCardPackRepository } from "./local-storage-repository"
import { createZustandCardRuntimeRefreshAdapter } from "./runtime-refresh-adapter"
import { db as cardImageDB } from "@/card/stores/image-service/database"
import { useUnifiedCardStore } from "@/card/stores/unified-card-store"

type CardPackApplicationServiceFactory = () => CardPackApplicationService | Promise<CardPackApplicationService>

let defaultFactory: CardPackApplicationServiceFactory = createBrowserCardPackApplicationService

export async function getDefaultCardPackApplicationService() {
  return defaultFactory()
}

export function setDefaultCardPackApplicationServiceFactoryForTests(
  factory: CardPackApplicationServiceFactory,
) {
  defaultFactory = factory
}

export function resetDefaultCardPackApplicationServiceFactoryForTests() {
  defaultFactory = createBrowserCardPackApplicationService
}

async function getBuiltinCardIds() {
  const store = useUnifiedCardStore.getState()

  if (!store.initialized) {
    const result = await store.initializeSystem()
    if (!result.initialized) {
      throw new Error("Failed to initialize card system")
    }
  }

  return new Set(
    useUnifiedCardStore
      .getState()
      .getAllBuiltinCardTemplateIds(),
  )
}

async function createBrowserCardPackApplicationService() {
  const builtinTemplateIds = await getBuiltinCardIds()
  const imageTable: CardImageTablePort = {
    get: (key) => cardImageDB.images.get(key),
    put: async (record) => {
      await cardImageDB.images.put(record)
    },
    delete: (key) => cardImageDB.images.delete(key),
    toArray: () => cardImageDB.images.toArray(),
  }

  return createCardPackApplicationService({
    repository: createLocalStorageCardPackRepository({
      storage: createBrowserCardPackStorageAdapter(),
      images: createDexieCardPackImageBackend({ table: imageTable }),
    }),
    runtimeRefresh: createZustandCardRuntimeRefreshAdapter(useUnifiedCardStore.getState()),
    builtinTemplateIds,
  })
}
