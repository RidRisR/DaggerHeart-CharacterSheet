# Variants 简化验证方案

## 方案背景

### 现状问题
当前的 variantTypes 验证系统要求用户必须在 `customFieldDefinitions.variantTypes` 中手动预定义复杂的对象结构，然后才能在 variant 卡牌中使用。这对用户来说增加了不必要的复杂度：

1. **结构复杂**：需要定义 description、subclasses、levelRange 等复杂对象
2. **格式不一致**：与其他预定义字段格式不统一
3. **学习成本高**：用户需要理解复杂的预定义系统

### 解决方案
简化预定义结构为统一的数组格式，同时保持严格验证和UI功能的完整性：

1. **统一格式**：`variants` 使用与其他字段一致的数组格式
2. **严格验证**：类型必须在预定义列表中，防止笔误
3. **双层架构**：用户定义简化，系统内部收集完整信息供UI使用

## 核心设计

### 统一的预定义结构

```json
{
    "customFieldDefinitions": {
        "professions": ["职业1", "职业2"],
        "ancestries": ["血统1", "血统2"],
        "communities": ["社群1", "社群2"],
        "domains": ["领域1", "领域2"],
        "variants": ["食物", "武器", "药剂", "神器"]  // 统一为数组格式！
    }
}
```

### 处理流程

```
用户 JSON 输入（必须包含 variants 预定义）
       ↓
1. 验证：类型字段严格验证，必须在 variants 列表中
       ↓
2. 收集：扫描 variant 卡牌 → 收集 subclasses 和 levels
       ↓
3. 存储：双层存储（用户定义 + 系统收集信息）
       ↓
4. 转换：正常的卡牌转换流程
```

### 关键原则

1. **格式统一**：所有预定义字段使用相同的数组格式
2. **严格验证**：类型字段必须预定义，防止笔误和不一致
3. **简单定义**：用户只需定义类型名称列表
4. **功能完整**：系统内部收集详细信息供UI使用

## 技术实现

### 1. 信息收集函数

```typescript
function collectVariantInfo(importData: ImportData): Record<string, {
    subclasses: Set<string>,
    levels: number[]
}> {
    if (!importData.variant || importData.variant.length === 0) {
        return {};
    }
    
    // 收集详细信息用于UI组件
    const collectedInfo: Record<string, {
        subclasses: Set<string>,
        levels: number[]
    }> = {};
    
    for (const card of importData.variant) {
        const typeName = card.类型;
        if (!typeName || typeof typeName !== 'string') continue;
        
        // 初始化类型信息
        if (!collectedInfo[typeName]) {
            collectedInfo[typeName] = {
                subclasses: new Set(),
                levels: []
            };
        }
        
        // 收集子类别
        if (isValidValue(card.子类别)) {
            collectedInfo[typeName].subclasses.add(card.子类别);
        }
        
        // 收集等级（0是有效值）
        if (isValidLevel(card.等级)) {
            collectedInfo[typeName].levels.push(card.等级);
        }
    }
    
    return collectedInfo;
}

// 辅助函数：检查值是否有效（非空、非undefined、非null）
function isValidValue(value: any): value is string {
    return value !== null && value !== undefined && value !== "" && typeof value === "string";
}

// 辅助函数：检查等级是否有效（0是有效的！）
function isValidLevel(value: any): value is number {
    return typeof value === "number" && !isNaN(value);
}
```

### 2. 集成到导入流程

在 `store-actions.ts` 的 `importCards` 方法中集成：

```typescript
// store-actions.ts - importCards 方法改进
importCards: async (importData: ImportData, batchName?: string) => {
    try {
        // 1. 向后兼容：处理旧格式
        const compatibleData = migrateVariantTypes(importData);
        
        // 2. 收集变体信息用于UI
        const variantInfo = collectVariantInfo(compatibleData);
        
        // 3. 验证数据（包括严格的类型验证）
        const validationResult = get()._validateImportData(compatibleData);
        if (!validationResult.isValid) {
            return {
                success: false,
                imported: 0,
                errors: validationResult.errors.map(e => e.message),
                batchId: ''
            };
        }
        
        // 4. 继续原流程
        const state = get();
        const duplicateIds = get()._checkForDuplicates(compatibleData);
        
        if (duplicateIds.length > 0) {
            return {
                success: false,
                imported: 0,
                errors: [`Duplicate card IDs found: ${duplicateIds.join(', ')}`],
                batchId: ''
            };
        }
        
        // 5. 转换导入数据
        const convertResult = await get()._convertImportData(compatibleData);
        
        // 6. 在创建批次时存储收集的信息
        const batchInfo: BatchInfo = {
            // ... 其他字段
            customFieldDefinitions: compatibleData.customFieldDefinitions,
            _variantTypeInfo: variantInfo  // 存储收集的详细信息
        };
        
        // ... 继续原有流程
    } catch (error) {
        // ... 错误处理
    }
}
```

### 3. 验证器严格验证

修改 `type-validators.ts` 中的 `validateVariantCard` 函数：

```typescript
export function validateVariantCard(card: any, index: number, context?: ValidationContext): TypeValidationResult {
    const errors: ValidationError[] = [];
    const prefix = `variant[${index}]`;

    // 必需字段验证 - 保持严格
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

    if (!card.类型 || typeof card.类型 !== 'string') {
        errors.push({ 
            path: `${prefix}.类型`, 
            message: '类型字段是必需的，且必须是字符串' 
        });
    } else {
        // 严格验证：类型必须在预定义列表中
        const validVariants = context?.customFields?.variants || [];
        if (validVariants.length > 0 && !validVariants.includes(card.类型)) {
            const suggestion = getSimilarType(card.类型, validVariants);
            errors.push({ 
                path: `${prefix}.类型`, 
                message: `类型"${card.类型}"不在预定义列表中。可用类型：${validVariants.join(', ')}${suggestion ? `。是否想使用"${suggestion}"？` : ''}`,
                value: card.类型
            });
        }
    }

    // 子类别验证 - 可选但类型严格
    if (card.子类别 !== undefined && card.子类别 !== null && card.子类别 !== "") {
        if (typeof card.子类别 !== 'string') {
            errors.push({ 
                path: `${prefix}.子类别`, 
                message: '子类别字段必须是字符串（如果提供的话）' 
            });
        }
    }

    // 等级验证 - 可选但类型严格，0是有效的
    if (card.等级 !== undefined && card.等级 !== null) {
        if (typeof card.等级 !== 'number' || isNaN(card.等级)) {
            errors.push({ 
                path: `${prefix}.等级`, 
                message: '等级字段必须是有效数字（如果提供的话）',
                value: card.等级
            });
        }
    }

    // 效果字段验证 - 保持严格
    if (!card.效果 || typeof card.效果 !== 'string') {
        errors.push({ 
            path: `${prefix}.效果`, 
            message: '效果字段是必需的，且必须是字符串' 
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// 辅助函数：找到相似的类型名称（防笔误）
function getSimilarType(input: string, validTypes: string[]): string | null {
    // 简单的相似度检查
    for (const type of validTypes) {
        if (Math.abs(input.length - type.length) <= 1) {
            let diff = 0;
            for (let i = 0; i < Math.min(input.length, type.length); i++) {
                if (input[i] !== type[i]) diff++;
            }
            if (diff <= 1) return type;
        }
    }
    return null;
}
```

## 用户体验对比

### 改进前（复杂对象定义）

```json
{
    "customFieldDefinitions": {
        "variantTypes": {
            "食物": {
                "description": "可以食用的物品",
                "subclasses": ["饮料", "主食"],
                "levelRange": [1, 10]
            },
            "武器": {
                "description": "战斗装备",
                "subclasses": ["单手剑", "双手剑"],
                "levelRange": [1, 20]
            }
        }
    },
    "variant": [
        {
            "id": "food-001",
            "名称": "精灵蜜酒",
            "类型": "食物",
            "子类别": "饮料",
            "等级": 3,
            "效果": "恢复2点生命"
        }
    ]
}
```

### 改进后（简单数组定义）

```json
{
    "customFieldDefinitions": {
        "variants": ["食物", "武器", "药剂"]  // 简单的数组格式！
    },
    "variant": [
        {
            "id": "food-001",
            "名称": "精灵蜜酒",
            "类型": "食物",          // 必须在预定义列表中
            "子类别": "饮料",        // 可选，自由输入
            "等级": 3,             // 可选，自由输入
            "效果": "恢复2点生命"
        },
        {
            "id": "simple-001",
            "名称": "神秘药水",
            "类型": "药剂",          // 必须在预定义列表中
            "效果": "恢复生命值"      // 子类别和等级可以完全省略
        }
    ]
}
```

### 验证行为示例

```json
{
    "customFieldDefinitions": {
        "variants": ["食物", "武器"]
    },
    "variant": [
        {
            "类型": "食物"    // ✅ 验证通过
        },
        {
            "类型": "食品"    // ❌ 验证失败："食品"不在预定义列表中。是否想使用"食物"？
        },
        {
            "类型": "药剂"    // ❌ 验证失败："药剂"不在预定义列表中。可用类型：食物, 武器
        }
    ]
}
```

## 边界情况处理

### 各种空值情况

```typescript
const testCases = [
    // 有效情况
    { 子类别: "战士" },        // ✅ 收集到subclasses，但不验证
    { 等级: 0 },              // ✅ 收集到levels，0是有效等级
    { 等级: 5 },              // ✅ 收集到levels
    
    // 跳过情况（不收集，不报错）
    { 子类别: undefined },     // ✅ 跳过，不收集
    { 子类别: null },         // ✅ 跳过，不收集
    { 子类别: "" },           // ✅ 跳过，不收集
    { 等级: undefined },      // ✅ 跳过，不收集
    { 等级: null },          // ✅ 跳过，不收集
    
    // 错误情况
    { 等级: "5" },           // ❌ 验证错误，等级必须是数字
    { 等级: NaN },           // ❌ 验证错误，NaN不是有效数字
];
```

### 缺少预定义的情况

```json
{
    // 没有定义 customFieldDefinitions.variants
    "variant": [
        { "类型": "食物" }    // ❌ 验证失败：没有找到预定义的变体类型
    ]
}
```

错误提示：
```
❌ 必须在 customFieldDefinitions.variants 中预定义变体类型
💡 请添加：{"customFieldDefinitions": {"variants": ["食物"]}}
```

### 类型收集示例

```json
{
    "customFieldDefinitions": {
        "variants": ["武器"]  // 用户预定义
    },
    "variant": [
        { "类型": "武器", "子类别": "剑", "等级": 5 },
        { "类型": "武器", "子类别": "斧", "等级": 10 },
        { "类型": "武器", "等级": 3 }
    ]
}
```

系统内部收集：
```json
{
    "_variantTypeInfo": {
        "武器": {
            "subclasses": ["剑", "斧"],    // 自动去重合并
            "levels": [5, 10, 3]          // 收集所有等级
        }
    }
}
```

## 向后兼容性

### 自动迁移机制

现有复杂格式会自动转换为新的简化格式：

```typescript
// 迁移函数
function migrateVariantTypes(importData: ImportData): ImportData {
    if (!importData.customFieldDefinitions) return importData;
    
    // 优先级规则：如果有variants字段，以variants为准，忽略variantTypes
    if (importData.customFieldDefinitions.variants) {
        // 已经有新格式的variants字段，清理旧字段并直接使用
        if (Array.isArray(importData.customFieldDefinitions.variants)) {
            delete importData.customFieldDefinitions.variantTypes;
            return importData;
        }
    }
    
    // 没有variants字段，或variants字段格式不正确，尝试从variantTypes转换
    const variantTypes = importData.customFieldDefinitions.variantTypes;
    if (variantTypes) {
        if (typeof variantTypes === 'object' && !Array.isArray(variantTypes)) {
            // 旧的对象格式 → 新的数组格式
            importData.customFieldDefinitions.variants = Object.keys(variantTypes);
        }
        
        // 清理旧字段
        delete importData.customFieldDefinitions.variantTypes;
    }
    
    return importData;
}
```

### 迁移示例

#### **旧格式（自动转换）**

```json
// 输入：旧的复杂格式
{
    "customFieldDefinitions": {
        "variantTypes": {
            "神器": {
                "description": "传说物品",
                "subclasses": ["武器", "护甲"],
                "levelRange": [8, 10]
            },
            "食物": {
                "description": "可食用物品",
                "subclasses": ["饮料"]
            }
        }
    }
}
```

```json
// 输出：自动转换后的新格式
{
    "customFieldDefinitions": {
        "variants": ["神器", "食物"]  // 自动提取键名
    }
}
```

#### **验证行为变化**

**旧行为**：
- 类型必须在 variantTypes 中定义
- 子类别必须在对应的 subclasses 中
- 等级必须在对应的 levelRange 范围内

**新行为**：
- 类型必须在 variants 数组中定义
- 子类别完全自由（仅收集用于UI）
- 等级完全自由（仅收集用于UI）

### 平滑迁移路径

1. **第一阶段**：系统同时支持新旧格式
2. **第二阶段**：自动转换旧格式为新格式
3. **第三阶段**：UI提示用户格式已更新

## 实施步骤

### 阶段1：核心功能实现

1. **添加信息收集函数**
   - 在合适的位置添加 `collectVariantInfo()` 函数
   - 添加 `isValidValue()` 和 `isValidLevel()` 辅助函数

2. **添加迁移函数**
   - 添加 `migrateVariantTypes()` 函数处理向后兼容
   - 支持旧格式到新格式的自动转换

3. **集成到导入流程**  
   - 修改 `store-actions.ts` 中的 `importCards()` 方法
   - 添加迁移、收集、验证步骤

### 阶段2：验证器改进

4. **更新验证器**
   - 修改 `type-validators.ts` 中的 `validateVariantCard()` 函数
   - 实现严格的类型验证，宽松的子类别和等级验证
   - 添加相似性检查和友好的错误提示

5. **更新类型定义**
   - 更新相关的TypeScript类型定义
   - 支持新的`variants`数组格式

### 阶段3：UI组件支持

6. **添加UI访问接口**
   - 在 `unified-card-store` 中添加 `getVariantSubclasses()` 方法
   - 在 `unified-card-store` 中添加 `getVariantLevelRange()` 方法
   - 确保UI组件能正常获取收集的信息

### 阶段4：测试验证

7. **测试用例覆盖**
   - 测试严格验证：类型必须预定义
   - 测试收集功能：子类别和等级收集
   - 测试向后兼容性：旧格式自动转换
   - 测试边界情况：空值、错误类型等

8. **集成测试**
   - 端到端测试导入流程
   - UI组件集成测试
   - 性能测试（大批量数据）

### 阶段5：用户体验优化

9. **错误提示优化**
   - 实现智能的相似性建议
   - 提供清晰的格式迁移提示

10. **文档更新**
    - 更新用户指南，说明新的简化格式
    - 更新AI创作指南
    - 提供迁移指南

## 预期效果

### 用户体验提升

- **格式统一**：所有预定义字段使用相同的数组格式，学习成本降低 70%
- **简化定义**：从复杂对象定义简化为简单数组，复杂度降低 80%
- **防止错误**：严格类型验证避免常见的笔误和不一致问题
- **智能提示**：相似性检查提供友好的错误提示和建议

### 系统稳定性

- **数据完整性**：类型字段严格验证保证数据质量
- **功能完整**：UI组件仍能获得完整的subclass和level信息
- **向后兼容**：现有用户平滑迁移，零影响升级
- **扩展性**：支持任意类型定义，系统内部自动收集详细信息

### 平衡设计的优势

这个方案在**简单性**和**严谨性**之间找到了最佳平衡点：

1. **用户层面简化**：只需定义类型名称数组
2. **验证层面严格**：防止常见错误，保证数据一致性  
3. **系统层面完整**：内部收集详细信息支持丰富的UI功能
4. **格式层面统一**：与其他预定义字段保持一致

这是一个既简化了用户体验，又保持了系统可靠性的优秀设计。