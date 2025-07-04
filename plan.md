# Zustand 卡牌管理改造计划

## 一、 核心目标

将应用内的卡牌数据（`allCards`）从组件级状态（`useAllCards` Hook）提升为全局状态（`Zustand` store），实现**一次加载，全局共享**，解决跨页面导航时的重复加载问题，并为后续性能优化和功能扩展打下基础。

## 二、 影响范围分析

- **数据入口**：`hooks/use-cards.ts` (将被改造), `card/index.ts` (将被调用).
- **数据出口**：`components/character-sheet.tsx` (主要消费方), `components/modals/generic-card-selection-modal.tsx` (次要消费方).

## 三、 行动步骤

1.  **✅ 安装 `Zustand`**:
    -   [x] 在终端中执行 `pnpm add zustand`。

2.  **✅ 创建卡牌状态仓库 (`Card Store`)**:
    -   [x] 在 `card/` 目录下创建新文件 `card-store.ts`。
    -   [x] 定义 store，包含 `cards`, `loading`, `error`, `isInitialized` 状态和 `fetchAllCards` 动作。

3.  **✅ 改造 `CharacterSheet` 组件以使用 Store**:
    -   [x] 打开 `components/character-sheet.tsx`。
    -   [x] 移除 `useAllCards` Hook 的调用。
    -   [x] 引入并调用 `useCardStore`。
    -   [x] 使用 `useEffect` 在组件加载时调用 `fetchAllCards()`。

4.  **✅ 改造依赖卡牌数据的子组件**:
    -   [x] 检查 `GenericCardSelectionModal` 等模态框组件，确保数据传递正常。
    -   [x] 改造 `CardSelectionModal` 组件使用新的 store。
    -   [x] 修复 React key 属性警告问题。

5.  **✅ 清理和收尾**:
    -   [x] 确认功能正常后，删除 `hooks/use-cards.ts` 文件。

## 四、 测试验证

- [x] 测试角色表单页面，确保卡牌数据正常加载和显示
- [x] 测试页面间切换，确认卡牌数据不会重复加载
- [x] 测试各种模态框的卡牌选择功能
- [x] 确认控制台不再出现重复的卡牌加载日志

## 五、 改造结果

✅ **成功完成 Zustand 卡牌管理改造**

### 改造效果：
- ✅ 卡牌数据现在存储在全局 Zustand store 中
- ✅ 页面切换时不再重复加载卡牌数据（321张卡牌）
- ✅ 特殊卡牌同步逻辑正常工作
- ✅ 所有模态框正常使用新的数据源
- ✅ 解决了 React key 属性警告

### 保留的正常日志：
- `syncSpecialCardsWithCharacterChoices: Called` - 正常，用于同步角色选择与卡牌
- `getUpdatedSpecialCards: Called` - 正常，确保特殊卡牌槽的一致性

### 消失的重复日志：
- `[useAllCards] 开始加载所有卡牌...` - 不再重复出现
- `[useAllCards] 成功加载 321 张卡牌` - 不再重复出现
