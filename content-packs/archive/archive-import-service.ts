import { importCardPackFromSource } from "@/card/import/import-pipeline"
import type { CardImportSource, CardPackConflictContext } from "@/card/import/types"
import type { ContentPackGroupMemberRef, ContentPackGroupMutationResult } from "@/content-packs/groups/types"
import { importEquipmentPackFromSource } from "@/equipment/import/import-pipeline"
import type { EquipmentPackConflictContext, EquipmentPackImportSource } from "@/equipment/import/types"
import { inspectZipArchive, type InspectZipArchiveOptions } from "./inspect-zip-archive"
import type {
  ArchiveEntryImportResult,
  ArchiveImportOutcome,
  ArchivePackEntry,
  ArchiveRollbackFailure,
  CardCommitResult,
  EquipmentCommitResult,
} from "./types"

export interface ImportContentPackArchiveDependencies {
  getCardConflictContext(): Promise<CardPackConflictContext>
  getEquipmentConflictContext(): Promise<EquipmentPackConflictContext>
  commitCardPack(source: CardImportSource): Promise<CardCommitResult>
  commitEquipmentPack(source: EquipmentPackImportSource): Promise<EquipmentCommitResult>
  removeCardPack(packId: string): Promise<{ ok: boolean; message?: string }>
  removeEquipmentPack(packId: string): Promise<{ ok: boolean; message?: string }>
  createGroup(input: {
    sourceFileName: string
    members: ContentPackGroupMemberRef[]
  }): ContentPackGroupMutationResult
  inspectOptions?: InspectZipArchiveOptions
}

interface TrackedCommittedMember {
  member: ContentPackGroupMemberRef
  archivePath: string
}

function cloneCardConflictContext(context: CardPackConflictContext): CardPackConflictContext {
  return {
    builtinTemplateIds: new Set(context.builtinTemplateIds),
    importedTemplateIds: new Set(context.importedTemplateIds),
    importedTemplateSources: new Map(context.importedTemplateSources),
    customPackCount: context.customPackCount ?? 0,
    maxCustomPackCount: context.maxCustomPackCount,
  }
}

interface MutableEquipmentConflictContext {
  builtinTemplateIds: Set<string>
  importedTemplateIds: Set<string>
  importedTemplateSources: Map<string, { packId?: string; packLabel?: string }>
  customPackCount: number
  maxCustomPackCount: number
}

function cloneEquipmentConflictContext(context: EquipmentPackConflictContext): MutableEquipmentConflictContext {
  return {
    builtinTemplateIds: new Set(context.builtinTemplateIds),
    importedTemplateIds: new Set(context.importedTemplateIds),
    importedTemplateSources: new Map(context.importedTemplateSources ?? []),
    customPackCount: context.customPackCount,
    maxCustomPackCount: context.maxCustomPackCount,
  }
}

function createArchiveCardSource(entry: Extract<ArchivePackEntry, { kind: "cardJson" | "cardDhcb" }>): CardImportSource {
  if (entry.kind === "cardJson") {
    return {
      origin: {
        kind: "container",
        label: entry.archivePath,
        fileName: entry.archivePath,
      },
      async read() {
        return {
          kind: "parsedObject",
          value: entry.parsed,
          sizeBytes: entry.sizeBytes,
        }
      },
    }
  }

  return {
    origin: {
      kind: "container",
      label: entry.archivePath,
      fileName: entry.archivePath,
    },
    async read() {
      return {
        kind: "dhcbBytes",
        bytes: entry.bytes,
        sizeBytes: entry.sizeBytes,
      }
    },
  }
}

function createArchiveEquipmentSource(
  entry: Extract<ArchivePackEntry, { kind: "equipmentJson" }>,
): EquipmentPackImportSource {
  return {
    origin: {
      kind: "container",
      label: entry.archivePath,
      fileName: entry.archivePath,
    },
    async read() {
      return {
        kind: "jsonText",
        text: entry.text,
        sizeBytes: entry.sizeBytes,
      }
    },
  }
}

async function rollbackCommittedMembers(
  committedMembers: TrackedCommittedMember[],
  dependencies: Pick<ImportContentPackArchiveDependencies, "removeCardPack" | "removeEquipmentPack">,
): Promise<ArchiveRollbackFailure[]> {
  const failures: ArchiveRollbackFailure[] = []

  for (let index = committedMembers.length - 1; index >= 0; index -= 1) {
    const tracked = committedMembers[index]
    const { member, archivePath } = tracked
    try {
      const result =
        member.kind === "card"
          ? await dependencies.removeCardPack(member.packId)
          : await dependencies.removeEquipmentPack(member.packId)
      if (!result.ok) {
        failures.push({
          member,
          archivePath,
          message:
            result.message ??
            `回滚残留包失败：${archivePath}（${member.kind === "card" ? "卡牌包" : "装备包"} ${member.packId}）`,
        })
      }
    } catch (error) {
      failures.push({
        member,
        archivePath,
        message:
          error instanceof Error
            ? `回滚残留包异常（${archivePath}）：${error.message}`
            : `回滚残留包失败：${archivePath}（${member.packId}）`,
      })
    }
  }

  return failures
}

function buildRollbackArchiveError(
  baseMessage: string,
  rollbackFailures: ArchiveRollbackFailure[],
  defaultCode: "ARCHIVE_COMMIT_FAILED" | NonNullable<Extract<ArchiveImportOutcome, { kind: "archive" }>["archiveError"]>["code"] = "ARCHIVE_COMMIT_FAILED",
) {
  if (rollbackFailures.length > 0) {
    return {
      code: "ARCHIVE_ROLLBACK_INCOMPLETE" as const,
      message: `${baseMessage}，但有 ${rollbackFailures.length} 个已安装内容包未能自动回滚，请前往内容包列表手动清理残留包`,
    }
  }

  return {
    code: defaultCode,
    message: `${baseMessage}，已自动回滚本次导入的内容包`,
  }
}

export async function importContentPackArchive(
  input: { fileName: string; bytes: ArrayBuffer },
  dependencies: ImportContentPackArchiveDependencies,
): Promise<ArchiveImportOutcome> {
  const inspected = await inspectZipArchive(input.bytes, dependencies.inspectOptions)

  if (inspected.kind === "legacyCardDhcb") {
    return { kind: "legacyCardDhcb" }
  }

  if (inspected.kind === "invalid") {
    return {
      kind: "archive",
      archiveName: input.fileName,
      success: false,
      blockedByPreflight: true,
      entryResults: [],
      ignoredFiles: [],
      archiveError: {
        code: inspected.code,
        message: inspected.message,
        value: inspected.value,
      },
    }
  }

  const hasCardEntries = inspected.entries.some((entry) => entry.kind === "cardJson" || entry.kind === "cardDhcb")
  const hasEquipmentEntries = inspected.entries.some((entry) => entry.kind === "equipmentJson")

  let cardConflictContext: CardPackConflictContext | undefined
  let equipmentConflictContext: MutableEquipmentConflictContext | undefined

  try {
    if (hasCardEntries) {
      cardConflictContext = cloneCardConflictContext(await dependencies.getCardConflictContext())
    }
    if (hasEquipmentEntries) {
      equipmentConflictContext = cloneEquipmentConflictContext(await dependencies.getEquipmentConflictContext())
    }
  } catch (error) {
    return {
      kind: "archive",
      archiveName: input.fileName,
      success: false,
      blockedByPreflight: true,
      entryResults: [],
      ignoredFiles: inspected.ignoredFiles,
      archiveError: {
        code: "ARCHIVE_COMMIT_FAILED",
        message: error instanceof Error ? `读取已安装内容包状态失败：${error.message}` : "读取已安装内容包状态失败",
        value: error,
      },
    }
  }

  const preparedSources = new Map<string, CardImportSource | EquipmentPackImportSource>()
  const preflightResults: ArchiveEntryImportResult[] = []
  let hasPreflightFailure = false

  for (const entry of inspected.entries) {
    if (entry.kind === "unknown") {
      hasPreflightFailure = true
      preflightResults.push({
        archivePath: entry.archivePath,
        kind: "unknown",
        success: false,
        diagnostics: [
          {
            severity: "error",
            code: entry.errorCode,
            path: "",
            message: entry.message,
          },
        ],
      })
      continue
    }

    if (entry.kind === "cardJson" || entry.kind === "cardDhcb") {
      const source = createArchiveCardSource(entry)
      preparedSources.set(entry.archivePath, source)
      const preflight = await importCardPackFromSource(
        source,
        { mode: "commit" },
        { conflictContext: cardConflictContext },
      )

      if (preflight.success && preflight.draft && cardConflictContext) {
        for (const templateId of preflight.draft.templateIds) {
          cardConflictContext.importedTemplateIds.add(templateId)
          cardConflictContext.importedTemplateSources.set(templateId, {
            packLabel: entry.archivePath,
          })
        }
        cardConflictContext.customPackCount = (cardConflictContext.customPackCount ?? 0) + 1

        preflightResults.push({
          archivePath: entry.archivePath,
          kind: "card",
          success: true,
          cardCount: preflight.summary.cardCount,
          parsedInput: entry.kind === "cardJson" ? entry.parsed : undefined,
          diagnostics: preflight.diagnostics,
        })
      } else {
        hasPreflightFailure = true
        preflightResults.push({
          archivePath: entry.archivePath,
          kind: "card",
          success: false,
          cardCount: preflight.summary.cardCount,
          parsedInput: entry.kind === "cardJson" ? entry.parsed : undefined,
          diagnostics: preflight.diagnostics,
        })
      }
      continue
    }

    const equipmentSource = createArchiveEquipmentSource(entry)
    preparedSources.set(entry.archivePath, equipmentSource)
    const preflight = await importEquipmentPackFromSource(
      equipmentSource,
      { mode: "commit" },
      { conflictContext: equipmentConflictContext },
    )

    if (preflight.success && preflight.draft && equipmentConflictContext) {
      for (const templateId of preflight.draft.templateIds) {
        equipmentConflictContext.importedTemplateIds.add(templateId)
        equipmentConflictContext.importedTemplateSources.set(templateId, {
          packLabel: entry.archivePath,
        })
      }
      equipmentConflictContext.customPackCount += 1

      preflightResults.push({
        archivePath: entry.archivePath,
        kind: "equipment",
        success: true,
        weaponCount: preflight.summary.weaponCount,
        armorCount: preflight.summary.armorCount,
        diagnostics: preflight.diagnostics,
      })
    } else {
      hasPreflightFailure = true
      preflightResults.push({
        archivePath: entry.archivePath,
        kind: "equipment",
        success: false,
        weaponCount: preflight.summary.weaponCount,
        armorCount: preflight.summary.armorCount,
        diagnostics: preflight.diagnostics,
      })
    }
  }

  if (hasPreflightFailure) {
    return {
      kind: "archive",
      archiveName: input.fileName,
      success: false,
      blockedByPreflight: true,
      entryResults: preflightResults,
      ignoredFiles: inspected.ignoredFiles,
    }
  }

  const committedMembers: TrackedCommittedMember[] = []
  const commitResults: ArchiveEntryImportResult[] = []
  let activeArchivePath: string | undefined

  try {
    for (const entry of inspected.entries) {
      if (entry.kind === "unknown") continue
      activeArchivePath = entry.archivePath

      if (entry.kind === "cardJson" || entry.kind === "cardDhcb") {
        const source = (preparedSources.get(entry.archivePath) as CardImportSource) ?? createArchiveCardSource(entry)
        const committed = await dependencies.commitCardPack(source)

        if (committed.storageCommitted && committed.summary.packId) {
          committedMembers.push({
            member: { kind: "card", packId: committed.summary.packId },
            archivePath: entry.archivePath,
          })
        }

        if (!committed.success || !committed.summary.packId) {
          const rollbackFailures = await rollbackCommittedMembers(committedMembers, dependencies)
          const failedEntry: ArchiveEntryImportResult = {
            archivePath: entry.archivePath,
            kind: "card",
            success: false,
            packId: committed.summary.packId,
            cardCount: committed.summary.cardCount,
            parsedInput: entry.kind === "cardJson" ? entry.parsed : undefined,
            diagnostics: committed.diagnostics,
          }
          return {
            kind: "archive",
            archiveName: input.fileName,
            success: false,
            blockedByPreflight: false,
            entryResults: [failedEntry],
            ignoredFiles: inspected.ignoredFiles,
            archiveError: buildRollbackArchiveError("写入内容包时失败", rollbackFailures),
            rollbackFailures: rollbackFailures.length > 0 ? rollbackFailures : undefined,
            rollbackErrors: rollbackFailures.length > 0 ? rollbackFailures.map((item) => item.message) : undefined,
          }
        }

        commitResults.push({
          archivePath: entry.archivePath,
          kind: "card",
          success: true,
          packId: committed.summary.packId,
          cardCount: committed.summary.cardCount,
          parsedInput: entry.kind === "cardJson" ? entry.parsed : undefined,
          diagnostics: committed.diagnostics,
        })
        continue
      }

      const equipmentSource =
        (preparedSources.get(entry.archivePath) as EquipmentPackImportSource) ?? createArchiveEquipmentSource(entry)
      const committed = await dependencies.commitEquipmentPack(equipmentSource)

      if (committed.storageCommitted && committed.summary.packId) {
        committedMembers.push({
          member: { kind: "equipment", packId: committed.summary.packId },
          archivePath: entry.archivePath,
        })
      }

      if (!committed.success || !committed.summary.packId) {
        const rollbackFailures = await rollbackCommittedMembers(committedMembers, dependencies)
        const failedEntry: ArchiveEntryImportResult = {
          archivePath: entry.archivePath,
          kind: "equipment",
          success: false,
          packId: committed.summary.packId,
          weaponCount: committed.summary.weaponCount,
          armorCount: committed.summary.armorCount,
          diagnostics: committed.diagnostics,
        }
        return {
          kind: "archive",
          archiveName: input.fileName,
          success: false,
          blockedByPreflight: false,
          entryResults: [failedEntry],
          ignoredFiles: inspected.ignoredFiles,
          archiveError: buildRollbackArchiveError("写入内容包时失败", rollbackFailures),
          rollbackFailures: rollbackFailures.length > 0 ? rollbackFailures : undefined,
          rollbackErrors: rollbackFailures.length > 0 ? rollbackFailures.map((item) => item.message) : undefined,
        }
      }

      commitResults.push({
        archivePath: entry.archivePath,
        kind: "equipment",
        success: true,
        packId: committed.summary.packId,
        weaponCount: committed.summary.weaponCount,
        armorCount: committed.summary.armorCount,
        diagnostics: committed.diagnostics,
      })
    }

    activeArchivePath = undefined
    const groupResult = dependencies.createGroup({
      sourceFileName: input.fileName,
      members: committedMembers.map((tracked) => tracked.member),
    })

    if (!groupResult.ok || !groupResult.group) {
      const rollbackFailures = await rollbackCommittedMembers(committedMembers, dependencies)
      const firstError = groupResult.errors[0]
      return {
        kind: "archive",
        archiveName: input.fileName,
        success: false,
        blockedByPreflight: false,
        entryResults: [],
        ignoredFiles: inspected.ignoredFiles,
        archiveError: buildRollbackArchiveError(
          firstError?.message ? `保存整合包信息失败（${firstError.message}）` : "保存整合包信息失败",
          rollbackFailures,
          firstError?.code ?? "GROUP_STORAGE_WRITE_FAILED",
        ),
        rollbackFailures: rollbackFailures.length > 0 ? rollbackFailures : undefined,
        rollbackErrors: rollbackFailures.length > 0 ? rollbackFailures.map((item) => item.message) : undefined,
      }
    }

    return {
      kind: "archive",
      archiveName: input.fileName,
      success: true,
      blockedByPreflight: false,
      group: groupResult.group,
      entryResults: commitResults,
      ignoredFiles: inspected.ignoredFiles,
    }
  } catch (error) {
    const rollbackFailures = await rollbackCommittedMembers(committedMembers, dependencies)
    const reason = error instanceof Error ? error.message : "发生未知错误"
    const entryResults: ArchiveEntryImportResult[] = activeArchivePath
      ? [
          {
            archivePath: activeArchivePath,
            kind: "unknown",
            success: false,
            diagnostics: [
              {
                severity: "error",
                code: "ARCHIVE_COMMIT_ABORTED",
                path: "",
                message: `提交子包时发生异常：${reason}`,
                value: error,
              },
            ],
          },
        ]
      : []

    return {
      kind: "archive",
      archiveName: input.fileName,
      success: false,
      blockedByPreflight: false,
      entryResults,
      ignoredFiles: inspected.ignoredFiles,
      archiveError:
        rollbackFailures.length > 0
          ? buildRollbackArchiveError(
              activeArchivePath ? `写入子包 ${activeArchivePath} 时发生异常：${reason}` : `保存整合包时发生异常：${reason}`,
              rollbackFailures,
            )
          : activeArchivePath
            ? {
                code: "ARCHIVE_ROLLBACK_INCOMPLETE" as const,
                message: `写入子包 ${activeArchivePath} 时发生异常：${reason}。此前已提交的子包已回滚，请刷新列表确认当前异常子包未残留`,
              }
            : buildRollbackArchiveError(`保存整合包时发生异常：${reason}`, rollbackFailures),
      rollbackFailures: rollbackFailures.length > 0 ? rollbackFailures : undefined,
      rollbackErrors: rollbackFailures.length > 0 ? rollbackFailures.map((item) => item.message) : undefined,
    }
  }
}
