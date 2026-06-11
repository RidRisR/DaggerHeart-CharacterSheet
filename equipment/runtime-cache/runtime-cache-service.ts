import { createEmptyEquipmentRuntimeCacheView, tryBuildEquipmentRuntimeCacheView } from "./build-cache-view"
import { createReadersFromView } from "./readers"
import type {
  EquipmentRuntimeCacheBuildInput,
  EquipmentRuntimeCacheService,
  StableEquipmentRuntimeCacheView,
} from "./types"

export function createEquipmentRuntimeCacheService(input: {
  initialView?: StableEquipmentRuntimeCacheView
} = {}): EquipmentRuntimeCacheService {
  let currentView = input.initialView ?? createEmptyEquipmentRuntimeCacheView()

  return {
    rebuild(rebuildInput: EquipmentRuntimeCacheBuildInput) {
      const result = tryBuildEquipmentRuntimeCacheView(rebuildInput)

      if (result.ok) {
        currentView = result.view
      }

      return result
    },
    getCurrentView() {
      return currentView
    },
    getRuntimeReader() {
      return createReadersFromView(currentView).runtime
    },
    getManagementReader() {
      return createReadersFromView(currentView).management
    },
  }
}
