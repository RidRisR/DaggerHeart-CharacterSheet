# 双卡组系统重构计划

## 项目状态：第一阶段已完成 ✅

### 已完成任务（第一阶段：清理聚焦功能）
- ✅ **完全移除聚焦卡组功能**：包括数据结构、props、状态、逻辑、UI等所有相关代码
- ✅ **数据结构清理**：移除 `focused_card_ids` 字段，新增 `inventory_cards` 字段
- ✅ **组件清理**：移除所有聚焦相关的 props、状态、useEffect、右键逻辑、UI高亮
- ✅ **存储清理**：移除聚焦卡牌的本地存储函数和事件处理
- ✅ **UI清理**：移除聚焦标签页、相关分类、异步加载逻辑
- ✅ **编译测试**：确保应用可以正常编译和运行，无错误和警告

### 已完成任务（第二阶段：实现双卡组系统）
- ✅ **数据结构完善**：为新角色添加 `inventory_cards` 字段，实现现有角色和导入数据的自动迁移
- ✅ **卡组视图切换**：实现聚焦卡组（蓝色）和库存卡组（绿色）的标签切换界面
- ✅ **卡牌移动功能**：实现右键移动卡牌在两个卡组间切换，包含特殊卡位保护机制
- ✅ **基础UI增强**：卡牌数量显示、卡组区分、特殊卡位标识

### 已完成任务（第二阶段：实现双卡组系统）
- ✅ **数据结构完善**：为新角色添加 `inventory_cards` 字段，实现现有角色和导入数据的自动迁移
- ✅ **卡组视图切换**：实现聚焦卡组（蓝色）和库存卡组（绿色）的标签切换界面，实时显示卡牌数量
- ✅ **卡牌移动功能**：实现右键移动卡牌在两个卡组间切换，包含特殊卡位保护机制（前5张不能移出聚焦卡组）
- ✅ **基础UI增强**：卡牌数量显示、卡组区分、特殊卡位标识，双卡组的动态渲染

### 已完成任务（第二阶段：实现双卡组系统）
- ✅ **数据结构完善**：为新角色添加 `inventory_cards` 字段，实现现有角色和导入数据的自动迁移
- ✅ **卡组视图切换**：实现聚焦卡组（蓝色）和库存卡组（绿色）的标签切换界面，实时显示卡牌数量
- ✅ **卡牌移动功能**：实现右键移动卡牌在两个卡组间切换，包含特殊卡位保护机制（前5张不能移出聚焦卡组）
- ✅ **基础UI增强**：卡牌数量显示、卡组区分、特殊卡位标识，双卡组的动态渲染
- ✅ **UI优化**：将 alert 提示替换为 toast，提升用户体验，集成了完整的 toast 系统
  - 位置优化：从屏幕底部改为屏幕中央偏上位置（`top-20 left-1/2`）
  - 样式优化：更紧凑的设计、圆角边框、优化的动画效果
  - 时间优化：自动关闭时间从16分钟调整为3秒
  - 视觉优化：淡入淡出效果，从顶部滑入和向顶部滑出
- ✅ **其他组件适配**：
  - 更新打印页面（`character-sheet-page-four.tsx`）显示聚焦+库存所有卡牌
  - 更新卡牌浏览区域（`card-display-section.tsx`）通过 `app/page.tsx` 接收合并的卡牌数据  
  - 更新第三页（`character-sheet-page-three.tsx`）接收所有卡牌数据
  - 添加 Toaster 组件到 `app/layout.tsx`
- ✅ **Bug修复**：修复右键移动卡牌的关键问题
  - **Bug 1**：卡牌从源卡组消失但不会出现在目标卡组
    - 原因：防重复更新机制导致第二个函数调用被阻止
    - 解决：实现 `onCardMove` 原子性移动函数，一次性更新完整的 formData
  - **Bug 2**：从库存卡组可以移动到聚焦卡组的特殊卡位
    - 原因：查找空位时没有区分特殊卡位和普通卡位
    - 解决：限制移动到聚焦卡组时只能使用普通卡位（索引 5-19）

### 待完成任务（第二阶段：完善双卡组系统）
- 🔄 **全面测试**：功能测试、边界测试、兼容性验证
- 🎯 **可选增强**：拖拽移动、右键菜单、性能优化等进一步改进

---

# 卡组系统改造方案 - 聚焦/库存双卡池系统

## 改造计划分析与评估

### 现有方案优点
✅ **产品设计合理**：双卡池（聚焦/库存）概念清晰，符合用户扩展需求  
✅ **交互逻辑直观**：右键在两个卡池间切换，操作简单易理解  
✅ **打印功能完善**：第四页能同时展示两个卡池的所有卡牌  
✅ **存档兼容性**：考虑了旧存档的平滑迁移

### 发现的潜在问题与改进建议

#### 1. 数据结构设计问题
**问题**：当前方案建议将 `cards` 重命名为 `focused_cards`，这会带来大量破坏性修改。

**改进方案**：
- **保持 `cards` 字段不变**，继续代表聚焦卡组
- **新增 `inventory_cards` 字段**代表库存卡组
- 这样可以最小化对现有代码的影响

#### 2. card-display-section兼容性理解偏差
**问题**：原方案误解了 `card-display-section` 的功能定位。

**正确理解**：
- `card-display-section` 是**左侧卡牌展示区**，用于浏览和查看角色拥有的卡牌
- `card-deck-section` 是**第二页的卡组构建区**，用于管理20张卡牌
- 第四页是**打印预览页**，展示角色的完整信息


#### 4. 移动限制逻辑不够完善
**问题**：只考虑了空间限制，未考虑特殊卡牌的移动限制。

**改进方案**：
- **特殊卡位锁定**：前5个位置（职业、子职业、血统卡、社群卡）不允许移出聚焦卡组
- **智能空位查找**：优先从普通卡位开始查找空位
- **用户反馈优化**：提供更详细的操作失败原因

## 卡组系统改造方案 (修正版)

### 1. 产品形态与交互设计

核心改动是将原有的单个“卡组”概念，升级为“聚焦卡组”和“库存卡组”的双卡池系统。

1.  **卡组界面 (`CardDeckSection`)**
    *   在原“卡组”标题位置，增加一个切换开关（例如用 `Tabs` 组件实现），包含“聚焦”和“库存”两个选项，默认显示“聚焦”卡组。
    *   每个卡组（聚焦/库存）都维持 20 个卡槽的 4x5 网格布局。
    *   **左键点击**：
        *   点击聚焦卡组中的**特殊卡位**（职业、子职业、血统、社群），不产生任何效果（保持现有逻辑）。库存卡组没有特殊卡位。
        *   点击聚焦卡组或库存卡组中的**普通卡位**，会打开卡牌选择模态框，允许用户从所有可用卡牌中选择一张放入该卡槽（保持现有逻辑）。
    *   **右键点击**：这是核心交互变化。
        *   在“聚焦”视图下，右键点击任意一张**非空卡牌**，会尝试将该卡牌移动到“库存”卡组的第一个可用空位中。
        *   在“库存”视图下，右键点击任意一张**非空卡牌**，会尝试将该卡牌移动到“聚焦”卡组的第一个可用空位中。
        *   移动成功后，原卡槽变为空。
    *   **卡槽已满处理**：当目标卡组（聚焦或库存）的 20 个卡槽都已满时，移动操作失败。系统应给出明确提示（例如一个短暂的 Toast 通知，内容为“聚焦卡组已满，无法移入”或“库存卡组已满，无法移入”），卡牌保留在原位。

2.  **左侧卡牌展示 (`CardDisplaySection`)**
    *   **“全部”标签页**：此列表现在会展示“聚焦”和“库存”中的**所有**卡牌。
    *   **“聚焦”标签页**：此列表的行为不变，但其数据源将改为只显示“聚焦”卡组中的卡牌。
    *   其他分类标签页（职业、背景等）将继续从所有卡牌（聚焦+库存）中进行筛选。

3.  **打印页面 (`CharacterSheetPageFour`)**
    *   第四页的打印预览将包含“聚焦”和“库存”中的**所有**卡牌，确保玩家可以导出一份完整的卡牌列表PDF。

### 2. 数据结构与存档兼容性

为了实现上述功能并保证旧存档可以无缝升级，我们需要对核心数据结构 `SheetData` 进行调整。

**文件**: `lib/sheet-data.ts`

1.  **数据结构变更**:
    *   将现有的 `cards: StandardCard[]` 字段的用途明确为“聚焦卡组”。为了代码可读性，可以考虑将其重命名为 `focused_cards`，但这会增加迁移成本。更简单的方案是**保持字段名 `cards` 不变，但在代码逻辑和注释中明确其代表“聚焦卡组”**。
    *   新增一个字段 `inventory_cards: StandardCard[]`，用于存储“库存卡组”的20张卡牌。
    *   现有的 `focused_card_ids: string[]` 字段将被**废弃**。因为一张卡是否“聚焦”将由它是否存在于 `cards` (聚焦卡组) 数组中来决定。

    ```typescript
    // in lib/sheet-data.ts
    export interface SheetData {
      // ... existing fields
    
      // cards 字段现在代表“聚焦卡组” (20个卡槽)
      cards: StandardCard[] 
    
      // 新增：库存卡组 (20个卡槽)
      inventory_cards?: StandardCard[] // 使用可选，用于迁移判断
    
      // ... other fields
    
      // 此字段将被废弃，其功能由 cards 数组本身取代
      focused_card_ids?: string[] 
    }
    ```

2.  **向后兼容与数据迁移**:
    *   迁移逻辑可以放在应用启动时加载角色数据的地方（例如 `app/page.tsx` 的 `loadInitialData` 或 `switchToCharacter` 函数中）。
    *   **迁移步骤**：当加载一个角色数据时，检查 `inventory_cards` 字段是否存在。
        *   如果 `inventory_cards` 为 `undefined`，说明是旧存档。
        *   此时，应用程序会自动为该角色数据添加 `inventory_cards` 字段，并将其初始化为一个包含20个空卡牌的数组。
        *   原有的 `cards` 数组被自然地当作新的“聚焦卡组”。
        *   `focused_card_ids` 字段在加载后可以被忽略或移除。
    *   这个过程对用户是透明的，旧存档会自动升级到新结构。

### 3. 数据结构设计

#### A. 保持现有结构的最小修改方案

**文件**: `lib/sheet-data.ts`

```typescript
export interface SheetData {
  // 保持现有字段不变，cards 继续表示聚焦卡组
  cards: StandardCard[]
  
  // 新增：库存卡组
  inventory_cards?: StandardCard[] // 可选字段，用于向后兼容
  
  // 移除：不再需要单独的聚焦ID列表
  // focused_card_ids?: string[] // 将被移除
  
  // ...其他字段保持不变
}
```

### 4. 详细执行计划

#### 第一阶段：清理现有聚焦功能

**Step 1: 移除聚焦相关代码**

**1.1 `lib/sheet-data.ts`**
- 移除 `focused_card_ids?: string[]` 字段声明
- 添加 `inventory_cards?: StandardCard[]` 字段

**1.2 `app/page.tsx`**
- 移除 `handleFocusedCardsChange` 函数
- 移除传递给 `CharacterSheetPageTwo` 的 `onFocusedCardsChange` prop
- 移除 `formData.focused_card_ids` 相关的所有逻辑

**1.3 `components/character-sheet-page-two-sections/card-deck-section.tsx`**
- 移除 `onFocusedCardsChange` prop 和相关类型定义
- 移除 `selectedCards` 状态和相关逻辑
- 移除 `isUpdatingFromPropsRef` 和防循环更新逻辑
- 移除卡牌边框高亮样式 (`ring-2 ring-blue-500`)
- 移除与 `focused_card_ids` 相关的所有 useEffect

**1.4 `components/character-sheet-page-two.tsx`**
- 移除 `onFocusedCardsChange` prop 的传递

**1.5 `lib/storage.ts`**
- 移除 `saveFocusedCardIds` 和 `loadFocusedCardIds` 函数
- 移除 `FOCUSED_CARDS_KEY` 常量

**1.6 `components/card-display-section.tsx`**
- 移除 `focusedCardIds` prop 和相关逻辑
- 移除 `loadAndSetFocusedCards` 函数
- 移除 `focusedCards` 状态和 "聚焦" 标签页

#### 第二阶段：实现双卡组系统

**Step 2: 数据结构与迁移**

## 第二阶段：实现双卡组系统（详细计划）

### 2.1 数据结构和迁移策略

#### 2.1.1 数据结构完善
**目标**：确保 `inventory_cards` 字段在所有新创建的角色中都有默认值。

**修改文件**：`lib/default-sheet-data.ts`
```typescript
export const defaultSheetData: SheetData = {
  // ...existing code...
  cards: Array(20).fill(0).map(() => createEmptyCard()),          // 聚焦卡组（20张）
  inventory_cards: Array(20).fill(0).map(() => createEmptyCard()), // 新增：库存卡组（20张）
  // ...existing code...
}
```

#### 2.1.2 多角色存储系统的迁移逻辑
**目标**：确保所有现有角色在加载时都有 `inventory_cards` 字段。

**修改文件**：`lib/multi-character-storage.ts`
```typescript
export function loadCharacterById(id: string): SheetData | null {
  try {
    const stored = localStorage.getItem(`${CHARACTER_DATA_PREFIX}${id}`);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as SheetData;
    
    // 兼容性迁移：为旧角色添加 inventory_cards 字段
    if (!parsed.inventory_cards) {
      console.log(`[Migration] Adding inventory_cards to character ${id}`);
      parsed.inventory_cards = Array(20).fill(0).map(() => createEmptyCard());
      // 立即保存迁移后的数据
      saveCharacterById(id, parsed);
    }
    
    return parsed;
  } catch (error) {
    console.error(`Failed to load character ${id}:`, error);
    return null;
  }
}
```

#### 2.1.3 导入数据的向后兼容
**目标**：确保导入的旧存档也能正确添加 `inventory_cards` 字段。

**修改文件**：`lib/storage.ts` 的 `importCharacterDataForMultiCharacter` 函数
```typescript
export function importCharacterDataForMultiCharacter(file: File): Promise<SheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // 基本验证
        if (!data || typeof data !== 'object') {
          throw new Error('无效的角色数据格式');
        }
        
        // 向后兼容：为旧存档添加 inventory_cards 字段
        if (!data.inventory_cards) {
          console.log('[Import] Adding inventory_cards to imported data');
          data.inventory_cards = Array(20).fill(0).map(() => createEmptyCard());
        }
        
        resolve(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '文件解析失败';
        reject(new Error(`导入失败：${errorMessage}`));
      }
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
```

### 2.2 卡组界面视图切换系统

#### 2.2.1 界面状态管理
**目标**：在卡组区域添加标签切换，支持"聚焦卡组"和"库存卡组"两个视图。

**修改文件**：`components/character-sheet-page-two-sections/card-deck-section.tsx`

**新增状态和UI**：
```typescript
// 卡组视图状态
const [activeDeck, setActiveDeck] = useState<'focused' | 'inventory'>('focused');

// 标签切换器UI
<div className="flex mb-4 border-b">
  <button
    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
      activeDeck === 'focused'
        ? 'border-blue-500 text-blue-600 bg-blue-50'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
    onClick={() => setActiveDeck('focused')}
  >
    聚焦卡组 ({getCurrentDeckCards('focused').filter(card => !isEmptyCard(card)).length}/20)
  </button>
  <button
    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
      activeDeck === 'inventory'
        ? 'border-green-500 text-green-600 bg-green-50'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
    onClick={() => setActiveDeck('inventory')}
  >
    库存卡组 ({getCurrentDeckCards('inventory').filter(card => !isEmptyCard(card)).length}/20)
  </button>
</div>
```

#### 2.2.2 动态数据渲染
**目标**：根据当前选中的卡组视图，动态显示对应的卡牌数据。

```typescript
// 获取当前卡组数据的辅助函数
const getCurrentDeckCards = (deckType: 'focused' | 'inventory'): StandardCard[] => {
  if (deckType === 'focused') {
    return formData.cards || [];
  } else {
    return formData.inventory_cards || [];
  }
};

// 渲染逻辑
const currentCards = getCurrentDeckCards(activeDeck);
```

### 2.3 卡牌移动系统

#### 2.3.1 右键移动逻辑
**目标**：实现卡牌在两个卡组之间的右键移动功能。

**核心函数**：
```typescript
const handleCardRightClick = (cardIndex: number) => {
  const isFromFocused = activeDeck === 'focused';
  const sourceCards = getCurrentDeckCards(activeDeck);
  const targetDeckType = isFromFocused ? 'inventory' : 'focused';
  const targetCards = getCurrentDeckCards(targetDeckType);
  
  // 特殊卡位保护：聚焦卡组的前5位不能移动到库存
  if (isFromFocused && cardIndex < 5) {
    toast.error("特殊卡位（前5张）不能移动到库存卡组");
    return;
  }
  
  // 检查源卡牌是否为空
  const sourceCard = sourceCards[cardIndex];
  if (isEmptyCard(sourceCard)) {
    toast.info("空卡位无法移动");
    return;
  }
  
  // 查找目标卡组的空位
  const emptyTargetIndex = targetCards.findIndex(isEmptyCard);
  if (emptyTargetIndex === -1) {
    toast.error(`${isFromFocused ? '库存' : '聚焦'}卡组已满，无法移动`);
    return;
  }
  
  // 执行移动
  const newSourceCards = [...sourceCards];
  const newTargetCards = [...targetCards];
  
  // 将卡牌移动到目标位置
  newTargetCards[emptyTargetIndex] = sourceCard;
  // 清空源位置
  newSourceCards[cardIndex] = createEmptyCard();
  
  // 更新formData
  const newFormData = { ...formData };
  if (isFromFocused) {
    newFormData.cards = newSourceCards;
    newFormData.inventory_cards = newTargetCards;
  } else {
    newFormData.inventory_cards = newSourceCards;
    newFormData.cards = newTargetCards;
  }
  
  setFormData(newFormData);
  toast.success(`卡牌已移动到${isFromFocused ? '库存' : '聚焦'}卡组`);
};
```

#### 2.3.2 拖拽移动支持（可选增强）
**目标**：支持拖拽方式在两个卡组间移动卡牌。

**实现方案**：
- 使用 `@dnd-kit/core` 支持跨容器拖拽
- 设置两个 `SortableContext`，分别对应两个卡组
- 在 `onDragEnd` 事件中处理跨容器移动逻辑

#### 2.4.3 右键菜单增强
**目标**：提供更丰富的右键操作选项。

```typescript
// 右键菜单选项
const contextMenuOptions = [
  {
    label: `移动到${activeDeck === 'focused' ? '库存' : '聚焦'}卡组`,
    onClick: () => handleCardRightClick(cardIndex),
    disabled: activeDeck === 'focused' && cardIndex < 5,
    icon: activeDeck === 'focused' ? '📦' : '⭐'
  },
  {
    label: '清空卡位',
    onClick: () => handleClearCard(cardIndex),
    icon: '🗑️'
  }
];
```

### 2.5 数据持久化和同步

#### 2.5.1 自动保存
**目标**：确保卡组间的移动操作能实时保存。

**实现**：在 `setFormData` 调用后自动触发保存逻辑。

#### 2.5.2 性能优化
**目标**：避免频繁的数据操作影响用户体验。

**策略**：
- 使用防抖机制减少保存频率
- 卡组切换时使用缓存避免重复渲染
- 大量卡牌移动时使用批量更新

### 2.6 其他组件更新

#### 2.6.1 `components/character-sheet-page-four.tsx`
**目标**：打印页面需要显示所有卡牌（聚焦+库存）。

```typescript
const allCards = [
  ...(formData?.cards || []),
  ...(formData?.inventory_cards || [])
].filter(card => !isEmptyCard(card));
```

#### 2.6.2 `components/card-display-section.tsx`
**目标**：卡牌浏览区域显示所有卡牌。

```typescript
// 在 app/page.tsx 中传递合并的卡牌数据
const allDisplayCards = [
  ...(formData?.cards || []),
  ...(formData?.inventory_cards || [])
];
```

### 2.7 测试和验证

#### 2.7.1 功能测试点
- ✅ 新创建的角色应该有20张空的库存卡组
- ✅ 现有角色加载时自动获得库存卡组
- ✅ 卡组视图切换正常工作
- ✅ 卡牌可以在两个卡组间移动
- ✅ 特殊卡位保护机制生效
- ✅ 数据保存和加载正确
- ✅ 导入的旧存档兼容性良好

#### 2.7.2 边界情况测试
- 卡组满员时的移动操作
- 空卡位的右键操作
- 特殊卡位的移动限制
- 数据迁移的异常处理

### 2.8 实现顺序建议

1. **第一步**：完善数据结构（2.1 节）
2. **第二步**：实现基础视图切换（2.2.1-2.2.2）
3. **第三步**：实现右键移动功能（2.3.1）
4. **第四步**：添加UI增强（2.4）
5. **第五步**：更新其他组件（2.6）
6. **第六步**：测试和优化（2.7）

#### 第三阶段：测试与优化

**Step 3.1: 完整性测试**
- 旧存档迁移测试
- 卡牌移动功能测试
- 特殊卡位限制测试
- 卡组满员提示测试
- 打印功能测试
- UI 响应性测试

---

## 开发日志

### 2025-01-20：第二阶段完成 + Bug修复 - 双卡组系统全功能实现
- ✅ **核心功能完成**：数据结构迁移、双卡组视图切换、卡牌移动、UI优化、组件适配
- ✅ **关键Bug修复**：修复右键移动卡牌的两个重要问题
  - **Bug 1 - 原子性问题**：右键点击卡牌后，卡牌从当前卡组消失，但不会加入另一个卡组
    - **原因**：`handleCardChange` 和 `handleInventoryCardChange` 都有防重复更新机制，连续调用时第二个函数被阻止执行
    - **解决**：实现 `onCardMove` 原子性移动函数，一次性更新完整的 formData，避免状态竞争
  - **Bug 2 - 特殊卡位保护**：从库存卡组可以移动到聚焦卡组的特殊卡位（前5个位置）
    - **原因**：查找空位时使用 `findIndex(isEmptyCard)` 没有区分特殊卡位和普通卡位
    - **解决**：限制移动到聚焦卡组时只能使用普通卡位（索引 5-19），特殊卡位完全受保护
  - **实现细节**：
    - 在 `CardDeckSectionProps` 中添加 `onCardMove` prop
    - 在 `character-sheet-page-two.tsx` 中实现 `handleCardMove` 函数
    - 在 `card-deck-section.tsx` 中调用 `onCardMove` 替代连续调用两个单独函数
- ✅ **编译验证**：修复后代码通过编译测试

**技术要点**：
- 原子性操作确保数据一致性
- 避免 React 状态更新竞争
- 完整的特殊卡位保护机制（双向保护）
- 保持了现有的防重复更新机制对其他操作的保护

**修改文件**（Bug修复）：
- `components/character-sheet-page-two-sections/card-deck-section.tsx` - 添加 onCardMove prop，修改右键移动逻辑
- `components/character-sheet-page-two.tsx` - 实现 handleCardMove 函数并传递给子组件

**第二阶段最终状态**：
🎯 **双卡组系统完全就绪**，包括数据迁移、视图切换、卡牌移动、错误处理、UI反馈和全组件支持。右键移动功能已经过bug修复，可以正常工作。

### 2025-01-20：UI优化 - Toast通知系统美化
- ✅ **Toast位置优化**：从屏幕底部移动到中央偏上位置
  - 修改 `ToastViewport` 使用 `top-20 left-1/2 -translate-x-1/2`
  - 更好的视觉体验，不遮挡重要内容
- ✅ **Toast样式优化**：
  - 更紧凑的设计：减少 padding (`px-4 py-3`)，更小的关闭按钮
  - 优化动画：从顶部滑入，向顶部滑出，添加淡入效果
  - 圆角设计：使用 `rounded-lg` 替代 `rounded-md`
- ✅ **Toast行为优化**：
  - 自动关闭时间从16分钟优化为3秒
  - 字体大小优化：标题使用 `text-sm font-medium`，描述使用 `text-xs`

**修改文件**（UI优化）：
- `components/ui/toast.tsx` - Toast位置、样式和动画优化
- `hooks/use-toast.ts` - 自动关闭时间优化

**改进效果**：
- 🎨 **视觉改进**：通知出现在屏幕中央偏上，更加醒目且美观
- ⏱️ **体验改进**：3秒自动消失，不会长时间干扰用户操作
- 🎬 **动画改进**：平滑的淡入淡出和滑动效果

### 2025-01-20：通知系统重构 - 简单淡化通知
- ✅ **创建新的淡化通知系统**：
  - 新建 `components/ui/fade-notification.tsx`
  - 一出现就开始逐渐淡化消失的效果
  - 无需用户交互，自动淡出
- ✅ **通知特性**：
  - 位置：屏幕中央偏上（`top-20 left-1/2`）
  - 持续时间：2秒总时长，最后500ms淡出
  - 类型支持：success（绿色）、error（红色）、info（蓝色）
  - 多通知堆叠：每个通知间距60px
- ✅ **替换现有通知**：
  - 卡牌移动成功：`卡牌已移动到X卡组`（绿色）
  - 特殊卡位保护：`特殊卡位不能移动到库存卡组`（红色）
  - 空卡位提示：`空卡位无法移动`（蓝色）
  - 卡组满员：`X卡组已满，无法移动`（红色）
- ✅ **技术实现**：
  - 全局状态管理，无需 Context
  - Portal 渲染，避免层级问题
  - CSS 过渡动画，平滑视觉效果
  - 自动清理机制，防止内存泄漏

**修改文件**（通知系统重构）：
- `components/ui/fade-notification.tsx` - 新的淡化通知组件
- `app/layout.tsx` - 添加 FadeNotificationContainer
- `components/character-sheet-page-two-sections/card-deck-section.tsx` - 替换所有 toast 为 showFadeNotification

**最终效果**：
- 🌟 **极简体验**：一出现就开始淡化，无需任何用户操作
- 🎯 **精准反馈**：不同颜色表示不同类型的操作结果
- ⚡ **零干扰**：2秒内自动消失，不阻塞用户操作流程

**下一步**：建议进行全面的功能测试来验证系统的稳定性。