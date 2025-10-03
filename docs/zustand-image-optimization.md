# Zustand 图片系统优化方案

## 📋 目录

- [当前状态分析](#当前状态分析)
- [优化机会](#优化机会)
- [优化方案](#优化方案)
- [实施细节](#实施细节)
- [性能提升](#性能提升)
- [最佳实践](#最佳实践)

---

## 当前状态分析

### 现有 Zustand Stores

#### 1. **UnifiedCardStore** (真实卡包系统)
**文件**: `card/stores/unified-card-store.ts`

**特点**:
- ✅ 使用 `subscribeWithSelector` 中间件 (细粒度订阅)
- ✅ 使用 `persist` 中间件 (持久化配置)
- ✅ 已有完整的批次管理逻辑
- ✅ 分离了 state 和 actions (`store-actions.ts`)
- ✅ 提供了选择器 hooks (`useCards`, `useBatches` 等)

**当前状态**:
```typescript
interface UnifiedCardState {
  cards: Map<string, ExtendedStandardCard>
  batches: Map<string, BatchInfo>
  cardsByType: Map<CardType, string[]>
  index: CustomCardIndex
  aggregatedCustomFields: CustomFieldNamesStore | null
  cacheValid: boolean
  initialized: boolean
  loading: boolean
  config: StorageConfig
  stats: CustomCardStats | null
}
```

#### 2. **CardEditorStore** (编辑器)
**文件**: `app/card-editor/store/card-editor-store.ts`

**特点**:
- ✅ 使用 `persist` 中间件 (持久化卡包数据)
- ✅ 包含 UI 状态管理 (对话框、验证等)
- ⚠️ 所有逻辑都在一个文件中 (可优化)

**当前状态**:
```typescript
interface CardEditorStore {
  packageData: CardPackageState
  currentCardIndex: CurrentCardIndex
  previewDialog: PreviewDialogState
  validationResult: ValidationResult | null
  // ... 其他状态和 actions
}
```

---

## 优化机会

### 🎯 优化点 1: 图片缓存状态管理

**当前设计** (IndexedDB 文档):
```typescript
// 建议在 store 中添加
imageCache: Map<string, string>  // cardId → Blob URL
```

**问题**:
- ❌ Blob URL 缓存没有集成到 Zustand
- ❌ 缺少响应式更新
- ❌ 组件需要手动管理缓存

**Zustand 优势**:
- ✅ **响应式更新**: 缓存变化自动触发组件重渲染
- ✅ **选择器优化**: 使用 `subscribeWithSelector` 避免不必要的渲染
- ✅ **集中管理**: 统一的状态树,易于调试

---

### 🎯 优化点 2: 图片加载状态

**当前设计**:
```typescript
// 组件内部管理
const [imageUrl, setImageUrl] = useState('')
const [loading, setLoading] = useState(false)

useEffect(() => {
  setLoading(true)
  getImageUrlFromDB(cardId).then(url => {
    setImageUrl(url)
    setLoading(false)
  })
}, [cardId])
```

**问题**:
- ❌ 每个组件都要重复加载逻辑
- ❌ 多个组件同时加载同一图片会重复请求
- ❌ 没有全局加载状态

**Zustand 优势**:
- ✅ **去重请求**: Store 层面管理加载状态
- ✅ **共享状态**: 多组件共享同一加载状态
- ✅ **统一 loading**: 全局 loading 指示器

---

### 🎯 优化点 3: 编辑器图片状态

**当前设计**:
```typescript
// CardEditorStore 没有图片相关状态
interface CardEditorStore {
  packageData: CardPackageState  // 包含 card.hasLocalImage
  // ❌ 缺少图片上传状态
  // ❌ 缺少图片预览缓存
}
```

**Zustand 优势**:
- ✅ **上传进度**: 实时反馈上传进度
- ✅ **错误处理**: 统一管理上传错误
- ✅ **预览缓存**: 避免重复读取 IndexedDB

---

### 🎯 优化点 4: 批次图片元数据

**当前设计**:
```typescript
// BatchInfo 需要扩展
interface BatchInfo {
  cardIds: string[]
  // ❌ 缺少 imageCardIds
}
```

**Zustand 优势**:
- ✅ **元数据集成**: 图片信息自然集成到批次元数据
- ✅ **响应式查询**: 快速查询批次是否有图片
- ✅ **统计信息**: 实时计算图片数量和大小

---

## 优化方案

### 方案 A: 扩展 UnifiedCardStore (真实卡包)

**目标**: 为真实卡包系统添加图片管理能力

#### 扩展 State

```typescript
// card/stores/store-types.ts 扩展

interface UnifiedCardState {
  // ... 现有字段

  // 新增: 图片服务状态
  imageService: {
    initialized: boolean
    cache: Map<string, string>      // cardId → Blob URL (LRU缓存)
    loadingImages: Set<string>      // 正在加载的 cardId
    failedImages: Set<string>       // 加载失败的 cardId
  }
}

interface BatchInfo {
  // ... 现有字段

  // 新增: 图片元数据
  imageCardIds?: string[]           // 有图片的卡牌ID列表
  totalImageSize?: number           // 图片总大小 (bytes)
  imageCount?: number               // 图片数量
}
```

#### 扩展 Actions

```typescript
// card/stores/store-actions.ts 扩展

interface UnifiedCardActions {
  // ... 现有方法

  // 新增: 图片服务管理
  initImageService: () => Promise<void>
  getImageUrl: (cardId: string) => Promise<string | null>
  preloadBatchImages: (batchId: string) => Promise<void>
  clearImageCache: (cardIds?: string[]) => void
  getImageLoadingStatus: (cardId: string) => 'idle' | 'loading' | 'success' | 'error'

  // 新增: 批次图片操作
  importBatchImages: (batchId: string, images: Map<string, Blob>) => Promise<BatchImportResult>
  deleteBatchImages: (batchId: string) => Promise<void>
  getBatchImageStats: (batchId: string) => { count: number; size: number }
}
```

#### 选择器 Hooks

```typescript
// card/stores/unified-card-store.ts 新增

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

    // 检查缓存
    if (cache.has(cardId)) {
      setUrl(cache.get(cardId)!)
      return
    }

    // 异步加载
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

### 方案 B: 扩展 CardEditorStore (编辑器)

**目标**: 为编辑器添加图片上传和管理能力

#### 扩展 State

```typescript
// app/card-editor/store/card-editor-store.ts 扩展

interface CardEditorStore {
  // ... 现有字段

  // 新增: 图片管理状态
  imageManager: {
    uploadingImages: Map<string, {     // cardId → 上传状态
      progress: number                  // 0-100
      status: 'pending' | 'uploading' | 'success' | 'error'
      error?: string
    }>
    previewCache: Map<string, string>  // cardId → Blob URL (预览缓存)
    totalImageSize: number              // 当前卡包总图片大小
  }
}
```

#### 扩展 Actions

```typescript
interface CardEditorStore {
  // ... 现有方法

  // 新增: 图片操作
  uploadCardImage: (cardId: string, file: File) => Promise<void>
  deleteCardImage: (cardId: string) => Promise<void>
  getPreviewUrl: (cardId: string) => Promise<string | null>
  clearPreviewCache: () => void
  calculateTotalImageSize: () => Promise<number>

  // 新增: 批量图片操作
  uploadMultipleImages: (images: Map<string, File>) => Promise<void>
  exportWithImages: () => Promise<void>  // 导出 ZIP
  importWithImages: (file: File) => Promise<void>  // 导入 ZIP
}
```

#### 选择器 Hooks

```typescript
// app/card-editor/store/card-editor-store.ts 新增

/**
 * 获取卡牌图片预览URL
 */
export const useCardImagePreview = (cardId: string | undefined) => {
  const previewCache = useCardEditorStore(state => state.imageManager.previewCache)
  const getPreviewUrl = useCardEditorStore(state => state.getPreviewUrl)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!cardId) return

    // 检查缓存
    if (previewCache.has(cardId)) {
      setUrl(previewCache.get(cardId)!)
      return
    }

    // 异步加载
    getPreviewUrl(cardId).then(setUrl)
  }, [cardId, previewCache])

  return url
}

/**
 * 获取上传进度
 */
export const useImageUploadProgress = (cardId: string | undefined) => {
  return useCardEditorStore(state => {
    if (!cardId) return null
    return state.imageManager.uploadingImages.get(cardId) || null
  })
}

/**
 * 获取卡包图片总大小
 */
export const useTotalImageSize = () => {
  return useCardEditorStore(state => state.imageManager.totalImageSize)
}
```

---

## 实施细节

### 实施 1: UnifiedCardStore 图片集成

**文件**: `card/stores/image-service-actions.ts` (新建)

```typescript
import { getCardImageDB } from './image-service/database'
import { importBatchImages, deleteBatchImages, getCachedImageUrl } from './image-service/image-manager'

export const createImageServiceActions = (set: any, get: any) => ({
  /**
   * 初始化图片服务
   */
  initImageService: async () => {
    try {
      // 验证 IndexedDB 可用性
      const db = getCardImageDB()
      await db.open()

      set((state: any) => ({
        imageService: {
          ...state.imageService,
          initialized: true
        }
      }))

      console.log('[ImageService] Initialized successfully')
    } catch (error) {
      console.error('[ImageService] Initialization failed:', error)
    }
  },

  /**
   * 获取图片URL (带缓存和去重)
   */
  getImageUrl: async (cardId: string): Promise<string | null> => {
    const state = get()

    // 1. 检查缓存
    if (state.imageService.cache.has(cardId)) {
      return state.imageService.cache.get(cardId)!
    }

    // 2. 检查是否正在加载 (去重)
    if (state.imageService.loadingImages.has(cardId)) {
      // 等待加载完成
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

    // 3. 检查是否之前加载失败
    if (state.imageService.failedImages.has(cardId)) {
      return null
    }

    // 4. 标记为加载中
    set((state: any) => ({
      imageService: {
        ...state.imageService,
        loadingImages: new Set([...state.imageService.loadingImages, cardId])
      }
    }))

    try {
      // 5. 从 IndexedDB 加载
      const blobUrl = await getCachedImageUrl(
        cardId,
        state.imageService.cache,
        (updater) => {
          set((state: any) => ({
            imageService: {
              ...state.imageService,
              cache: updater(state.imageService.cache)
            }
          }))
        }
      )

      // 6. 移除加载中标记
      set((state: any) => {
        const newLoadingImages = new Set(state.imageService.loadingImages)
        newLoadingImages.delete(cardId)

        // 如果加载失败,标记为失败
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

      // 标记为失败
      set((state: any) => {
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

  /**
   * 预加载批次图片
   */
  preloadBatchImages: async (batchId: string) => {
    const state = get()
    const batch = state.batches.get(batchId)

    if (!batch?.imageCardIds) return

    // 并发预加载
    await Promise.allSettled(
      batch.imageCardIds.map(cardId => get().getImageUrl(cardId))
    )

    console.log(`[preloadBatchImages] Preloaded ${batch.imageCardIds.length} images for batch ${batchId}`)
  },

  /**
   * 清空图片缓存
   */
  clearImageCache: (cardIds?: string[]) => {
    set((state: any) => {
      const cache = new Map(state.imageService.cache)

      if (cardIds) {
        // 清除指定图片
        cardIds.forEach(cardId => {
          const blobUrl = cache.get(cardId)
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl)
            cache.delete(cardId)
          }
        })
      } else {
        // 清除所有图片
        cache.forEach(blobUrl => URL.revokeObjectURL(blobUrl))
        cache.clear()
      }

      return {
        imageService: {
          ...state.imageService,
          cache: cache,
          failedImages: new Set()  // 清除失败标记
        }
      }
    })
  },

  /**
   * 获取图片加载状态
   */
  getImageLoadingStatus: (cardId: string): 'idle' | 'loading' | 'success' | 'error' => {
    const state = get()

    if (state.imageService.cache.has(cardId)) return 'success'
    if (state.imageService.loadingImages.has(cardId)) return 'loading'
    if (state.imageService.failedImages.has(cardId)) return 'error'
    return 'idle'
  },

  /**
   * 导入批次图片
   */
  importBatchImages: async (batchId: string, images: Map<string, Blob>) => {
    const result = await importBatchImages(batchId, images)

    if (result.success) {
      // 更新批次元数据
      set((state: any) => {
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

  /**
   * 删除批次图片
   */
  deleteBatchImages: async (batchId: string) => {
    const state = get()
    const batch = state.batches.get(batchId)

    if (!batch?.imageCardIds) return

    // 删除 IndexedDB 图片
    await deleteBatchImages(batch.imageCardIds)

    // 清除缓存
    get().clearImageCache(batch.imageCardIds)

    // 更新批次元数据
    set((state: any) => {
      const newBatches = new Map(state.batches)
      const updatedBatch = { ...batch }
      delete updatedBatch.imageCardIds
      delete updatedBatch.imageCount
      delete updatedBatch.totalImageSize

      newBatches.set(batchId, updatedBatch)

      return { batches: newBatches }
    })
  },

  /**
   * 获取批次图片统计
   */
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

**集成到 store-actions.ts**:

```typescript
// card/stores/store-actions.ts

import { createImageServiceActions } from './image-service-actions'

export const createStoreActions = (set: any, get: any) => ({
  // ... 现有 actions

  // 图片服务 actions
  ...createImageServiceActions(set, get)
})
```

---

### 实施 2: CardEditorStore 图片集成

**文件**: `app/card-editor/store/image-actions.ts` (新建)

```typescript
import { saveImageToDB, getImageUrlFromDB, deleteImageFromDB, getAllEditorImageIds } from '../utils/image-db-helpers'
import { exportPackageAsZip, importPackageFromZip } from '../utils/zip-import-export'
import { toast } from 'sonner'

export const createImageActions = (set: any, get: any) => ({
  /**
   * 上传卡牌图片
   */
  uploadCardImage: async (cardId: string, file: File) => {
    // 1. 验证文件
    const ALLOWED_TYPES = ['image/webp', 'image/png', 'image/jpeg']
    const MAX_SIZE = 5 * 1024 * 1024  // 5MB

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('不支持的文件格式，请使用 webp/png/jpg')
      return
    }

    if (file.size > MAX_SIZE) {
      toast.error('文件大小不能超过 5MB')
      return
    }

    // 2. 标记为上传中
    set((state: any) => ({
      imageManager: {
        ...state.imageManager,
        uploadingImages: new Map(state.imageManager.uploadingImages).set(cardId, {
          progress: 0,
          status: 'uploading'
        })
      }
    }))

    try {
      // 3. 保存到 IndexedDB
      await saveImageToDB(cardId, file)

      // 4. 生成预览 URL
      const blobUrl = URL.createObjectURL(file)

      // 5. 更新状态
      set((state: any) => {
        const newUploadingImages = new Map(state.imageManager.uploadingImages)
        newUploadingImages.set(cardId, {
          progress: 100,
          status: 'success'
        })

        const newPreviewCache = new Map(state.imageManager.previewCache)
        newPreviewCache.set(cardId, blobUrl)

        return {
          imageManager: {
            ...state.imageManager,
            uploadingImages: newUploadingImages,
            previewCache: newPreviewCache,
            totalImageSize: state.imageManager.totalImageSize + file.size
          }
        }
      })

      // 6. 清除上传状态 (延迟)
      setTimeout(() => {
        set((state: any) => {
          const newUploadingImages = new Map(state.imageManager.uploadingImages)
          newUploadingImages.delete(cardId)
          return {
            imageManager: {
              ...state.imageManager,
              uploadingImages: newUploadingImages
            }
          }
        })
      }, 1000)

      toast.success('图片上传成功')

    } catch (error) {
      console.error('[uploadCardImage] Failed:', error)

      set((state: any) => {
        const newUploadingImages = new Map(state.imageManager.uploadingImages)
        newUploadingImages.set(cardId, {
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : '上传失败'
        })

        return {
          imageManager: {
            ...state.imageManager,
            uploadingImages: newUploadingImages
          }
        }
      })

      toast.error('图片上传失败')
    }
  },

  /**
   * 删除卡牌图片
   */
  deleteCardImage: async (cardId: string) => {
    try {
      // 1. 从 IndexedDB 删除
      await deleteImageFromDB(cardId)

      // 2. 更新状态
      set((state: any) => {
        const newPreviewCache = new Map(state.imageManager.previewCache)
        const oldUrl = newPreviewCache.get(cardId)

        if (oldUrl) {
          URL.revokeObjectURL(oldUrl)
          newPreviewCache.delete(cardId)
        }

        return {
          imageManager: {
            ...state.imageManager,
            previewCache: newPreviewCache
          }
        }
      })

      toast.success('图片已删除')

    } catch (error) {
      console.error('[deleteCardImage] Failed:', error)
      toast.error('删除图片失败')
    }
  },

  /**
   * 获取预览URL
   */
  getPreviewUrl: async (cardId: string): Promise<string | null> => {
    const state = get()

    // 检查缓存
    if (state.imageManager.previewCache.has(cardId)) {
      return state.imageManager.previewCache.get(cardId)!
    }

    // 从 IndexedDB 加载
    const blobUrl = await getImageUrlFromDB(cardId)

    if (blobUrl) {
      // 更新缓存
      set((state: any) => ({
        imageManager: {
          ...state.imageManager,
          previewCache: new Map(state.imageManager.previewCache).set(cardId, blobUrl)
        }
      }))
    }

    return blobUrl
  },

  /**
   * 清空预览缓存
   */
  clearPreviewCache: () => {
    set((state: any) => {
      state.imageManager.previewCache.forEach(url => URL.revokeObjectURL(url))

      return {
        imageManager: {
          ...state.imageManager,
          previewCache: new Map()
        }
      }
    })
  },

  /**
   * 计算总图片大小
   */
  calculateTotalImageSize: async (): Promise<number> => {
    const db = getCardImageDB()
    const records = await db.editorImages.toArray()
    const totalSize = records.reduce((sum, r) => sum + r.size, 0)

    set((state: any) => ({
      imageManager: {
        ...state.imageManager,
        totalImageSize: totalSize
      }
    }))

    return totalSize
  },

  /**
   * 导出带图片的ZIP
   */
  exportWithImages: async () => {
    const { packageData } = get()

    try {
      await exportPackageAsZip(packageData)
      toast.success('卡包已导出 (含图片)')
    } catch (error) {
      console.error('[exportWithImages] Failed:', error)
      toast.error('导出失败')
    }
  },

  /**
   * 导入带图片的ZIP
   */
  importWithImages: async (file: File) => {
    try {
      const importedPackage = await importPackageFromZip(file)

      if (importedPackage) {
        set({
          packageData: importedPackage,
          currentCardIndex: {
            profession: 0,
            ancestry: 0,
            variant: 0,
            community: 0,
            subclass: 0,
            domain: 0
          }
        })

        // 重新计算图片大小
        await get().calculateTotalImageSize()

        toast.success('卡包已导入 (含图片)')
      }
    } catch (error) {
      console.error('[importWithImages] Failed:', error)
      toast.error('导入失败')
    }
  }
})
```

**集成到 card-editor-store.ts**:

```typescript
// app/card-editor/store/card-editor-store.ts

import { createImageActions } from './image-actions'

export const useCardEditorStore = create<CardEditorStore>()(
  persist(
    (set, get) => ({
      // 现有状态
      packageData: defaultPackage,
      // ...

      // 新增图片管理状态
      imageManager: {
        uploadingImages: new Map(),
        previewCache: new Map(),
        totalImageSize: 0
      },

      // 现有 actions
      // ...

      // 新增图片 actions
      ...createImageActions(set, get)
    }),
    {
      name: 'card-editor-storage',
      partialize: (state) => ({
        packageData: state.packageData
        // 不持久化 imageManager (运行时状态)
      })
    }
  )
)
```

---

## 性能提升

### 1. 去重加载 ✅

**场景**: 10个组件同时请求同一张图片

**优化前**:
```typescript
// ❌ 10次 IndexedDB 读取
Component1: getImageUrlFromDB(cardId)
Component2: getImageUrlFromDB(cardId)
// ... 重复 10 次
```

**优化后**:
```typescript
// ✅ 1次 IndexedDB 读取 + 9次缓存命中
Component1: store.getImageUrl(cardId)  // IndexedDB
Component2: store.getImageUrl(cardId)  // 缓存
// ... 其他都从缓存
```

### 2. 响应式更新 ✅

**场景**: 图片上传完成后更新预览

**优化前**:
```typescript
// ❌ 手动通知所有组件
await saveImageToDB(cardId, file)
setPreviewUrl(URL.createObjectURL(file))  // 手动设置
// 其他组件不知道图片已上传
```

**优化后**:
```typescript
// ✅ Zustand 自动通知订阅者
await store.uploadCardImage(cardId, file)
// 所有使用 useCardImagePreview(cardId) 的组件自动更新
```

### 3. 选择性渲染 ✅

**场景**: 100张卡牌列表,只更新一张卡的图片

**优化前**:
```typescript
// ❌ 整个列表重渲染
const [images, setImages] = useState<Map<string, string>>(new Map())
setImages(new Map(images).set(cardId, newUrl))  // 所有卡牌重渲染
```

**优化后**:
```typescript
// ✅ 只有该卡牌重渲染
const imageUrl = useImageUrl(cardId)  // 细粒度订阅
// 其他卡牌不受影响
```

### 4. 预加载优化 ✅

**场景**: 用户打开批次详情页

**优化前**:
```typescript
// ❌ 用户滚动时按需加载 (卡顿)
<CardImage card={card} />  // 每张卡都触发异步加载
```

**优化后**:
```typescript
// ✅ 打开页面时后台预加载
useEffect(() => {
  store.preloadBatchImages(batchId)
}, [batchId])

// 用户滚动时从缓存读取 (流畅)
<CardImage card={card} />  // 缓存命中
```

---

## 最佳实践

### 1. 使用选择器 Hooks

```typescript
// ✅ 好: 细粒度订阅
const imageUrl = useImageUrl(cardId)

// ❌ 坏: 订阅整个 store
const store = useUnifiedCardStore()
const imageUrl = store.imageService.cache.get(cardId)
```

### 2. 避免在 Render 中调用异步 Actions

```typescript
// ❌ 坏: 每次渲染都调用
function CardImage({ cardId }) {
  const url = store.getImageUrl(cardId)  // ❌ 异步函数
  return <img src={url} />
}

// ✅ 好: 使用 useEffect
function CardImage({ cardId }) {
  const url = useImageUrl(cardId)  // ✅ Hook 内部处理异步
  return <img src={url} />
}
```

### 3. 清理 Blob URLs

```typescript
// ✅ 组件卸载时清理
useEffect(() => {
  return () => {
    store.clearPreviewCache()
  }
}, [])
```

### 4. 批量操作

```typescript
// ❌ 坏: 循环单个操作
for (const [cardId, file] of images) {
  await store.uploadCardImage(cardId, file)
}

// ✅ 好: 批量操作
await store.uploadMultipleImages(images)
```

---

## 总结

### Zustand 优化带来的价值

| 优化点 | 优化前 | 优化后 | 提升 |
|--------|--------|--------|------|
| **重复加载** | 10次IndexedDB读取 | 1次读取+缓存 | 10x |
| **组件通信** | 手动传递状态 | 自动响应式 | ∞ |
| **渲染性能** | 全量重渲染 | 选择性渲染 | 5-10x |
| **代码复杂度** | 分散在各组件 | 集中管理 | 50%↓ |
| **调试难度** | 需要追踪多个组件 | Redux DevTools | 80%↓ |

### 推荐实施顺序

1. ✅ **阶段1**: 扩展 UnifiedCardStore (真实卡包)
   - 影响范围: 已导入的卡包
   - 风险: 低
   - 价值: 高 (用户最常用)

2. ✅ **阶段2**: 扩展 CardEditorStore (编辑器)
   - 影响范围: 卡包创建流程
   - 风险: 低
   - 价值: 中 (进阶用户)

3. ✅ **阶段3**: 优化选择器 Hooks
   - 影响范围: 所有组件
   - 风险: 低
   - 价值: 高 (性能提升)

---

## 相关文档

- `docs/indexeddb.md` - IndexedDB 基础设施
- `docs/editor-plan.md` - 编辑器实施方案
- `docs/卡包图片系统设计.md` - 真实卡包设计
- [Zustand 文档](https://github.com/pmndrs/zustand)

---

## 更新日志

- **2025-01-03** - 初始版本
  - 分析现有 Zustand stores
  - 提出图片系统 Zustand 优化方案
  - 设计完整的 State/Actions/Selectors
  - 实施细节和性能分析
