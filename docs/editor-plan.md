# 卡牌编辑器图片系统实施方案

## 📋 项目概述

**目标**: 为卡牌编辑器添加本地图片上传和管理功能

**范围**: 仅限 `app/card-editor/` 目录,不涉及真实卡包系统

**核心功能**:
1. ✅ 用户可手动选择图片上传
2. ✅ 图片持久化到 IndexedDB (`editorImages` 表)
3. ✅ 导出时打包成 `.zip` 文件(JSON + 图片)
4. ✅ JSON元信息记录图片状态
5. ✅ 实时预览上传的图片

---

## 🏗️ 架构设计

### 数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                      卡牌编辑器图片系统                        │
└─────────────────────────────────────────────────────────────┘

用户上传图片
     ↓
┌──────────────────┐
│ 图片上传组件      │ - <ImageUploadField />
│                 │ - 文件选择
│                 │ - 预览缩略图
└────────┬─────────┘
         ↓
┌──────────────────┐
│ IndexedDB存储    │ - editorImages 表
│                 │ - key: cardId
│                 │ - blob: 图片Blob
│                 │ - mimeType, size
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 卡牌数据更新      │ - card.hasLocalImage = true
│                 │ - updateCard()
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 实时预览         │ - ImageCard 组件
│                 │ - getImageUrlFromDB()
│                 │ - 自动刷新预览
└──────────────────┘

导出流程:
┌──────────────────┐
│ 导出按钮         │ - exportPackage()
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 收集图片         │ - 遍历所有卡牌
│                 │ - 从 IndexedDB 读取图片
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 生成 ZIP         │ - cards.json (卡牌数据)
│                 │ - {cardId}.webp (图片文件)
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 下载文件         │ - {packageName}.zip
└──────────────────┘

导入流程:
┌──────────────────┐
│ 导入ZIP文件      │ - importPackage()
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 解析ZIP          │ - JSZip
│                 │ - 读取 cards.json
│                 │ - 提取图片文件
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 存储图片         │ - 写入 editorImages 表
│                 │ - 设置 hasLocalImage = true
└────────┬─────────┘
         ↓
┌──────────────────┐
│ 加载卡包数据      │ - 更新 packageData
└──────────────────┘
```

### 文件格式规范

**导出格式**: `.zip` 文件

```
mypack.zip
├── cards.json          # 卡牌数据 (CardPackageState 格式)
├── card1-id.webp       # 图片 (文件名 = cardId)
├── card2-id.png
└── ...
```

**cards.json 结构**:
```json
{
  "name": "我的卡包",
  "version": "1.0.0",
  "author": "作者",
  "description": "描述",
  "customFieldDefinitions": {...},
  "profession": [
    {
      "id": "pack-author-prof-warrior",
      "名称": "战士",
      "hasLocalImage": true,  // ← 标记有本地图片
      "imageUrl": "https://...",  // ← 可选的外链URL
      ...
    }
  ],
  "ancestry": [...],
  ...
}
```

---

## 📁 文件结构

### 新增文件

```
app/card-editor/
├── utils/
│   ├── image-db-helpers.ts         # ✅ 新建 - IndexedDB 操作
│   ├── zip-import-export.ts        # ✅ 新建 - ZIP 导入导出
│   └── import-export.ts            # ✏️ 修改 - 集成 ZIP 功能
│
├── components/
│   ├── image-upload-field.tsx      # ✅ 新建 - 图片上传组件
│   └── card-tabs/
│       └── card-editor-tab.tsx     # ✏️ 修改 - 集成图片上传
│
└── store/
    └── card-editor-store.ts        # ✏️ 修改 - 添加图片相关 actions
```

### 修改文件

```
components/card-editor/
└── card-form.tsx                   # ✏️ 修改 - 添加图片上传字段

card/stores/image-service/
└── database.ts                     # ✏️ 修改 - 确保 editorImages 表存在
```

---

## 🔧 实施步骤

### 阶段 1: IndexedDB 基础设施 (优先级: 高)

**任务**: 建立图片存储能力

#### 1.1 创建 `app/card-editor/utils/image-db-helpers.ts`

**功能**:
- `saveImageToDB(cardId, file)` - 保存图片到 editorImages 表
- `getImageUrlFromDB(cardId)` - 读取图片并生成 Blob URL
- `deleteImageFromDB(cardId)` - 删除图片
- `hasImageInDB(cardId)` - 检查图片是否存在

**关键代码**:
```typescript
import { getCardImageDB } from '@/card/stores/image-service/database'

export async function saveImageToDB(
  cardId: string,
  file: File
): Promise<void> {
  const db = getCardImageDB()
  const blob = new Blob([await file.arrayBuffer()], { type: file.type })

  await db.editorImages.put({
    key: cardId,
    blob: blob,
    mimeType: file.type,
    size: file.size,
    createdAt: Date.now()
  })
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

// 其他函数...
```

#### 1.2 验证 `card/stores/image-service/database.ts`

**检查项**:
- ✅ `editorImages` 表是否已定义
- ✅ Schema 包含: `key, blob, mimeType, size, createdAt`

---

### 阶段 2: 图片上传组件 (优先级: 高)

**任务**: 提供用户界面上传图片

#### 2.1 创建 `app/card-editor/components/image-upload-field.tsx`

**功能**:
- 文件选择按钮
- 图片预览(缩略图)
- 删除按钮
- 支持的格式: `.webp, .png, .jpg, .jpeg`
- 文件大小限制: 5MB

**UI 设计**:
```
┌───────────────────────────────────────┐
│ 卡牌图片                               │
│                                       │
│ ┌─────────────┐                      │
│ │             │  [选择图片]  [删除]   │
│ │  预览图     │                      │
│ │             │                      │
│ └─────────────┘                      │
│ 支持: webp/png/jpg, 最大5MB           │
└───────────────────────────────────────┘
```

**关键代码**:
```typescript
interface ImageUploadFieldProps {
  cardId: string
  hasLocalImage?: boolean
  onImageChange: (hasImage: boolean) => void
}

export function ImageUploadField({
  cardId,
  hasLocalImage,
  onImageChange
}: ImageUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // 加载现有图片
  useEffect(() => {
    if (hasLocalImage) {
      getImageUrlFromDB(cardId).then(url => {
        if (url) setPreviewUrl(url)
      })
    } else {
      setPreviewUrl(null)
    }
  }, [cardId, hasLocalImage])

  // 文件选择处理
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型和大小
    if (!['image/webp', 'image/png', 'image/jpeg'].includes(file.type)) {
      toast.error('不支持的文件格式')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('文件大小不能超过5MB')
      return
    }

    // 保存到 IndexedDB
    await saveImageToDB(cardId, file)

    // 更新预览
    const blobUrl = URL.createObjectURL(file)
    setPreviewUrl(blobUrl)

    // 通知父组件（设置本地图片标记）
    onImageChange(true)
  }

  // 删除图片
  const handleDelete = async () => {
    await deleteImageFromDB(cardId)
    setPreviewUrl(null)
    onImageChange(false)
  }

  return (
    <div className="space-y-2">
      <Label>卡牌图片</Label>
      <div className="flex items-center gap-4">
        {/* 预览区 */}
        {previewUrl && (
          <div className="w-32 h-32 border rounded overflow-hidden">
            <img src={previewUrl} className="w-full h-full object-cover" />
          </div>
        )}

        {/* 按钮区 */}
        <div className="flex flex-col gap-2">
          <label>
            <Input
              type="file"
              accept=".webp,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <span>选择图片</span>
            </Button>
          </label>

          {previewUrl && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              删除图片
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        支持: webp/png/jpg, 最大5MB
      </p>
    </div>
  )
}
```

#### 2.2 集成到 `components/card-editor/card-form.tsx`

**修改位置**: 每个卡牌表单组件 (ProfessionCardForm, CommunityCardForm 等)

**添加代码**:
```typescript
import { ImageUploadField } from '@/app/card-editor/components/image-upload-field'

export function ProfessionCardForm({ card, cardIndex, cardType }: Props) {
  const { updateCard } = useCardEditorStore()

  // 处理图片变化
  const handleImageChange = (hasImage: boolean) => {
    updateCard(cardType, cardIndex, { hasLocalImage: hasImage })
  }

  return (
    <Form {...form}>
      {/* 现有字段... */}

      {/* 新增图片上传 */}
      <ImageUploadField
        cardId={card.id}
        hasLocalImage={card.hasLocalImage}
        onImageChange={handleImageChange}
      />

      {/* 其他字段... */}
    </Form>
  )
}
```

---

### 阶段 3: ZIP 导入导出 (优先级: 高)

**任务**: 打包 JSON + 图片

#### 3.1 安装依赖

```bash
pnpm add jszip
pnpm add -D @types/jszip
```

#### 3.2 创建 `app/card-editor/utils/zip-import-export.ts`

**导出功能**:

```typescript
import JSZip from 'jszip'
import { CardPackageState } from '../types'
import { getCardImageDB } from '@/card/stores/image-service/database'

/**
 * 导出卡包为 ZIP 文件
 */
export async function exportPackageAsZip(
  packageData: CardPackageState
): Promise<void> {
  const zip = new JSZip()

  // 1. 准备 cards.json
  const exportData = { ...packageData }
  delete exportData.isModified
  delete exportData.lastSaved

  zip.file('cards.json', JSON.stringify(exportData, null, 2))

  // 2. 收集所有图片
  const db = getCardImageDB()
  const cardTypes = ['profession', 'ancestry', 'community', 'subclass', 'domain', 'variant']

  for (const cardType of cardTypes) {
    const cards = (packageData[cardType] as any[]) || []

    for (const card of cards) {
      if (card.hasLocalImage) {
        try {
          const record = await db.editorImages.get(card.id)

          if (record) {
            // 确定文件扩展名
            const ext = record.mimeType === 'image/png' ? 'png' :
                       record.mimeType === 'image/jpeg' ? 'jpg' : 'webp'

            // 添加图片到 ZIP (文件名 = cardId.ext)
            zip.file(`${card.id}.${ext}`, record.blob)
          }
        } catch (error) {
          console.error(`[Export] Failed to read image for ${card.id}:`, error)
        }
      }
    }
  }

  // 3. 生成 ZIP 文件
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  // 4. 下载
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${packageData.name || '卡包'}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
```

**导入功能**:

```typescript
/**
 * 导入 ZIP 卡包
 */
export async function importPackageFromZip(): Promise<CardPackageState | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      try {
        const zip = await JSZip.loadAsync(file)

        // 1. 读取 cards.json
        const cardsFile = zip.file('cards.json')
        if (!cardsFile) {
          toast.error('ZIP文件中缺少 cards.json')
          resolve(null)
          return
        }

        const cardsText = await cardsFile.async('text')
        const packageData = JSON.parse(cardsText) as CardPackageState

        // 2. 导入图片到 IndexedDB
        const db = getCardImageDB()
        const imageFiles = Object.keys(zip.files).filter(name =>
          /\.(webp|png|jpg|jpeg)$/i.test(name) && !name.startsWith('__MACOSX')
        )

        for (const imageName of imageFiles) {
          const imageFile = zip.file(imageName)
          if (!imageFile) continue

          // 提取 cardId (去掉扩展名)
          const cardId = imageName.replace(/\.(webp|png|jpg|jpeg)$/i, '')

          // 读取图片 Blob
          const blob = await imageFile.async('blob')

          // 保存到 editorImages 表
          await db.editorImages.put({
            key: cardId,
            blob: blob,
            mimeType: blob.type || 'image/webp',
            size: blob.size,
            createdAt: Date.now()
          })

          console.log(`[Import] Saved image: ${cardId}`)
        }

        toast.success('卡包已导入')
        resolve(packageData)

      } catch (error) {
        console.error('[Import] Failed:', error)
        toast.error('导入失败：文件格式不正确')
        resolve(null)
      }
    }

    input.click()
  })
}
```

#### 3.3 修改 `app/card-editor/utils/import-export.ts`

**目标**: 保留旧的 JSON 导入导出,添加 ZIP 选项

**修改**:
```typescript
import { exportPackageAsZip, importPackageFromZip } from './zip-import-export'

// 保留原有 JSON 导出
export function exportCardPackage(data: CardPackageState): void {
  // ... 现有代码 ...
}

// 新增 ZIP 导出
export async function exportCardPackageAsZip(data: CardPackageState): Promise<void> {
  await exportPackageAsZip(data)
}

// 保留原有 JSON 导入
export function importCardPackage(): Promise<CardPackageState | null> {
  // ... 现有代码 ...
}

// 新增 ZIP 导入
export async function importCardPackageFromZip(): Promise<CardPackageState | null> {
  return await importPackageFromZip()
}
```

#### 3.4 修改 `app/card-editor/store/card-editor-store.ts`

**添加 ZIP 导入导出方法**:

```typescript
import { exportCardPackageAsZip, importCardPackageFromZip } from '../utils/import-export'

interface CardEditorStore {
  // ... 现有字段 ...

  // 新增方法
  exportPackageAsZip: () => Promise<void>
  importPackageFromZip: () => Promise<void>
}

export const useCardEditorStore = create<CardEditorStore>()(
  persist(
    (set, get) => ({
      // ... 现有代码 ...

      // ZIP 导出
      exportPackageAsZip: async () => {
        const { packageData } = get()
        const exportData = { ...packageData }
        delete exportData.isModified
        delete exportData.lastSaved
        await exportCardPackageAsZip(exportData)
      },

      // ZIP 导入
      importPackageFromZip: async () => {
        const importedPackage = await importCardPackageFromZip()
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
        }
      }
    })
  )
)
```

#### 3.5 修改 `app/card-editor/components/toolbar.tsx`

**添加 ZIP 导入导出按钮**:

```typescript
interface ToolbarProps {
  // ... 现有 props ...
  onExportZip?: () => void
  onImportZip?: () => void
}

export function Toolbar({ ..., onExportZip, onImportZip }: ToolbarProps) {
  return (
    <div className="flex gap-2">
      {/* 现有按钮 */}
      <Button onClick={onExport}>导出 JSON</Button>
      <Button onClick={onImport}>导入 JSON</Button>

      {/* 新增 ZIP 按钮 */}
      <Button onClick={onExportZip} variant="outline">
        导出 ZIP (含图片)
      </Button>
      <Button onClick={onImportZip} variant="outline">
        导入 ZIP
      </Button>

      {/* 其他按钮... */}
    </div>
  )
}
```

#### 3.6 修改 `app/card-editor/page.tsx`

**连接 ZIP 导入导出按钮**:

```typescript
export default function CardEditorPage() {
  const {
    exportPackage,
    importPackage,
    exportPackageAsZip,      // ← 新增
    importPackageFromZip     // ← 新增
  } = useCardEditorStore()

  return (
    <div>
      <Toolbar
        onExport={exportPackage}
        onImport={importPackage}
        onExportZip={exportPackageAsZip}      // ← 连接
        onImportZip={importPackageFromZip}    // ← 连接
      />
      {/* 其他内容... */}
    </div>
  )
}
```

---

### 阶段 4: 实时预览优化 (优先级: 中)

**任务**: 确保图片变化立即反映在预览中

#### 4.1 验证 `app/card-editor/components/card-tabs/card-editor-tab.tsx`

**检查点**:
- ✅ `useEffect` 监听 `currentCard` 变化
- ✅ 调用 `transformCardToStandard()` 生成预览卡牌
- ✅ 图片从 `db://` URL 自动加载

**关键代码**:
```typescript
// 现有代码已经支持实时预览
useEffect(() => {
  if (currentCard) {
    const standardCard = transformCardToStandard(currentCard, cardType)
    setPreviewCard(standardCard)
  }
}, [currentCard, cardType])
```

#### 4.2 修改 `lib/utils.ts` 支持 `hasLocalImage`

**需要修改 `getCardImageUrlAsync()`**:

```typescript
export async function getCardImageUrlAsync(
  card: StandardCard | undefined,
  isError: boolean = false
): Promise<string> {
  const basePath = getBasePath()

  if (isError || !card) {
    return `${basePath}/image/empty-card.webp`
  }

  // 新增: 优先检查本地图片标记
  const extendedCard = card as any
  if (extendedCard.hasLocalImage && card.id) {
    try {
      const { getImageUrlFromDB } = await import('@/app/card-editor/utils/image-db-helpers')
      const blobUrl = await getImageUrlFromDB(card.id)
      if (blobUrl) return blobUrl
    } catch (error) {
      console.error('[getCardImageUrlAsync] Failed to load local image:', error)
    }
  }

  // 处理外链 imageUrl
  let imageUrl = card.imageUrl
  if (imageUrl) {
    // ... 现有的外链URL处理逻辑 ...
  }

  // 默认空卡牌图片
  return `${basePath}/image/empty-card.webp`
}
```

**关键变化**:
- ✅ 移除 `db://` 前缀检测
- ✅ 优先检查 `hasLocalImage` 字段
- ✅ 使用 `card.id` 查询 IndexedDB
- ✅ 保持外链URL的独立处理

---

## 🧪 测试计划

### 单元测试

#### 测试 1: 图片保存和读取
```typescript
// tests/unit/card-editor/image-db-helpers.test.ts
test('saveImageToDB and getImageUrlFromDB', async () => {
  const cardId = 'test-card-id'
  const file = new File(['test'], 'test.webp', { type: 'image/webp' })

  await saveImageToDB(cardId, file)
  const url = await getImageUrlFromDB(cardId)

  expect(url).toBeTruthy()
  expect(url?.startsWith('blob:')).toBe(true)
})
```

#### 测试 2: ZIP 导出
```typescript
test('exportPackageAsZip generates valid ZIP', async () => {
  const packageData = {
    name: 'Test Pack',
    profession: [
      { id: 'test-prof', 名称: 'Test', imageUrl: 'db://test-prof' }
    ]
  }

  // Mock IndexedDB data
  // ... 执行导出 ...
  // ... 验证 ZIP 内容 ...
})
```

### 集成测试

#### 测试 3: 完整导入导出流程
```typescript
test('import and export ZIP maintains data integrity', async () => {
  // 1. 导出现有卡包
  await exportPackageAsZip(originalPackage)

  // 2. 导入导出的 ZIP
  const importedPackage = await importPackageFromZip()

  // 3. 验证数据一致性
  expect(importedPackage).toEqual(originalPackage)
})
```

### 手动测试清单

- [ ] **上传图片**
  - [ ] 选择 webp/png/jpg 文件
  - [ ] 文件大小验证 (5MB)
  - [ ] 预览立即显示
  - [ ] 刷新页面后图片仍存在

- [ ] **删除图片**
  - [ ] 点击删除按钮
  - [ ] 预览消失
  - [ ] IndexedDB 记录删除

- [ ] **导出 ZIP**
  - [ ] 包含 cards.json
  - [ ] 包含所有图片文件
  - [ ] 文件名格式正确 (cardId.ext)

- [ ] **导入 ZIP**
  - [ ] 解析 cards.json
  - [ ] 导入所有图片到 IndexedDB
  - [ ] 卡牌数据正确加载
  - [ ] 图片正确显示

- [ ] **实时预览**
  - [ ] 上传图片后预览立即更新
  - [ ] 切换卡牌时预览正确
  - [ ] 编辑卡牌时预览同步

---

## 📊 进度追踪

### 阶段 1: IndexedDB 基础设施
- [ ] 创建 `image-db-helpers.ts`
  - [ ] `saveImageToDB()`
  - [ ] `getImageUrlFromDB()`
  - [ ] `deleteImageFromDB()`
  - [ ] `hasImageInDB()`
- [ ] 验证 `database.ts` schema

### 阶段 2: 图片上传组件
- [ ] 创建 `image-upload-field.tsx`
  - [ ] 文件选择逻辑
  - [ ] 预览显示
  - [ ] 删除功能
- [ ] 集成到 `card-form.tsx`
  - [ ] ProfessionCardForm
  - [ ] CommunityCardForm
  - [ ] VariantCardForm
  - [ ] DomainCardForm

### 阶段 3: ZIP 导入导出
- [ ] 安装 `jszip` 依赖
- [ ] 创建 `zip-import-export.ts`
  - [ ] `exportPackageAsZip()`
  - [ ] `importPackageFromZip()`
- [ ] 修改 `import-export.ts` (集成)
- [ ] 修改 `card-editor-store.ts` (添加 actions)
- [ ] 修改 `toolbar.tsx` (添加按钮)
- [ ] 修改 `page.tsx` (连接按钮)

### 阶段 4: 实时预览优化
- [ ] 验证 `card-editor-tab.tsx` 预览逻辑
- [ ] 确认 `getCardImageUrlAsync()` 支持编辑器

### 阶段 5: 测试
- [ ] 单元测试
- [ ] 集成测试
- [ ] 手动测试清单

---

## 🚨 风险和注意事项

### 风险 1: IndexedDB 容量限制
**问题**: 浏览器对 IndexedDB 有存储限制
**解决方案**:
- 限制单个图片大小 (5MB)
- 提供清理功能 (删除无用图片)
- 监控存储使用情况

### 风险 2: 图片格式兼容性
**问题**: 不同浏览器对 WebP 支持不同
**解决方案**:
- 支持 PNG/JPG 作为备选
- 导出时保持原始格式
- 显示时自动 fallback

### 风险 3: ZIP 文件损坏
**问题**: 导入损坏的 ZIP 文件
**解决方案**:
- 添加 try-catch 错误处理
- 验证 cards.json 格式
- 提供详细错误信息

### 风险 4: 内存泄漏
**问题**: Blob URL 未及时释放
**解决方案**:
```typescript
useEffect(() => {
  return () => {
    if (blobUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl)
    }
  }
}, [blobUrl])
```

---

## 📚 参考文档

- [真实卡包图片系统设计](./卡包图片系统设计.md) - 完整架构参考
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [JSZip 文档](https://stuk.github.io/jszip/)
- [Dexie.js 文档](https://dexie.org/)

---

## ✅ 验收标准

### 功能完整性
- [x] 用户可上传图片到卡牌
- [x] 图片保存到 IndexedDB
- [x] 导出生成 ZIP 文件 (JSON + 图片)
- [x] 导入 ZIP 文件恢复所有数据
- [x] 实时预览显示上传的图片

### 性能要求
- [ ] 图片上传响应 < 1秒
- [ ] ZIP 导出时间 < 5秒 (100张卡牌)
- [ ] 预览刷新延迟 < 500ms

### 用户体验
- [ ] 上传进度反馈
- [ ] 错误提示清晰
- [ ] 操作可撤销 (删除图片)
- [ ] 支持键盘快捷键

### 代码质量
- [ ] TypeScript 类型完整
- [ ] 错误处理健全
- [ ] 单元测试覆盖率 > 80%
- [ ] 无 ESLint 警告

---

## 📝 更新日志

- **2025-01-03** - 初始方案
  - 定义编辑器图片系统架构
  - 规划 4 个实施阶段
  - 制定测试和验收标准
- **2025-01-03** - 优化图片标记方案
  - 采用 `hasLocalImage: boolean` 字段替代 `imageUrl: "db://cardId"`
  - 优势: 语义清晰、类型安全、职责分离
  - 支持同时存在本地图片和外链URL
