import type {
  CardImportFinalCommitPlan,
  CardPackIntegrityReport,
  CardPackStorageSnapshot,
  CardPackStorageTransactionResult,
} from "./storage-types"

export interface CardPackRepository {
  loadSnapshot(): Promise<CardPackStorageSnapshot>
  ensureIntegrity(): Promise<CardPackIntegrityReport>
  commitImport(plan: CardImportFinalCommitPlan): Promise<CardPackStorageTransactionResult>
  removePack(packId: string): Promise<CardPackStorageTransactionResult>
  setPackDisabled(packId: string, disabled: boolean): Promise<CardPackStorageTransactionResult>
}
