# 卡牌管理系统重构计划

## 当前系统概述

目前的卡牌管理系统分为两个部分：内置卡牌系统和自定义卡牌系统。

### 内置卡牌系统
- 内置卡牌通过 TypeScript 文件（如 `profession-card/cards.ts`）定义并导入
- 使用 `BuiltinCardManager` 类注册并转换不同类型的卡牌
- 在运行时转换为标准化的 `StandardCard` 格式
- 通过 `builtin-card-data.ts` 中的 `BUILTIN_CARDS_VERSION` 控制版本
- 内置卡牌也会被写入 localStorage 作为特殊批次 `BUILTIN_BATCH_ID`

### 自定义卡牌系统
- 自定义卡牌通过 JSON 文件导入
- 使用 `CustomCardManager` 管理自定义卡牌
- 卡牌数据存储在 localStorage 中，每个导入批次单独存储
- 提供了卡牌的导入、删除、获取等功能
- 支持自定义字段定义和变体类型

### 两者的关联
- `CustomCardManager` 负责在启动时将内置卡牌写入 localStorage
- 两个系统共享同一组卡牌转换器（如 `professionCardConverter`）
- 卡牌检索接口 `getAllStandardCardsAsync` 等实际上是通过 `CustomCardManager` 访问统一存储的

## 重构目标

统一内置和自定义卡牌系统，使用 JSON 文件作为内置卡牌的数据源，主要区别仅在于内置卡牌在系统启动时自动加载。这样可以让卡牌管理更加一致，并为将来添加更多内置卡牌包做准备。

## 数据流分析

### 当前数据流
1. **内置卡牌**:
   - 来源：TypeScript 文件 (`*.ts`)
   - 转换：`BuiltinCardManager` → `StandardCard`
   - 存储：内存中 + localStorage (`BUILTIN_BATCH_ID`)
   - 访问：`getBuiltinStandardCards()` 或 `getAllStandardCardsAsync()`

2. **自定义卡牌**:
   - 来源：JSON 文件 (导入)
   - 转换：`CustomCardManager` → 相应的转换器 → `StandardCard`
   - 存储：localStorage (批次)
   - 访问：`getCustomCards()` 或 `getAllStandardCardsAsync()`

### 重构后的数据流
1. **所有卡牌**:
   - 来源：JSON 文件（内置卡牌包和用户导入）
   - 转换：统一的转换器系统 → `StandardCard`
   - 存储：localStorage (批次，内置卡牌有特殊标记)
   - 访问：统一的 API

## 重构方案

### 1. 内置卡牌转换为 JSON

将当前 TS 文件中的内置卡牌数据转换为标准 JSON 格式：

```
/public/
  /card-packs/
    builtin-base.json         # 基础内置卡牌（现有内容）
    builtin-expansion-1.json  # 未来可能的扩展包
    builtin-expansion-2.json  # 未来可能的扩展包
```

每个 JSON 文件结构与当前导入格式一致：

```json
{
  "name": "基础内置卡牌",
  "version": "VERSION_ID",
  "description": "系统内置卡牌包，数据来自SRD",
  "author": "RidRisR",
  "profession": [ ... ],
  "ancestry": [ ... ],
  "community": [ ... ],
  "subclass": [ ... ],
  "domain": [ ... ]
}
```

### 2. 重构卡牌管理系统

#### 2.1 `CardManager` 统一类

创建一个统一的 `CardManager` 类，取代现有的 `BuiltinCardManager` 和 `CustomCardManager`：

```typescript
export class CardManager {
  private static instance: CardManager;
  private cardConverters: Record<string, Function> = {};
  private isInitialized = false;
  
  static getInstance(): CardManager { ... }
  
  // 注册转换器方法保持不变
  registerConverter(type: string, converter: Function): void { ... }
  
  // 初始化系统
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // 加载内置卡牌包
    await this.loadBuiltinCardPacks();
    
    // 加载用户自定义卡牌
    this.loadCustomCards();
    
    this.isInitialized = true;
  }
  
  // 加载内置卡牌包
  private async loadBuiltinCardPacks(): Promise<void> {
    // 从静态资源目录加载JSON文件
    // 设置isSystemBatch=true并导入每个卡牌包
  }
  
  // 其他方法保持与现有CustomCardManager一致
  ...
}
```

#### 2.2 卡牌存储系统

保持现有的 `CardStorage` 类不变，它已经能够支持按批次存储卡牌。

### 3. 内置卡牌加载机制

实现从静态资源加载内置卡牌 JSON 文件的机制：

```typescript
async function loadBuiltinCardPacks(): Promise<void> {
  try {
    // 内置卡牌包列表，可以扩展
    const builtinPacks = [
      { id: 'builtin-base', path: '/card-packs/builtin-base.json' }
      // 未来可添加更多内置卡牌包
    ];
    
    for (const pack of builtinPacks) {
      const response = await fetch(pack.path);
      const packData = await response.json();
      
      // 检查版本并更新
      const existingPack = this.getBatchById(pack.id);
      if (existingPack && existingPack.version === packData.version) {
        continue; // 版本一致，无需更新
      }
      
      // 导入卡牌包，设置为系统内置
      await this.importCards(packData, {
        id: pack.id,
        isSystemBatch: true
      });
    }
  } catch (error) {
    console.error('加载内置卡牌包失败:', error);
  }
}
```

### 4. 导入导出接口优化

扩展导入导出功能，以支持更多卡牌包格式：

```typescript
// 导入卡牌
async importCards(
  data: ImportData, 
  options?: { 
    id?: string,              // 自定义批次ID
    name?: string,            // 自定义批次名称
    isSystemBatch?: boolean   // 是否系统内置
  }
): Promise<ImportResult> { ... }

// 导出卡牌包
exportCardPack(batchId: string): ExportData { ... }
```

## 实施步骤

1. **创建 JSON 数据文件**
   - 将 TypeScript 中的内置卡牌数据转换为 JSON 格式
   - 放置到静态资源目录

2. **重构管理系统**
   - 创建统一的 `CardManager` 类
   - 实现从 JSON 加载内置卡牌的功能
   - 保留兼容性接口以避免中断现有功能

3. **更新初始化流程**
   - 更新 `CardSystemInitializer` 组件以使用新的 `CardManager`
   - 确保在客户端初始化时加载卡牌包

4. **测试与验证**
   - 验证卡牌导入导出功能
   - 验证内置卡牌自动加载功能
   - 验证现有功能的正常工作

## 方案的优势

1. **统一数据格式**：内置卡牌和自定义卡牌使用相同的 JSON 格式，简化了系统维护。

2. **模块化内置内容**：可以轻松添加更多内置卡牌包，无需修改代码。

3. **版本控制**：每个卡牌包都有独立的版本号，便于更新管理。

4. **扩展性**：可以在未来轻松添加更多功能，如官方扩展包、社区精选包等。

5. **简化开发流程**：不再需要在 TypeScript 和 JSON 之间转换，减少了维护成本。

## 可能的挑战和解决方案

1. **静态资源访问**：在 Next.js 环境中从公共目录加载 JSON 文件可能需要特殊处理。
   - 解决方案：内置卡牌静态导入，外部卡包用户手动导入。

3. **转换逻辑维护**：现有转换器仍然需要支持不同格式。
   - 解决方案：保持现有转换器不变，只重构数据来源和存储部分。

## 详细实施计划

### 阶段一：准备工作

1. **数据转换工具**
   - 创建一个脚本工具，将现有 TS 格式的卡牌数据转换为 JSON 格式
   - 确保转换过程中保留所有必要的数据和结构

2. **测试数据验证**
   - 创建验证工具，确认转换后的 JSON 数据可以被正确导入和解析
   - 比较转换前后的卡牌数量和内容

### 阶段二：核心重构

1. **创建新的 `CardManager` 类**
   ```typescript
   // /data/card/card-manager.ts
   export class CardManager {
     // 实现统一的卡牌管理逻辑
   }
   ```

2. **内置卡牌加载系统**
   ```typescript
   // /data/card/builtin-card-loader.ts
   export async function loadBuiltinCardPacks(): Promise<ImportResult[]> {
     // 实现从 public 目录加载 JSON 卡牌包
   }
   ```

3. **更新 `CardSystemInitializer` 组件**
   ```tsx
   // /components/card-system-initializer.tsx
   export function CardSystemInitializer() {
     useEffect(() => {
       // 使用新的 CardManager 初始化系统
     }, []);
     return null;
   }
   ```

### 阶段三：兼容层和迁移

1. **兼容层接口**
   ```typescript
   // /data/card/index.ts
   // 保持现有导出接口不变，但内部实现重定向到新系统
   ```

2. **渐进式迁移**
   - 先保留旧系统，同时实现新系统
   - 在测试环境中验证新系统功能
   - 确认无问题后切换到新系统

### 阶段四：优化和扩展

1. **卡牌包管理界面优化**
   - 增加卡牌包启用/禁用功能
   - 添加卡牌包分类和筛选功能

## 总结

该重构方案将统一内置和自定义卡牌系统，使用 JSON 作为所有卡牌的标准格式。系统的主要区别仅在于内置卡牌在启动时自动加载，并被标记为系统内置。

这种方案的实施将简化卡牌管理，提高系统的可维护性和扩展性，同时为未来添加更多内置卡牌包做好准备。通过分阶段实施，可以确保系统平稳过渡，同时保持现有功能不受影响。
