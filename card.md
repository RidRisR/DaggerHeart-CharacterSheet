# DaggerHeart 角色卡卡牌系统分析

## 概述

这个项目实现了一个复杂的卡牌管理系统，用于管理 DaggerHeart 角色扮演游戏中的各种卡牌（职业、血统、社群、子职业、领域、变体卡牌等）。系统同时支持内置卡牌和用户自定义卡牌，具有完整的导入、存储、验证和管理功能。

## 系统架构

### 核心组件

1. **CustomCardManager** - 统一卡牌管理器（单例模式）
2. **CustomCardStorage** - localStorage 抽象层
3. **Card Converters** - 各种卡牌类型转换器
4. **Type Validators** - 卡牌数据验证器
5. **JSON 卡牌包** - 统一的数据格式

### 文件结构
```
card/
├── index.ts                    # 主入口文件，导出所有功能
├── custom-card-manager.ts      # 统一卡牌管理器
├── card-storage.ts            # localStorage 抽象层
├── card-types.ts              # 类型定义
├── card-converter.ts          # 通用转换器
├── type-validators.ts         # 数据验证器
├── card-predefined-field.ts   # 预定义字段和动态字段获取
├── card-ui-config.ts          # UI 配置
├── [type]-card/
│   └── convert.ts             # 各类型卡牌转换器
└── data/cards/
    └── builtin-base.json      # 内置卡牌JSON数据包
```

## 内置卡牌 vs 自定义卡牌

### 内置卡牌加载逻辑

**数据来源**：
- 主要数据来自 `data/cards/builtin-base.json`
- 这是一个包含所有内置卡牌的大型JSON文件（3174行）
- 版本控制通过 `BUILTIN_CARDS_VERSION = "V20250603-JSON"`

**加载流程**：
1. **静态导入**：JSON文件在构建时被静态导入
   ```typescript
   import builtinCardPackJson from '../data/cards/builtin-base.json';
   ```

2. **转换处理**：通过 `BuiltinCardPackLoader` 类处理
   ```typescript
   static convertJsonPackToStandardCards(jsonPack: JsonCardPack): ExtendedStandardCard[]
   ```

3. **种子化到localStorage**：在系统初始化时写入localStorage
   ```typescript
   await this._seedOrUpdateBuiltinCards();
   ```

4. **版本检查**：通过版本号判断是否需要重新种子化
   - 内置卡牌作为特殊批次存储，批次ID为 `BUILTIN_BATCH_ID = "SYSTEM_BUILTIN_CARDS"`
   - 标记 `source: CardSource.BUILTIN`

### 自定义卡牌加载逻辑

**数据来源**：
- 用户导入的JSON文件
- 遵循相同的JSON卡牌包格式

**加载流程**：
1. **文件导入**：用户通过UI导入JSON文件
2. **数据验证**：通过 `TypeValidationResult` 验证数据完整性
3. **转换处理**：使用相同的转换器系统
4. **批次存储**：每个导入作为独立批次存储
   - 生成唯一批次ID：`batch_${timestamp}_${random}`
   - 标记 `source: CardSource.CUSTOM`

**关键区别**：
- **存储标识**：内置卡牌有特殊的批次ID和source标记
- **版本管理**：内置卡牌有版本控制，自动更新；自定义卡牌由用户管理
- **加载时机**：内置卡牌在系统初始化时自动加载；自定义卡牌需要用户主动导入

## localStorage 使用情况

### 存储架构

**存储键定义**：
```typescript
export const STORAGE_KEYS = {
    INDEX: 'daggerheart_custom_cards_index',                    // 主索引
    BATCH_PREFIX: 'daggerheart_custom_cards_batch_',           // 批次数据前缀
    CONFIG: 'daggerheart_custom_cards_config',                 // 配置
    CUSTOM_FIELDS_BY_BATCH: 'daggerheart_custom_fields_by_batch',  // 自定义字段
    VARIANT_TYPES_BY_BATCH: 'daggerheart_variant_types_by_batch'   // 变体类型定义
}
```

### 存储结构

1. **主索引** (`daggerheart_custom_cards_index`)
   ```typescript
   {
     batches: Record<string, ImportBatch>,  // 所有批次的元数据
     totalCards: number,                    // 总卡牌数量
     totalBatches: number,                  // 总批次数量
     lastUpdate: string                     // 最后更新时间
   }
   ```

2. **批次数据** (`daggerheart_custom_cards_batch_${batchId}`)
   ```typescript
   {
     metadata: BatchBase,                   // 批次元数据
     cards: StandardCard[],                 // 实际卡牌数据
     customFieldDefinitions?: CustomFieldsForBatch  // 自定义字段定义
   }
   ```

3. **配置数据** (`daggerheart_custom_cards_config`)
   ```typescript
   {
     maxBatches: 50,                        // 最大批次数
     maxStorageSize: 5 * 1024 * 1024,      // 最大存储大小 5MB
     autoCleanup: true,                     // 自动清理
     compressionEnabled: false              // 压缩功能
   }
   ```

### 存储特性

**容量管理**：
- 最大存储限制：5MB
- 自动空间检查和清理
- 孤立数据检测和清理

**数据完整性**：
- 索引和批次数据的一致性检查
- 损坏数据的检测和修复
- 清理孤立的存储键

**版本控制**：
- 内置卡牌的版本化种子化
- 批次级别的版本管理

## 卡牌转换系统

### 转换器架构

每种卡牌类型都有专门的转换器：

```typescript
// 统一转换器接口
interface CardConverter<T> {
  toStandard(card: T): StandardCard
}

// 实际转换器
professionCardConverter.toStandard(card: ProfessionCard): StandardCard
ancestryCardConverter.toStandard(card: AncestryCard): StandardCard
communityCardConverter.toStandard(card: CommunityCard): StandardCard
subclassCardConverter.toStandard(card: SubClassCard): StandardCard
domainCardConverter.toStandard(card: DomainCard): StandardCard
variantCardConverter.toStandard(card: RawVariantCard): StandardCard
```

### 标准化输出

所有卡牌最终转换为统一的 `StandardCard` 格式：

```typescript
interface StandardCard {
  standarized: boolean           // 标准化标记
  id: string                    // 唯一标识符
  name: string                  // 卡牌名称
  type: string                  // 卡牌类型
  class: string                 // 卡牌分类
  level?: number                // 等级（可选）
  description?: string          // 描述
  hint?: string                 // 提示信息
  imageUrl?: string            // 图片URL
  headerDisplay?: string        // 头部显示
  cardSelectDisplay: {          // 选择界面显示
    item1?: string
    item2?: string
    item3?: string
    item4?: string
  }
  professionSpecial?: { ... }   // 职业特殊数据
  variantSpecial?: { ... }      // 变体特殊数据
}
```

