import { allWeapons } from "@/data/list/all-weapons"
import { armorItems } from "@/data/list/armor"
import type { NormalizedEquipmentModifierContributionTemplate } from "@/equipment/import/types"
import {
  createEquipmentPackApplicationService,
  type EquipmentPackApplicationService,
} from "@/equipment/packs/application-service"
import type { EquipmentPackStorageAdapter } from "@/equipment/packs/local-storage-adapter"
import {
  createBrowserLocalStorageAdapter,
  createInMemoryEquipmentPackStorageAdapter,
} from "@/equipment/packs/local-storage-adapter"
import { createLocalStorageEquipmentPackRepository } from "@/equipment/packs/local-storage-repository"
import { buildBuiltinRuntimeEquipmentTemplates } from "@/equipment/runtime-cache/builtin-templates"
import { createEquipmentRuntimeCacheService } from "@/equipment/runtime-cache/runtime-cache-service"
import type { EquipmentRuntimeCacheService } from "@/equipment/runtime-cache/types"
import {
  getEquipmentDisabledSourceIds,
  setEquipmentSourceDisabled,
} from "@/lib/app-preferences"

export interface DefaultEquipmentServices {
  applicationService: EquipmentPackApplicationService
  runtimeCacheService: EquipmentRuntimeCacheService
}

export type DefaultEquipmentStorageInput =
  | { storage?: "browser" | "memory"; adapter?: never }
  | { storage: "adapter"; adapter: EquipmentPackStorageAdapter }

function normalizedBuiltinArmor() {
  return armorItems.map((armor) => ({
    ...armor,
    modifierContributions: (armor.modifierContributions ?? []).filter(
      (contribution): contribution is NormalizedEquipmentModifierContributionTemplate =>
        contribution.definition.kind === "modifier",
    ),
  }))
}

function createDefaultAdapter(input: DefaultEquipmentStorageInput = {}) {
  if (input.storage === "adapter") return input.adapter
  if (input.storage === "memory") return createInMemoryEquipmentPackStorageAdapter()
  if (typeof window === "undefined") return createInMemoryEquipmentPackStorageAdapter()
  return createBrowserLocalStorageAdapter(window.localStorage)
}

export function createDefaultEquipmentServices(
  input: DefaultEquipmentStorageInput = {},
): DefaultEquipmentServices {
  const runtimeCacheService = createEquipmentRuntimeCacheService()
  const repository = createLocalStorageEquipmentPackRepository(createDefaultAdapter(input))
  const builtinTemplates = buildBuiltinRuntimeEquipmentTemplates({
    weapons: allWeapons,
    armor: normalizedBuiltinArmor(),
  })
  const applicationService = createEquipmentPackApplicationService({
    repository,
    runtimeCacheService,
    builtinTemplates,
    sourcePreferences: {
      getDisabledSourceIds: getEquipmentDisabledSourceIds,
      setSourceDisabled: setEquipmentSourceDisabled,
    },
  })

  return { applicationService, runtimeCacheService }
}
