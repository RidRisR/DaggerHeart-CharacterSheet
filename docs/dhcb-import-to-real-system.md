# .dhcb 卡包导入到真实系统设计方案

## 📋 目录

- [设计目标](#设计目标)
- [核心原则](#核心原则)
- [现状分析](#现状分析)
- [架构设计](#架构设计)
- [详细实施方案](#详细实施方案)
- [完整数据流](#完整数据流)
- [错误处理和回滚](#错误处理和回滚)
- [性能优化](#性能优化)
- [测试策略](#测试策略)
- [实施步骤](#实施步骤)

---

## 设计目标

### 业务需求

用户需要能够将编辑器导出的 `.dhcb` 卡包文件导入到真实卡牌系统,实现以下功能:

1. **完整导入** - 卡牌数据 + 图片一次性导入
2. **数据完整性** - 避免孤儿数据和数据不一致
3. **图片校验** - 确保图片与卡牌正确对应
4. **优雅降级** - 图片加载失败时有合理的 fallback
5. **高性能** - 大批次导入时保持流畅

### 技术要求

- ✅ **整存整取** - 批次级原子事务,要么全部成功要么全部回滚
- ✅ **导入校验** - 检查所有图片是否有对应卡牌,避免孤儿数据
- ✅ **加载顺序** - IndexedDB → 外链URL → 默认图片
- ✅ **性能优化** - 使用 Zustand 响应式状态 + IndexedDB 批量操作 + LRU 缓存

---

## 核心原则

### 1. 整存整取 (Atomic Operations)

**原则**: 批次级原子操作,保证数据一致性

```typescript
// ✅ 正确: 使用事务
await db.transaction('rw', db.images, async () => {
  for (const [cardId, blob] of images.entries()) {
    await db.images.put({ key: cardId, blob, ... })
  }
})

// ❌ 错误: 逐个操作,可能部分失败
for (const [cardId, blob] of images.entries()) {
  await db.images.put({ key: cardId, blob, ... })  // 中途失败会留下孤儿数据
}
```

**保证**:
- 图片导入失败 → 回滚所有图片
- 卡牌导入失败 → 不导入图片
- 删除批次 → 同时删除所有图片

### 2. 导入校验 (Validation)

**原则**: 导入时检查图片与卡牌的对应关系

**检查项**:

1. **孤儿图片检测**
   ```typescript
   // 图片存在但对应卡牌不存在
   for (const imageCardId of imageMap.keys()) {
     if (!batch.cardIds.includes(imageCardId)) {
       warnings.push(`孤儿图片: ${imageCardId}`)
     }
   }
   ```

2. **缺失图片检测**
   ```typescript
   // 卡牌标记了 hasLocalImage 但图片文件不存在
   for (const card of cards) {
     if (card.hasLocalImage === true) {
       if (!imageMap.has(card.id)) {
         warnings.push(`缺失图片: ${card.id}`)
       }
     }
   }
   ```

### 3. 加载顺序 (Loading Priority)

**原则**: 多级 fallback 确保图片总能显示

```
1. IndexedDB (优先级最高，当 card.hasLocalImage === true)
   ├─ 真实卡包: store.getImageUrl(cardId) [带缓存]
   └─ 编辑器: getImageUrlFromDB(cardId)
        ↓ (失败 或 hasLocalImage 为 false)
2. 外链URL (如果有)
   └─ card.imageUrl
        ↓ (失败)
3. 默认图片 (最终兜底)
   └─ /image/empty-card.webp
```

### 4. 性能优化 (Performance)

**原则**: 使用 Zustand + IndexedDB + LRU 缓存

| 优化点 | 技术方案 | 效果 |
|--------|----------|------|
| **响应式更新** | Zustand store | 图片加载完成自动更新UI |
| **去重加载** | loadingImages Set | 同一图片只加载一次 |
| **LRU 缓存** | Map + cacheOrder | 100张图片常驻内存 |
| **批量操作** | bulkPut/bulkDelete | 事务批量写入/删除 |

---

## 现状分析

### 已完成部分 ✅

1. **IndexedDB 基础设施**
   - `CardImageDB` 数据库定义 (`card/stores/image-service/database.ts`)
   - `images` 表 (真实卡包图片)
   - `editorImages` 表 (编辑器图片)

2. **Zustand 图片服务**
   - `imageService` 状态 (`UnifiedCardStore`)
   - LRU 缓存机制 (`cache`, `cacheOrder`)
   - 加载去重 (`loadingImages`, `failedImages`)

3. **图片操作 API**
   - `getImageUrl(cardId)` - 读取图片 (带缓存)
   - `importBatchImages(batchId, images)` - 批量导入
   - `deleteBatchImages(imageCardIds)` - 批量删除
   - `clearImageCache()` - 清空缓存

4. **批次元信息**
   - `BatchInfo.imageCardIds` 字段已定义
   - `BatchInfo.imageCount` 字段已定义
   - `BatchInfo.totalImageSize` 字段已定义

### 缺失部分 ❌

1. **UI 层面**
   - ❌ 卡包管理页面不支持 `.dhcb` / `.zip` 文件上传
   - ❌ 导入结果不显示图片数量和校验信息

2. **导入流程**
   - ❌ 没有 `.dhcb` 文件解析函数
   - ❌ 没有图片校验逻辑
   - ❌ `imageCardIds` 字段未在导入时保存

3. **删除流程**
   - ❌ 删除批次时未使用 `imageCardIds` 清理图片

4. **Fallback 机制**
   - ❌ `getCardImageUrlAsync()` 没有多级 fallback
   - ❌ IndexedDB 图片丢失时直接显示空卡

---

## 架构设计

### 系统架构图

```
┌────────────────────────────────────────────────────────────────┐
│                      用户界面 (UI Layer)                        │
│                 app/card-manager/page.tsx                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ JSON 导入    │  │ .dhcb 导入   │  │ 批次管理     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│                   业务逻辑层 (Business Layer)                   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ card/importers/dhcb-importer.ts (新建)                  │   │
│  │                                                         │   │
│  │  importDhcbCardPackage(file)                           │   │
│  │   ├─ 解析 ZIP 文件                                      │   │
│  │   ├─ 读取 cards.json → ImportData                      │   │
│  │   ├─ 读取 images/* → Map<cardId, Blob>                │   │
│  │   ├─ 导入卡牌数据 (store.importCustomCards)            │   │
│  │   ├─ 导入图片 (store.importBatchImages)                │   │
│  │   ├─ 校验图片与卡牌对应关系                             │   │
│  │   └─ 返回导入结果                                       │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────┬──────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│                   数据存储层 (Storage Layer)                    │
│                                                                 │
│  ┌──────────────────────┐      ┌──────────────────────┐       │
│  │ UnifiedCardStore     │      │ IndexedDB (images)   │       │
│  │ (Zustand)            │      │ (Dexie.js)           │       │
│  │                      │      │                      │       │
│  │ - cards: Map         │◄────►│ - key: cardId        │       │
│  │ - batches: Map       │      │ - blob: Blob         │       │
│  │ - imageService       │      │ - mimeType: string   │       │
│  │   - cache: Map       │      │ - size: number       │       │
│  │   - loadingImages    │      │ - createdAt: number  │       │
│  │   - failedImages     │      │                      │       │
│  └──────────────────────┘      └──────────────────────┘       │
│                                                                 │
│  ┌──────────────────────┐                                      │
│  │ localStorage         │                                      │
│  │                      │                                      │
│  │ - batch metadata     │                                      │
│  │   - imageCardIds[]   │  ← 关键字段                         │
│  │   - imageCount       │                                      │
│  │   - totalImageSize   │                                      │
│  └──────────────────────┘                                      │
└────────────────────────────────────────────────────────────────┘
```

### 数据结构

#### .dhcb 文件格式

```
mypack.dhcb (ZIP 格式)
├── manifest.json (可选)
│   └── { format: "DaggerHeart Card Batch", version: "1.0", hasImages: true }
├── cards.json (必需)
│   └── { name, version, author, profession: [], ancestry: [], ... }
└── images/ (可选)
    ├── card-id-1.webp
    ├── card-id-2.png
    └── card-id-3.jpg
```

#### BatchInfo 扩展

```typescript
interface BatchInfo {
  id: string;
  name: string;
  fileName: string;
  importTime: string;
  version?: string;
  description?: string;
  author?: string;
  cardCount: number;
  cardTypes: string[];
  size: number;
  isSystemBatch?: boolean;
  disabled?: boolean;
  cardIds: string[];
  customFieldDefinitions?: CustomFieldsForBatch;
  variantTypes?: VariantTypesForBatch;

  // ✅ 图片相关字段 (已定义但未使用)
  imageCardIds?: string[];      // 有图片的卡牌ID列表
  imageCount?: number;           // 图片数量
  totalImageSize?: number;       // 图片总大小 (bytes)
}
```

---

## 详细实施方案

### 方案 1: UI 层 - 支持 .dhcb 文件上传

**文件**: `app/card-manager/page.tsx`

#### 修改点 1: 文件类型支持

```typescript
// 修改文件上传输入框
<input
  ref={fileInputRef}
  type="file"
  accept=".json,.dhcb,.zip"  // ← 新增 .dhcb, .zip
  onChange={(e) => handleFileSelect(e.target.files)}
  className="hidden"
/>
```

#### 修改点 2: 文件类型判断

```typescript
const handleFileSelect = async (files: FileList | null) => {
  if (!files || files.length === 0) return

  const file = files[0]

  // 判断文件类型
  if (file.name.endsWith('.dhcb') || file.name.endsWith('.zip')) {
    // 使用新的 .dhcb 导入流程
    await handleDhcbImport(file)
  } else if (file.name.endsWith('.json')) {
    // 使用现有 JSON 导入流程
    await handleJsonImport(file)
  } else {
    setImportStatus({
      isImporting: false,
      result: null,
      error: '请选择 JSON 或 .dhcb 文件'
    })
  }
}
```

#### 修改点 3: .dhcb 导入处理

```typescript
const handleDhcbImport = async (file: File) => {
  setImportStatus({ isImporting: true, result: null, error: null })

  try {
    // 调用新的导入函数
    const result = await importDhcbCardPackage(file)

    setImportStatus({
      isImporting: false,
      result: {
        success: true,
        imported: result.totalCards,
        batchId: result.batchId,
        errors: [],
        imageCount: result.imageCount,           // ← 新增
        validationWarnings: result.validationErrors  // ← 新增
      },
      error: null
    })

    refreshData()
  } catch (error) {
    setImportStatus({
      isImporting: false,
      result: null,
      error: error instanceof Error ? error.message : '导入失败'
    })
  }
}
```

#### 修改点 4: 导入结果展示

```typescript
{importStatus.result && importStatus.result.success && (
  <div className="space-y-2">
    <p className="text-green-600 text-sm">
      ✅ 成功导入 {importStatus.result.imported} 张卡牌
    </p>

    {/* 新增: 图片导入信息 */}
    {importStatus.result.imageCount > 0 && (
      <p className="text-green-600 text-sm">
        🖼️ 导入 {importStatus.result.imageCount} 张图片
      </p>
    )}

    {/* 新增: 校验警告 */}
    {importStatus.result.validationWarnings &&
     importStatus.result.validationWarnings.length > 0 && (
      <div className="mt-2">
        <p className="text-yellow-600 text-sm font-medium">⚠️ 校验警告：</p>
        <ul className="text-yellow-600 text-sm list-disc list-inside">
          {importStatus.result.validationWarnings.map((warning, i) => (
            <li key={i}>{warning}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}
```

---

### 方案 2: 业务层 - .dhcb 导入函数 (复用现有机制 + 关键字段处理)

**核心思路**:
- ✅ **复用现有的 `importCustomCards()`** - 所有卡牌校验逻辑已完整
- ✅ **处理关键字段** - `hasLocalImage` + `BatchInfo.imageCardIds`
- ✅ **严格校验图片** - 禁止孤儿图片,确保一一对应

**关键问题识别**:
1. ❌ **`hasLocalImage` 字段丢失** - 导入后卡牌没有标记,图片无法加载
2. ❌ **`BatchInfo.imageCardIds` 未保存** - 删除批次时图片无法清理
3. ❌ **孤儿图片未拒绝** - 必须确保每张图片都有对应卡牌

**文件**: `card/importers/dhcb-importer.ts` (新建)

```typescript
/**
 * .dhcb Card Package Importer
 * 复用现有的 importCustomCards() + 额外处理图片
 */

import JSZip from 'jszip'
import { importCustomCards } from '@/card/index-unified'
import { useUnifiedCardStore } from '@/card/stores/unified-card-store'
import type { ImportData } from '@/card/card-types'

export interface DhcbImportResult {
  batchId: string;
  totalCards: number;
  imageCount: number;
  validationErrors: string[];
}

/**
 * 导入 .dhcb 卡包 (复用JSON导入 + 图片处理)
 *
 * 步骤:
 * 1. 解析 ZIP 文件
 * 2. 提取 cards.json → ImportData
 * 3. ✅ 复用 importCustomCards(ImportData) [所有卡牌校验都在这里]
 * 4. 提取 images/* → Map<cardId, Blob>
 * 5. 导入图片到 IndexedDB
 * 6. 简单校验图片与卡牌对应关系
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

  // ========== 步骤 3: 提取图片 (先提取,用于校验) ==========
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
  console.log('[DhcbImport] Importing cards using existing importCustomCards()...')
  const importResult = await importCustomCards(processedImportData, file.name)

  if (!importResult.success) {
    throw new Error(`卡牌导入失败: ${importResult.errors.join(', ')}`)
  }

  const batchId = importResult.batchId!
  console.log(`[DhcbImport] ✅ Cards imported: ${importResult.imported} cards to batch ${batchId}`)

  // ========== 步骤 6: 严格校验图片 - 禁止孤儿图片 ==========
  const store = useUnifiedCardStore.getState()
  const batch = store.batches.get(batchId)

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
      await store.importBatchImages(batchId, imageMap)
      console.log(`[DhcbImport] ✅ Images imported successfully`)
    } catch (error) {
      console.error('[DhcbImport] Image import failed:', error)

      // ❌ 图片导入失败 → 回滚卡牌导入
      console.log('[DhcbImport] Rolling back card import due to image import failure...')
      await store.removeBatch(batchId)

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
```

**关键改进点**:

1. ✅ **预处理 `hasLocalImage`** - 导入前标记,确保图片能被加载
   ```typescript
   // 根据实际图片标记卡牌
   hasLocalImage: imageCardIds.has(card.id) ? true : card.hasLocalImage
   ```

2. ✅ **严格禁止孤儿图片** - 发现孤儿图片直接拒绝导入
   ```typescript
   if (orphanImages.length > 0) {
     throw new Error(`发现孤儿图片,导入被拒绝...`)
   }
   ```

3. ✅ **图片导入失败回滚** - 确保整存整取
   ```typescript
   catch (error) {
     await store.removeBatch(batchId) // 回滚卡牌导入
     throw new Error(`图片导入失败,已回滚`)
   }
   ```

4. ✅ **复用卡牌校验** - 所有卡牌逻辑(种族配对/子职业三联等)都在 `importCustomCards()` 中

---

### 方案 3: 存储层 - 保存 imageCardIds

**问题**: `BatchInfo.imageCardIds` 字段已定义但未在导入时保存

**文件**: `card/stores/image-service/actions.ts`

#### 修改点: importBatchImages 保存 imageCardIds

```typescript
/**
 * Import batch images to IndexedDB (images table)
 * @param batchId - Batch identifier
 * @param images - Map of cardId -> Blob
 */
importBatchImages: async (batchId: string, images: Map<string, Blob>) => {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB not available');
  }

  try {
    // Use transaction for atomic batch import
    await db.transaction('rw', db.images, async () => {
      for (const [cardId, blob] of images.entries()) {
        await db.images.put({
          key: cardId,
          blob,
          mimeType: blob.type,
          size: blob.size,
          createdAt: Date.now()
        });
      }
    });

    console.log(`[ImageService] Imported ${images.size} images for batch ${batchId}`);

    // ✅ 关键修改: 更新批次元信息中的 imageCardIds
    set((state: any) => {
      const batch = state.batches.get(batchId);
      if (!batch) {
        console.warn(`[ImageService] Batch ${batchId} not found when updating imageCardIds`);
        return state;
      }

      const imageCardIds = Array.from(images.keys());
      const totalImageSize = Array.from(images.values()).reduce((sum, b) => sum + b.size, 0);

      const updatedBatch = {
        ...batch,
        imageCardIds,           // ← 保存图片ID列表
        imageCount: images.size,
        totalImageSize
      };

      const newBatches = new Map(state.batches);
      newBatches.set(batchId, updatedBatch);

      console.log(`[ImageService] Updated batch ${batchId} with ${imageCardIds.length} imageCardIds`);

      return { batches: newBatches };
    });

    // ✅ 同步到 localStorage
    const currentState = get() as any;
    currentState._syncBatchToLocalStorage(batchId);

  } catch (error) {
    console.error(`[ImageService] Failed to import batch images:`, error);
    throw error;
  }
},
```

---

### 方案 4: 删除层 - 使用 imageCardIds 清理图片

**问题**: 删除批次时未使用 `imageCardIds` 清理图片

**文件**: `card/stores/store-actions.ts`

#### 修改点: removeCustomCardBatch 清理图片

```typescript
/**
 * Remove custom card batch
 * @param batchId - Batch ID to remove
 */
removeCustomCardBatch: (batchId: string) => {
  const state = get();
  const batch = state.batches.get(batchId);

  if (!batch) {
    console.warn(`[removeCustomCardBatch] Batch not found: ${batchId}`);
    return false;
  }

  if (batch.isSystemBatch) {
    console.warn(`[removeCustomCardBatch] Cannot remove system batch: ${batchId}`);
    return false;
  }

  try {
    // ✅ 关键修改: 先删除图片 (如果有)
    if (batch.imageCardIds && batch.imageCardIds.length > 0) {
      console.log(`[removeCustomCardBatch] Deleting ${batch.imageCardIds.length} images for batch ${batchId}`);

      // 异步删除图片,但同步更新状态
      state.deleteBatchImages(batch.imageCardIds).catch(error => {
        console.error(`[removeCustomCardBatch] Failed to delete images:`, error);
      });
    }

    // 删除卡牌数据
    const newCards = new Map(state.cards);
    for (const cardId of batch.cardIds) {
      newCards.delete(cardId);
    }

    // 删除批次信息
    const newBatches = new Map(state.batches);
    newBatches.delete(batchId);

    // 从索引中移除
    const newIndex = { ...state.index };
    delete newIndex.batches[batchId];
    newIndex.totalBatches--;
    newIndex.totalCards -= batch.cardCount;

    // 更新状态
    set({
      cards: newCards,
      batches: newBatches,
      index: newIndex,
      cacheValid: false
    });

    // 从 localStorage 移除
    if (!isServer) {
      localStorage.removeItem(`${STORAGE_KEYS.BATCH_PREFIX}${batchId}`);
      localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(newIndex));
    }

    // 重新计算聚合
    get()._recomputeAggregations();
    get()._rebuildCardsByType();

    console.log(`[removeCustomCardBatch] Successfully removed batch ${batchId}`);
    return true;

  } catch (error) {
    console.error(`[removeCustomCardBatch] Failed to remove batch:`, error);
    return false;
  }
},
```

---

### 方案 5: 视图层 - 图片加载 Fallback

**问题**: IndexedDB 图片丢失时直接显示空卡,没有 fallback

**文件**: `lib/utils.ts`

#### 修改点: getCardImageUrlAsync 多级 fallback

```typescript
/**
 * 异步获取卡牌图片URL (带多级 fallback)
 *
 * 加载顺序:
 * 1. IndexedDB (优先级最高)
 *    ├─ 真实卡包: store.getImageUrl(cardId) [带缓存]
 *    └─ 编辑器: getImageUrlFromDB(cardId)
 * 2. 外链URL (如果有)
 *    └─ card.imageUrl (非 db:// 前缀)
 * 3. 默认图片 (最终兜底)
 *    └─ /image/empty-card.webp
 *
 * @param card - 卡牌数据
 * @param isError - 是否为错误状态
 * @returns Promise<string> - 图片URL
 */
export async function getCardImageUrlAsync(
  card: StandardCard | undefined,
  isError: boolean = false
): Promise<string> {
  const basePath = getBasePath();

  // 错误状态或无卡牌 → 默认图片
  if (isError || !card) {
    return `${basePath}/image/empty-card.webp`;
  }

  let imageUrl = card.imageUrl;

  // 尝试从 store 查找完整卡牌数据 (可能有更新的 imageUrl)
  if (!imageUrl && card.id) {
    const store = useUnifiedCardStore.getState();
    if (store.initialized) {
      const foundCard = store.getCardById(card.id);
      if (foundCard?.imageUrl) {
        imageUrl = foundCard.imageUrl;
      }
    }
  }

  // ========== 优先级 1: IndexedDB 图片 (当 hasLocalImage === true) ==========
  if (card.hasLocalImage === true && card.id) {
    const cardId = card.id;

    try {
      const extendedCard = card as any;

      if (extendedCard.batchId) {
        // 真实卡包分支 - 使用 unified-card-store (带缓存)
        console.log(`[ImageLoad] Loading real batch image: ${cardId}`);
        const store = useUnifiedCardStore.getState();
        const blobUrl = await store.getImageUrl(cardId);

        if (blobUrl) {
          console.log(`[ImageLoad] ✅ IndexedDB hit: ${cardId}`);
          return blobUrl;
        }

        console.warn(`[ImageLoad] ⚠️ IndexedDB miss for real batch card: ${cardId}`);
      } else {
        // 编辑器分支 - 使用编辑器专用函数
        console.log(`[ImageLoad] Loading editor image: ${cardId}`);
        const { getImageUrlFromDB } = await import('@/app/card-editor/utils/image-db-helpers');
        const blobUrl = await getImageUrlFromDB(cardId);

        if (blobUrl) {
          console.log(`[ImageLoad] ✅ IndexedDB hit (editor): ${cardId}`);
          return blobUrl;
        }

        console.warn(`[ImageLoad] ⚠️ IndexedDB miss for editor card: ${cardId}`);
      }
    } catch (error) {
      console.error(`[ImageLoad] ❌ IndexedDB error for ${cardId}:`, error);
    }

    // ========== Fallback 1: 尝试外链URL ==========
    // IndexedDB 失败时，如果卡牌有 imageUrl，尝试使用
    if (imageUrl) {
      console.log(`[ImageLoad] 🔄 Fallback to external URL for ${cardId}`);
      return resolveImagePath(imageUrl, basePath);
    }
  }

  // ========== 优先级 2: 普通外链URL (当 hasLocalImage 为 false 或 undefined) ==========
  if (imageUrl) {
    console.log(`[ImageLoad] Using external URL: ${imageUrl}`);
    return resolveImagePath(imageUrl, basePath);
  }

  // ========== 优先级 3: 默认图片 (最终兜底) ==========
  console.log(`[ImageLoad] 🔄 Using default empty card image`);
  return `${basePath}/image/empty-card.webp`;
}

/**
 * 解析图片路径
 */
function resolveImagePath(imageUrl: string, basePath: string): string {
  // 绝对URL (http:// 或 https://)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // 绝对路径 (以 / 开头)
  if (imageUrl.startsWith('/')) {
    return `${basePath}${imageUrl}`;
  }

  // 相对路径
  return `${basePath}/${imageUrl}`;
}
```

---

### 方案 6: 导出函数注册

**文件**: `card/index.ts`

```typescript
// ... 现有导出 ...

// 新增: .dhcb 导入函数
export {
  importDhcbCardPackage,
  type DhcbImportResult
} from './importers/dhcb-importer';
```

**文件**: `app/card-manager/page.tsx`

```typescript
import {
  // ... 现有导入 ...
  importDhcbCardPackage,  // ← 新增
  type DhcbImportResult   // ← 新增
} from '@/card/index';
```

---

## 完整数据流

### 导入流程

```
1. 用户上传 .dhcb 文件
   ↓
2. handleFileSelect() 判断文件类型
   ↓
3. handleDhcbImport() 调用导入函数
   ↓
4. importDhcbCardPackage(file)
   ├─ 4.1 解析 ZIP 文件 (JSZip)
   ├─ 4.2 读取 cards.json → ImportData
   ├─ 4.3 读取 images/* → Map<cardId, Blob>
   ├─ 4.4 store.importCustomCards(ImportData)
   │      ├─ 生成 batchId
   │      ├─ 验证卡牌数据
   │      ├─ 保存到 cards Map
   │      └─ 保存 BatchInfo (cardIds)
   ├─ 4.5 store.importBatchImages(batchId, imageMap)
   │      ├─ db.transaction('rw', db.images, ...) [原子事务]
   │      ├─ bulkPut() 批量写入 IndexedDB
   │      ├─ 更新 BatchInfo.imageCardIds
   │      └─ 同步到 localStorage
   ├─ 4.6 校验图片与卡牌对应关系
   │      ├─ 检查孤儿图片
   │      └─ 检查缺失图片
   └─ 4.7 返回 DhcbImportResult
   ↓
5. 显示导入结果
   ├─ 卡牌数量
   ├─ 图片数量
   └─ 校验警告 (如果有)
```

### 删除流程

```
1. 用户点击删除批次
   ↓
2. handleRemoveBatch(batchId) 确认
   ↓
3. store.removeCustomCardBatch(batchId)
   ├─ 3.1 获取 batch.imageCardIds
   ├─ 3.2 store.deleteBatchImages(imageCardIds)
   │      ├─ db.transaction('rw', db.images, ...) [原子事务]
   │      ├─ bulkDelete(imageCardIds) 批量删除
   │      ├─ 清除缓存 (revoke blob URLs)
   │      └─ 清除 failedImages 标记
   ├─ 3.3 删除 cards Map 中的卡牌
   ├─ 3.4 删除 batches Map 中的批次
   ├─ 3.5 更新 index
   └─ 3.6 从 localStorage 移除批次数据
   ↓
4. 刷新 UI
```

### 图片加载流程

```
1. 组件渲染需要显示卡牌图片
   ↓
2. getCardImageUrlAsync(card)
   ├─ 2.1 检查 card.imageUrl 是否为 db://
   ├─ 2.2 [是] 尝试从 IndexedDB 加载
   │      ├─ [真实卡包] store.getImageUrl(cardId)
   │      │             ├─ 检查缓存 (cache.has)
   │      │             ├─ 检查加载中 (loadingImages.has)
   │      │             ├─ 检查失败标记 (failedImages.has)
   │      │             ├─ db.images.get(cardId)
   │      │             ├─ URL.createObjectURL(blob)
   │      │             └─ 更新 LRU 缓存
   │      └─ [编辑器] getImageUrlFromDB(cardId)
   │                    ├─ db.editorImages.get(cardId)
   │                    └─ URL.createObjectURL(blob)
   ├─ 2.3 [IndexedDB 失败] 尝试 fallbackImageUrl
   ├─ 2.4 [无 db://] 使用普通外链URL
   └─ 2.5 [最终兜底] /image/empty-card.webp
   ↓
3. 返回 URL 给组件
   ↓
4. 组件显示图片
```

---

## 错误处理和回滚

### 原子性保证

#### 1. 图片导入失败回滚

```typescript
try {
  await db.transaction('rw', db.images, async () => {
    for (const [cardId, blob] of images.entries()) {
      await db.images.put({ key: cardId, blob, ... })
    }
  })
} catch (error) {
  // ✅ 事务自动回滚,所有图片都不会被写入
  throw new Error(`图片导入失败: ${error.message}`)
}
```

#### 2. 卡牌导入失败处理

```typescript
// 先导入卡牌,再导入图片
const importResult = await store.importCustomCards(packageData, file.name)

if (!importResult.success) {
  // ✅ 卡牌导入失败,不导入图片
  throw new Error(`卡牌导入失败: ${importResult.errors.join(', ')}`)
}

// 卡牌导入成功,再导入图片
await store.importBatchImages(batchId, imageMap)
```

#### 3. 删除失败容错

```typescript
try {
  // 先删除图片
  if (batch.imageCardIds && batch.imageCardIds.length > 0) {
    await state.deleteBatchImages(batch.imageCardIds)
  }
} catch (error) {
  console.error('图片删除失败,但继续删除卡牌:', error)
  // ✅ 图片删除失败不影响卡牌删除
}

// 继续删除卡牌数据
// ...
```

### 校验错误处理

#### 1. 孤儿图片检测 (严格模式)

```typescript
// ❌ 错误级别: 直接拒绝导入
if (orphanImages.length > 0) {
  throw new Error(
    `发现孤儿图片,导入被拒绝:\n` +
    orphanImages.map(id => `  - ${id} (图片存在但对应卡牌不存在)`).join('\n')
  )
}
```

**策略**: 严格禁止孤儿图片,确保数据完整性

#### 2. 缺失图片处理

```typescript
// ⚠️ 可选: 卡牌标记了 hasLocalImage 但图片不存在
// 这种情况允许导入,系统会自动 fallback 到 imageUrl 或默认图片
for (const card of cards) {
  if (card.hasLocalImage === true && !imageMap.has(card.id)) {
    console.warn(`[Validation] Missing image for card ${card.id}, will fallback to imageUrl or default`)
  }
}
```

**策略**: 允许导入,图片加载时会自动 fallback 到 `imageUrl` 或默认图片

---

## 性能优化

### 1. 批量操作

```typescript
// ✅ 好: 使用 bulkPut/bulkDelete
await db.images.bulkPut(imageRecords)
await db.images.bulkDelete(imageCardIds)

// ❌ 坏: 循环单个操作
for (const record of imageRecords) {
  await db.images.put(record)  // 每次都是一个事务,慢
}
```

**性能提升**: 10-100x (取决于批次大小)

### 2. LRU 缓存

```typescript
// ✅ 缓存命中: 直接返回 blob URL
if (cache.has(cardId)) {
  return cache.get(cardId)!  // O(1)
}

// ❌ 无缓存: 每次都读 IndexedDB
const record = await db.images.get(cardId)  // 异步 I/O
return URL.createObjectURL(record.blob)
```

**性能提升**: 避免重复异步 I/O,响应时间从 10-50ms 降至 <1ms

### 3. 加载去重

```typescript
// ✅ 去重: 同一图片只加载一次
if (loadingImages.has(cardId)) {
  // 等待已有的加载完成
  return waitForLoad(cardId)
}

// ❌ 无去重: 10 个组件同时加载同一图片
Component1: getImageUrl(cardId)  // 读 IndexedDB
Component2: getImageUrl(cardId)  // 重复读
// ... 重复 10 次
```

**性能提升**: 避免重复 I/O,节省带宽和计算

### 4. Zustand 选择器

```typescript
// ✅ 好: 细粒度订阅
const imageUrl = useUnifiedCardStore(state => state.imageService.cache.get(cardId))

// ❌ 坏: 订阅整个 store
const store = useUnifiedCardStore()
const imageUrl = store.imageService.cache.get(cardId)
// ⚠️ store 任何字段变化都会触发重渲染
```

**性能提升**: 避免不必要的组件重渲染

---

## 测试策略

### 单元测试

#### 1. 图片校验逻辑

```typescript
describe('DhcbImporter - Validation', () => {
  it('should detect orphan images', async () => {
    const mockZip = createMockZip({
      cards: [{ id: 'card-1' }],
      images: ['card-1.webp', 'card-2.webp']  // card-2 不存在
    })

    const result = await importDhcbCardPackage(mockZip)

    expect(result.validationErrors).toContain('孤儿图片: card-2')
  })

  it('should warn about missing images (but allow import)', async () => {
    const mockZip = createMockZip({
      cards: [
        { id: 'card-1', hasLocalImage: true },
        { id: 'card-2', hasLocalImage: true }
      ],
      images: ['card-1.webp']  // card-2.webp 缺失
    })

    const result = await importDhcbCardPackage(mockZip)

    // 应该成功导入,只是警告
    expect(result.success).toBe(true)
    // 检查控制台警告 (或记录到某个日志字段)
  })
})
```

#### 2. 原子性测试

```typescript
describe('ImageService - Atomicity', () => {
  it('should rollback all images on transaction failure', async () => {
    const imageMap = new Map([
      ['card-1', mockBlob1],
      ['card-2', mockBlob2],
      ['card-3', corruptedBlob]  // 会导致事务失败
    ])

    await expect(store.importBatchImages('batch-1', imageMap)).rejects.toThrow()

    // 验证所有图片都未写入
    const img1 = await db.images.get('card-1')
    const img2 = await db.images.get('card-2')
    const img3 = await db.images.get('card-3')

    expect(img1).toBeUndefined()
    expect(img2).toBeUndefined()
    expect(img3).toBeUndefined()
  })
})
```

### 集成测试

#### 1. 完整导入流程

```typescript
describe('DhcbImporter - Integration', () => {
  it('should import .dhcb package with images', async () => {
    const dhcbFile = createMockDhcbFile({
      name: 'Test Pack',
      cards: 10,
      images: 8
    })

    const result = await importDhcbCardPackage(dhcbFile)

    expect(result.totalCards).toBe(10)
    expect(result.imageCount).toBe(8)
    expect(result.validationErrors).toHaveLength(0)

    // 验证 IndexedDB
    const storedImages = await db.images.toArray()
    expect(storedImages).toHaveLength(8)

    // 验证 BatchInfo
    const batch = store.batches.get(result.batchId)
    expect(batch.imageCardIds).toHaveLength(8)
    expect(batch.cardIds).toHaveLength(10)
  })
})
```

#### 2. 删除流程

```typescript
describe('BatchManagement - Delete', () => {
  it('should delete batch with images', async () => {
    // 先导入
    const result = await importDhcbCardPackage(mockDhcbFile)
    const batchId = result.batchId

    // 验证导入成功
    expect(await db.images.count()).toBe(8)

    // 删除批次
    const success = await store.removeCustomCardBatch(batchId)

    expect(success).toBe(true)
    expect(await db.images.count()).toBe(0)  // 图片已删除
    expect(store.batches.has(batchId)).toBe(false)  // 批次已删除
  })
})
```

### 性能测试

#### 1. 大批次导入

```typescript
describe('Performance - Large Batch', () => {
  it('should import 1000 cards with 800 images in <5s', async () => {
    const largeDhcb = createMockDhcbFile({
      cards: 1000,
      images: 800
    })

    const startTime = Date.now()
    const result = await importDhcbCardPackage(largeDhcb)
    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(5000)  // <5秒
    expect(result.totalCards).toBe(1000)
    expect(result.imageCount).toBe(800)
  })
})
```

#### 2. LRU 缓存命中率

```typescript
describe('Performance - Cache Hit Rate', () => {
  it('should achieve >90% cache hit rate for repeated loads', async () => {
    // 导入100张图片
    await importDhcbCardPackage(mockDhcbFile)

    let cacheHits = 0
    let cacheMisses = 0

    // 重复加载每张图片 10 次
    for (let i = 0; i < 10; i++) {
      for (const cardId of imageCardIds) {
        const startCacheSize = store.imageService.cache.size
        await store.getImageUrl(cardId)
        const endCacheSize = store.imageService.cache.size

        if (endCacheSize > startCacheSize) {
          cacheMisses++
        } else {
          cacheHits++
        }
      }
    }

    const hitRate = cacheHits / (cacheHits + cacheMisses)
    expect(hitRate).toBeGreaterThan(0.9)  // >90% 命中率
  })
})
```

---

## 实施步骤

### 阶段 1: 基础功能 (P0 - 必须)

**目标**: 实现 .dhcb 导入的核心流程

1. ✅ 创建 `card/importers/dhcb-importer.ts`
   - `importDhcbCardPackage()` 函数
   - ZIP 解析
   - 图片收集
   - 卡牌导入
   - 图片导入

2. ✅ 修改 `card/stores/image-service/actions.ts`
   - `importBatchImages()` 保存 `imageCardIds`
   - 同步到 localStorage

3. ✅ 修改 `card/stores/store-actions.ts`
   - `removeCustomCardBatch()` 使用 `imageCardIds` 删除图片

4. ✅ 修改 `app/card-manager/page.tsx`
   - 支持 `.dhcb` / `.zip` 文件上传
   - `handleDhcbImport()` 处理函数
   - 基础导入结果展示

5. ✅ 修改 `card/index.ts`
   - 导出 `importDhcbCardPackage`

**验收标准**:
- [ ] 可以上传 .dhcb 文件
- [ ] 卡牌和图片都能正确导入
- [ ] 删除批次时图片被清理
- [ ] 无孤儿数据残留

**预计时间**: 2-3 小时

---

### 阶段 2: 校验和 Fallback (P1 - 重要)

**目标**: 增强数据完整性和用户体验

1. ✅ 扩展 `importDhcbCardPackage()`
   - 图片校验逻辑 (孤儿图片/缺失图片检测)
   - 返回 `validationErrors`

2. ✅ 修改 `lib/utils.ts`
   - `getCardImageUrlAsync()` 多级 fallback
   - 日志记录

3. ✅ 修改 `app/card-manager/page.tsx`
   - 显示图片数量
   - 显示校验警告 (黄色提示)

**验收标准**:
- [ ] 导入时显示校验警告
- [ ] IndexedDB 图片丢失时显示默认图片
- [ ] 控制台有清晰的加载日志

**预计时间**: 1-2 小时

---

### 阶段 3: 优化和测试 (P2 - 优化)

**目标**: 性能优化和测试覆盖

1. ✅ 编写单元测试
   - `dhcb-importer.test.ts` (校验逻辑)
   - `image-service-actions.test.ts` (原子性)

2. ✅ 编写集成测试
   - 完整导入流程
   - 删除流程
   - 大批次性能测试

3. ✅ 性能优化
   - 进度条 (可选)
   - 并发加载优化 (可选)

**验收标准**:
- [ ] 测试覆盖率 >80%
- [ ] 1000 张卡导入 <5 秒
- [ ] LRU 缓存命中率 >90%

**预计时间**: 2-3 小时

---

## 总结

### 关键设计点

1. ✅ **整存整取** - IndexedDB 事务保证原子性
2. ✅ **校验机制** - 导入时检查图片与卡牌对应关系
3. ✅ **Fallback 链** - IndexedDB → 外链 → 默认图片
4. ✅ **性能优化** - Zustand + LRU 缓存 + 批量操作

### 实施优先级

- **P0 (必须)**: .dhcb 导入 + 图片清理
- **P1 (重要)**: 校验 + Fallback
- **P2 (优化)**: 测试 + 性能优化

### 风险和注意事项

1. **原子性风险** - 确保使用 Dexie 事务
2. **内存泄漏** - 组件卸载时 revoke blob URLs
3. **兼容性** - 旧版本 .dhcb 文件的向后兼容
4. **性能瓶颈** - 大批次导入时可能卡顿 (需要进度条)

---

## 更新日志

- **2025-01-04** - 初始版本
  - 完整设计方案
  - 分阶段实施计划
  - 测试策略
  - 性能优化方案
