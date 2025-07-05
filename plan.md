# 在卡牌底部显示来源卡包名称 - 实现计划

## 1. 目标

在 `SelectableCard` 组件的底部，清晰地展示卡牌的来源。
- **内置卡牌**: 显示 “内置卡包”。
- **自定义卡牌**: 显示用户### 第 4 步: 验证和测试

1.  **内置卡牌**: 确认所有标准卡牌都正确显示 "内置卡包"。
2.  **自定义卡牌**: 导入一个自定义卡包（确保其 `json` 文件中有 `name` 字段），并验证卡牌是否正确显示该名称。
3.  **兼容性测试**: 
    - 验证没有 `name` 字段的旧版自定义卡包是否能正确回退显示 `batchId`。
    - 验证没有 `source` 字段的旧卡牌是否能正确显示 "内置卡包"。
4.  **UI 检查**: 在所有使用 `SelectableCard` 的地方进行测试：
    - 卡牌管理器页面 (`app/card-manager/page.tsx`)
    - 角色创建流程的各个模态框
    - 角色表单中的卡牌选择区域
    - 确保布局没有问题，来源信息不会与其他内容重叠

## 4. 关键技术细节

### 性能优化
- 利用现有的 `CustomCardStorage` 缓存机制，避免重复的 localStorage 查询
- 在 `getAllStandardCardsAsync` 中一次性处理所有卡牌，而不是在每个组件中单独查询

### 向后兼容性
- 对于没有 `source` 字段的旧卡牌，默认显示 "内置卡包"
- 对于没有 `batchName` 的自定义卡牌，回退显示 `batchId` 或 "自定义卡包"

### 错误处理
- 如果 `getBatchName` 返回 `null`，有适当的回退机制
- 确保 UI 组件在数据异常时不会崩溃卡包**名称**（例如 “玩家社区扩展包”），而不仅仅是 `batchId`。

## 2. 核心思路

为了在 UI 组件中获取到卡包名称，我们需要建立一个从 `batchId` 到卡包元数据（特别是名称）的查询链。最佳实践是将数据获取和处理逻辑放在数据管理层，而不是 UI 组件中。

## 3. 分步实现计划

### 第 1 步: 增强 `CustomCardManager` 的数据查询能力

**文件**: `card/custom-card-manager.ts`

1.  **添加 `getBatchName` 方法**:
    - 创建一个公共方法 `getBatchName(batchId: string): string | null`。
    - 该方法调用现有的 `getBatchById(batchId)` 方法获取 `ImportBatch` 对象。
    - 如果找到批次，返回其 `name` 字段；否则返回 `null`。
    - 这个方法利用了现有的 `CustomCardStorage` 缓存机制，无需额外的缓存层。

**具体实现**:
```typescript
/**
 * 获取批次名称
 */
getBatchName(batchId: string): string | null {
    const batch = this.getBatchById(batchId);
    return batch?.name || null;
}
```

### 第 2 步: 在数据出口处（`card/index.ts`）统一处理卡牌数据

**文件**: `card/index.ts`

1.  **创建 `getBatchName` 代理函数**:
    - 导出一个新的函数 `export const getBatchName = (batchId: string) => customCardManager.getBatchName(batchId);`。
    - 这样，应用的其余部分可以通过 `card/index.ts` 这个统一出口与 `customCardManager` 交互。

2.  **扩展 `ExtendedStandardCard` 类型**:
    - 在 `card/card-types.ts` 中，为 `ExtendedStandardCard` 接口添加一个可选字段 `batchName?: string;`。

3.  **修改 `getAllStandardCardsAsync` 函数**:
    - 在这个函数获取到卡牌列表后，增加一个处理步骤。
    - 在返回卡牌列表前，遍历列表。对于每一张 `source === CardSource.CUSTOM` 的卡牌：
      - 调用 `customCardManager.getBatchName(card.batchId)` 获取其卡包名称
      - 将获取到的名称赋值给 `card.batchName` 字段
    - 这样，所有通过 `use-cards.ts` 等 Hook 获取的卡牌数据都将自动包含 `batchName`。

**具体实现**:
```typescript
// 在 getAllStandardCardsAsync 函数中
const unifiedCards = customCardManager.getAllCards();

// 为自定义卡牌添加 batchName 字段
const cardsWithBatchNames = unifiedCards.map(card => {
    if (card.source === CardSource.CUSTOM && card.batchId) {
        const batchName = customCardManager.getBatchName(card.batchId);
        return { ...card, batchName };
    }
    return card;
});

return cardsWithBatchNames;
```

### 第 3 步: 更新 `SelectableCard` 组件以显示来源

**文件**: `components/ui/selectable-card.tsx`

1.  **更新类型导入**:
    - 导入 `ExtendedStandardCard` 和 `CardSource`。
    - 将 `SelectableCardProps` 中的 `card` 类型修改为 `ExtendedStandardCard`。

2.  **创建 `getCardSourceDisplayName` 辅助函数**:
    - 在组件外部创建一个辅助函数，根据卡牌的 `source`, `batchName`, 和 `batchId` 返回最终要显示的字符串。
    - **逻辑**:
      - 如果 `source` 是 `CardSource.BUILTIN`，返回 "内置卡包"。
      - 如果 `source` 是 `CardSource.CUSTOM`，优先返回 `batchName`。如果 `batchName` 不存在，返回 `batchId` 或 "自定义卡包"。
      - 如果 `source` 未定义，默认为 "内置卡包" 以实现向后兼容。

3.  **修改 JSX 布局**:
    - 在卡牌描述区域（`ReactMarkdown` 组件）的下方，添加一个新的 `<div>` 用于显示来源信息。
    - **样式**: 使用 `text-xs`, `text-gray-400`, `text-right`, `mt-2` 等 Tailwind CSS 类，使其显示在卡牌右下角，样式与整体风格协调。

**具体实现**:
```typescript
// 辅助函数
const getCardSourceDisplayName = (card: ExtendedStandardCard): string => {
    if (card.source === CardSource.BUILTIN) {
        return "内置卡包";
    }
    if (card.source === CardSource.CUSTOM) {
        return card.batchName || card.batchId || "自定义卡包";
    }
    return "内置卡包"; // 向后兼容
};

// 在 JSX 中添加来源显示
<div className="text-xs text-gray-600 leading-snug mb-1 flex-1 overflow-hidden">
    {/* 现有的描述内容 */}
</div>
<div className="text-xs text-gray-400 text-right mt-2">
    {getCardSourceDisplayName(card)}
</div>
```

### 第 4 步: 验证和测试

1.  **内置卡牌**: 确认所有标准卡牌都正确显示 “内置卡包”。
2.  **自定义卡牌**: 导入一个自定义卡包（确保其 `json` 文件中有 `name` 字段），并验证卡牌是否正确显示该名称。
3.  **兼容性**: 验证没有 `name` 字段的旧版自定义卡包是否能正确回退显示 `batchId`。
4.  **UI 检查**: 在所有使用 `SelectableCard` 的模态框和页面中（如卡牌管理器、角色创建流程等），检查 UI 显示是否正常，没有布局问题。
