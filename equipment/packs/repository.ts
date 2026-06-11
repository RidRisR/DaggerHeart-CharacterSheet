import type {
  EquipmentPackIntegrityReport,
  EquipmentPackStorageSnapshot,
  EquipmentPackStorageTransactionResult,
  EquipmentPackFinalCommitPlan,
} from "./storage-types"

export interface EquipmentPackRepository {
  loadSnapshot(): Promise<EquipmentPackStorageSnapshot>
  ensureIntegrity(): Promise<EquipmentPackIntegrityReport>
  commitImport(plan: EquipmentPackFinalCommitPlan): Promise<EquipmentPackStorageTransactionResult>
  removePack(packId: string): Promise<EquipmentPackStorageTransactionResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<EquipmentPackStorageTransactionResult>
}
