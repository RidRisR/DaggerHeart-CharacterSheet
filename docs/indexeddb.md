# IndexedDB 图片存储基础设施设计

## 📋 目录

- [设计目标](#设计目标)
- [架构概览](#架构概览)
- [数据库设计](#数据库设计)
- [核心模块](#核心模块)
- [使用场景](#使用场景)
- [API 接口](#api-接口)
- [实现细节](#实现细节)
- [迁移策略](#迁移策略)

---

## 设计目标

### 业务需求

系统需要支持两种完全不同的图片管理场景：

1. **卡牌编辑器** - 用户正在创建/编辑的卡包
   - 单一编辑环境
   - 频繁的单卡修改
   - 需要实时预览
   - 数据可随时修改/删除

2. **真实卡包系统** - 已导入的完整卡包
   - 多批次管理
   - 批次级原子操作
   - 导入后不再修改
   - 批次级删除

### 技术目标

✅ **统一基础设施** - 一个数据库,两个表,统一管理
✅ **完全隔离** - 编辑器和真实卡包数据逻辑隔离
✅ **类型安全** - 完整的 TypeScript 类型定义
✅ **性能优化** - 批量操作 + LRU 缓存
✅ **错误处理** - 健全的错误恢复机制

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    应用层 (Application)                       │
├─────────────────────────┬───────────────────────────────────┤
│  卡牌编辑器 (Editor)     │  真实卡包系统 (Real Batches)      │
│                         │                                   │
│  - 单卡图片上传          │  - ZIP 批量导入                   │
│  - 实时预览             │  - 批次级管理                     │
│  - 随时修改/删除         │  - 批次级删除                     │
└─────────────┬───────────┴──────────────┬────────────────────┘
              │                          │
              ↓                          ↓
┌──────────────────────┐    ┌──────────────────────┐
│ Editor Image Manager │    │ Batch Image Manager  │
│                      │    │                      │
│ - saveImageToDB()    │    │ - importBatchImages()│
│ - getImageUrlFromDB()│    │ - deleteBatchImages()│
│ - deleteImageFromDB()│    │ - getCachedImageUrl()│
└──────────┬───────────┘    └──────────┬───────────┘
           │                           │
           └───────────┬───────────────┘
                       ↓
           ┌────────────────────────┐
           │   Shared Database      │
           │   (CardImageDB)        │
           │                        │
           │  - editorImages 表     │
           │  - images 表           │
           └────────────────────────┘
                       ↓
           ┌────────────────────────┐
           │   IndexedDB Browser    │
           │   (Dexie.js wrapper)   │
           └────────────────────────┘
```

---

## 数据库设计

### Database Schema

```typescript
Database: "card-images"
Version: 1

Tables:
  1. editorImages - 编辑器图片表
  2. images - 真实卡包图片表
```

### Table 1: editorImages (编辑器图片)

**用途**: 存储卡牌编辑器中上传的图片

**Schema**:
```typescript
interface EditorImageRecord {
  key: string        // 主键: cardId
  blob: Blob         // 图片二进制数据
  mimeType: string   // MIME类型 (image/webp, image/png, image/jpeg)
  size: number       // 文件大小 (bytes)
  createdAt: number  // 创建时间戳
  updatedAt?: number // 更新时间戳 (可选)
}
```

**索引**:
```typescript
Primary Key: key (cardId)
```

**特点**:
- ✅ 单卡增删改查
- ✅ 无需批次信息
- ✅ 支持覆盖更新
- ✅ 无缓存 (数据量小)

### Table 2: images (真实卡包图片)

**用途**: 存储已导入卡包的图片

**Schema**:
```typescript
interface BatchImageRecord {
  key: string        // 主键: cardId (直接使用,无batchId前缀)
  blob: Blob         // 图片二进制数据
  mimeType: string   // MIME类型
  size: number       // 文件大小
  createdAt: number  // 创建时间戳
}
```

**索引**:
```typescript
Primary Key: key (cardId)
```

**特点**:
- ✅ 批量导入
- ✅ 批量删除
- ✅ 只读 (导入后不修改)
- ✅ LRU缓存优化

### 为什么直接使用 cardId 作为键?

**cardId 格式**: `${packageName}-${author}-${typeCode}-${suffix}`

**示例**:
- 编辑器: `mypack-john-prof-warrior`
- 真实卡包: `official-core-criticalrole-prof-ranger`

**优势**:
1. ✅ **全局唯一** - cardId 已包含 packageName + author
2. ✅ **简化查询** - 无需拼接 batchId 前缀
3. ✅ **减少冗余** - 避免键中重复包含 batchId
4. ✅ **一致性** - 编辑器和真实卡包使用相同的键格式

---

## 核心模块

### 模块 1: Database Definition

**文件**: `card/stores/image-service/database.ts`

**职责**: 定义 IndexedDB 数据库结构

```typescript
import Dexie, { Table } from 'dexie'

export interface ImageRecord {
  key: string        // cardId
  blob: Blob
  mimeType: string
  size: number
  createdAt: number
  updatedAt?: number
}

export class CardImageDB extends Dexie {
  editorImages!: Table<ImageRecord, string>
  images!: Table<ImageRecord, string>

  constructor() {
    super('card-images')

    this.version(1).stores({
      editorImages: 'key',  // 主键: key (cardId)
      images: 'key'         // 主键: key (cardId)
    })
  }
}

// 单例实例
let dbInstance: CardImageDB | null = null

export function getCardImageDB(): CardImageDB {
  if (!dbInstance) {
    if (typeof window === 'undefined') {
      throw new Error('IndexedDB can only be used in browser environment')
    }
    dbInstance = new CardImageDB()
  }
  return dbInstance
}
```

---

### 模块 2: Editor Image Manager

**文件**: `app/card-editor/utils/image-db-helpers.ts`

**职责**: 编辑器图片的 CRUD 操作

```typescript
import { getCardImageDB } from '@/card/stores/image-service/database'
import type { ImageRecord } from '@/card/stores/image-service/database'

/**
 * 保存图片到编辑器表
 * @param cardId 卡牌ID
 * @param file 图片文件
 */
export async function saveImageToDB(
  cardId: string,
  file: File
): Promise<void> {
  const db = getCardImageDB()

  const record: ImageRecord = {
    key: cardId,
    blob: new Blob([await file.arrayBuffer()], { type: file.type }),
    mimeType: file.type,
    size: file.size,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  await db.editorImages.put(record)
}

/**
 * 读取图片并生成 Blob URL
 * @param cardId 卡牌ID
 * @returns Blob URL 或 null
 */
export async function getImageUrlFromDB(
  cardId: string
): Promise<string | null> {
  const db = getCardImageDB()
  const record = await db.editorImages.get(cardId)

  if (record) {
    return URL.createObjectURL(record.blob)
  }

  return null
}

/**
 * 删除图片
 * @param cardId 卡牌ID
 */
export async function deleteImageFromDB(cardId: string): Promise<void> {
  const db = getCardImageDB()
  await db.editorImages.delete(cardId)
}

/**
 * 检查图片是否存在
 * @param cardId 卡牌ID
 */
export async function hasImageInDB(cardId: string): Promise<boolean> {
  const db = getCardImageDB()
  const record = await db.editorImages.get(cardId)
  return !!record
}

/**
 * 获取所有编辑器图片的 cardId 列表
 */
export async function getAllEditorImageIds(): Promise<string[]> {
  const db = getCardImageDB()
  const records = await db.editorImages.toArray()
  return records.map(r => r.key)
}

/**
 * 清空编辑器所有图片
 */
export async function clearAllEditorImages(): Promise<void> {
  const db = getCardImageDB()
  await db.editorImages.clear()
}
```

---

### 模块 3: Batch Image Manager

**文件**: `card/stores/image-service/image-manager.ts`

**职责**: 真实卡包图片的批量操作

```typescript
import { getCardImageDB } from './database'
import type { ImageRecord } from './database'

export interface BatchImportResult {
  success: boolean
  batchId: string
  importedCount: number
  totalSize: number
  imageCardIds: string[]  // 有图片的卡牌ID列表
  errors?: string[]
}

/**
 * 批量导入图片 (原子事务)
 *
 * @param batchId 批次ID (用于日志和返回值)
 * @param images 图片Map (key: cardId, value: Blob)
 * @returns 导入结果
 */
export async function importBatchImages(
  batchId: string,
  images: Map<string, Blob>
): Promise<BatchImportResult> {
  const db = getCardImageDB()

  try {
    const result = await db.transaction(
      'rw',
      db.images,
      async () => {
        const imageRecords: ImageRecord[] = []
        const imageCardIds: string[] = []
        let totalSize = 0

        // 准备图片记录
        for (const [cardId, blob] of images.entries()) {
          const record: ImageRecord = {
            key: cardId,  // 直接使用 cardId 作为键
            blob: blob,
            mimeType: blob.type || 'image/webp',
            size: blob.size,
            createdAt: Date.now()
          }

          imageRecords.push(record)
          imageCardIds.push(cardId)
          totalSize += blob.size
        }

        // 批量写入
        await db.images.bulkPut(imageRecords)

        return {
          importedCount: imageRecords.length,
          totalSize: totalSize,
          imageCardIds: imageCardIds
        }
      }
    )

    console.log(`[importBatchImages] Success: ${result.importedCount} images, ${(result.totalSize / 1024).toFixed(2)}KB`)

    return {
      success: true,
      batchId: batchId,
      ...result
    }

  } catch (error) {
    console.error('[importBatchImages] Transaction failed:', error)
    return {
      success: false,
      batchId: batchId,
      importedCount: 0,
      totalSize: 0,
      imageCardIds: [],
      errors: [error instanceof Error ? error.message : String(error)]
    }
  }
}

/**
 * 删除批次图片
 *
 * @param imageCardIds 有图片的卡牌ID列表
 */
export async function deleteBatchImages(
  imageCardIds: string[]
): Promise<void> {
  if (imageCardIds.length === 0) {
    console.log('[deleteBatchImages] No images to delete')
    return
  }

  const db = getCardImageDB()

  try {
    await db.images.bulkDelete(imageCardIds)
    console.log(`[deleteBatchImages] Deleted ${imageCardIds.length} images`)
  } catch (error) {
    console.error('[deleteBatchImages] Failed:', error)
    throw error
  }
}

/**
 * 获取图片 (带缓存)
 *
 * @param cardId 卡牌ID
 * @param cache LRU缓存实例
 * @param setCacheUpdater 缓存更新函数
 * @returns Blob URL 或 null
 */
export async function getCachedImageUrl(
  cardId: string,
  cache: Map<string, string>,
  setCacheUpdater: (updater: (cache: Map<string, string>) => Map<string, string>) => void
): Promise<string | null> {
  // 1. 检查缓存
  if (cache.has(cardId)) {
    return cache.get(cardId)!
  }

  // 2. 从 IndexedDB 读取
  const db = getCardImageDB()
  const record = await db.images.get(cardId)

  if (!record) {
    return null
  }

  // 3. 生成 Blob URL
  const blobUrl = URL.createObjectURL(record.blob)

  // 4. 更新缓存 (LRU)
  setCacheUpdater(prevCache => {
    const newCache = new Map(prevCache)

    // LRU: 如果缓存满了,删除最旧的
    const MAX_CACHE_SIZE = 100
    if (newCache.size >= MAX_CACHE_SIZE) {
      const firstKey = newCache.keys().next().value
      if (firstKey) {
        const oldUrl = newCache.get(firstKey)
        if (oldUrl) URL.revokeObjectURL(oldUrl)
        newCache.delete(firstKey)
      }
    }

    newCache.set(cardId, blobUrl)
    return newCache
  })

  return blobUrl
}

/**
 * 清空批次图片缓存
 *
 * @param batchId 批次ID
 * @param cache 缓存实例
 * @param cardIds 该批次的所有卡牌ID
 */
export function clearBatchImageCache(
  batchId: string,
  cache: Map<string, string>,
  cardIds: string[]
): void {
  let clearedCount = 0

  cardIds.forEach(cardId => {
    if (cache.has(cardId)) {
      const blobUrl = cache.get(cardId)
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
      cache.delete(cardId)
      clearedCount++
    }
  })

  console.log(`[clearBatchImageCache] Cleared ${clearedCount} cached images for batch ${batchId}`)
}
```

---

### 模块 4: Unified Store Integration

**文件**: `card/stores/image-service-actions.ts` (扩展现有 store)

**职责**: 将图片管理集成到 unified-card-store

```typescript
// 添加到现有 store 的 actions

import {
  importBatchImages,
  deleteBatchImages,
  getCachedImageUrl,
  clearBatchImageCache
} from './image-service/image-manager'

// Store State 扩展
interface ImageServiceState {
  initialized: boolean
  imageCache: Map<string, string>  // LRU 缓存: cardId → Blob URL
}

// Store Actions 扩展
interface ImageServiceActions {
  /**
   * 初始化图片服务
   */
  initImageService: () => Promise<void>

  /**
   * 导入批次图片
   */
  importBatchImages: (
    batchId: string,
    images: Map<string, Blob>
  ) => Promise<BatchImportResult>

  /**
   * 删除批次图片
   */
  deleteBatchImages: (imageCardIds: string[]) => Promise<void>

  /**
   * 获取图片URL (带缓存)
   */
  getImageUrl: (cardId: string) => Promise<string | null>

  /**
   * 清空批次缓存
   */
  clearBatchImageCache: (batchId: string, cardIds: string[]) => void

  /**
   * 清空所有缓存
   */
  clearAllImageCache: () => void
}

// 实现示例
const imageServiceActions: ImageServiceActions = {
  initImageService: async () => {
    set({ initialized: true })
  },

  importBatchImages: async (batchId, images) => {
    const result = await importBatchImages(batchId, images)
    return result
  },

  deleteBatchImages: async (imageCardIds) => {
    await deleteBatchImages(imageCardIds)
  },

  getImageUrl: async (cardId) => {
    const state = get()
    return await getCachedImageUrl(
      cardId,
      state.imageCache,
      (updater) => set({ imageCache: updater(state.imageCache) })
    )
  },

  clearBatchImageCache: (batchId, cardIds) => {
    const state = get()
    clearBatchImageCache(batchId, state.imageCache, cardIds)
  },

  clearAllImageCache: () => {
    const state = get()
    state.imageCache.forEach(url => URL.revokeObjectURL(url))
    set({ imageCache: new Map() })
  }
}
```

---

## 使用场景

### 场景 1: 编辑器上传图片

```typescript
// 1. 用户选择文件
const file: File = /* ... */

// 2. 保存到 editorImages 表
await saveImageToDB(card.id, file)

// 3. 更新卡牌数据
updateCard(cardType, cardIndex, { hasLocalImage: true })

// 4. 实时预览
const blobUrl = await getImageUrlFromDB(card.id)
setPreviewUrl(blobUrl)
```

### 场景 2: 导入真实卡包 (ZIP)

```typescript
// 1. 解析 ZIP 文件
const { cards, images } = await parseZipFile(zipFile)

// 2. 导入卡牌数据到 store
const { batchId } = await store.importCustomCards(cards, fileName)

// 3. 导入图片到 IndexedDB
const result = await store.importBatchImages(batchId, images)

// 4. 更新批次元信息 (localStorage)
const batchInfo = {
  id: batchId,
  name: cards.name,
  cardIds: cards.map(c => c.id),
  imageCardIds: result.imageCardIds  // ← 记录有图片的卡牌
}
localStorage.setItem(`batch_${batchId}`, JSON.stringify(batchInfo))
```

### 场景 3: 删除真实卡包

```typescript
// 1. 读取批次元信息
const batchInfo = JSON.parse(localStorage.getItem(`batch_${batchId}`))

// 2. 删除图片
if (batchInfo.imageCardIds?.length > 0) {
  await store.deleteBatchImages(batchInfo.imageCardIds)
}

// 3. 清空缓存
store.clearBatchImageCache(batchId, batchInfo.cardIds)

// 4. 删除批次元信息
localStorage.removeItem(`batch_${batchId}`)
```

### 场景 4: 预览卡牌图片 (通用)

```typescript
// lib/utils.ts - getCardImageUrlAsync()
export async function getCardImageUrlAsync(
  card: StandardCard
): Promise<string> {
  const extendedCard = card as any

  // 优先检查本地图片
  if (extendedCard.hasLocalImage && card.id) {
    // 编辑器卡牌
    if (!extendedCard.batchId) {
      const { getImageUrlFromDB } = await import(
        '@/app/card-editor/utils/image-db-helpers'
      )
      const blobUrl = await getImageUrlFromDB(card.id)
      if (blobUrl) return blobUrl
    }
    // 真实卡包卡牌
    else {
      const store = useUnifiedCardStore.getState()
      const blobUrl = await store.getImageUrl(card.id)
      if (blobUrl) return blobUrl
    }
  }

  // 回退到外链URL或默认图片
  return card.imageUrl || `${getBasePath()}/image/empty-card.webp`
}
```

---

## API 接口

### Editor Image API

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `saveImageToDB` | `(cardId, file)` | `Promise<void>` | 保存图片 |
| `getImageUrlFromDB` | `(cardId)` | `Promise<string \| null>` | 读取图片 |
| `deleteImageFromDB` | `(cardId)` | `Promise<void>` | 删除图片 |
| `hasImageInDB` | `(cardId)` | `Promise<boolean>` | 检查存在 |
| `getAllEditorImageIds` | `()` | `Promise<string[]>` | 所有ID |
| `clearAllEditorImages` | `()` | `Promise<void>` | 清空所有 |

### Batch Image API

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `importBatchImages` | `(batchId, images)` | `Promise<BatchImportResult>` | 批量导入 |
| `deleteBatchImages` | `(imageCardIds)` | `Promise<void>` | 批量删除 |
| `getCachedImageUrl` | `(cardId, cache, updater)` | `Promise<string \| null>` | 带缓存读取 |
| `clearBatchImageCache` | `(batchId, cache, cardIds)` | `void` | 清空缓存 |

### Store Actions

| Action | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| `initImageService` | `()` | `Promise<void>` | 初始化 |
| `importBatchImages` | `(batchId, images)` | `Promise<BatchImportResult>` | 导入批次 |
| `deleteBatchImages` | `(imageCardIds)` | `Promise<void>` | 删除批次 |
| `getImageUrl` | `(cardId)` | `Promise<string \| null>` | 获取URL |
| `clearBatchImageCache` | `(batchId, cardIds)` | `void` | 清空批次缓存 |
| `clearAllImageCache` | `()` | `void` | 清空所有缓存 |

---

## 实现细节

### 1. Dexie 事务处理

```typescript
// 批量导入使用事务保证原子性
await db.transaction('rw', db.images, async () => {
  await db.images.bulkPut(imageRecords)
})
```

### 2. LRU 缓存实现

```typescript
// Map 自然保持插入顺序,实现简单 LRU
const MAX_CACHE_SIZE = 100

if (cache.size >= MAX_CACHE_SIZE) {
  const firstKey = cache.keys().next().value
  const oldUrl = cache.get(firstKey)
  URL.revokeObjectURL(oldUrl)  // 释放内存
  cache.delete(firstKey)
}

cache.set(cardId, blobUrl)  // 新项插入到末尾
```

### 3. Blob URL 生命周期管理

```typescript
// 创建
const blobUrl = URL.createObjectURL(blob)

// 使用
<img src={blobUrl} />

// 清理 (组件卸载时)
useEffect(() => {
  return () => {
    if (blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl)
    }
  }
}, [blobUrl])
```

### 4. 浏览器环境检测

```typescript
export function getCardImageDB(): CardImageDB {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB can only be used in browser environment')
  }

  if (!dbInstance) {
    dbInstance = new CardImageDB()
  }

  return dbInstance
}
```

### 5. 错误处理模式

```typescript
try {
  const record = await db.editorImages.get(cardId)
  if (!record) {
    console.warn(`[getImageUrlFromDB] Image not found: ${cardId}`)
    return null
  }
  return URL.createObjectURL(record.blob)
} catch (error) {
  console.error(`[getImageUrlFromDB] Failed:`, error)
  return null
}
```

---

## 迁移策略

### 阶段 1: 基础设施就绪

1. ✅ 安装依赖: `pnpm add dexie`
2. ✅ 创建 `database.ts` 定义
3. ✅ 创建 `image-db-helpers.ts` (编辑器)
4. ✅ 创建 `image-manager.ts` (真实卡包)

### 阶段 2: 向后兼容

**现有数据**: 如果用户已有旧版本的图片数据

- ❌ 当前系统没有图片存储,无需迁移
- ✅ 新系统从零开始,无兼容性问题

### 阶段 3: 渐进式启用

1. **编辑器优先**
   - 先实现编辑器图片上传
   - 用户逐步开始使用

2. **真实卡包跟进**
   - 实现 ZIP 导入导出
   - 真实卡包系统集成

3. **统一预览**
   - 实现 `getCardImageUrlAsync()`
   - 所有组件统一使用

---

## 性能优化

### 1. 批量操作优化

```typescript
// ✅ 使用 bulkPut 而不是循环 put
await db.images.bulkPut(imageRecords)

// ❌ 避免
for (const record of imageRecords) {
  await db.images.put(record)
}
```

### 2. 缓存策略

- **编辑器**: 无需缓存 (数据量小,频繁修改)
- **真实卡包**: LRU 缓存 100 个最近使用的图片

### 3. 延迟加载

```typescript
// 图片组件使用异步加载
const [imageUrl, setImageUrl] = useState<string>('')

useEffect(() => {
  getCardImageUrlAsync(card).then(setImageUrl)
}, [card.id])
```

### 4. 内存管理

```typescript
// 组件卸载时清理 Blob URLs
useEffect(() => {
  return () => {
    blobUrls.forEach(url => URL.revokeObjectURL(url))
  }
}, [])
```

---

## 安全考虑

### 1. 文件类型验证

```typescript
const ALLOWED_MIME_TYPES = [
  'image/webp',
  'image/png',
  'image/jpeg'
]

if (!ALLOWED_MIME_TYPES.includes(file.type)) {
  throw new Error('Unsupported file type')
}
```

### 2. 文件大小限制

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024  // 5MB

if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large')
}
```

### 3. 存储配额检查

```typescript
if (navigator.storage && navigator.storage.estimate) {
  const { usage, quota } = await navigator.storage.estimate()
  const usagePercent = (usage / quota) * 100

  if (usagePercent > 90) {
    console.warn('Storage quota nearly full')
  }
}
```

---

## 测试策略

### 单元测试

```typescript
// tests/unit/image-db-helpers.test.ts
describe('Editor Image Manager', () => {
  it('should save and retrieve image', async () => {
    const cardId = 'test-card'
    const file = new File(['test'], 'test.webp', { type: 'image/webp' })

    await saveImageToDB(cardId, file)
    const url = await getImageUrlFromDB(cardId)

    expect(url).toBeTruthy()
    expect(url?.startsWith('blob:')).toBe(true)
  })

  it('should delete image', async () => {
    const cardId = 'test-card'
    await deleteImageFromDB(cardId)
    const url = await getImageUrlFromDB(cardId)

    expect(url).toBeNull()
  })
})
```

### 集成测试

```typescript
// tests/integration/batch-import.test.ts
describe('Batch Image Import', () => {
  it('should import batch images atomically', async () => {
    const images = new Map([
      ['card1', blob1],
      ['card2', blob2]
    ])

    const result = await importBatchImages('batch-1', images)

    expect(result.success).toBe(true)
    expect(result.importedCount).toBe(2)
    expect(result.imageCardIds).toEqual(['card1', 'card2'])
  })
})
```

---

## 故障排查

### 问题 1: IndexedDB 不可用

**症状**: 抛出 "IndexedDB can only be used in browser environment"

**原因**: 在服务端渲染或测试环境调用

**解决**:
```typescript
if (typeof window !== 'undefined') {
  await saveImageToDB(cardId, file)
}
```

### 问题 2: 图片未显示

**症状**: `getImageUrlFromDB()` 返回 null

**排查步骤**:
1. 检查 `cardId` 是否正确
2. 使用 `hasImageInDB()` 确认图片存在
3. 检查浏览器 DevTools → Application → IndexedDB

### 问题 3: 内存泄漏

**症状**: 页面占用内存持续增长

**原因**: Blob URL 未释放

**解决**: 确保组件卸载时调用 `URL.revokeObjectURL()`

---

## 相关文件

### 核心模块
- `card/stores/image-service/database.ts` - 数据库定义
- `card/stores/image-service/image-manager.ts` - 批次图片管理
- `app/card-editor/utils/image-db-helpers.ts` - 编辑器图片管理

### 集成点
- `card/stores/unified-card-store.ts` - Store 集成
- `lib/utils.ts` - 通用图片加载函数
- `components/ui/image-card.tsx` - 图片展示组件

### 文档
- `docs/editor-plan.md` - 编辑器实施方案
- `docs/卡包图片系统设计.md` - 真实卡包设计
- `docs/indexeddb.md` - 本文档

---

## 更新日志

- **2025-01-03** - 初始版本
  - 定义统一 IndexedDB 基础设施
  - 双表隔离架构 (editorImages + images)
  - 直接使用 cardId 作为键,无 batchId 前缀
  - 编辑器和真实卡包完整 API 设计
  - LRU 缓存策略
  - 错误处理和性能优化方案
