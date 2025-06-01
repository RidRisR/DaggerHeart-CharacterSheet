我需要为当前卡牌系统添加一个自定义导入数据的功能。基本功能如下：

1. 核心逻辑：
使用fileReader接口，允许用户选择一个json文件并上传到系统中。json文件中应该是多个列表，包含所有希望添加的卡牌数据。你可以参考data/card/xxxx-card/cards.ts中的字段。

请帮我定义json文件的格式：

加载完成后应该转入具体的卡牌类型然后接入（请检查是否能接入）现有的data/card/xxx-card/convert.ts，并可以增量增加到现有的ALL_STANDARD_CARDS中

2. 用户接口

目前只需要开发一个测试网页，提供导入按钮，简单展示增量数据能否成功读取即可

---

## 详细实现方案

### 1. 系统架构分析

**现有卡牌系统优势：**
- ✅ 清晰的TypeScript类型系统
- ✅ 统一的CardManager转换机制  
- ✅ 模块化设计（每种卡牌类型独立）
- ✅ 集中管理（index.ts统一导出）

**数据持久化策略：**
- **内置卡牌**：静态编译时生成（ALL_STANDARD_CARDS），独立管理
- **自定义卡牌**：动态运行时管理（localStorage存储），完全独立
- **分离管理**：两类数据永不混合，通过标识字段区分来源
- **统一查询**：提供接口按需组合查询内置+自定义卡牌

**localStorage存储格式设计：**
采用多键值分离存储，确保不同导入来源的数据独立管理：

```typescript
// 主索引键：存储所有导入批次的元数据
'daggerheart_custom_cards_index': {
  batches: {
    [batchId]: {
      id: string;           // 批次唯一ID
      name: string;         // 用户定义的批次名称
      fileName: string;     // 原始文件名
      importTime: string;   // 导入时间戳
      cardCount: number;    // 卡牌总数
      cardTypes: string[];  // 包含的卡牌类型
      size: number;         // 数据大小（字节）
    }
  },
  totalCards: number;       // 总卡牌数
  totalBatches: number;     // 总批次数
}

// 批次数据键：每个导入批次独立存储
'daggerheart_custom_cards_batch_[batchId]': {
  metadata: {
    batchId: string;
    fileName: string;
    importTime: string;
    originalData: ImportData; // 原始导入数据备份
  },
  cards: StandardCard[];    // 转换后的标准卡牌数据
}
```

### 2. JSON数据格式定义

```typescript
interface ImportData {
  profession?: ProfessionCard[];
  ancestry?: AncestryCard[];
  community?: CommunityCard[];
  subclass?: SubClassCard[];
  domain?: DomainCard[];
}
```

**示例JSON文件：**
```json
{
  "ancestry": [
    {
      "id": "custom-ancestry-1",
      "名称": "自定义血统",
      "种族": "人类",
      "简介": "这是一个自定义的血统卡牌",
      "效果": "提供某种特殊能力",
      "类别": 1,
      "imageURL": ""
    }
  ],
  "profession": [
    {
      "id": "custom-profession-1", 
      "名称": "自定义职业",
      "领域1": "奥术",
      "领域2": "勇气",
      "起始生命": 6,
      "起始闪避": 10,
      "起始物品": "自定义物品",
      "简介": "自定义职业简介",
      "希望特性": "自定义希望特性",
      "职业特性": "自定义职业特性"
    }
  ],
  "domain": [
    {
      "ID": "custom-domain-1",
      "名称": "自定义领域法术",
      "领域": "奥术",
      "等级": 1,
      "属性": "法术",
      "回想": 0,
      "描述": "自定义法术效果",
      "imageUrl": ""
    }
  ]
}
```

### 3. 核心组件实现

#### 3.1 自定义卡牌管理器 (`data/card/custom-card-manager.ts`)

```typescript
export class CustomCardManager {
  private static instance: CustomCardManager;
  private customCards: StandardCard[] = [];
  private cardManager: CardManager;

  // 核心功能：
  async importCards(importData: ImportData, batchName?: string): Promise<ImportResult>
  private validateUniqueIds(importData: ImportData, existingCards: StandardCard[]): ValidationResult
  
  // 数据管理：
  getCustomCards(): StandardCard[]
  getCustomCardsByType(type: string): StandardCard[]
  getAllBatches(): ImportBatch[]
  getBatchById(batchId: string): ImportBatch | null
  removeBatch(batchId: string): boolean
  clearAllCustomCards(): void
  
  // 统计功能：
  getStats(): CustomCardStats
  getBatchStats(batchId: string): BatchStats | null
}

// 数据结构定义
interface ImportBatch {
  id: string;
  name: string;
  fileName: string;
  importTime: string;
  cardCount: number;
  cardTypes: string[];
  size: number;
}

interface CustomCardIndex {
  batches: Record<string, ImportBatch>;
  totalCards: number;
  totalBatches: number;
  lastUpdate: string;
}

interface BatchData {
  metadata: {
    batchId: string;
    fileName: string;
    importTime: string;
    originalData: ImportData;
  };
  cards: StandardCard[];
}

interface CustomCardStats {
  totalCards: number;
  totalBatches: number;
  cardsByType: Record<string, number>;
  cardsByBatch: Record<string, number>;
  storageUsed: number; // 字节数
}

interface BatchStats {
  cardCount: number;
  cardTypes: string[];
  storageSize: number;
  importTime: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicateIds?: string[];
  batchId?: string; // 成功导入时返回批次ID
}

interface ValidationResult {
  isValid: boolean;
  duplicateIds: string[];
}
```

**关键特性：**
- ID冲突严格检查（检测到重复ID直接报错）
- localStorage持久化存储
- 完整的错误处理和验证
- 与现有CardManager完全兼容

#### 3.2 扩展主卡牌索引 (`data/card/index.ts`)

```typescript
// 新增函数：
export function getAllCards(): StandardCard[] 
export function getAllCardsByType(typeId: CardType): StandardCard[]

// 导出管理器：
export { customCardManager, CustomCardManager }
```

#### 3.3 导入测试页面 (`app/card-import-test/page.tsx`)

**用户界面功能：**
- 文件拖拽/选择上传
- 批次命名功能（可选）
- 实时导入进度显示
- 结果统计（成功/失败/重复）
- 自定义卡牌批次管理界面
- 批次详情查看
- 单个批次删除/批量清除功能
- 存储使用情况显示

**批次管理界面设计：**
```typescript
interface BatchManagementUI {
  // 批次列表显示
  batchList: {
    id: string;
    name: string;
    fileName: string;
    cardCount: number;
    importTime: string;
    storageSize: string; // 格式化的存储大小
  }[];
  
  // 操作功能
  actions: {
    viewBatchDetails: (batchId: string) => void;
    removeBatch: (batchId: string) => void;
    exportBatch: (batchId: string) => void;
    renameBatch: (batchId: string, newName: string) => void;
  };
  
  // 统计信息
  statistics: {
    totalCards: number;
    totalBatches: number;
    storageUsed: string;
    storageLimit: string;
  };
}
```

### 4. 数据流程设计

```
用户JSON文件
     ↓
FileReader API 读取
     ↓  
JSON 解析和验证
     ↓
ID冲突检查（严格模式）
     ↓ (如果有冲突，直接报错退出)
生成批次ID和元数据
     ↓
CustomCardManager.importCards()
     ↓
分类型处理 → CardManager.ConvertCard() → StandardCard
     ↓
创建BatchData结构
     ↓
localStorage分离存储：
  - 更新主索引 (daggerheart_custom_cards_index)
  - 保存批次数据 (daggerheart_custom_cards_batch_[batchId])
     ↓
更新内存中的卡牌缓存
```

**导入流程详细步骤：**
1. **文件读取和解析**：FileReader → JSON对象
2. **预验证**：格式检查、必要字段验证
3. **ID冲突检查**：与所有现有卡牌（内置+自定义）比对
4. **批次准备**：生成唯一批次ID，准备元数据
5. **数据转换**：使用CardManager转换为StandardCard
6. **存储操作**：
   - 保存批次数据到独立键
   - 更新主索引记录
   - 更新统计信息
7. **内存更新**：重新加载自定义卡牌到内存缓存

### 5. 错误处理策略

1. **文件格式错误**：JSON解析失败的友好提示
2. **数据格式错误**：缺少必要字段的卡牌跳过处理
3. **转换失败**：记录详细错误信息供调试
4. **ID冲突**：检测到重复ID直接报错，终止导入流程
5. **存储限制**：localStorage容量检查和处理
6. **存储完整性**：定期检查和修复孤立数据
7. **批次损坏**：自动检测和处理批次数据损坏情况

**存储异常处理：**
```typescript
// 存储操作的事务性处理
async importCards(importData: ImportData, batchName?: string): Promise<ImportResult> {
  const batchId = this.generateBatchId();
  let hasCreatedBatch = false;
  
  try {
    // 第一步：ID冲突检查
    const validation = this.validateUniqueIds(importData, await this.getAllExistingCards());
    if (!validation.isValid) {
      return {
        success: false,
        imported: 0,
        errors: [`ID冲突: ${validation.duplicateIds.join(', ')}`],
        duplicateIds: validation.duplicateIds
      };
    }
    
    // 第二步：数据转换
    const convertedCards = await this.convertImportData(importData);
    
    // 第三步：准备批次数据
    const batchData: BatchData = {
      metadata: {
        batchId,
        fileName: batchName || 'Unknown',
        importTime: new Date().toISOString(),
        originalData: importData
      },
      cards: convertedCards
    };
    
    // 第四步：存储操作（事务性）
    this.saveBatchData(batchId, batchData);
    hasCreatedBatch = true;
    
    // 第五步：更新索引
    const index = this.loadIndex();
    index.batches[batchId] = {
      id: batchId,
      name: batchName || `Batch ${new Date().toLocaleDateString()}`,
      fileName: batchName || 'imported.json',
      importTime: batchData.metadata.importTime,
      cardCount: convertedCards.length,
      cardTypes: [...new Set(convertedCards.map(card => card.type))],
      size: JSON.stringify(batchData).length * 2
    };
    index.totalCards += convertedCards.length;
    index.totalBatches++;
    
    this.saveIndex(index);
    
    // 第六步：更新内存缓存
    this.reloadCustomCards();
    
    return {
      success: true,
      imported: convertedCards.length,
      errors: [],
      batchId
    };
    
  } catch (error) {
    // 清理失败的操作
    if (hasCreatedBatch) {
      this.removeBatchData(batchId);
    }
    
    console.error('[CustomCardManager] 导入失败:', error);
    return {
      success: false,
      imported: 0,
      errors: [`导入失败: ${error.message}`]
    };
  }
}
```

### 6. 实现文件清单

#### 需要创建的文件：
- `data/card/custom-card-manager.ts` - 自定义卡牌核心管理器
- `data/card/custom-card-storage.ts` - localStorage存储抽象层
- `app/card-import-test/page.tsx` - 导入测试页面
- `components/custom-card-manager-ui.tsx` - 批次管理UI组件

#### 需要修改的文件：
- `data/card/index.ts` - 集成自定义卡牌管理器
- `data/card/card-types.ts` - 添加新的类型定义
- 可能需要更新的UI组件（如果要在现有界面显示自定义卡牌）

#### 存储层架构：
```typescript
// 存储抽象层 (custom-card-storage.ts)
export class CustomCardStorage {
  // 索引操作
  static loadIndex(): CustomCardIndex
  static saveIndex(index: CustomCardIndex): void
  
  // 批次操作
  static saveBatch(batchId: string, data: BatchData): void
  static loadBatch(batchId: string): BatchData | null
  static removeBatch(batchId: string): void
  static listBatches(): string[]
  
  // 维护操作
  static validateIntegrity(): IntegrityReport
  static cleanupOrphanedData(): CleanupReport
  static calculateStorageUsage(): StorageStats
  
  // 配置操作
  static getConfig(): StorageConfig
  static setConfig(config: Partial<StorageConfig>): void
}

interface StorageConfig {
  maxBatches: number;
  maxStorageSize: number; // 字节
  autoCleanup: boolean;
  compressionEnabled: boolean;
}
```

### 7. 测试计划

#### 单元测试：
- CustomCardManager各方法功能
- ID冲突检查逻辑（严格模式）
- localStorage存储和读取

#### 集成测试：
- 与现有卡牌系统兼容性
- CardManager转换器集成
- UI组件交互

#### 用户测试场景：
- 正常JSON文件导入
- 错误格式文件处理
- 大量数据导入性能
- ID重复场景的错误提示和处理

### 8. 技术要点

#### ID冲突检查算法：
```typescript
private validateUniqueIds(importData: ImportData, existingCards: StandardCard[]): { 
  isValid: boolean; 
  duplicateIds: string[]; 
} {
  const duplicateIds: string[] = [];
  const existingIds = new Set(existingCards.map(card => card.id));
  
  // 检查所有导入卡牌的ID
  for (const [cardType, cards] of Object.entries(importData)) {
    if (!cards || !Array.isArray(cards)) continue;
    
    for (const card of cards) {
      if (card.id && existingIds.has(card.id)) {
        duplicateIds.push(`${cardType}.${card.id}`);
      }
    }
  }
  
  return {
    isValid: duplicateIds.length === 0,
    duplicateIds
  };
}
```

#### 导入前验证流程：
```typescript
async importCards(importData: ImportData): Promise<ImportResult> {
  const existingCards = [...ALL_STANDARD_CARDS, ...this.customCards];
  
  // 第一步：ID冲突检查
  const validation = this.validateUniqueIds(importData, existingCards);
  if (!validation.isValid) {
    return {
      success: false,
      imported: 0,
      errors: [`ID冲突检测到重复ID: ${validation.duplicateIds.join(', ')}`],
      duplicates: validation.duplicateIds
    };
  }
  
  // 第二步：数据转换和导入
  // ... 其余导入逻辑
}
```

#### localStorage容量管理：
```typescript
private checkStorageSpace(data: string): boolean {
  try {
    localStorage.setItem('test_storage', data);
    localStorage.removeItem('test_storage');
    return true;
  } catch (e) {
    return false; // 容量不足或其他限制
  }
}
```

#### localStorage数据管理详细实现：

**存储键命名规范：**
```typescript
// 常量定义
const STORAGE_KEYS = {
  INDEX: 'daggerheart_custom_cards_index',
  BATCH_PREFIX: 'daggerheart_custom_cards_batch_',
  CONFIG: 'daggerheart_custom_cards_config'
} as const;

// 生成批次存储键
private getBatchStorageKey(batchId: string): string {
  return `${STORAGE_KEYS.BATCH_PREFIX}${batchId}`;
}
```

**批次ID生成策略：**
```typescript
private generateBatchId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return `batch_${timestamp}_${random}`;
}
```

**索引管理：**
```typescript
private loadIndex(): CustomCardIndex {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.INDEX);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[CustomCardManager] 索引加载失败:', error);
  }
  
  // 返回默认索引结构
  return {
    batches: {},
    totalCards: 0,
    totalBatches: 0,
    lastUpdate: new Date().toISOString()
  };
}

private saveIndex(index: CustomCardIndex): void {
  try {
    index.lastUpdate = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(index));
  } catch (error) {
    console.error('[CustomCardManager] 索引保存失败:', error);
    throw new Error('无法保存自定义卡牌索引');
  }
}
```

**批次数据管理：**
```typescript
private saveBatchData(batchId: string, batchData: BatchData): void {
  try {
    const key = this.getBatchStorageKey(batchId);
    localStorage.setItem(key, JSON.stringify(batchData));
  } catch (error) {
    console.error(`[CustomCardManager] 批次 ${batchId} 保存失败:`, error);
    throw new Error(`无法保存批次数据: ${batchId}`);
  }
}

private loadBatchData(batchId: string): BatchData | null {
  try {
    const key = this.getBatchStorageKey(batchId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error(`[CustomCardManager] 批次 ${batchId} 加载失败:`, error);
    return null;
  }
}

private removeBatchData(batchId: string): void {
  const key = this.getBatchStorageKey(batchId);
  localStorage.removeItem(key);
}
```

**存储空间监控：**
```typescript
private calculateStorageUsage(): number {
  let totalSize = 0;
  const index = this.loadIndex();
  
  // 计算索引大小
  totalSize += JSON.stringify(index).length * 2; // UTF-16编码
  
  // 计算各批次数据大小
  for (const batchId of Object.keys(index.batches)) {
    const key = this.getBatchStorageKey(batchId);
    const data = localStorage.getItem(key);
    if (data) {
      totalSize += data.length * 2;
    }
  }
  
  return totalSize;
}
```

#### 数据清理和维护：

**清理策略：**
```typescript
// 清理单个批次
public removeBatch(batchId: string): boolean {
  const index = this.loadIndex();
  
  if (!index.batches[batchId]) {
    return false;
  }
  
  // 删除批次数据
  this.removeBatchData(batchId);
  
  // 更新索引
  const batch = index.batches[batchId];
  delete index.batches[batchId];
  index.totalBatches--;
  index.totalCards -= batch.cardCount;
  
  this.saveIndex(index);
  
  // 重新加载内存中的卡牌数据
  this.reloadCustomCards();
  
  return true;
}

// 清理所有自定义卡牌
public clearAllCustomCards(): void {
  const index = this.loadIndex();
  
  // 删除所有批次数据
  for (const batchId of Object.keys(index.batches)) {
    this.removeBatchData(batchId);
  }
  
  // 清空索引
  localStorage.removeItem(STORAGE_KEYS.INDEX);
  
  // 重置内存数据
  this.customCards = [];
}

// 数据完整性检查
public validateStorageIntegrity(): { 
  isValid: boolean; 
  issues: string[]; 
  orphanedKeys: string[] 
} {
  const issues: string[] = [];
  const orphanedKeys: string[] = [];
  
  const index = this.loadIndex();
  
  // 检查索引中的批次是否都有对应的数据
  for (const [batchId, batch] of Object.entries(index.batches)) {
    const batchData = this.loadBatchData(batchId);
    if (!batchData) {
      issues.push(`批次 ${batchId} 索引存在但数据丢失`);
    }
  }
  
  // 检查localStorage中是否有孤立的批次数据
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEYS.BATCH_PREFIX)) {
      const batchId = key.replace(STORAGE_KEYS.BATCH_PREFIX, '');
      if (!index.batches[batchId]) {
        orphanedKeys.push(key);
        issues.push(`发现孤立的批次数据: ${key}`);
      }
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    orphanedKeys
  };
}
```

#### ID冲突处理策略说明：
**严格模式**：检测到任何ID冲突都会直接终止导入流程
- **优势**：保证数据完整性，避免意外覆盖
- **用户体验**：提供明确的错误信息，指出冲突的具体ID
- **建议**：用户需要手动修改JSON文件中的重复ID后重新导入
- **错误信息格式**：`"ID冲突: profession.custom-warrior-1, ancestry.elf-ranger"`

### 9. 未来扩展方向

- 导出功能：将自定义卡牌导出为JSON
- 模板系统：提供常用卡牌模板
- 批量编辑：支持批量修改自定义卡牌
- 云端同步：支持跨设备同步自定义卡牌
- 分享功能：支持分享自定义卡牌给其他用户

### 11. 性能考虑

- localStorage数据懒加载
- 大量卡牌时的虚拟滚动
- JSON解析的进度反馈
- 内存使用优化

---

**结论：** 该方案完全基于现有架构，确保了兼容性和可维护性，同时提供了完整的用户体验和错误处理机制。