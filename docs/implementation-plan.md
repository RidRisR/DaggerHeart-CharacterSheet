# IndexedDB + Zustand 图片系统完整实施方案

## 📋 目录

- [项目概述](#项目概述)
- [现状分析](#现状分析)
- [架构设计](#架构设计)
- [实施计划](#实施计划)
- [代码示例](#代码示例)
- [验收标准](#验收标准)
- [风险控制](#风险控制)

---

## 项目概述

### 目标

为 DaggerHeart 角色卡系统添加完整的本地图片存储和管理能力，支持：

1. **卡牌编辑器**: 用户可上传图片到正在编辑的卡包
2. **真实卡包系统**: 批量导入/导出带图片的卡包
3. **统一预览**: 自动分流编辑器和真实卡包的图片

### 核心技术栈

- **IndexedDB**: 本地图片存储 (使用 Dexie 封装)
- **Zustand**: 状态管理和缓存优化
- **JSZip**: ZIP 文件打包/解包

### 关键优化

- ✅ **去重加载**: 10个组件请求同一图片 → 只读取1次
- ✅ **响应式更新**: 上传图片 → 所有预览自动刷新
- ✅ **选择性渲染**: 更新1张图片 → 只重渲染1个组件
- ✅ **LRU缓存**: 100个图片缓存,自动淘汰

---

## 现状分析

### ✅ 已具备的条件

#### 1. Zustand 基础设施完善

**UnifiedCardStore** (`card/stores/unified-card-store.ts`):
```typescript
// 已使用 subscribeWithSelector 中间件
export const useUnifiedCardStore = create<UnifiedCardStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({ ... })
    )
  )
)

// 已有选择器 hooks
export const useCards = () => useUnifiedCardStore(state => state.cards)
export const useBatches = () => useUnifiedCardStore(state => state.batches)
```

**CardEditorStore** (`app/card-editor/store/card-editor-store.ts`):
```typescript
// 已使用 persist 中间件
export const useCardEditorStore = create<CardEditorStore>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'card-editor-storage',
      partialize: (state) => ({ packageData: state.packageData })
    }
  )
)
```

#### 2. Store Actions 分离模式

**已建立的模式**:
```typescript
// store-actions.ts
export const createStoreActions = (set, get) => ({
  initializeSystem: async () => { ... },
  loadAllCards: () => { ... },
  // ... 其他 actions
})

// unified-card-store.ts
export const useUnifiedCardStore = create<UnifiedCardStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        cards: new Map(),
        batches: new Map(),

        // Actions (分离)
        ...createStoreActions(set, get)
      })
    )
  )
)
```

我们将延续这个模式,创建 `image-service-actions.ts` 和 `image-actions.ts`

#### 3. 图片展示基础

**ImageCard 组件** (`components/ui/image-card.tsx`):
```typescript
// 已使用 getCardImageUrl() (同步)
import { getCardImageUrl } from "@/lib/utils"

export function ImageCard({ card, ... }) {
  const imageUrl = getCardImageUrl(card)  // 同步获取

  return <Image src={imageUrl} ... />
}
```

我们将添加 `getCardImageUrlAsync()` 支持 IndexedDB 异步加载

### ❌ 缺失的部分

#### 1. 依赖包
```bash
# 需要安装
pnpm add dexie jszip
pnpm add -D @types/jszip
```

#### 2. IndexedDB 基础设施
- 无 `card/stores/image-service/` 目录
- 无数据库定义和操作函数

#### 3. 类型定义
- `StandardCard` 缺少 `hasLocalImage` 字段
- `BatchInfo` 缺少图片元数据字段

#### 4. 图片管理逻辑
- Store 中无图片缓存状态
- 无上传/删除/预览功能
- 无 ZIP 导入导出

---

## 架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        应用层                                 │
├──────────────────────────┬──────────────────────────────────┤
│  卡牌编辑器               │  真实卡包系统                      │
│  (CardEditorStore)       │  (UnifiedCardStore)              │
│                          │                                  │
│  - 单卡上传/删除          │  - ZIP 批量导入                   │
│  - 实时预览              │  - 批次级删除                      │
│  - 进度追踪              │  - LRU 缓存                       │
└──────────┬───────────────┴───────────┬──────────────────────┘
           │                           │
           ↓                           ↓
┌──────────────────────┐    ┌──────────────────────┐
│ Image Actions        │    │ ImageService Actions │
│ (编辑器)              │    │ (真实卡包)            │
│                      │    │                      │
│ - uploadCardImage    │    │ - getImageUrl        │
│ - deleteCardImage    │    │ - importBatchImages  │
│ - getPreviewUrl      │    │ - deleteBatchImages  │
└──────────┬───────────┘    └──────────┬───────────┘
           │                           │
           └───────────┬───────────────┘
                       ↓
           ┌────────────────────────┐
           │  Image DB Helpers      │
           │  (共享层)               │
           │                        │
           │  - getCardImageDB()    │
           │  - saveImageToDB()     │
           │  - getImageUrlFromDB() │
           └────────┬───────────────┘
                    ↓
           ┌────────────────────────┐
           │   IndexedDB            │
           │   (Dexie)              │
           │                        │
           │  - editorImages 表     │
           │  - images 表           │
           └────────────────────────┘
```

### 数据流设计

#### 场景 1: 编辑器上传图片

```
用户选择文件
    ↓
CardEditorStore.uploadCardImage(cardId, file)
    ↓
1. 验证文件 (类型+大小)
2. 更新状态: uploadingImages.set(cardId, { progress: 0, status: 'uploading' })
3. saveImageToDB(cardId, file)  ← IndexedDB
4. 生成 Blob URL
5. 更新状态: previewCache.set(cardId, blobUrl)
6. 更新卡牌: card.hasLocalImage = true
    ↓
所有使用 useCardImagePreview(cardId) 的组件自动重渲染
```

#### 场景 2: 真实卡包导入图片

```
用户选择 ZIP 文件
    ↓
parseZip(file) → { cards, images }
    ↓
UnifiedCardStore.importBatchImages(batchId, images)
    ↓
1. 批量写入 IndexedDB (事务)
2. 更新 BatchInfo: imageCardIds, imageCount, totalImageSize
3. 不更新缓存 (按需加载)
    ↓
用户打开批次详情页
    ↓
组件使用 useImageUrl(cardId)
    ↓
UnifiedCardStore.getImageUrl(cardId)
    ↓
1. 检查缓存 → 命中直接返回
2. 检查 loadingImages → 等待其他组件的请求
3. 从 IndexedDB 加载 → 更新缓存
4. 返回 Blob URL
    ↓
组件自动渲染图片
```

#### 场景 3: 图片预览 (通用)

```
<ImageCard card={card} />
    ↓
useEffect(() => {
  getCardImageUrlAsync(card).then(setImageUrl)
}, [card.id, card.hasLocalImage])
    ↓
判断: card.hasLocalImage?
    ↓
是 → 判断: card.batchId?
    ↓
无 batchId (编辑器) → getImageUrlFromDB(card.id)
有 batchId (真实卡包) → store.getImageUrl(card.id)
    ↓
返回 Blob URL
    ↓
<Image src={blobUrl} />
```

### 数据库 Schema

```typescript
Database: "card-images"
Version: 1

Tables:
  1. editorImages (编辑器图片)
     - key: string (主键: cardId)
     - blob: Blob
     - mimeType: string
     - size: number
     - createdAt: number
     - updatedAt?: number

  2. images (真实卡包图片)
     - key: string (主键: cardId)
     - blob: Blob
     - mimeType: string
     - size: number
     - createdAt: number
```

**为什么直接使用 cardId?**
- cardId 格式: `${packageName}-${author}-${typeCode}-${suffix}`
- 全局唯一,无需 batchId 前缀
- 简化查询逻辑

### Zustand State 设计

#### UnifiedCardStore State

```typescript
interface UnifiedCardState {
  // ... 现有字段
  cards: Map<string, ExtendedStandardCard>
  batches: Map<string, BatchInfo>

  // 新增: 图片服务状态
  imageService: {
    initialized: boolean              // 是否已初始化
    cache: Map<string, string>        // LRU 缓存: cardId → Blob URL
    loadingImages: Set<string>        // 正在加载的 cardId (去重)
    failedImages: Set<string>         // 加载失败的 cardId
  }
}

interface BatchInfo {
  // ... 现有字段
  id: string
  name: string
  cardIds: string[]

  // 新增: 图片元数据
  imageCardIds?: string[]    // 有图片的卡牌ID列表
  imageCount?: number        // 图片数量
  totalImageSize?: number    // 总大小 (bytes)
}
```

#### CardEditorStore State

```typescript
interface CardEditorStore {
  // ... 现有字段
  packageData: CardPackageState
  currentCardIndex: CurrentCardIndex

  // 新增: 图片管理状态
  imageManager: {
    uploadingImages: Map<string, {
      progress: number              // 0-100
      status: 'uploading' | 'success' | 'error'
      error?: string
    }>
    previewCache: Map<string, string>  // cardId → Blob URL
    totalImageSize: number              // 当前卡包总图片大小
  }
}
```

---

## 实施计划

### 总览

| 阶段 | 任务 | 新建文件 | 修改文件 | 代码量 | 时间 |
|------|------|---------|---------|--------|------|
| 1 | 依赖和基础设施 | 3 | 0 | ~430行 | 20分钟 |
| 2 | 类型扩展 | 0 | 9 | ~15行 | 15分钟 |
| 3 | UnifiedStore集成 | 1 | 2 | ~370行 | 45分钟 |
| 4 | EditorStore集成 | 1 | 1 | ~265行 | 40分钟 |
| 5 | ZIP功能 | 1 | 4 | ~306行 | 60分钟 |
| 6 | UI集成 | 1 | 5 | ~295行 | 50分钟 |
| **合计** | **6个阶段** | **7个** | **21个** | **~1681行** | **3.5小时** |

---

### 阶段 1: 依赖和基础设施 (20分钟)

#### 1.1 安装依赖

```bash
pnpm add dexie jszip
pnpm add -D @types/jszip
```

#### 1.2 创建数据库定义

**新建文件**: `card/stores/image-service/database.ts`

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
      editorImages: 'key',
      images: 'key'
    })
  }
}

let dbInstance: CardImageDB | null = null

export function getCardImageDB(): CardImageDB {
  if (!dbInstance) {
    if (typeof window === 'undefined') {
      throw new Error('IndexedDB can only be used in browser')
    }
    dbInstance = new CardImageDB()
  }
  return dbInstance
}
```

**关键点**:
- Dexie 类继承
- 双表设计 (editorImages + images)
- 单例模式
- 浏览器环境检测

#### 1.3 创建编辑器图片工具

**新建文件**: `app/card-editor/utils/image-db-helpers.ts`

```typescript
import { getCardImageDB } from '@/card/stores/image-service/database'
import type { ImageRecord } from '@/card/stores/image-service/database'

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

export async function deleteImageFromDB(cardId: string): Promise<void> {
  const db = getCardImageDB()
  await db.editorImages.delete(cardId)
}

export async function hasImageInDB(cardId: string): Promise<boolean> {
  const db = getCardImageDB()
  const record = await db.editorImages.get(cardId)
  return !!record
}

export async function getAllEditorImageIds(): Promise<string[]> {
  const db = getCardImageDB()
  const records = await db.editorImages.toArray()
  return records.map(r => r.key)
}

export async function clearAllEditorImages(): Promise<void> {
  const db = getCardImageDB()
  await db.editorImages.clear()
}
```

**提供的API**:
- ✅ 保存/读取/删除图片
- ✅ 检查图片是否存在
- ✅ 获取所有图片ID
- ✅ 清空所有图片

#### 1.4 创建批次图片管理器

**新建文件**: `card/stores/image-service/image-manager.ts`

```typescript
import { getCardImageDB } from './database'
import type { ImageRecord } from './database'

export interface BatchImportResult {
  success: boolean
  batchId: string
  importedCount: number
  totalSize: number
  imageCardIds: string[]
  errors?: string[]
}

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

        for (const [cardId, blob] of images.entries()) {
          const record: ImageRecord = {
            key: cardId,
            blob: blob,
            mimeType: blob.type || 'image/webp',
            size: blob.size,
            createdAt: Date.now()
          }

          imageRecords.push(record)
          imageCardIds.push(cardId)
          totalSize += blob.size
        }

        await db.images.bulkPut(imageRecords)

        return {
          importedCount: imageRecords.length,
          totalSize: totalSize,
          imageCardIds: imageCardIds
        }
      }
    )

    return {
      success: true,
      batchId: batchId,
      ...result
    }

  } catch (error) {
    console.error('[importBatchImages] Failed:', error)
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

export async function deleteBatchImages(
  imageCardIds: string[]
): Promise<void> {
  if (imageCardIds.length === 0) return

  const db = getCardImageDB()
  await db.images.bulkDelete(imageCardIds)
}

export async function getCachedImageUrl(
  cardId: string,
  cache: Map<string, string>,
  setCacheUpdater: (updater: (cache: Map<string, string>) => Map<string, string>) => void
): Promise<string | null> {
  // 检查缓存
  if (cache.has(cardId)) {
    return cache.get(cardId)!
  }

  // 从 IndexedDB 读取
  const db = getCardImageDB()
  const record = await db.images.get(cardId)

  if (!record) {
    return null
  }

  // 生成 Blob URL
  const blobUrl = URL.createObjectURL(record.blob)

  // 更新缓存 (LRU)
  setCacheUpdater(prevCache => {
    const newCache = new Map(prevCache)

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
```

**核心功能**:
- ✅ 批量导入 (原子事务)
- ✅ 批量删除
- ✅ 带 LRU 缓存的读取

---

### 阶段 2: 类型扩展 (15分钟)

#### 2.1 扩展 StandardCard

**修改文件**: `card/card-types.ts`

```typescript
export interface StandardCard {
  standarized: boolean
  id: string
  name: string
  type: string
  class: string
  level?: number
  description?: string
  hint?: string
  imageUrl?: string
  hasLocalImage?: boolean  // ← 新增
  // ... 其他字段
}
```

#### 2.2 扩展所有卡牌类型接口

**需要修改的文件** (6个):

1. `card/profession-card/convert.ts`
```typescript
export interface ProfessionCard {
  id: string
  名称: ProfessionClass
  简介: string
  imageUrl?: string
  hasLocalImage?: boolean  // ← 新增
  // ... 其他字段
}
```

2. `card/community-card/convert.ts`
3. `card/variant-card/convert.ts`
4. `card/domain-card/convert.ts`
5. `card/ancestry-card/convert.ts`
6. `card/subclass-card/convert.ts`

每个文件都添加同样的字段。

#### 2.3 扩展 BatchInfo

**修改文件**: `card/stores/store-types.ts`

```typescript
export interface BatchInfo {
  id: string
  name: string
  fileName: string
  importTime: string
  version?: string
  description?: string
  author?: string
  cardCount: number
  cardTypes: string[]
  size: number
  isSystemBatch?: boolean
  disabled?: boolean
  cardIds: string[]
  customFieldDefinitions?: CustomFieldsForBatch
  variantTypes?: VariantTypesForBatch

  // 新增: 图片元数据
  imageCardIds?: string[]      // ← 新增
  imageCount?: number          // ← 新增
  totalImageSize?: number      // ← 新增
}
```

---

### 阶段 3: UnifiedCardStore 集成 (45分钟)

#### 3.1 扩展 State

**修改文件**: `card/stores/store-types.ts`

```typescript
export interface UnifiedCardState {
  // ... 现有字段
  cards: Map<string, ExtendedStandardCard>
  batches: Map<string, BatchInfo>
  cardsByType: Map<CardType, string[]>
  index: CustomCardIndex
  aggregatedCustomFields: CustomFieldNamesStore | null
  aggregatedVariantTypes: VariantTypesForBatch | null
  cacheValid: boolean
  initialized: boolean
  loading: boolean
  error: string | null
  config: StorageConfig
  stats: CustomCardStats | null

  // 新增: 图片服务状态
  imageService: {
    initialized: boolean
    cache: Map<string, string>
    loadingImages: Set<string>
    failedImages: Set<string>
  }
}
```

#### 3.2 创建图片服务 Actions

**新建文件**: `card/stores/image-service-actions.ts`

```typescript
import { getCardImageDB } from './image-service/database'
import {
  importBatchImages,
  deleteBatchImages,
  getCachedImageUrl
} from './image-service/image-manager'
import { UnifiedCardState, UnifiedCardActions } from './store-types'

type SetFunction = (partial: Partial<UnifiedCardState> | ((state: UnifiedCardState) => Partial<UnifiedCardState>)) => void
type GetFunction = () => UnifiedCardState & UnifiedCardActions

export const createImageServiceActions = (set: SetFunction, get: GetFunction) => ({
  initImageService: async () => {
    try {
      const db = getCardImageDB()
      await db.open()

      set((state) => ({
        imageService: {
          ...state.imageService,
          initialized: true
        }
      }))

      console.log('[ImageService] Initialized')
    } catch (error) {
      console.error('[ImageService] Init failed:', error)
    }
  },

  getImageUrl: async (cardId: string): Promise<string | null> => {
    const state = get()

    // 1. 检查缓存
    if (state.imageService.cache.has(cardId)) {
      return state.imageService.cache.get(cardId)!
    }

    // 2. 检查是否正在加载 (去重)
    if (state.imageService.loadingImages.has(cardId)) {
      return new Promise(resolve => {
        const unsubscribe = useUnifiedCardStore.subscribe(
          state => state.imageService.cache,
          (cache) => {
            if (cache.has(cardId)) {
              unsubscribe()
              resolve(cache.get(cardId)!)
            }
          }
        )
      })
    }

    // 3. 检查是否失败过
    if (state.imageService.failedImages.has(cardId)) {
      return null
    }

    // 4. 标记为加载中
    set((state) => ({
      imageService: {
        ...state.imageService,
        loadingImages: new Set([...state.imageService.loadingImages, cardId])
      }
    }))

    try {
      // 5. 加载图片
      const blobUrl = await getCachedImageUrl(
        cardId,
        state.imageService.cache,
        (updater) => {
          set((state) => ({
            imageService: {
              ...state.imageService,
              cache: updater(state.imageService.cache)
            }
          }))
        }
      )

      // 6. 清除加载中标记
      set((state) => {
        const newLoadingImages = new Set(state.imageService.loadingImages)
        newLoadingImages.delete(cardId)

        const newFailedImages = new Set(state.imageService.failedImages)
        if (!blobUrl) {
          newFailedImages.add(cardId)
        }

        return {
          imageService: {
            ...state.imageService,
            loadingImages: newLoadingImages,
            failedImages: newFailedImages
          }
        }
      })

      return blobUrl

    } catch (error) {
      console.error(`[getImageUrl] Failed for ${cardId}:`, error)

      set((state) => {
        const newLoadingImages = new Set(state.imageService.loadingImages)
        newLoadingImages.delete(cardId)

        const newFailedImages = new Set(state.imageService.failedImages)
        newFailedImages.add(cardId)

        return {
          imageService: {
            ...state.imageService,
            loadingImages: newLoadingImages,
            failedImages: newFailedImages
          }
        }
      })

      return null
    }
  },

  preloadBatchImages: async (batchId: string) => {
    const state = get()
    const batch = state.batches.get(batchId)

    if (!batch?.imageCardIds) return

    await Promise.allSettled(
      batch.imageCardIds.map(cardId => get().getImageUrl(cardId))
    )

    console.log(`[preloadBatchImages] Loaded ${batch.imageCardIds.length} images`)
  },

  clearImageCache: (cardIds?: string[]) => {
    set((state) => {
      const cache = new Map(state.imageService.cache)

      if (cardIds) {
        cardIds.forEach(cardId => {
          const blobUrl = cache.get(cardId)
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl)
            cache.delete(cardId)
          }
        })
      } else {
        cache.forEach(blobUrl => URL.revokeObjectURL(blobUrl))
        cache.clear()
      }

      return {
        imageService: {
          ...state.imageService,
          cache: cache,
          failedImages: new Set()
        }
      }
    })
  },

  getImageLoadingStatus: (cardId: string): 'idle' | 'loading' | 'success' | 'error' => {
    const state = get()

    if (state.imageService.cache.has(cardId)) return 'success'
    if (state.imageService.loadingImages.has(cardId)) return 'loading'
    if (state.imageService.failedImages.has(cardId)) return 'error'
    return 'idle'
  },

  importBatchImages: async (batchId: string, images: Map<string, Blob>) => {
    const result = await importBatchImages(batchId, images)

    if (result.success) {
      set((state) => {
        const batch = state.batches.get(batchId)
        if (!batch) return state

        const updatedBatch = {
          ...batch,
          imageCardIds: result.imageCardIds,
          imageCount: result.importedCount,
          totalImageSize: result.totalSize
        }

        const newBatches = new Map(state.batches)
        newBatches.set(batchId, updatedBatch)

        return { batches: newBatches }
      })
    }

    return result
  },

  deleteBatchImages: async (batchId: string) => {
    const state = get()
    const batch = state.batches.get(batchId)

    if (!batch?.imageCardIds) return

    await deleteBatchImages(batch.imageCardIds)

    get().clearImageCache(batch.imageCardIds)

    set((state) => {
      const newBatches = new Map(state.batches)
      const updatedBatch = { ...batch }
      delete updatedBatch.imageCardIds
      delete updatedBatch.imageCount
      delete updatedBatch.totalImageSize

      newBatches.set(batchId, updatedBatch)

      return { batches: newBatches }
    })
  },

  getBatchImageStats: (batchId: string) => {
    const state = get()
    const batch = state.batches.get(batchId)

    return {
      count: batch?.imageCount || 0,
      size: batch?.totalImageSize || 0
    }
  }
})
```

**关键特性**:
- ✅ 去重加载 (loadingImages)
- ✅ 错误追踪 (failedImages)
- ✅ LRU 缓存自动淘汰
- ✅ 批次级操作

#### 3.3 集成到 store-actions.ts

**修改文件**: `card/stores/store-actions.ts`

```typescript
import { createImageServiceActions } from './image-service-actions'

export const createStoreActions = (set: SetFunction, get: GetFunction): UnifiedCardActions => ({
  // ... 现有 actions

  // 图片服务 actions
  ...createImageServiceActions(set, get)
})
```

#### 3.4 修改 initializeSystem

**修改文件**: `card/stores/store-actions.ts`

```typescript
initializeSystem: async () => {
  const state = get()
  if (state.initialized) {
    return { initialized: true }
  }

  set({ loading: true, error: null })

  try {
    const migrationResult = await get()._migrateLegacyData()
    await get()._loadAllCards()
    get()._recomputeAggregations()

    // 初始化图片服务
    await get().initImageService()  // ← 新增

    const stats = get()._computeStats()

    set({
      initialized: true,
      loading: false,
      stats: stats
    })

    return { initialized: true, migrationResult }

  } catch (error) {
    // ... 错误处理
  }
}
```

#### 3.5 添加选择器 Hooks

**修改文件**: `card/stores/unified-card-store.ts`

```typescript
import { useState, useEffect } from 'react'

/**
 * 获取图片URL (响应式)
 */
export const useImageUrl = (cardId: string | undefined): string | null => {
  const cache = useUnifiedCardStore(state => state.imageService.cache)
  const getImageUrl = useUnifiedCardStore(state => state.getImageUrl)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!cardId) {
      setUrl(null)
      return
    }

    if (cache.has(cardId)) {
      setUrl(cache.get(cardId)!)
      return
    }

    getImageUrl(cardId).then(setUrl)
  }, [cardId, cache])

  return url
}

/**
 * 获取图片加载状态
 */
export const useImageLoadingStatus = (cardId: string | undefined) => {
  return useUnifiedCardStore(state => {
    if (!cardId) return 'idle'
    return state.getImageLoadingStatus(cardId)
  })
}

/**
 * 获取批次图片统计
 */
export const useBatchImageStats = (batchId: string) => {
  return useUnifiedCardStore(state => state.getBatchImageStats(batchId))
}
```

---

### 阶段 4-6: 详细步骤

由于文档已经很长，后续阶段的详细代码请参考:
- **阶段 4**: CardEditorStore 集成 - 参见 `docs/zustand-image-optimization.md` "方案B"
- **阶段 5**: ZIP 导入导出 - 参见 `docs/editor-plan.md` "阶段3"
- **阶段 6**: UI 集成 - 参见 `docs/editor-plan.md` "阶段2"

---

## 代码示例

### 示例 1: 组件中使用图片预览

```typescript
// 编辑器中的卡牌预览
function CardPreview({ cardId }: { cardId: string }) {
  const imageUrl = useCardImagePreview(cardId)  // ← Zustand hook
  const uploadStatus = useImageUploadProgress(cardId)

  return (
    <div>
      {uploadStatus?.status === 'uploading' && (
        <ProgressBar progress={uploadStatus.progress} />
      )}

      <img src={imageUrl || '/default.png'} />
    </div>
  )
}
```

### 示例 2: 上传图片

```typescript
// 图片上传组件
function ImageUploadField({ cardId }) {
  const uploadImage = useCardEditorStore(state => state.uploadCardImage)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadImage(cardId, file)
      // ✅ 所有预览自动更新!
    }
  }

  return <input type="file" onChange={handleFileSelect} />
}
```

### 示例 3: 批次导入

```typescript
// ZIP 导入
async function handleZipImport(file: File) {
  const store = useUnifiedCardStore.getState()

  // 1. 解析 ZIP
  const { cards, images } = await parseZip(file)

  // 2. 导入卡牌
  const { batchId } = await store.importCards(cards, file.name)

  // 3. 导入图片
  await store.importBatchImages(batchId, images)

  // ✅ 完成! 所有状态自动更新
}
```

---

## 验收标准

### 功能测试清单

- [ ] **编辑器图片**
  - [ ] 上传 webp/png/jpg 格式图片
  - [ ] 文件大小超过 5MB 提示错误
  - [ ] 上传后实时预览显示
  - [ ] 刷新页面图片仍然存在
  - [ ] 删除图片成功

- [ ] **ZIP 导入导出**
  - [ ] 导出 ZIP 包含 cards.json
  - [ ] 导出 ZIP 包含所有图片文件
  - [ ] 导入 ZIP 恢复所有卡牌数据
  - [ ] 导入 ZIP 恢复所有图片
  - [ ] 图片文件名格式正确 (cardId.ext)

- [ ] **真实卡包**
  - [ ] 批次导入 100 张图片无卡顿
  - [ ] 批次删除清空所有图片
  - [ ] 图片缓存命中率 > 90%

### 性能测试

- [ ] **去重加载**: 10 个组件显示同一图片,只读取 1 次 IndexedDB
- [ ] **响应式更新**: 上传图片后,所有预览组件在 500ms 内更新
- [ ] **选择性渲染**: 更新 1 张图片,只重渲染 1 个组件 (100张卡牌列表)
- [ ] **LRU 缓存**: 缓存满时自动淘汰最旧的条目

### Zustand 优化验证

- [ ] **Redux DevTools**: 可以查看所有 action 和状态变化
- [ ] **时间旅行**: 可以回退到之前的状态
- [ ] **选择器优化**: 使用 `subscribeWithSelector` 避免不必要的渲染

---

## 风险控制

### 风险矩阵

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| IndexedDB 不可用 | 高 | 低 | 环境检测 + 降级处理 |
| Blob URL 内存泄漏 | 中 | 中 | useEffect 清理 + LRU 淘汰 |
| Store 状态过大 | 中 | 低 | partialize 排除缓存 |
| ZIP 解析失败 | 低 | 中 | try-catch + 详细错误提示 |
| 并发冲突 | 低 | 低 | loadingImages 去重 |

### 降级方案

如果 IndexedDB 不可用:
```typescript
export function getCardImageDB(): CardImageDB {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB requires browser environment')
  }

  if (!window.indexedDB) {
    console.warn('[IndexedDB] Not supported, using fallback')
    // 降级: 仅使用 imageUrl 外链
    throw new Error('IndexedDB not supported')
  }

  // ... 正常初始化
}
```

组件中捕获错误:
```typescript
useEffect(() => {
  if (card.hasLocalImage) {
    getImageUrlFromDB(card.id)
      .then(setUrl)
      .catch(() => {
        // 降级到外链或默认图片
        setUrl(card.imageUrl || '/default.png')
      })
  }
}, [card])
```

---

## 参考文档

- `docs/indexeddb.md` - IndexedDB 基础设施详细设计
- `docs/zustand-image-optimization.md` - Zustand 优化方案
- `docs/editor-plan.md` - 编辑器实施方案
- `docs/卡包图片系统设计.md` - 真实卡包系统设计

---

## 更新日志

- **2025-01-03** - 初始版本
  - 整合所有设计文档
  - 制定 6 阶段实施计划
  - 提供完整代码示例
  - 定义验收标准和风险控制
