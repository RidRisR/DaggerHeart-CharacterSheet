/**
 * .dhcb Card Package Importer
 * 复用现有的 importCustomCards() + 额外处理图片
 */

import * as JSZip from 'jszip'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'
import type { ImportData } from '@/card/card-types'

export interface DhcbImportResult {
  batchId: string
  totalCards: number
  imageCount: number
  validationErrors: string[]
}

/**
 * 导入 .dhcb 卡包 (复用JSON导入 + 图片处理)
 *
 * 步骤:
 * 1. 解析 ZIP 文件
 * 2. 提取 cards.json → ImportData
 * 3. 提取 images/* → Map<cardId, Blob>
 * 4. ✅ 预处理: 标记 hasLocalImage 字段
 * 5. ✅ 复用 importCustomCards(ImportData) [所有卡牌校验都在这里]
 * 6. ✅ 严格校验: 禁止孤儿图片
 * 7. 导入图片到 IndexedDB
 * 8. ✅ 回滚机制: 图片失败则删除卡牌
 *
 * @param file - .dhcb/.zip 文件
 * @returns Promise<DhcbImportResult>
 */
export async function importDhcbCardPackage(
  file: File
): Promise<DhcbImportResult> {
  console.log(`[DhcbImport] Starting import of ${file.name}`)

  // ========== 步骤 1: 解析 ZIP 文件 ==========
  const zip = await JSZip.loadAsync(file)

  // ========== 步骤 2: 提取 cards.json ==========
  const cardsFile = zip.file('cards.json')
  if (!cardsFile) {
    throw new Error('cards.json not found in .dhcb file')
  }

  const cardsText = await cardsFile.async('text')
  const importData: ImportData = JSON.parse(cardsText)

  console.log(`[DhcbImport] Package: ${importData.name || 'Unnamed'}`)
  console.log(`[DhcbImport] Author: ${importData.author || 'Unknown'}`)

  // ========== 步骤 3: 提取图片 (先提取,用于预处理和校验) ==========
  const imageMap = new Map<string, Blob>()
  const imageFiles = Object.keys(zip.files).filter(name =>
    name.startsWith('images/') && !zip.files[name].dir
  )

  console.log(`[DhcbImport] Found ${imageFiles.length} image files`)

  for (const filePath of imageFiles) {
    const zipFile = zip.file(filePath)
    if (zipFile) {
      try {
        const blob = await zipFile.async('blob')

        // 从文件名提取 cardId
        const fileName = filePath.replace('images/', '')
        const cardId = fileName.replace(/\.(webp|png|jpg|jpeg|gif|svg)$/i, '')

        imageMap.set(cardId, blob)
        console.log(`[DhcbImport] Loaded image: ${cardId} (${(blob.size / 1024).toFixed(1)}KB)`)
      } catch (error) {
        console.warn(`[DhcbImport] Failed to load image ${filePath}:`, error)
      }
    }
  }

  console.log(`[DhcbImport] Loaded ${imageMap.size} images`)

  // ========== 步骤 4: 预处理 ImportData - 标记 hasLocalImage ==========
  const imageCardIds = new Set(imageMap.keys())

  // Helper: 标记有本地图片的卡牌
  const markHasLocalImage = (cards: any[] | undefined) => {
    if (!cards || !Array.isArray(cards)) return cards
    return cards.map(card => ({
      ...card,
      hasLocalImage: imageCardIds.has(card.id) ? true : card.hasLocalImage
    }))
  }

  // 标记所有卡牌类型
  const processedImportData: ImportData = {
    ...importData,
    profession: markHasLocalImage(importData.profession),
    ancestry: markHasLocalImage(importData.ancestry),
    community: markHasLocalImage(importData.community),
    subclass: markHasLocalImage(importData.subclass),
    domain: markHasLocalImage(importData.domain),
    variant: markHasLocalImage(importData.variant)
  }

  console.log('[DhcbImport] Marked hasLocalImage for cards with images')

  // ========== 步骤 5: 复用现有的卡牌导入 (所有校验都在这里) ==========
  console.log('[DhcbImport] Importing cards using existing store.importCards()...')
  const store = useUnifiedCardStore.getState()

  // 确保系统已初始化
  if (!store.initialized) {
    const result = await store.initializeSystem()
    if (!result.initialized) {
      throw new Error('Failed to initialize card system')
    }
  }

  const importResult = await store.importCards(processedImportData, file.name)

  if (!importResult.success) {
    throw new Error(`卡牌导入失败: ${importResult.errors.join(', ')}`)
  }

  const batchId = importResult.batchId!
  console.log(`[DhcbImport] ✅ Cards imported: ${importResult.imported} cards to batch ${batchId}`)

  // ========== 步骤 6: 严格校验图片 - 禁止孤儿图片 ==========
  // 重新获取最新的 store 状态
  const currentStore = useUnifiedCardStore.getState()
  const batch = currentStore.batches.get(batchId)

  if (!batch) {
    throw new Error(`批次 ${batchId} 未找到`)
  }

  const allCardIds = new Set(batch.cardIds)
  const orphanImages: string[] = []

  console.log(`[DhcbImport] Validating ${imageMap.size} images against ${allCardIds.size} cards...`)

  // ✅ 严格检查: 每张图片都必须有对应卡牌
  for (const imageCardId of imageMap.keys()) {
    if (!allCardIds.has(imageCardId)) {
      orphanImages.push(imageCardId)
    }
  }

  // ❌ 发现孤儿图片 → 拒绝导入
  if (orphanImages.length > 0) {
    // 回滚卡牌导入
    console.error('[DhcbImport] Orphan images detected, rolling back card import...')
    useUnifiedCardStore.getState().removeBatch(batchId)

    throw new Error(
      `发现孤儿图片,导入被拒绝:\n` +
      orphanImages.map(id => `  - ${id} (图片存在但对应卡牌不存在)`).join('\n') +
      `\n\n请确保所有图片都有对应的卡牌。`
    )
  }

  console.log('[DhcbImport] ✅ All images validated - no orphans')

  // ========== 步骤 7: 导入图片到 IndexedDB ==========
  if (imageMap.size > 0) {
    try {
      console.log(`[DhcbImport] Importing ${imageMap.size} images to IndexedDB...`)
      await useUnifiedCardStore.getState().importBatchImages(batchId, imageMap)
      console.log(`[DhcbImport] ✅ Images imported successfully`)
    } catch (error) {
      console.error('[DhcbImport] Image import failed:', error)

      // ❌ 图片导入失败 → 回滚卡牌导入
      console.log('[DhcbImport] Rolling back card import due to image import failure...')
      useUnifiedCardStore.getState().removeBatch(batchId)

      throw new Error(`图片导入失败,已回滚: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    console.log('[DhcbImport] No images to import')
  }

  console.log('[DhcbImport] Import completed successfully')

  return {
    batchId,
    totalCards: importResult.imported,
    imageCount: imageMap.size,
    validationErrors: [] // 严格模式下不允许警告
  }
}
