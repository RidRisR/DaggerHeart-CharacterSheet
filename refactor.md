# Variant 卡牌系统重构方案

## 1. 现有卡牌系统架构分析

### 1.1 当前系统组成

现有卡牌系统采用了分层架构：

1. **类型定义层** (`card-types.ts`)
   - 定义 `StandardCard` 接口和 `CardType` 枚举
   - 管理卡牌类型映射 `ALL_CARD_TYPES`
   - 提供空卡牌创建函数

2. **预定义字段层** (`card-predefined-field.ts`)
   - 定义各类型卡牌的类别名称常量
   - 提供动态获取函数，支持自定义卡牌扩展
   - 集成 `CustomCardStorage` 以支持临时批次定义

3. **转换器层** (`builtin-card-manager.ts`, `card-converter.ts`)
   - `BuiltinCardManager` 注册各类型转换器
   - 将原始卡牌数据转换为 `StandardCard` 格式
   - 支持动态注册新的卡牌类型转换器

4. **存储层** (`card-storage.ts`)
   - 管理自定义卡牌的存储和批次管理
   - 支持自定义字段的批次关联存储

5. **UI配置层** (`card-ui-config.ts`)
   - 将数据层配置转换为UI选项格式
   - 管理等级选项和类别选项

6. **UI交互层** (`card-selection-modal.tsx`)
   - 提供卡牌选择界面
   - 支持按类型、类别、等级筛选

### 1.2 现有架构优势

- **解耦设计**：各层职责清晰，便于维护
- **可扩展性**：支持动态注册新的卡牌类型
- **一致性**：所有卡牌最终转换为统一的 `StandardCard` 格式
- **存储灵活性**：支持批次管理和自定义字段

## 2. Variant 卡牌需求分析

### 2.1 核心需求

```typescript
interface VariantCard {
  id: string
  名称: string
  type: "variant" // 自动生成，不需要用户填写
  类型: string   // 自定义类型，如 "食物"、"人物"
  子类别?: string // 自定义子类别，如 "饮料"、"盟友"
  等级?: number
  效果: string
  imageUrl?: string
  简略信息: {
    item1?: string
    item2?: string
    item3?: string
  }
}
```

### 2.2 关键挑战

1. **动态类型映射**：从 `variant` 到真实类别的转化
2. **子类别管理**：不同变体类型对应不同的子类别范围
3. **UI分离**：标准卡牌与扩展卡牌的界面分离
4. **验证机制**：导入时的类型和子类别验证
5. **存储一致性**：与现有存储系统的兼容

## 3. 解决方案设计

### 3.1 架构扩展策略

#### 3.1.1 引入变体类型注册系统

```typescript
// 新增：data/card/variant-card/variant-registry.ts
interface VariantTypeDefinition {
  id: string              // 变体类型ID，如 "food"
  name: string           // 显示名称，如 "食物"
  subclasses: string[]   // 允许的子类别
  defaultLevel?: number  // 默认等级
}

class VariantTypeRegistry {
  // 管理变体类型定义
  // 支持动态注册和验证
}
```

#### 3.1.2 扩展现有类型系统

```typescript
// 修改：data/card/card-types.ts
export enum CardType {
  // ...existing types
  Variant = "variant",
}

export enum CardCategory {
  Standard = "standard",  // 标准卡牌
  Extended = "extended",  // 扩展卡牌（包含variant）
}
```

#### 3.1.3 变体卡牌转换器

```typescript
// 新增：data/card/variant-card/convert.ts
export interface RawVariantCard {
  id: string
  名称: string
  类型: string
  子类别?: string
  等级?: number
  效果: string
  imageUrl?: string
  简略信息: {
    item1?: string
    item2?: string
    item3?: string
  }
}

export function convertVariantCard(card: RawVariantCard): StandardCard {
  // 转换逻辑
}
```

### 3.2 实施步骤

#### 第一阶段：核心架构扩展

1. **创建变体类型注册系统**
   - `data/card/variant-card/variant-registry.ts`
   - `data/card/variant-card/variant-types.ts`
   - `data/card/variant-card/convert.ts`

2. **扩展现有类型定义**
   - 修改 `card-types.ts` 添加 `CardType.Variant` 和 `CardCategory`
   - 修改 `card-predefined-field.ts` 添加变体类型支持

3. **注册变体转换器**
   - 修改 `builtin-card-manager.ts` 支持变体卡牌转换
   - 修改 `card-converter.ts` 集成变体转换逻辑

#### 第二阶段：存储和验证

4. **扩展存储系统**
   - 修改 `card-storage.ts` 支持变体类型定义存储
   - 添加批次导入时的变体类型验证

5. **实现验证机制**
   - 创建 `data/card/variant-card/validator.ts`
   - 导入时验证变体类型和子类别的预定义

#### 第三阶段：UI集成

6. **UI配置更新**
   - 修改 `card-ui-config.ts` 支持卡牌分类显示
   - 添加变体类型的UI选项生成

7. **选择模态框改造**
   - 修改 `card-selection-modal.tsx` 添加"标准"/"扩展"分类
   - 为变体卡牌提供独立的筛选界面

### 3.3 文件改动清单

#### 新增文件
```
data/card/variant-card/
  ├── variant-registry.ts      # 变体类型注册系统
  ├── variant-types.ts         # 变体类型定义
  ├── convert.ts              # 变体卡牌转换器
  └── validator.ts            # 变体卡牌验证器
```

#### 修改文件
```
data/card/
  ├── card-types.ts           # 添加Variant类型和CardCategory
  ├── card-predefined-field.ts # 添加变体类型支持
  ├── builtin-card-manager.ts # 注册变体转换器
  ├── card-converter.ts       # 集成变体转换
  ├── card-storage.ts         # 扩展存储支持
  └── card-ui-config.ts       # UI配置更新

components/modals/
  └── card-selection-modal.tsx # UI分类改造
```

## 4. 详细技术方案

### 4.1 变体类型注册系统

```typescript
// data/card/variant-card/variant-registry.ts
export class VariantTypeRegistry {
  private static instance: VariantTypeRegistry;
  private typeDefinitions: Map<string, VariantTypeDefinition> = new Map();

  // 注册变体类型
  registerType(definition: VariantTypeDefinition): void {
    this.typeDefinitions.set(definition.id, definition);
  }

  // 获取变体类型
  getType(id: string): VariantTypeDefinition | undefined {
    return this.typeDefinitions.get(id);
  }

  // 验证子类别
  validateSubclass(typeId: string, subclass: string): boolean {
    const type = this.getType(typeId);
    return type ? type.subclasses.includes(subclass) : false;
  }

  // 获取所有注册的类型
  getAllTypes(): VariantTypeDefinition[] {
    return Array.from(this.typeDefinitions.values());
  }
}
```

### 4.2 UI分类改造

```typescript
// components/modals/card-selection-modal.tsx (部分修改)
const [cardCategory, setCardCategory] = useState<CardCategory>(CardCategory.Standard);

// 添加分类切换UI
<div className="flex space-x-2 mb-4">
  <Button 
    variant={cardCategory === CardCategory.Standard ? "default" : "outline"}
    onClick={() => setCardCategory(CardCategory.Standard)}
  >
    标准卡牌
  </Button>
  <Button 
    variant={cardCategory === CardCategory.Extended ? "default" : "outline"}
    onClick={() => setCardCategory(CardCategory.Extended)}
  >
    扩展卡牌
  </Button>
</div>

// 根据分类显示不同的类型选项
const availableCardTypes = useMemo(() => {
  if (cardCategory === CardCategory.Standard) {
    return standardCardTypes;
  } else {
    return extendedCardTypes;
  }
}, [cardCategory]);
```

### 4.3 导入验证机制

```typescript
// data/card/variant-card/validator.ts
export class VariantCardValidator {
  static validateBatch(
    cards: RawVariantCard[], 
    predefinedTypes: VariantTypeDefinition[]
  ): ValidationResult {
    const errors: string[] = [];
    
    // 预注册所有类型定义
    const registry = VariantTypeRegistry.getInstance();
    predefinedTypes.forEach(type => registry.registerType(type));
    
    // 验证每张卡牌
    cards.forEach((card, index) => {
      if (!registry.getType(card.类型)) {
        errors.push(`卡牌 ${index + 1}: 未定义的类型 "${card.类型}"`);
      }
      
      if (card.子类别 && !registry.validateSubclass(card.类型, card.子类别)) {
        errors.push(`卡牌 ${index + 1}: 无效的子类别 "${card.子类别}"`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  }
}
```

## 5. 潜在问题分析

### 5.1 技术风险

1. **性能问题**
   - **风险**：动态类型注册可能影响启动性能
   - **缓解**：实现懒加载和缓存机制

2. **类型安全**
   - **风险**：运行时类型注册可能导致类型错误
   - **缓解**：严格的验证机制和TypeScript类型约束

3. **向后兼容性**
   - **风险**：现有卡牌系统可能受到影响
   - **缓解**：保持现有API不变，仅添加新功能

### 5.2 用户体验风险

1. **复杂性增加**
   - **风险**：变体卡牌的配置可能过于复杂
   - **缓解**：提供清晰的文档和示例

2. **UI一致性**
   - **风险**：标准和扩展卡牌的界面差异可能造成困惑
   - **缓解**：保持一致的设计语言和交互模式

### 5.3 数据一致性风险

1. **存储冲突**
   - **风险**：变体类型定义与现有数据冲突
   - **缓解**：实现数据迁移和冲突检测机制

2. **验证遗漏**
   - **风险**：导入时可能遗漏某些验证
   - **缓解**：全面的测试覆盖和边界情况处理

## 6. 实施优先级

### 高优先级（核心功能）
- [ ] 创建变体类型注册系统
- [ ] 扩展卡牌类型定义
- [ ] 实现变体卡牌转换器
- [ ] 基本的导入验证

### 中优先级（用户体验）
- [ ] UI分类改造
- [ ] 扩展存储系统
- [ ] 完善验证机制

### 低优先级（优化增强）
- [ ] 性能优化
- [ ] 高级验证功能
- [ ] 文档和示例

## 7. 测试策略

1. **单元测试**：对每个新组件进行单元测试
2. **集成测试**：测试变体卡牌与现有系统的集成
3. **用户测试**：验证UI分类的用户体验
4. **边界测试**：测试极端情况和错误处理

## 8. 后续扩展可能

1. **可视化编辑器**：为变体类型定义提供图形化编辑界面
2. **模板系统**：提供常用变体类型的模板
3. **导出功能**：支持变体卡牌的批量导出
4. **版本管理**：支持变体类型定义的版本控制

## 9. Variant 卡牌的 JSON 文件格式设计

### 9.1 现有JSON格式分析

当前系统的JSON格式包含以下关键特性：

1. **批次元数据**：`name`、`version`、`description`、`author`
2. **自定义字段定义**：`customFieldDefinitions` 用于扩展已有类型的选项
3. **分类卡牌数据**：`profession`、`ancestry`、`community`、`subclass`、`domain`
4. **验证机制**：通过 `CardTypeValidator` 验证数据格式和字段值

### 9.2 Variant 卡牌JSON格式扩展

#### 9.2.1 扩展的JSON结构

```json
{
  "name": "我的扩展卡牌包",
  "version": "1.0",
  "description": "包含Variant卡牌的扩展卡牌包",
  "author": "用户名",
  
  // 扩展自定义字段定义，新增变体类型定义
  "customFieldDefinitions": {
    "professions": ["流浪剑客"],
    "ancestries": ["树人"],
    "communities": ["河谷之民"],
    "domains": ["时空", "幻术"],
    
    // 新增：变体类型定义
    "variantTypes": {
      "食物": {
        "name": "食物",
        "subclasses": ["饮料", "主食", "菜品", "零食"],
        "defaultLevel": 1,
        "description": "各种食物道具"
      },
      "人物": {
        "name": "人物",
        "subclasses": ["盟友", "中立", "敌人"],
        "description": "NPC角色卡牌"
      },
      "装备": {
        "name": "装备",
        "subclasses": ["武器", "防具", "饰品", "工具"],
        "levelRange": [1, 10],
        "description": "各种装备道具"
      }
    }
  },
  
  // 现有卡牌类型...
  "profession": [...],
  "ancestry": [...],
  "community": [...],
  "subclass": [...],
  "domain": [...],
  
  // 新增：变体卡牌数据
  "variant": [
    {
      "id": "mycards-myname-1.0-variant-food-001",
      "名称": "美味苹果",
      "类型": "食物",
      "子类别": "零食",
      "等级": 1,
      "效果": "食用后恢复少量生命值。**美味**：额外获得1点希望。",
      "imageUrl": "apple.jpg",
      "简略信息": {
        "item1": "恢复生命",
        "item2": "获得希望",
        "item3": "美味零食"
      }
    },
    {
      "id": "mycards-myname-1.0-variant-person-002", 
      "名称": "村庄铁匠",
      "类型": "人物",
      "子类别": "盟友",
      "效果": "可以修理装备和制作简单武器。**信任**：购买物品时获得折扣。",
      "简略信息": {
        "item1": "修理装备",
        "item2": "制作武器", 
        "item3": "商店折扣"
      }
    },
    {
      "id": "mycards-myname-1.0-variant-equipment-003",
      "名称": "龙鳞护甲",
      "类型": "装备",
      "子类别": "防具",
      "等级": 5,
      "效果": "提供优秀的物理防护。**龙威**：面对龙类敌人时获得额外防护。**火焰抗性**：减少火焰伤害。",
      "简略信息": {
        "item1": "优秀防护",
        "item2": "龙威效果",
        "item3": "火焰抗性"
      }
    }
  ]
}
```

#### 9.2.2 变体类型定义格式

```typescript
interface VariantTypeDefinition {
  name: string                    // 显示名称
  subclasses: string[]           // 允许的子类别列表
  defaultLevel?: number          // 默认等级
  levelRange?: [number, number]  // 等级范围 [最小值, 最大值]
  description?: string           // 类型描述
  required?: string[]            // 必需字段列表（扩展用）
  optional?: string[]            // 可选字段列表（扩展用）
}
```

#### 9.2.3 变体卡牌数据格式

```typescript
interface RawVariantCard {
  id: string                     // 唯一标识符
  名称: string                   // 卡牌名称
  类型: string                   // 变体类型，必须在 variantTypes 中定义
  子类别?: string                // 子类别，必须在对应类型的 subclasses 中
  等级?: number                  // 等级（可选）
  效果: string                   // 卡牌效果描述
  imageUrl?: string              // 图片URL（保留字段）
  简略信息: {                    // 卡牌选择时显示的简要信息
    item1?: string
    item2?: string  
    item3?: string
  }
  
  // 预留扩展字段
  [key: string]: any
}
```

#### 9.3 验证机制扩展

#### 9.3.1 变体类型验证器

```typescript
// 新增：data/card/variant-card/validator.ts
export function validateVariantCard(
  card: any, 
  index: number, 
  variantTypes: Record<string, VariantTypeDefinition>
): TypeValidationResult {
  const errors: ValidationError[] = [];
  const prefix = `variant[${index}]`;

  // 必需字段验证
  if (!card.id || typeof card.id !== 'string') {
    errors.push({ 
      path: `${prefix}.id`, 
      message: 'id字段是必需的，且必须是字符串' 
    });
  }

  if (!card.名称 || typeof card.名称 !== 'string') {
    errors.push({ 
      path: `${prefix}.名称`, 
      message: '名称字段是必需的，且必须是字符串' 
    });
  }

  // 类型验证
  if (!card.类型 || typeof card.类型 !== 'string') {
    errors.push({ 
      path: `${prefix}.类型`, 
      message: '类型字段是必需的，且必须是字符串' 
    });
  } else if (!variantTypes[card.类型]) {
    const availableTypes = Object.keys(variantTypes);
    errors.push({ 
      path: `${prefix}.类型`, 
      message: `类型字段必须是预定义的变体类型。可用类型: ${availableTypes.join(', ')}`,
      value: card.类型
    });
  }

  // 子类别验证
  if (card.子类别) {
    if (typeof card.子类别 !== 'string') {
      errors.push({ 
        path: `${prefix}.子类别`, 
        message: '子类别字段必须是字符串' 
      });
    } else if (variantTypes[card.类型]) {
      const validSubclasses = variantTypes[card.类型].subclasses;
      if (!validSubclasses.includes(card.子类别)) {
        errors.push({ 
          path: `${prefix}.子类别`, 
          message: `子类别字段必须是类型"${card.类型}"的有效子类别。可用选项: ${validSubclasses.join(', ')}`,
          value: card.子类别
        });
      }
    }
  }

  // 等级验证
  if (card.等级 !== undefined) {
    if (typeof card.等级 !== 'number' || card.等级 < 0) {
      errors.push({ 
        path: `${prefix}.等级`, 
        message: '等级字段必须是非负数字',
        value: card.等级
      });
    } else if (variantTypes[card.类型]?.levelRange) {
      const [min, max] = variantTypes[card.类型].levelRange!;
      if (card.等级 < min || card.等级 > max) {
        errors.push({ 
          path: `${prefix}.等级`, 
          message: `等级字段必须在范围 ${min}-${max} 内`,
          value: card.等级
        });
      }
    }
  }

  // 效果验证
  if (!card.效果 || typeof card.效果 !== 'string') {
    errors.push({ 
      path: `${prefix}.效果`, 
      message: '效果字段是必需的，且必须是字符串' 
    });
  }

  // 简略信息验证
  if (!card.简略信息 || typeof card.简略信息 !== 'object') {
    errors.push({ 
      path: `${prefix}.简略信息`, 
      message: '简略信息字段是必需的，且必须是对象' 
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

#### 9.3.2 批次验证扩展

```typescript
// 修改：data/card/type-validators.ts 
export function validateImportDataWithVariants(
  importData: ImportData,
  tempFields?: TemporaryCustomFields
): ExtendedValidationResult {
  const result = validateImportData(importData, tempFields); // 现有验证
  
  // 新增变体卡牌验证
  if (importData.variant && Array.isArray(importData.variant)) {
    const variantTypes = importData.customFieldDefinitions?.variantTypes || {};
    
    // 先验证变体类型定义
    const typeDefErrors = validateVariantTypeDefinitions(variantTypes);
    result.errors.push(...typeDefErrors);
    
    // 然后验证每张变体卡牌
    importData.variant.forEach((card, index) => {
      const cardValidation = validateVariantCard(card, index, variantTypes);
      result.errors.push(...cardValidation.errors);
    });
    
    result.totalCards += importData.variant.length;
  }
  
  return result;
}

function validateVariantTypeDefinitions(
  variantTypes: Record<string, any>
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  Object.entries(variantTypes).forEach(([typeId, typeDef]) => {
    if (!typeDef.name || typeof typeDef.name !== 'string') {
      errors.push({
        path: `customFieldDefinitions.variantTypes.${typeId}.name`,
        message: 'name字段是必需的，且必须是字符串'
      });
    }
    
    if (!Array.isArray(typeDef.subclasses)) {
      errors.push({
        path: `customFieldDefinitions.variantTypes.${typeId}.subclasses`,
        message: 'subclasses字段必须是字符串数组'
      });
    }
    
    if (typeDef.levelRange && !Array.isArray(typeDef.levelRange)) {
      errors.push({
        path: `customFieldDefinitions.variantTypes.${typeId}.levelRange`,
        message: 'levelRange字段必须是长度为2的数字数组 [min, max]'
      });
    }
  });
  
  return errors;
}
```

### 9.4 转换器集成

#### 9.4.1 变体卡牌转换器

```typescript
// 新增：data/card/variant-card/convert.ts
import { StandardCard, CardSource, ExtendedStandardCard } from '../card-types';

export interface VariantCardConverter {
  toStandard(card: RawVariantCard): StandardCard;
  fromStandard(card: StandardCard): RawVariantCard;
}

export const variantCardConverter: VariantCardConverter = {
  toStandard(card: RawVariantCard): StandardCard {
    return {
      standarized: true,
      id: card.id,
      name: card.名称,
      type: "variant",
      class: card.类型,          // 将"类型"映射到class字段
      level: card.等级,
      description: card.效果,
      imageUrl: card.imageUrl,
      cardSelectDisplay: {
        item1: card.简略信息?.item1 || "",
        item2: card.简略信息?.item2 || "",
        item3: card.简略信息?.item3 || "",
        item4: card.子类别 || ""    // 将子类别作为item4显示
      },
      // 保留原始变体信息
      variantInfo: {
        原始类型: card.类型,
        子类别: card.子类别
      }
    };
  },

  fromStandard(card: StandardCard): RawVariantCard {
    return {
      id: card.id,
      名称: card.name,
      类型: card.class,
      子类别: (card as any).variantInfo?.子类别,
      等级: card.level,
      效果: card.description || "",
      imageUrl: card.imageUrl,
      简略信息: {
        item1: card.cardSelectDisplay?.item1,
        item2: card.cardSelectDisplay?.item2,
        item3: card.cardSelectDisplay?.item3
      }
    };
  }
};
```

#### 9.4.2 自定义卡牌管理器集成

```typescript
// 修改：data/card/custom-card-manager.ts
private async convertImportData(importData: ImportData): Promise<{
  success: boolean;
  cards: ExtendedStandardCard[];
  errors: string[]
}> {
  // ...existing conversion code...

  // 新增：转换变体卡牌
  if (importData.variant && Array.isArray(importData.variant)) {
    for (let i = 0; i < importData.variant.length; i++) {
      try {
        const standardCard = variantCardConverter.toStandard(importData.variant[i]);
        const extendedCard: ExtendedStandardCard = {
          ...standardCard,
          source: CardSource.CUSTOM
        };
        convertedCards.push(extendedCard);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`variant[${i}]: 转换失败 - ${errorMessage}`);
      }
    }
  }

  // ...rest of the method...
}
```

### 9.5 用户使用流程

#### 9.5.1 创建变体卡牌包的步骤

1. **定义变体类型**：在 `customFieldDefinitions.variantTypes` 中定义自己的卡牌类型
2. **创建卡牌数据**：在 `variant` 数组中添加具体的卡牌
3. **验证导入**：系统会自动验证类型定义和卡牌数据的一致性
4. **转换存储**：通过转换器转换为标准格式并存储

#### 9.5.2 示例使用场景

**场景1：食物系统**
```json
{
  "customFieldDefinitions": {
    "variantTypes": {
      "食物": {
        "name": "食物",
        "subclasses": ["饮料", "主食", "菜品", "零食"],
        "defaultLevel": 1,
        "description": "游戏中的各种食物道具"
      }
    }
  },
  "variant": [
    {
      "id": "food-pack-v1-apple-001",
      "名称": "红苹果",
      "类型": "食物",
      "子类别": "零食",
      "等级": 1,
      "效果": "恢复10点生命",
      "简略信息": {
        "item1": "+10 HP",
        "item2": "零食",
        "item3": "美味"
      }
    }
  ]
}
```

**场景2：NPC系统**
```json
{
  "customFieldDefinitions": {
    "variantTypes": {
      "NPC": {
        "name": "NPC",
        "subclasses": ["商人", "任务发布者", "敌人", "盟友"],
        "description": "游戏中的非玩家角色"
      }
    }
  },
  "variant": [
    {
      "id": "npc-pack-v1-blacksmith-001",
      "名称": "老铁匠",
      "类型": "NPC",
      "子类别": "商人",
      "效果": "可以修理装备和出售武器。**熟练工艺**：修理费用减少20%。",
      "简略信息": {
        "item1": "修理装备",
        "item2": "出售武器",
        "item3": "工艺折扣"
      }
    }
  ]
}
```

### 9.6 技术优势

1. **向后兼容**：完全保持现有JSON格式不变
2. **类型安全**：通过预定义保证变体类型的一致性
3. **灵活扩展**：用户可以定义任意类型和子类别
4. **验证完备**：全面的格式和数据验证机制
5. **UI集成**：通过现有的分类机制自然集成到界面中

## 10. 现有接口修改详细方案

### 10.1 ImportData 接口扩展

```typescript
// 修改：data/card/card-types.ts
export interface ImportData {
  name?: string;
  version?: string; 
  description?: string;
  author?: string;

  // 扩展自定义字段定义以支持变体类型
  customFieldDefinitions?: {
    profession?: string[];
    ancestry?: string[];
    community?: string[];
    subclass?: string[];
    domain?: string[];
    
    // 新增：变体类型定义
    variantTypes?: {
      [typeId: string]: VariantTypeDefinition;
    };
    
    [key: string]: string[] | Record<string, VariantTypeDefinition> | undefined;
  };

  // 现有卡牌类型
  profession?: ProfessionCard[];
  ancestry?: AncestryCard[];
  community?: CommunityCard[];
  subclass?: SubClassCard[];
  domain?: DomainCard[];
  
  // 新增：变体卡牌
  variant?: RawVariantCard[];
}

// 新增变体类型定义接口
export interface VariantTypeDefinition {
  name: string;
  subclasses: string[];
  defaultLevel?: number;
  levelRange?: [number, number];
  description?: string;
  required?: string[];
  optional?: string[];
}

// 新增原始变体卡牌接口
export interface RawVariantCard {
  id: string;
  名称: string;
  类型: string;
  子类别?: string;
  等级?: number;
  效果: string;
  imageUrl?: string;
  简略信息: {
    item1?: string;
    item2?: string;
    item3?: string;
  };
  [key: string]: any; // 允许扩展字段
}
```

### 10.2 存储系统扩展

#### 10.2.1 BatchData 接口扩展

```typescript
// 修改：data/card/card-storage.ts
export interface BatchData extends BatchBase {
  cards: ExtendedStandardCard[];
  customFieldDefinitions?: {
    profession?: string[];
    ancestry?: string[];
    community?: string[];
    subclass?: string[];
    domain?: string[];
    
    // 新增：变体类型定义存储
    variantTypes?: {
      [typeId: string]: VariantTypeDefinition;
    };
  };
}

// 新增：变体类型定义存储接口
export interface VariantTypeStorage {
  [batchId: string]: {
    [typeId: string]: VariantTypeDefinition;
  };
}
```

#### 10.2.2 存储操作扩展

```typescript
// 修改：data/card/card-storage.ts
export class CustomCardStorage {
  
  // 新增：变体类型定义存储键
  private static readonly VARIANT_TYPES_KEY = 'daggerheart_variant_types';

  /**
   * 保存变体类型定义到批次
   */
  static saveVariantTypesForBatch(
    batchId: string, 
    variantTypes: Record<string, VariantTypeDefinition>
  ): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    try {
      const existing = this.loadVariantTypeStorage();
      existing[batchId] = variantTypes;
      
      localStorage.setItem(this.VARIANT_TYPES_KEY, JSON.stringify(existing));
      
      logDebug('saveVariantTypesForBatch', {
        batchId,
        typeCount: Object.keys(variantTypes).length,
        types: Object.keys(variantTypes)
      });
    } catch (error) {
      console.error('[CustomCardStorage] 变体类型定义保存失败:', error);
    }
  }

  /**
   * 加载变体类型定义存储
   */
  static loadVariantTypeStorage(): VariantTypeStorage {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return {};
    }
    
    try {
      const stored = localStorage.getItem(this.VARIANT_TYPES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[CustomCardStorage] 变体类型定义加载失败:', error);
      return {};
    }
  }

  /**
   * 获取聚合的变体类型定义
   */
  static getAggregatedVariantTypes(): Record<string, VariantTypeDefinition> {
    const storage = this.loadVariantTypeStorage();
    const aggregated: Record<string, VariantTypeDefinition> = {};
    
    // 聚合所有批次的变体类型定义
    Object.values(storage).forEach(batchTypes => {
      Object.assign(aggregated, batchTypes);
    });
    
    return aggregated;
  }

  /**
   * 移除批次的变体类型定义
   */
  static removeVariantTypesForBatch(batchId: string): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    try {
      const existing = this.loadVariantTypeStorage();
      delete existing[batchId];
      
      localStorage.setItem(this.VARIANT_TYPES_KEY, JSON.stringify(existing));
      
      logDebug('removeVariantTypesForBatch', { batchId });
    } catch (error) {
      console.error('[CustomCardStorage] 变体类型定义删除失败:', error);
    }
  }
}
```

### 10.3 验证系统集成

#### 10.3.1 CardTypeValidator 扩展

```typescript
// 修改：data/card/type-validators.ts
export interface ExtendedValidationResult extends TypeValidationResult {
  totalCards: number;
  cardTypeCounts: Record<string, number>;
}

export class CardTypeValidator {
  /**
   * 验证导入数据（扩展支持变体卡牌）
   */
  static validateImportData(
    importData: ImportData,
    tempFields?: TemporaryCustomFields
  ): ExtendedValidationResult {
    const errors: ValidationError[] = [];
    let totalCards = 0;
    const cardTypeCounts: Record<string, number> = {};

    // 现有类型验证...
    // (profession, ancestry, community, subclass, domain)

    // 新增：变体卡牌验证
    if (importData.variant && Array.isArray(importData.variant)) {
      const variantTypeDefinitions = importData.customFieldDefinitions?.variantTypes || {};
      
      // 首先验证变体类型定义本身
      const typeDefErrors = this.validateVariantTypeDefinitions(variantTypeDefinitions);
      errors.push(...typeDefErrors);
      
      // 然后验证每张变体卡牌
      importData.variant.forEach((card, index) => {
        const cardErrors = this.validateVariantCard(card, index, variantTypeDefinitions);
        errors.push(...cardErrors.errors);
      });
      
      totalCards += importData.variant.length;
      cardTypeCounts['variant'] = importData.variant.length;
    }

    return {
      isValid: errors.length === 0,
      errors,
      totalCards,
      cardTypeCounts
    };
  }

  /**
   * 验证变体类型定义
   */
  private static validateVariantTypeDefinitions(
    variantTypes: Record<string, any>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    Object.entries(variantTypes).forEach(([typeId, typeDef]) => {
      const prefix = `customFieldDefinitions.variantTypes.${typeId}`;
      
      if (!typeDef || typeof typeDef !== 'object') {
        errors.push({
          path: prefix,
          message: '变体类型定义必须是对象',
          value: typeDef
        });
        return;
      }
      
      if (!typeDef.name || typeof typeDef.name !== 'string') {
        errors.push({
          path: `${prefix}.name`,
          message: 'name字段是必需的，且必须是字符串',
          value: typeDef.name
        });
      }
      
      if (!Array.isArray(typeDef.subclasses)) {
        errors.push({
          path: `${prefix}.subclasses`,
          message: 'subclasses字段必须是字符串数组',
          value: typeDef.subclasses
        });
      } else if (typeDef.subclasses.length === 0) {
        errors.push({
          path: `${prefix}.subclasses`,
          message: 'subclasses数组不能为空',
          value: typeDef.subclasses
        });
      }
      
      if (typeDef.levelRange) {
        if (!Array.isArray(typeDef.levelRange) || typeDef.levelRange.length !== 2) {
          errors.push({
            path: `${prefix}.levelRange`,
            message: 'levelRange必须是长度为2的数组 [min, max]',
            value: typeDef.levelRange
          });
        } else {
          const [min, max] = typeDef.levelRange;
          if (typeof min !== 'number' || typeof max !== 'number' || min > max) {
            errors.push({
              path: `${prefix}.levelRange`,
              message: 'levelRange必须是有效的数字范围 [min, max]，且min <= max',
              value: typeDef.levelRange
            });
          }
        }
      }
    });
    
    return errors;
  }

  /**
   * 验证单张变体卡牌
   */
  private static validateVariantCard(
    card: any,
    index: number,
    variantTypes: Record<string, VariantTypeDefinition>
  ): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `variant[${index}]`;

    // 基础字段验证
    if (!card.id || typeof card.id !== 'string') {
      errors.push({
        path: `${prefix}.id`,
        message: 'id字段是必需的，且必须是字符串'
      });
    }

    if (!card.名称 || typeof card.名称 !== 'string') {
      errors.push({
        path: `${prefix}.名称`,
        message: '名称字段是必需的，且必须是字符串'
      });
    }

    // 类型字段验证
    if (!card.类型 || typeof card.类型 !== 'string') {
      errors.push({
        path: `${prefix}.类型`,
        message: '类型字段是必需的，且必须是字符串'
      });
    } else if (!variantTypes[card.类型]) {
      const availableTypes = Object.keys(variantTypes);
      errors.push({
        path: `${prefix}.类型`,
        message: `类型"${card.类型}"未在variantTypes中定义。可用类型: ${availableTypes.join(', ')}`,
        value: card.类型
      });
    }

    // 子类别验证
    if (card.子类别 !== undefined) {
      if (typeof card.子类别 !== 'string') {
        errors.push({
          path: `${prefix}.子类别`,
          message: '子类别字段必须是字符串'
        });
      } else if (variantTypes[card.类型]) {
        const validSubclasses = variantTypes[card.类型].subclasses;
        if (!validSubclasses.includes(card.子类别)) {
          errors.push({
            path: `${prefix}.子类别`,
            message: `子类别"${card.子类别}"不在类型"${card.类型}"的有效子类别中。可用选项: ${validSubclasses.join(', ')}`,
            value: card.子类别
          });
        }
      }
    }

    // 等级验证
    if (card.等级 !== undefined) {
      if (typeof card.等级 !== 'number' || card.等级 < 0) {
        errors.push({
          path: `${prefix}.等级`,
          message: '等级字段必须是非负数字',
          value: card.等级
        });
      } else if (variantTypes[card.类型]?.levelRange) {
        const [min, max] = variantTypes[card.类型].levelRange!;
        if (card.等级 < min || card.等级 > max) {
          errors.push({
            path: `${prefix}.等级`,
            message: `等级${card.等级}超出类型"${card.类型}"的有效范围 ${min}-${max}`,
            value: card.等级
          });
        }
      }
    }

    // 效果字段验证
    if (!card.效果 || typeof card.效果 !== 'string') {
      errors.push({
        path: `${prefix}.效果`,
        message: '效果字段是必需的，且必须是字符串'
      });
    }

    // 简略信息验证
    if (!card.简略信息 || typeof card.简略信息 !== 'object') {
      errors.push({
        path: `${prefix}.简略信息`,
        message: '简略信息字段是必需的，且必须是对象'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### 10.4 CustomCardManager 集成

```typescript
// 修改：data/card/custom-card-manager.ts
export class CustomCardManager {
  
  /**
   * 导入卡牌（扩展支持变体卡牌）
   */
  async importCards(importData: ImportData, batchName?: string): Promise<ImportResult> {
    // ...existing validation and setup code...

    try {
      // 保存变体类型定义（如果有）
      if (importData.customFieldDefinitions?.variantTypes) {
        CustomCardStorage.saveVariantTypesForBatch(
          batchId, 
          importData.customFieldDefinitions.variantTypes
        );
      }

      // ...existing validation steps...

      // 数据转换（包含变体卡牌）
      const convertResult = await this.convertImportDataWithVariants(importData);
      
      // ...rest of import logic...
    } catch (error) {
      // 清理操作（包括变体类型定义）
      if (importData.customFieldDefinitions?.variantTypes) {
        CustomCardStorage.removeVariantTypesForBatch(batchId);
      }
      // ...error handling...
    }
  }

  /**
   * 转换导入数据（包含变体卡牌）
   */
  private async convertImportDataWithVariants(importData: ImportData): Promise<{
    success: boolean;
    cards: ExtendedStandardCard[];
    errors: string[]
  }> {
    const convertedCards: ExtendedStandardCard[] = [];
    const errors: string[] = [];

    // ...existing conversion code for other card types...

    // 新增：转换变体卡牌
    if (importData.variant && Array.isArray(importData.variant)) {
      // 确保变体转换器已注册
      if (!this.builtinCardManager.isTypeRegistered('variant')) {
        this.builtinCardManager.registerCardType('variant', {
          converter: variantCardConverter.toStandard
        });
      }

      for (let i = 0; i < importData.variant.length; i++) {
        try {
          const standardCard = this.builtinCardManager.ConvertCard(
            importData.variant[i], 
            'variant'
          );
          
          if (standardCard) {
            const extendedCard: ExtendedStandardCard = {
              ...standardCard,
              source: CardSource.CUSTOM
            };
            convertedCards.push(extendedCard);
          } else {
            errors.push(`variant[${i}]: 转换失败 - 转换器返回null`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`variant[${i}]: 转换失败 - ${errorMessage}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      cards: convertedCards,
      errors
    };
  }

  /**
   * ID唯一性验证（扩展支持变体卡牌）
   */
  private validateUniqueIds(importData: ImportData, existingCards: StandardCard[]): ValidationResult {
    const duplicateIds: string[] = [];
    const existingIds = new Set(existingCards.map(card => card.id).filter(Boolean));

    // ...existing validation for other card types...

    // 新增：变体卡牌ID验证
    if (importData.variant && Array.isArray(importData.variant)) {
      for (const card of importData.variant) {
        if (card && card.id && existingIds.has(card.id)) {
          duplicateIds.push(`variant.${card.id}`);
        }
      }
    }

    return {
      isValid: duplicateIds.length === 0,
      duplicateIds
    };
  }
}
```

### 10.5 UI配置更新

```typescript
// 修改：data/card/card-ui-config.ts
import { VariantTypeRegistry } from './variant-card/variant-registry';

// 扩展UI配置以支持变体卡牌
export const CARD_CLASS_OPTIONS_BY_TYPE = {
  // ...existing card types...
  
  // 新增：变体卡牌选项（动态生成）
  [CardType.Variant]: () => {
    const registry = VariantTypeRegistry.getInstance();
    return registry.getAllTypes().map(type => ({
      value: type.id,
      label: type.name
    }));
  }
};

// 扩展等级选项
export const CARD_LEVEL_OPTIONS_BY_TYPE = {
  // ...existing card types...
  
  [CardType.Variant]: (variantType?: string) => {
    if (!variantType) return [];
    
    const registry = VariantTypeRegistry.getInstance();
    const typeDef = registry.getType(variantType);
    
    if (typeDef?.levelRange) {
      const [min, max] = typeDef.levelRange;
      return Array.from({ length: max - min + 1 }, (_, i) => ({
        value: (min + i).toString(),
        label: (min + i).toString()
      }));
    }
    
    return [];
  }
};

// 获取变体子类别选项
export function getVariantSubclassOptions(variantType: string): { value: string; label: string }[] {
  const registry = VariantTypeRegistry.getInstance();
  const typeDef = registry.getType(variantType);
  
  return typeDef?.subclasses.map(subclass => ({
    value: subclass,
    label: subclass
  })) || [];
}
```

### 10.6 实施顺序建议

1. **第一步**：扩展 `card-types.ts` 中的接口定义
2. **第二步**：创建变体卡牌相关的新文件
   - `data/card/variant-card/variant-registry.ts`
   - `data/card/variant-card/variant-types.ts`
   - `data/card/variant-card/convert.ts`
   - `data/card/variant-card/validator.ts`
3. **第三步**：修改现有验证器和存储系统
4. **第四步**：更新 `CustomCardManager` 集成变体卡牌处理
5. **第五步**：修改 UI 配置和选择模态框
6. **第六步**：注册变体转换器到 `BuiltinCardManager`

这个方案确保了变体卡牌能够完全集成到现有的卡牌系统中，同时保持向后兼容性和类型安全性。

## 11. 完整示例：Variant 卡牌包

### 11.1 示例JSON文件

```json
{
  "name": "幻想世界扩展包",
  "version": "1.0.0",
  "description": "包含食物、NPC、装备和魔法道具的扩展卡牌包",
  "author": "玩家社区",
  
  "customFieldDefinitions": {
    "professions": [
      "龙骑士"
    ],
    "domains": [
      "龙息",
      "时空"
    ],
    "variantTypes": {
      "食物": {
        "name": "食物",
        "subclasses": ["饮料", "主食", "菜品", "零食", "药材"],
        "defaultLevel": 1,
        "levelRange": [1, 5],
        "description": "游戏中的各种食物和消耗品"
      },
      "NPC": {
        "name": "NPC",
        "subclasses": ["商人", "任务发布者", "敌人", "盟友", "中立"],
        "description": "游戏中的非玩家角色"
      },
      "装备": {
        "name": "装备",
        "subclasses": ["武器", "防具", "饰品", "工具"],
        "levelRange": [1, 10],
        "description": "各种装备道具"
      },
      "魔法道具": {
        "name": "魔法道具",
        "subclasses": ["法杖", "护符", "卷轴", "药水"],
        "levelRange": [1, 8],
        "description": "具有魔法效果的特殊道具"
      },
      "载具": {
        "name": "载具",
        "subclasses": ["陆地", "海洋", "空中"],
        "description": "各种交通工具"
      }
    }
  },
  
  "profession": [
    {
      "id": "fantasy-pack-v1-dragonknight-001",
      "名称": "龙骑士",
      "简介": "与巨龙建立羁绊的强大战士",
      "领域1": "龙息",
      "领域2": "勇气",
      "起始生命": 250,
      "起始闪避": 150,
      "起始物品": "龙鳞甲、龙骨剑、龙蛋",
      "希望特性": "龙之契约",
      "职业特性": "龙骑士与龙类生物有着特殊的联系，能够驾驭龙类坐骑并使用龙息攻击。**龙之羁绊**：可以与一条龙建立终生契约。**龙息掌控**：能够使用不同类型的龙息攻击。"
    }
  ],
  
  "domain": [
    {
      "ID": "fantasy-pack-v1-dragonbreath-001",
      "名称": "烈焰龙息",
      "领域": "龙息",
      "等级": 3,
      "法术位消耗": 1,
      "施法时间": "1行动",
      "距离": "30尺锥形",
      "持续时间": "瞬间",
      "描述": "你吐出一道烈焰龙息。锥形范围内的所有敌人必须进行敏捷检定，失败者受到火焰伤害。",
      "升环效果": "使用更高等级的法术位时，伤害增加。"
    }
  ],
  
  "variant": [
    {
      "id": "fantasy-pack-v1-food-bread-001",
      "名称": "精灵面包",
      "类型": "食物",
      "子类别": "主食",
      "等级": 2,
      "效果": "食用后恢复中等生命值并获得**活力**状态1小时。**精灵祝福**：在自然环境中效果翻倍。",
      "简略信息": {
        "item1": "恢复生命",
        "item2": "活力状态",
        "item3": "自然加成"
      }
    },
    {
      "id": "fantasy-pack-v1-food-potion-001",
      "名称": "治疗药水",
      "类型": "食物",
      "子类别": "药材",
      "等级": 3,
      "效果": "立即恢复大量生命值。**快速治疗**：可以在战斗中作为次要行动使用。",
      "简略信息": {
        "item1": "大量治疗",
        "item2": "次要行动",
        "item3": "战斗可用"
      }
    },
    {
      "id": "fantasy-pack-v1-npc-blacksmith-001",
      "名称": "大师铁匠",
      "类型": "NPC",
      "子类别": "商人",
      "效果": "可以制作和强化装备。**大师工艺**：制作的装备获得额外属性。**信誉良好**：首次交易获得折扣。",
      "简略信息": {
        "item1": "制作装备",
        "item2": "装备强化",
        "item3": "首次折扣"
      }
    },
    {
      "id": "fantasy-pack-v1-npc-questgiver-001",
      "名称": "神秘法师",
      "类型": "NPC",
      "子类别": "任务发布者",
      "效果": "提供魔法相关的任务和知识。**奥秘导师**：可以传授魔法技能。**古老智慧**：提供稀有的魔法信息。",
      "简略信息": {
        "item1": "魔法任务",
        "item2": "技能传授",
        "item3": "魔法知识"
      }
    },
    {
      "id": "fantasy-pack-v1-equipment-sword-001",
      "名称": "月光之刃",
      "类型": "装备",
      "子类别": "武器",
      "等级": 6,
      "效果": "优雅的精灵长剑，在月光下闪闪发光。**月光增幅**：夜晚时攻击力增加。**精灵工艺**：对不死生物造成额外伤害。",
      "简略信息": {
        "item1": "夜晚增幅",
        "item2": "反不死",
        "item3": "精灵工艺"
      }
    },
    {
      "id": "fantasy-pack-v1-equipment-armor-001",
      "名称": "星辰斗篷",
      "类型": "装备",
      "子类别": "防具",
      "等级": 4,
      "效果": "用星辰丝线编织的神秘斗篷。**星光护盾**：反射部分魔法攻击。**隐匿**：在黑暗中难以被发现。",
      "简略信息": {
        "item1": "魔法反射",
        "item2": "黑暗隐匿",
        "item3": "星辰材质"
      }
    },
    {
      "id": "fantasy-pack-v1-magic-staff-001",
      "名称": "风暴法杖",
      "类型": "魔法道具",
      "子类别": "法杖",
      "等级": 7,
      "效果": "蕴含风暴之力的强大法杖。**雷电掌控**：可以释放雷电法术。**风暴之眼**：在恶劣天气中获得优势。**法力增幅**：增加法术伤害。",
      "简略信息": {
        "item1": "雷电法术",
        "item2": "天气优势", 
        "item3": "法术增幅"
      }
    },
    {
      "id": "fantasy-pack-v1-magic-scroll-001",
      "名称": "传送卷轴",
      "类型": "魔法道具",
      "子类别": "卷轴",
      "等级": 5,
      "效果": "一次性使用的传送魔法卷轴。**瞬间传送**：传送到已知的安全地点。**群体传送**：可以带着队友一起传送。",
      "简略信息": {
        "item1": "瞬间传送",
        "item2": "群体效果",
        "item3": "一次使用"
      }
    },
    {
      "id": "fantasy-pack-v1-vehicle-dragon-001",
      "名称": "青铜龙坐骑",
      "类型": "载具",
      "子类别": "空中",
      "效果": "忠诚的青铜龙伙伴，可以作为飞行坐骑。**高速飞行**：快速移动到远距离地点。**战斗伙伴**：在空中战斗中提供支援。**龙威**：威慑较小的敌人。",
      "简略信息": {
        "item1": "高速飞行",
        "item2": "战斗支援",
        "item3": "龙威威慑"
      }
    },
    {
      "id": "fantasy-pack-v1-vehicle-ship-001",
      "名称": "精灵战舰",
      "类型": "载具",
      "子类别": "海洋",
      "效果": "优雅的精灵制造战舰，适合海上冒险。**风帆魔法**：可以控制风向。**精灵工艺**：在海上不会迷失方向。**舒适航行**：减少长途旅行的疲劳。",
      "简略信息": {
        "item1": "风帆魔法",
        "item2": "导航精准",
        "item3": "舒适旅行"
      }
    }
  ]
}
```

### 11.2 导入流程示例

#### 11.2.1 用户操作步骤

1. **准备JSON文件**
   - 按照上述格式创建JSON文件
   - 在 `customFieldDefinitions.variantTypes` 中定义所需的变体类型
   - 在 `variant` 数组中添加具体的卡牌数据

2. **验证阶段**
   - 系统自动验证变体类型定义的完整性
   - 检查每张变体卡牌的 `类型` 是否在定义中存在
   - 验证 `子类别` 是否在对应类型的 `subclasses` 中
   - 检查 `等级` 是否在允许的范围内（如果定义了 `levelRange`）

3. **转换存储**
   - 变体类型定义被存储到变体类型注册表
   - 每张变体卡牌被转换为 `StandardCard` 格式
   - 所有卡牌存储到对应的批次中

4. **UI集成**
   - 在卡牌选择界面的"扩展"分类中显示变体卡牌
   - 根据变体类型动态生成筛选选项
   - 支持按变体类型和子类别进行筛选

#### 11.2.2 错误处理示例

**类型未定义错误**：
```
variant[0]: 类型"食物"未在variantTypes中定义。可用类型: 
```

**子类别不匹配错误**：
```
variant[1]: 子类别"甜品"不在类型"食物"的有效子类别中。可用选项: 饮料, 主食, 菜品, 零食, 药材
```

**等级超出范围错误**：
```
variant[2]: 等级11超出类型"装备"的有效范围 1-10
```

### 11.3 高级用法示例

#### 11.3.1 条件子类别

某些变体类型可能需要复杂的子类别结构：

```json
{
  "customFieldDefinitions": {
    "variantTypes": {
      "法术组件": {
        "name": "法术组件",
        "subclasses": ["材料", "焦点", "神圣", "奥术"],
        "levelRange": [1, 9],
        "description": "施法所需的各种组件"
      }
    }
  },
  "variant": [
    {
      "id": "components-v1-diamond-001",
      "名称": "钻石粉末",
      "类型": "法术组件",
      "子类别": "材料",
      "等级": 9,
      "效果": "施放高级法术所需的珍贵材料组件。**高纯度**：可以替代任何9级以下的材料组件。**闪耀之力**：增强光系法术效果。",
      "简略信息": {
        "item1": "高级组件",
        "item2": "万能替代",
        "item3": "光系增强"
      }
    }
  ]
}
```

#### 11.3.2 无等级变体类型

对于不需要等级的变体类型：

```json
{
  "customFieldDefinitions": {
    "variantTypes": {
      "信息": {
        "name": "信息",
        "subclasses": ["地图", "书籍", "传说", "谣言"],
        "description": "各种信息类道具"
      }
    }
  },
  "variant": [
    {
      "id": "info-v1-ancientmap-001",
      "名称": "古代遗迹地图",
      "类型": "信息",
      "子类别": "地图",
      "效果": "标记着失落遗迹位置的古老地图。**遗迹导航**：可以找到隐藏的古代遗迹。**历史价值**：对学者和冒险家都很有价值。",
      "简略信息": {
        "item1": "遗迹位置",
        "item2": "导航功能",
        "item3": "珍贵收藏"
      }
    }
  ]
}
```

### 11.4 最佳实践建议

1. **命名规范**
   - ID使用项目-版本-类型-具体名称的格式
   - 变体类型ID使用简洁的英文或拼音
   - 子类别名称保持简短且具有区分性

2. **类型设计**
   - 每个变体类型的子类别数量建议在2-8个之间
   - 等级范围应该有意义（1-10是常见的游戏等级范围）
   - 描述字段有助于其他用户理解该类型的用途

3. **效果描述**
   - 使用Markdown格式增强可读性
   - 用**粗体**突出重要的特殊能力
   - 保持描述简洁但信息完整

4. **扩展性考虑**
   - 预留足够的子类别空间以便后续扩展
   - 考虑与现有标准卡牌的平衡性
   - 避免创建过于复杂的效果描述

这个完整的示例展示了Variant卡牌系统的强大灵活性，用户可以根据自己的需求创建任意类型的自定义卡牌，同时保持与现有系统的兼容性。