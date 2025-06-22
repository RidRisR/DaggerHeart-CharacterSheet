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

**2.1 `lib/sheet-data.ts`**
- 添加 `inventory_cards?: StandardCard[]` 字段

**2.2 `app/page.tsx`**
- 在数据加载函数中添加迁移逻辑：
  ```typescript
  // 迁移旧存档到新结构
  if (data && !data.inventory_cards) {
    data.inventory_cards = Array(20).fill(createEmptyCard());
    // 保存迁移后的数据
    saveCharacterData(characterId, data);
  }
  ```

**Step 3: 实现卡组界面**

**3.1 `components/character-sheet-page-two-sections/card-deck-section.tsx`**
- 添加视图切换状态：`const [activeDeck, setActiveDeck] = useState<'focused' | 'inventory'>('focused')`
- 添加标签切换器 UI
- 修改 props 接受 `setFormData: (data: SheetData) => void`
- 根据 `activeDeck` 条件渲染不同的卡组数据
- 实现右键移动逻辑：
  ```typescript
  const handleCardRightClick = (index: number) => {
    const isFromFocused = activeDeck === 'focused';
    const sourceCards = isFromFocused ? formData.cards : (formData.inventory_cards || []);
    const targetCards = isFromFocused ? (formData.inventory_cards || []) : formData.cards;
    
    // 检查特殊卡位限制（聚焦卡组的前5位）
    if (isFromFocused && index < 5) {
      toast.error("特殊卡位不能移动到库存");
      return;
    }
    
    // 查找目标卡组的空位
    const emptyIndex = targetCards.findIndex(isEmptyCard);
    if (emptyIndex === -1) {
      toast.error(`${isFromFocused ? '库存' : '聚焦'}卡组已满，无法移动`);
      return;
    }
    
    // 执行移动
    const newFormData = { ...formData };
    const cardToMove = sourceCards[index];
    
    if (isFromFocused) {
      newFormData.cards = [...formData.cards];
      newFormData.inventory_cards = [...(formData.inventory_cards || [])];
      newFormData.cards[index] = createEmptyCard();
      newFormData.inventory_cards[emptyIndex] = cardToMove;
    } else {
      newFormData.cards = [...formData.cards];
      newFormData.inventory_cards = [...(formData.inventory_cards || [])];
      newFormData.inventory_cards[index] = createEmptyCard();
      newFormData.cards[emptyIndex] = cardToMove;
    }
    
    setFormData(newFormData);
    toast.success("卡牌移动成功");
  };
  ```

**3.2 `components/character-sheet-page-two.tsx`**
- 传递 `setFormData` 给 `CardDeckSection`

**Step 4: 更新其他组件**

**4.1 `components/character-sheet-page-four.tsx`**
- 修改数据源为合并的卡牌数组：
  ```typescript
  const allCards = [
    ...(formData?.cards || []),
    ...(formData?.inventory_cards || [])
  ].filter(card => !isEmptyCard(card));
  ```

**4.2 `components/card-display-section.tsx`**
- 更新数据源接收合并后的卡牌列表
- 移除聚焦相关的所有逻辑和 UI
- 简化标签页只保留：全部、职业、背景、域、变体

**4.3 `app/page.tsx`**
- 更新传递给 `CardDisplaySection` 的 props：
  ```typescript
  const allDisplayCards = [
    ...(formData?.cards || []),
    ...(formData?.inventory_cards || [])
  ];
  ```

#### 第三阶段：测试与优化

**Step 5: 完整性测试**
- 旧存档迁移测试
- 卡牌移动功能测试
- 特殊卡位限制测试
- 卡组满员提示测试
- 打印功能测试
- UI 响应性测试

### 5. 潜在风险与注意事项

**A. 数据迁移风险**
- 确保迁移逻辑在所有存档加载路径中都能执行
- 添加迁移日志以便调试

**B. UI 一致性**
- 确保两个卡组的视觉样式保持一致
- Toast 提示信息需要清晰易懂
- 特殊卡位的限制需要有视觉反馈

**C. 性能考虑**
- 卡牌移动操作会触发整个 formData 的更新，需要确保性能
- 考虑是否需要防抖处理频繁的移动操作

**D. 兼容性测试重点**
- 多角色系统的存档切换
- 打印功能的完整性
- 卡牌选择模态框的正常工作
- 特殊卡位功能的保持