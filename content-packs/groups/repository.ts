import type {
  ContentPackGroupMemberRef,
  ContentPackGroupRecord,
  ContentPackGroupRepositoryResult,
} from "./types"

export interface ContentPackGroupRepository {
  loadAll(): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]>
  saveGroup(group: ContentPackGroupRecord): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]>
  renameGroup(groupId: string, name: string): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]>
  deleteGroup(groupId: string): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]>
  removeMember(member: ContentPackGroupMemberRef): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]>
  reconcileInstalledPacks(input: {
    installedCardPackIds: ReadonlySet<string>
    installedEquipmentPackIds: ReadonlySet<string>
  }): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]>
  clearAll(): ContentPackGroupRepositoryResult<ContentPackGroupRecord[]>
}
