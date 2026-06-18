import { createCardDhcbSource } from "@/card/import/source"
import { getDefaultCardPackApplicationService } from "@/card/packs/default-card-pack-services"

export interface DhcbImportResult {
  batchId: string
  totalCards: number
  imageCount: number
  validationErrors: string[]
}

export async function importDhcbCardPackage(
  file: File,
): Promise<DhcbImportResult> {
  const bytes = await file.arrayBuffer()
  const service = await getDefaultCardPackApplicationService()
  const result = await service.importFromSource(
    createCardDhcbSource(bytes, file.name),
    { mode: "commit" },
  )

  if (!result.success) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join(", "))
  }

  return {
    batchId: result.summary.packId ?? "",
    totalCards: result.summary.cardCount,
    imageCount: result.summary.imageCount,
    validationErrors: [],
  }
}
