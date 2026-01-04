# AI文本转换工具 - 详细执行计划

> Phase 1 MVP 实现路线图

---

## 🚀 实施进度追踪

**最后更新**: 2025-01-04
**当前状态**: ✅ UI层完成，功能已完全集成到卡包编辑器

### 已完成阶段 ✅

| 阶段 | 状态 | Commit | 说明 |
|------|------|--------|------|
| **阶段0** | ✅ 完成 | `928f5e2` | 类型定义 (ai-types.ts) |
| **阶段1** | ✅ 完成 | `a1f84e3` | 基础工具层 (api-key-manager, file-processor, prompt-builder) |
| **阶段2** | ✅ 完成 | `204affa` | 核心服务层 (json-merger, ai-service, result-parser) |
| **阶段3** | ✅ 完成 | `a54c598` | 业务逻辑层 (streaming-batch-processor) |
| **测试+重构** | ✅ 完成 | `2c6d23f` | 迁移到 Vercel AI SDK，集成测试全部通过 (9/9) |
| **阶段4A** | ✅ 完成 | `968c1d3` | UI基础组件 (progress, ai-config-dialog, file-upload-zone) |
| **阶段4B** | ✅ 完成 | 待提交 | 主对话框与集成 (ai-converter-dialog, alert, page.tsx集成) |

### 待执行阶段 ⏳

| 阶段 | 状态 | 预计文件 | 说明 |
|------|------|---------|------|
| **手动测试** | ⏳ 待执行 | - | 启动 dev server 进行端到端测试 |
| **优化迭代** | ⏳ 待执行 | - | 根据测试结果优化UI和用户体验 |

### 已创建文件清单

**服务层文件** (`app/card-editor/services/` - 8个服务):
1. ✅ `ai-types.ts` - 类型定义，支持 volcengine provider (252行)
2. ✅ `api-key-manager.ts` - API Key加密存储 (141行)
3. ✅ `file-processor.ts` - 文件处理器 (65行)
4. ✅ `ai-prompt-builder.ts` - 提示词构建器 (206行)
5. ✅ `json-merger.ts` - JSON合并函数 (231行)
6. ✅ `ai-service.ts` - AI服务 (基于 Vercel AI SDK, 140行)
7. ✅ `result-parser.ts` - 结果解析器 (141行)
8. ✅ `streaming-batch-processor.ts` - 流式批量处理器 (315行)

**UI组件文件** (`app/card-editor/components/` - 3个 + `components/ui/` - 2个):
1. ✅ `ai-config-dialog.tsx` - AI配置对话框 (218行)
2. ✅ `file-upload-zone.tsx` - 文件上传区 (176行)
3. ✅ `ai-converter-dialog.tsx` - 主转换器对话框 (420行)
4. ✅ `components/ui/progress.tsx` - 进度条组件 (27行)
5. ✅ `components/ui/alert.tsx` - 警告提示组件 (68行)

**集成修改文件** (3个):
1. ✅ `app/card-editor/store/card-editor-store.ts` - 添加 AI 对话框状态
2. ✅ `app/card-editor/components/toolbar.tsx` - 添加 AI 转换按钮
3. ✅ `app/card-editor/page.tsx` - 集成 AI 对话框组件

**测试文件** (`tests/` - 5个):
1. ✅ `unit/json-merger.test.ts` - JSON合并测试 (13 tests, 100% pass)
2. ✅ `unit/file-processor.test.ts` - 文件处理测试 (17 tests, 100% pass)
3. ✅ `unit/api-key-manager.test.ts` - 加密管理测试 (12 tests, 100% pass)
4. ✅ `integration/ai-service.test.ts` - AI服务集成测试 (6 tests, 100% pass)
5. ✅ `integration/streaming-processor.test.ts` - 流式处理集成测试 (3 tests, 100% pass)

**总代码行数**: 约 1,491 行服务代码 + 约 909 行UI代码 + 约 800 行测试代码

**测试覆盖**: 51 tests, 100% passing

### 技术决策与重构

#### 为什么选择 Vercel AI SDK？

1. **统一接口**: 支持 OpenAI、Claude、火山引擎等多个提供商
2. **零适配器代码**: 只需使用 `.chat()` 方法即可兼容火山引擎 Ark API
3. **成熟稳定**: 200万周下载量，社区活跃
4. **类型安全**: 完整的 TypeScript 支持
5. **易于扩展**: 未来切换提供商只需改 baseURL

#### 火山引擎兼容性要点

- ✅ 使用 `client.chat()` 而非 `client.responses()` (Chat Completions API)
- ✅ 集成测试需使用 `@vitest-environment node` (happy-dom fetch 不兼容)
- ✅ 添加 `volcengine` 作为预设 provider 类型

### Git提交历史

```bash
[待提交] feat(ai-converter): complete UI layer (Phase 4B)
968c1d3 feat(ai-converter): add UI foundation components (Phase 4A)
2c6d23f refactor(ai-service): migrate to Vercel AI SDK
a54c598 feat(ai-converter): add streaming batch processor
204affa feat(ai-converter): add core services
a1f84e3 feat(ai-converter): add foundation services
928f5e2 feat(ai-converter): add type definitions
```

---

## 一、总览

### 1.1 目标

实现基础的AI文本转换功能，支持用户将已撰写的文本内容转换为卡包JSON格式。

### 1.2 工作量统计

| 类型 | 数量 | 说明 |
|------|------|------|
| 新建服务文件 | 7个 | 底层服务和业务逻辑 |
| 新建组件文件 | 8个 | UI组件 |
| 修改现有文件 | 3个 | Store、Toolbar、Page |
| 类型定义文件 | 1个 | TypeScript类型 |
| **总计** | **19个** | 约9.5小时工作量 |

### 1.3 技术栈

- **后端服务：** TypeScript + Fetch API
- **UI组件：** React + Radix UI + Tailwind CSS
- **状态管理：** Zustand（复用现有store）
- **加密：** Web Crypto API
- **文件处理：** File API

---

## 二、依赖关系图

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: 基础工具层（无依赖）                                │
├─────────────────────────────────────────────────────────────┤
│ ✅ ai-types.ts                    类型定义                   │
│ ✅ api-key-manager.ts             API Key加密存储            │
│ ✅ file-processor.ts              文件文本提取                │
│ ✅ ai-prompt-builder.ts           提示词构建                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: 核心服务层（依赖Layer 1）                           │
├─────────────────────────────────────────────────────────────┤
│ ✅ json-merger.ts                 JSON合并纯函数             │
│ ✅ ai-service.ts                  OpenAI兼容API服务          │
│ ✅ result-parser.ts               AI输出解析                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: 业务逻辑层（依赖Layer 2）                           │
├─────────────────────────────────────────────────────────────┤
│ ✅ streaming-batch-processor.ts   流式批量处理协调器         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: UI基础组件（依赖Layer 1-3）                         │
├─────────────────────────────────────────────────────────────┤
│ ✅ file-upload-zone.tsx           文件上传组件               │
│ ✅ ai-config-dialog.tsx           AI配置界面                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: 三步骤组件（依赖Layer 4）                           │
├─────────────────────────────────────────────────────────────┤
│ ✅ ai-card-preview.tsx            卡牌预览组件               │
│ ✅ ai-upload-step.tsx             步骤1：上传界面            │
│ ✅ ai-processing-step.tsx         步骤2：处理进度            │
│ ✅ ai-preview-step.tsx            步骤3：预览确认            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 6: 主对话框（依赖Layer 5）                             │
├─────────────────────────────────────────────────────────────┤
│ ✅ ai-converter-dialog.tsx        主对话框（流程协调）       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 7: 编辑器集成（依赖Layer 6）                           │
├─────────────────────────────────────────────────────────────┤
│ 🔧 card-editor-store.ts (修改)    添加AI对话框状态          │
│ 🔧 toolbar.tsx (修改)             添加AI转换按钮             │
│ 🔧 page.tsx (修改)                集成对话框组件             │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、详细执行步骤

### 准备阶段：环境检查

#### 检查清单

1. **UI组件检查**
   ```bash
   ls components/ui/
   ```
   确认是否存在：
   - ✅ `dialog.tsx`
   - ✅ `button.tsx`
   - ✅ `input.tsx`
   - ✅ `textarea.tsx`
   - ✅ `tabs.tsx`
   - ✅ `badge.tsx`
   - ✅ `alert.tsx`
   - ✅ `collapsible.tsx`
   - ✅ `scroll-area.tsx`
   - ❓ `progress.tsx` - 如果缺失，后续需创建
   - ❓ `select.tsx` - 如果缺失，后续需创建
   - ❓ `checkbox.tsx` - 如果缺失，后续需创建

2. **依赖包检查**
   ```bash
   pnpm list | grep -E "(radix|lucide)"
   ```
   确认版本兼容性

3. **Git状态检查**
   ```bash
   git status
   ```
   确保工作目录干净

---

### 阶段0：类型定义（15分钟）

#### 文件：`app/card-editor/services/ai-types.ts`

**内容结构：**
```typescript
// AI服务配置
export interface AIServiceConfig {
  provider: 'openai' | 'claude' | 'custom'
  apiKey: string
  baseURL: string
  model: string
}

// AI块响应
export interface AIChunkResponse {
  cards: any[]
  metadata: {
    processedUpTo: number
    lastProcessedText: string
    nextShouldStartFrom?: number
    confidence: 'complete' | 'partial'
  }
}

// 处理状态
export interface ProcessState {
  phase: 'parsing' | 'validating' | 'completed'
  progress: number
  currentPosition?: number
  totalLength?: number
  currentChunk?: {
    id: string
    index: number
    total: number
    estimatedCards: number
  }
  stats?: {
    totalChunks?: number
    processedChunks?: number
    totalCards: number
    processedCards: number
    cardsByType: Partial<Record<CardType, number>>
  }
  warnings?: AIWarning[]
  errors?: ValidationError[]
}

// 警告信息
export interface AIWarning {
  severity: 'info' | 'warning' | 'error'
  path: string
  message: string
  suggestion?: string
}

// 解析结果
export interface ParseResult {
  success: boolean
  data?: Partial<CardPackageState>
  warnings: AIWarning[]
  errors: ValidationError[]
  stats?: {
    totalCards: number
    cardsByType: Partial<Record<CardType, number>>
  }
}

// 合并选项
export interface MergeOptions {
  deduplicateById?: boolean
  conflictStrategy?: 'overwrite' | 'keep_existing' | 'merge'
}

// 选择的卡牌
export interface SelectedCards {
  profession: number[]
  ancestry: number[]
  community: number[]
  subclass: number[]
  domain: number[]
  variant: number[]
}
```

**验证：** TypeScript编译无错误

---

### 阶段1：基础工具层（1小时）

#### 步骤1.1：API Key管理器（20分钟）

**文件：** `app/card-editor/services/api-key-manager.ts`

**核心功能：**
1. 使用Web Crypto API加密
2. 基于设备指纹生成密钥
3. localStorage存储加密配置
4. 提供save/load接口

**关键代码框架：**
```typescript
export class APIKeyManager {
  private readonly STORAGE_KEY = 'dh_ai_config'

  async saveConfig(config: AIServiceConfig): Promise<void>
  async loadConfig(): Promise<AIServiceConfig | null>
  private async encrypt(data: string): Promise<string>
  private async decrypt(data: string): Promise<string>
  private async getDeviceKey(): Promise<CryptoKey>
}
```

**验证方法：**
```typescript
const manager = new APIKeyManager()
await manager.saveConfig({ provider: 'openai', apiKey: 'test', ... })
const loaded = await manager.loadConfig()
console.log(loaded) // 应该与保存的一致
```

**潜在问题：**
- Web Crypto API在某些环境不可用 → 降级到base64编码
- localStorage容量限制 → API Key不会太大，无需担心

---

#### 步骤1.2：文件处理器（15分钟）

**文件：** `app/card-editor/services/file-processor.ts`

**核心功能：**
1. 读取.txt文件
2. 读取.md文件
3. 统一文本提取接口

**关键代码框架：**
```typescript
export class FileProcessor {
  supportedTypes = ['.txt', '.md']

  async extractText(file: File): Promise<string> {
    const ext = this.getExtension(file.name)

    if (ext === 'txt' || ext === 'md') {
      return await file.text()
    }

    throw new Error(`不支持的文件格式: ${ext}`)
  }

  private getExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || ''
  }
}
```

**验证方法：**
```typescript
const processor = new FileProcessor()
const mockFile = new File(['测试内容'], 'test.txt', { type: 'text/plain' })
const text = await processor.extractText(mockFile)
console.log(text) // "测试内容"
```

---

#### 步骤1.3：提示词构建器（25分钟）

**文件：** `app/card-editor/services/ai-prompt-builder.ts`

**核心功能：**
1. 读取AI创作指南
2. 构建首次完整提示词
3. 构建后续精简提示词
4. 注入上下文信息

**关键代码框架：**
```typescript
import AI_GUIDE from '@/public/自定义卡包指南和示例/AI-卡包创作指南.md'

export class AIPromptBuilder {
  private guideContent: string

  constructor() {
    // 读取指南内容（需要配置Webpack/Next.js支持.md导入）
    this.guideContent = AI_GUIDE
  }

  buildSystemPrompt(): string {
    return this.guideContent
  }

  buildUserPrompt(
    textWindow: string,
    packageContext: CardPackageState,
    isFirstChunk: boolean,
    position: number,
    totalLength: number
  ): string {
    if (isFirstChunk) {
      return this.buildFirstChunkPrompt(textWindow, position, totalLength)
    } else {
      return this.buildSubsequentChunkPrompt(
        textWindow,
        packageContext,
        position,
        totalLength
      )
    }
  }

  private buildFirstChunkPrompt(...): string
  private buildSubsequentChunkPrompt(...): string
}
```

**验证方法：**
打印生成的提示词，检查格式：
```typescript
const builder = new AIPromptBuilder()
const prompt = builder.buildUserPrompt('测试文本', context, true, 0, 100)
console.log(prompt)
```

**潜在问题：**
- .md文件导入可能需要配置 → 先用fs.readFileSync作为后备
- 提示词过长 → 后续Phase优化

---

### 阶段2：核心服务层（1.5小时）

#### 步骤2.1：JSON合并函数（30分钟）

**文件：** `app/card-editor/services/json-merger.ts`

**核心功能：**
1. customFieldDefinitions去重合并
2. 卡牌数组合并
3. ID去重
4. 冲突策略处理

**关键代码框架：**
```typescript
export function mergeCardData(
  existing: CardPackageState,
  incoming: Partial<CardPackageState>,
  options: MergeOptions = {
    deduplicateById: true,
    conflictStrategy: 'merge'
  }
): CardPackageState {
  const merged = { ...existing }

  // 1. 合并customFieldDefinitions
  if (incoming.customFieldDefinitions) {
    Object.keys(incoming.customFieldDefinitions).forEach(key => {
      const existingSet = new Set(merged.customFieldDefinitions[key] || [])
      const incomingArray = incoming.customFieldDefinitions[key] || []
      incomingArray.forEach(item => existingSet.add(item))
      merged.customFieldDefinitions[key] = Array.from(existingSet)
    })
  }

  // 2. 合并卡牌数组
  const cardTypes: CardType[] = [
    'profession', 'ancestry', 'community',
    'subclass', 'domain', 'variant'
  ]

  cardTypes.forEach(type => {
    if (!incoming[type] || incoming[type].length === 0) return

    const existingCards = merged[type] || []
    const incomingCards = incoming[type]

    if (options.deduplicateById) {
      merged[type] = deduplicateById(
        existingCards,
        incomingCards,
        options.conflictStrategy
      )
    } else {
      merged[type] = [...existingCards, ...incomingCards]
    }
  })

  // 3. 更新元数据
  if (incoming.name) merged.name = incoming.name
  if (incoming.version) merged.version = incoming.version
  if (incoming.author) merged.author = incoming.author
  if (incoming.description) merged.description = incoming.description

  return merged
}

function deduplicateById(
  existing: any[],
  incoming: any[],
  strategy: 'overwrite' | 'keep_existing' | 'merge'
): any[]
```

**验证方法：**
```typescript
const existing = {
  customFieldDefinitions: { professions: ['战士'] },
  profession: [{ id: '1', 名称: '战士' }]
}

const incoming = {
  customFieldDefinitions: { professions: ['法师', '战士'] },
  profession: [{ id: '1', 名称: '战士', 简介: '新增' }]
}

const result = mergeCardData(existing, incoming, { conflictStrategy: 'merge' })

console.log(result.customFieldDefinitions.professions)
// ['战士', '法师']

console.log(result.profession[0].简介)
// '新增' (merge策略填充了空字段)
```

---

#### 步骤2.2：AI服务（40分钟）

**文件：** `app/card-editor/services/ai-service.ts`

**核心功能：**
1. OpenAI格式API调用
2. 支持多提供商（baseURL可配）
3. 返回结构化AIChunkResponse
4. 错误处理

**关键代码框架：**
```typescript
export class AIService {
  private config: AIServiceConfig

  constructor(config: AIServiceConfig) {
    this.config = config
  }

  async generateWithMetadata(
    prompt: string,
    packageContext: CardPackageState
  ): Promise<AIChunkResponse> {
    const response = await fetch(
      `${this.config.baseURL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`API调用失败: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    return JSON.parse(content) as AIChunkResponse
  }
}
```

**验证方法：**
```typescript
const service = new AIService({
  provider: 'openai',
  apiKey: 'sk-test...',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini'
})

const result = await service.generateWithMetadata(
  '将以下文本转换为JSON: 职业卡：战士',
  emptyContext
)

console.log(result.cards)
console.log(result.metadata.processedUpTo)
```

**潜在问题：**
- API调用超时 → 添加timeout参数
- 网络错误 → 需要重试机制（阶段3处理）
- 响应格式不符 → 需要验证（步骤2.3处理）

---

#### 步骤2.3：结果解析器（20分钟）

**文件：** `app/card-editor/services/result-parser.ts`

**核心功能：**
1. 解析AI返回的JSON
2. 提取AI标注的警告
3. 调用现有ValidationService

**关键代码框架：**
```typescript
import { validationService } from '../services/validation-service'

export class ResultParser {
  async parse(aiOutput: string): Promise<ParseResult> {
    try {
      const parsed = JSON.parse(aiOutput)

      // 1. 提取警告
      const warnings = this.extractWarnings(parsed)

      // 2. 数据验证
      const validationResult = await validationService.validatePackage(parsed)

      return {
        success: validationResult.isValid,
        data: parsed,
        warnings,
        errors: validationResult.errors,
        stats: {
          totalCards: this.countCards(parsed),
          cardsByType: this.countByType(parsed)
        }
      }
    } catch (error) {
      return {
        success: false,
        warnings: [],
        errors: [{
          path: 'root',
          message: `JSON解析失败: ${error.message}`
        }]
      }
    }
  }

  private extractWarnings(data: any): AIWarning[] {
    // 从AI返回的注释或特殊字段中提取警告
    const warnings: AIWarning[] = []

    if (data._warnings) {
      warnings.push(...data._warnings)
    }

    return warnings
  }

  private countCards(data: any): number
  private countByType(data: any): Partial<Record<CardType, number>>
}
```

**验证方法：**
```typescript
const parser = new ResultParser()

const mockAIOutput = JSON.stringify({
  name: '测试卡包',
  profession: [{ 名称: '战士', ... }],
  _warnings: [{ severity: 'info', message: '测试警告' }]
})

const result = await parser.parse(mockAIOutput)
console.log(result.success)
console.log(result.warnings)
console.log(result.stats)
```

---

### 阶段3：业务逻辑层（1.5小时）

#### 步骤3.1：流式批量处理器（1.5小时）

**文件：** `app/card-editor/services/streaming-batch-processor.ts`

**核心功能：**
1. 滑动窗口分块
2. AI自主分节判断
3. 位置验证
4. 死循环防护
5. 进度回调
6. JSON合并

**关键代码框架：**
```typescript
export class StreamingBatchProcessor {
  private readonly WINDOW_SIZE = 6000
  private readonly OVERLAP = 200
  private readonly MAX_ITERATIONS = 50

  async process(
    fullText: string,
    initialContext: CardPackageState,
    aiService: AIService,
    onProgress: (state: ProcessState) => void
  ): Promise<CardPackageState> {
    let currentPosition = 0
    let accumulatedData = { ...initialContext }
    let iterationCount = 0

    while (
      currentPosition < fullText.length &&
      iterationCount < this.MAX_ITERATIONS
    ) {
      iterationCount++

      // 1. 提取文本窗口（带重叠）
      const windowEnd = Math.min(
        currentPosition + this.WINDOW_SIZE,
        fullText.length
      )
      const textWindow = fullText.slice(currentPosition, windowEnd)

      // 2. 构建提示词
      const promptBuilder = new AIPromptBuilder()
      const prompt = promptBuilder.buildUserPrompt(
        textWindow,
        accumulatedData,
        iterationCount === 1,
        currentPosition,
        fullText.length
      )

      // 3. 调用AI
      onProgress({
        phase: 'parsing',
        progress: (currentPosition / fullText.length) * 90,
        currentPosition,
        totalLength: fullText.length,
        stats: { totalCards: this.countCards(accumulatedData), ... }
      })

      const response = await aiService.generateWithMetadata(
        prompt,
        accumulatedData
      )

      // 4. 合并结果
      if (response.cards?.length > 0) {
        const incomingData = this.convertToPackageData(response.cards)
        accumulatedData = mergeCardData(
          accumulatedData,
          incomingData,
          { deduplicateById: true, conflictStrategy: 'merge' }
        )
      }

      // 5. 更新位置
      const nextPosition = response.metadata.nextShouldStartFrom ||
                          response.metadata.processedUpTo

      // 6. 验证进度（防死循环）
      if (nextPosition <= currentPosition) {
        console.warn('[Processor] AI停滞，强制跳过')
        currentPosition = Math.min(currentPosition + 1000, fullText.length)
      } else {
        currentPosition = nextPosition
      }
    }

    // 最终验证
    onProgress({ phase: 'validating', progress: 95 })
    const parser = new ResultParser()
    const finalResult = await parser.parse(JSON.stringify(accumulatedData))

    onProgress({
      phase: 'completed',
      progress: 100,
      errors: finalResult.errors,
      warnings: finalResult.warnings
    })

    return accumulatedData
  }

  private convertToPackageData(cards: any[]): Partial<CardPackageState>
  private countCards(data: CardPackageState): number
}
```

**验证方法：**
```typescript
const processor = new StreamingBatchProcessor()
const testText = `
## 职业卡：战士
- 简介：近战专家
- 领域1：武技
- 领域2：防御
...
`.repeat(50) // 约5000字符

const result = await processor.process(
  testText,
  emptyContext,
  aiService,
  (state) => console.log(`进度: ${state.progress}%`)
)

console.log('最终结果:', result)
```

**潜在问题：**
- AI返回的processedUpTo不准确 → 使用重叠窗口兜底
- 某块处理失败 → 记录错误继续处理其他块
- 文本过长超过MAX_ITERATIONS → 提示用户分段

---

### 阶段4：UI基础组件（1小时）

#### 步骤4.1：文件上传组件（30分钟）

**文件：** `app/card-editor/components/file-upload-zone.tsx`

**核心功能：**
1. 拖拽上传
2. 点击选择文件
3. 文件类型过滤

**关键代码框架：**
```tsx
import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FileProcessor } from '../services/file-processor'

interface FileUploadZoneProps {
  accept: string
  onFileLoaded: (content: string) => void
}

export function FileUploadZone({ accept, onFileLoaded }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const processor = new FileProcessor()

  const handleFile = async (file: File) => {
    try {
      const text = await processor.extractText(file)
      onFileLoaded(text)
    } catch (error) {
      console.error('文件读取失败:', error)
      // TODO: 显示错误提示
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await handleFile(file)
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-12 text-center",
        "transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted hover:border-primary/50"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-lg mb-2">拖拽文件到此处</p>
      <p className="text-sm text-muted-foreground mb-4">或点击选择文件</p>
      <Button variant="outline" type="button">
        选择文件
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      <p className="text-xs text-muted-foreground mt-4">
        支持格式：{accept}
      </p>
    </div>
  )
}
```

**验证方法：**
在Storybook或单独页面中测试：
- 拖拽文件能正确触发
- 点击能打开文件选择器
- 文件内容正确回调

---

#### 步骤4.2：AI配置对话框（30分钟）

**文件：** `app/card-editor/components/ai-config-dialog.tsx`

**核心功能：**
1. 提供商选择
2. API Key输入（密码框）
3. Base URL配置
4. 模型选择
5. 保存/读取配置

**关键代码框架：**
```tsx
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, ... } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'
import { APIKeyManager } from '../services/api-key-manager'
import type { AIServiceConfig } from '../services/ai-types'

interface AIConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIConfigDialog({ open, onOpenChange }: AIConfigDialogProps) {
  const [config, setConfig] = useState<AIServiceConfig>({
    provider: 'openai',
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o'
  })

  const apiKeyManager = new APIKeyManager()

  // 加载配置
  useEffect(() => {
    if (open) {
      apiKeyManager.loadConfig().then(loaded => {
        if (loaded) setConfig(loaded)
      })
    }
  }, [open])

  const PROVIDERS = {
    openai: {
      name: 'OpenAI',
      baseURL: 'https://api.openai.com/v1',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
    },
    claude: {
      name: 'Claude (OpenAI兼容)',
      baseURL: 'https://api.anthropic.com/v1',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']
    },
    custom: {
      name: '自定义',
      baseURL: '',
      models: []
    }
  }

  const handleProviderChange = (provider: 'openai' | 'claude' | 'custom') => {
    setConfig(prev => ({
      ...prev,
      provider,
      baseURL: PROVIDERS[provider].baseURL,
      model: PROVIDERS[provider].models[0] || ''
    }))
  }

  const handleSave = async () => {
    await apiKeyManager.saveConfig(config)
    onOpenChange(false)
    // TODO: 显示成功提示
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI服务配置</DialogTitle>
          {/* ... */}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 提供商选择 */}
          <div>
            <Label>选择提供商</Label>
            <Select value={config.provider} onValueChange={handleProviderChange}>
              {/* ... */}
            </Select>
          </div>

          {/* API Key */}
          <div>
            <Label>API Key</Label>
            <Input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
            />
          </div>

          {/* Base URL */}
          <div>
            <Label>Base URL</Label>
            <Input
              value={config.baseURL}
              disabled={config.provider !== 'custom'}
              onChange={(e) => setConfig(prev => ({ ...prev, baseURL: e.target.value }))}
            />
          </div>

          {/* 模型 */}
          <div>
            <Label>模型</Label>
            {/* ... */}
          </div>

          {/* 费用提示 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              约20,000字符的文本转换预计消耗18,500 tokens（GPT-4o约$0.03 USD）
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!config.apiKey.trim()}>
            保存配置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**验证方法：**
- 切换提供商，baseURL自动更新
- 输入API Key，保存后重新打开应能加载

---

### 阶段5：三步骤组件（2小时）

#### 步骤5.1：卡牌预览组件（30分钟）

**文件：** `app/card-editor/components/ai-card-preview.tsx`

**略** - 参考UI设计文档的CardTypePreview实现

---

#### 步骤5.2：上传步骤（30分钟）

**文件：** `app/card-editor/components/ai-upload-step.tsx`

**略** - 参考UI设计文档的UploadStep实现

---

#### 步骤5.3：处理进度步骤（30分钟）

**文件：** `app/card-editor/components/ai-processing-step.tsx`

**略** - 参考UI设计文档的ProcessingStep实现

---

#### 步骤5.4：预览步骤（30分钟）

**文件：** `app/card-editor/components/ai-preview-step.tsx`

**略** - 参考UI设计文档的PreviewStep实现

---

### 阶段6：主对话框（1小时）

#### 步骤6.1：AI转换主对话框

**文件：** `app/card-editor/components/ai-converter-dialog.tsx`

**核心功能：**
1. 三步骤流程控制
2. 状态管理
3. 调用业务逻辑
4. 处理回调

**关键代码框架：**
```tsx
import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AIUploadStep } from './ai-upload-step'
import { AIProcessingStep } from './ai-processing-step'
import { AIPreviewStep } from './ai-preview-step'
import { StreamingBatchProcessor } from '../services/streaming-batch-processor'
import { AIService } from '../services/ai-service'
import { APIKeyManager } from '../services/api-key-manager'
import type { ProcessState, ParseResult } from '../services/ai-types'

type Step = 'upload' | 'processing' | 'preview'

interface AIConverterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIConverterDialog({ open, onOpenChange }: AIConverterDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [processState, setProcessState] = useState<ProcessState | null>(null)
  const [result, setResult] = useState<ParseResult | null>(null)

  const handleSubmit = async (text: string) => {
    // 1. 检查API配置
    const apiKeyManager = new APIKeyManager()
    const config = await apiKeyManager.loadConfig()

    if (!config) {
      // TODO: 提示用户先配置API
      return
    }

    // 2. 进入处理阶段
    setStep('processing')

    try {
      // 3. 初始化服务
      const aiService = new AIService(config)
      const processor = new StreamingBatchProcessor()

      // 4. 处理文本
      const packageData = await processor.process(
        text,
        emptyContext, // 新建模式使用空上下文
        aiService,
        (state) => setProcessState(state)
      )

      // 5. 解析结果
      const parser = new ResultParser()
      const parseResult = await parser.parse(JSON.stringify(packageData))

      setResult(parseResult)
      setStep('preview')

    } catch (error) {
      console.error('处理失败:', error)
      // TODO: 显示错误并返回上传步骤
    }
  }

  const handleConfirm = (selectedCards: SelectedCards) => {
    // 导入到编辑器
    const { newPackage } = useCardEditorStore.getState()
    newPackage() // 清空现有卡包

    // 设置新数据（只包含选中的卡牌）
    const filteredData = filterSelectedCards(result.data, selectedCards)
    useCardEditorStore.setState({ packageData: filteredData })

    onOpenChange(false)
    toast.success(`已导入 ${totalSelected} 张卡牌`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        {step === 'upload' && <AIUploadStep onSubmit={handleSubmit} />}
        {step === 'processing' && <AIProcessingStep state={processState} />}
        {step === 'preview' && <AIPreviewStep result={result} onConfirm={handleConfirm} />}
      </DialogContent>
    </Dialog>
  )
}

function filterSelectedCards(data: any, selected: SelectedCards): CardPackageState
```

---

### 阶段7：编辑器集成（30分钟）

#### 步骤7.1：修改Store（10分钟）

**文件：** `app/card-editor/store/card-editor-store.ts`

**修改内容：**
```typescript
// 在接口中添加
interface CardEditorStore {
  // ... 现有状态

  // 新增AI对话框状态
  aiConverterDialog: boolean
  aiConfigDialog: boolean

  setAIConverterDialog: (open: boolean) => void
  setAIConfigDialog: (open: boolean) => void
}

// 在create中添加
export const useCardEditorStore = create<CardEditorStore>()(
  persist(
    (set, get) => ({
      // ... 现有状态

      aiConverterDialog: false,
      aiConfigDialog: false,

      setAIConverterDialog: (open) => set({ aiConverterDialog: open }),
      setAIConfigDialog: (open) => set({ aiConfigDialog: open }),
    }),
    { /* ... */ }
  )
)
```

---

#### 步骤7.2：修改Toolbar（10分钟）

**文件：** `app/card-editor/components/toolbar.tsx`

**修改内容：**
```tsx
import { Sparkles } from 'lucide-react' // 新增图标

interface ToolbarProps {
  // ... 现有props
  onOpenAIConverter: () => void  // 新增
}

export function Toolbar({
  // ... 现有props
  onOpenAIConverter
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
      {/* ... 现有按钮 */}

      {/* 在"导入卡包"后添加 */}
      <Button
        variant="outline"
        size="sm"
        onClick={onOpenAIConverter}
        className="flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        AI文本转换
      </Button>

      {/* ... 其他按钮 */}
    </div>
  )
}
```

---

#### 步骤7.3：修改Page（10分钟）

**文件：** `app/card-editor/page.tsx`

**修改内容：**
```tsx
// 导入新组件
import { AIConverterDialog } from './components/ai-converter-dialog'
import { AIConfigDialog } from './components/ai-config-dialog'

export default function CardEditorPage() {
  const {
    // ... 现有状态
    aiConverterDialog,
    setAIConverterDialog,
    aiConfigDialog,
    setAIConfigDialog,
  } = useCardEditorStore()

  // 检查API配置的处理函数
  const handleOpenAIConverter = async () => {
    const apiKeyManager = new APIKeyManager()
    const config = await apiKeyManager.loadConfig()

    if (!config || !config.apiKey) {
      // 未配置，先打开配置对话框
      setAIConfigDialog(true)
    } else {
      // 已配置，直接打开转换对话框
      setAIConverterDialog(true)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* ... 现有内容 */}

      <Toolbar
        // ... 现有props
        onOpenAIConverter={handleOpenAIConverter}
      />

      {/* ... 其他内容 */}

      {/* 新增对话框 */}
      <AIConverterDialog
        open={aiConverterDialog}
        onOpenChange={setAIConverterDialog}
      />

      <AIConfigDialog
        open={aiConfigDialog}
        onOpenChange={setAIConfigDialog}
      />
    </div>
  )
}
```

---

### 阶段8：端到端测试（1小时）

#### 测试8.1：API配置流程

1. 启动开发服务器 `pnpm dev`
2. 进入卡包编辑器页面
3. 点击"AI文本转换"按钮
4. 应弹出AI配置对话框（首次使用）
5. 选择提供商（如OpenAI）
6. 输入测试API Key
7. 保存配置
8. 验证localStorage中存储了加密数据

---

#### 测试8.2：小文本转换

**测试文本：**
```
## 职业卡：剑客
- 简介：以剑术为生的战士
- 领域1：武技
- 领域2：防御
- 起始生命：14
- 起始闪避：8
- 起始物品：长剑、皮甲
- 希望特性：剑术精通
- 职业特性：***剑术大师***：攻击掷骰+1
```

**测试步骤：**
1. 点击"AI文本转换"
2. 粘贴上述文本
3. 点击"开始转换"
4. 观察进度条
5. 等待预览界面
6. 检查识别的卡牌
7. 确认导入
8. 在编辑器中验证卡牌数据

**预期结果：**
- 识别到1张职业卡
- 字段映射正确
- customFieldDefinitions包含"剑客"、"武技"、"防御"

---

#### 测试8.3：中等文本转换

**测试文本：** 5000字符，包含3-5张不同类型的卡牌

**测试步骤：**
1. 粘贴中等长度文本
2. 开始转换
3. 观察分块进度（应该分2-3块）
4. 检查预览中的所有卡牌
5. 选择性导入（部分勾选）
6. 验证只导入了选中的卡牌

**预期结果：**
- 分块处理正常
- 进度显示准确
- 选择性导入生效

---

#### 测试8.4：错误处理

**测试场景：**
1. **无效API Key** - 应显示明确错误
2. **网络错误** - 应提示重试
3. **AI返回格式错误** - 应捕获并提示
4. **文本过长** - 应分块处理或提示用户

---

## 四、检查点与质量保证

### 4.1 代码检查点

| 阶段 | 检查项 | 通过标准 |
|------|--------|---------|
| 阶段1 | TypeScript编译 | 无错误 |
| 阶段2 | 单元测试（可选） | 核心函数可测试 |
| 阶段3 | 集成测试 | 小文本转换成功 |
| 阶段7 | UI测试 | 界面显示正常 |
| 阶段8 | E2E测试 | 完整流程走通 |

### 4.2 Git提交策略

**建议提交点：**
1. 阶段1完成后：`feat: add AI service foundation (api-key, file-processor, prompt-builder)`
2. 阶段2完成后：`feat: add core AI services (merger, ai-service, parser)`
3. 阶段3完成后：`feat: add streaming batch processor`
4. 阶段4-5完成后：`feat: add AI converter UI components`
5. 阶段6完成后：`feat: add AI converter main dialog`
6. 阶段7完成后：`feat: integrate AI converter into card editor`

---

## 五、风险与应对

### 5.1 技术风险

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|---------|
| Web Crypto API不兼容 | 低 | 中 | 降级到base64编码 |
| Progress组件缺失 | 中 | 低 | 用简单div实现 |
| Select组件缺失 | 中 | 低 | 用原生select |
| .md文件导入失败 | 中 | 中 | 用fs.readFileSync后备 |
| AI API调用超时 | 高 | 高 | 添加重试机制 |

### 5.2 业务风险

| 风险 | 应对 |
|------|------|
| AI生成质量差 | 提供预览和选择性导入 |
| Token成本过高 | 提示词优化 + 费用估算提示 |
| 大文本处理慢 | 进度显示 + 分块处理 |

---

## 六、下一步行动

### 开始前确认：

1. ✅ 是否有可用的测试API Key？
2. ✅ 是否需要检查UI组件完整性？
3. ✅ 执行方式：
   - 选项A：一次性执行全部阶段
   - 选项B：分批执行（如阶段1-3 → 测试 → 阶段4-7）
4. ✅ 是否需要Git提交策略？

### 开始执行：

确认后，执行顺序为：
```
准备阶段 → 阶段0 → 阶段1 → 阶段2 → 阶段3 →
阶段4 → 阶段5 → 阶段6 → 阶段7 → 阶段8
```

---

**文档版本：** v1.0
**最后更新：** 2025-01-04
**预计总耗时：** 9.5小时
**关键路径：** 阶段3（业务逻辑层）和阶段6（主对话框）
