# 持久化卡牌交互组件状态实施方案

本文档旨在规划如何为卡牌描述中的交互式组件（如输入框、复选框）实现数据持久化。

## 核心思路

我们将采用"卡牌实例状态"方案，在不显著增加 `SheetData` 复杂性的前提下，为每个卡牌实例附加一个 `values` 对象来存储其交互组件的状态。

## 实施进度

### ✅ 已完成

1. **数据结构扩展**:
   - ✅ 修改了 `card/card-types.ts` 中的 `StandardCard` 接口，添加了 `values?: Record<string, any>` 字段。

2. **数据迁移逻辑**:
   - ✅ 创建了 `lib/card-data-migration.ts` 文件，包含 `migrateSheetData` 函数。
   - ✅ 在 `lib/storage.ts` 中集成了迁移逻辑：
     - `loadCharacterData()` - 从 localStorage 加载时自动迁移
     - `importCharacterData()` - JSON 导入时自动迁移
     - `importCharacterDataForMultiCharacter()` - 多角色系统导入时自动迁移
   - ✅ 在 `lib/html-importer.ts` 中集成了迁移逻辑：
     - `cleanAndNormalizeData()` - HTML 导入时自动迁移

3. **语法解析器更新**:
   - ✅ 更新了 `lib/md-component.ts` 中的 `transformCustomSyntax` 函数，支持新的语法格式：
     - `[input:size:key]` - 输入框带唯一标识
     - `[box:size:key]` - 方框带唯一标识  
     - `[checkbox:key]` - 单个复选框带唯一标识
     - `[checkbox:count:key]` - 多个复选框带唯一标识
   - ✅ 保持向后兼容，旧格式 `[input:size]` 等仍然有效（但无持久化能力）

4. **状态更新逻辑**:
   - ✅ 在 `components/character-sheet.tsx` 中添加了 `updateCardValue` 函数
   - 函数签名：`(cardIndex: number, deckType: 'cards' | 'inventory_cards', key: string, value: any) => void`

### 🔄 进行中

5. **UI层交互实现**:
   - 🔄 需要修改卡牌渲染组件，使其能够：
     - 解析 `data-key` 属性
     - 从 `card.values[key]` 读取初始值
     - 通过 `updateCardValue` 函数保存用户输入

## 实施步骤

### 1. 数据结构扩展与迁移

**目标**: 确保所有被加载的卡牌实例都包含 `values` 字段。

1.  **修改 `StandardCard` 接口**:
    *   **文件**: `card/card-types.ts`
    *   **操作**: 为 `StandardCard` 接口添加一个可选的新字段 `values?: Record<string, any>;`。

2.  **创建数据迁移函数**:
    *   **文件**: `lib/card-data-migration.ts` (新建)
    *   **操作**: 创建一个导出函数 `migrateSheetData(sheetData: SheetData): SheetData`。此函数会遍历 `sheetData.cards` 和 `sheetData.inventory_cards`，确保每张卡牌都有一个 `values` 对象。如果卡牌没有 `values` 字段，就为其初始化为 `{}`。

3.  **集成迁移逻辑**:
    *   **文件**: `lib/storage.ts`
    *   **位置**: 在 `loadCharacterSheet` 函数中。
    *   **操作**: 从 `localStorage` 获取到 `SheetData` 对象后，在返回之前，调用 `migrateSheetData` 对其进行处理。
    *   **文件**: `lib/html-importer.ts`
    *   **位置**: 在 `importCharacterSheetFromHtml` 函数中。
    *   **操作**: 从HTML文件成功解析出 `SheetData` 对象后，在设置数据之前，调用 `migrateSheetData` 对其进行处理。

### 2. 更新语法解析器

**目标**: 让 `md-component` 能够解析带唯一 `key` 的新语法。

1.  **修改 `transformCustomSyntax` 函数**:
    *   **文件**: `lib/md-component.ts`
    *   **操作**:
        *   更新正则表达式以支持 `[type:value:key]` 格式，例如 `[input:20:character_name]`。
        *   对于匹配到的新语法，生成带有 `data-key` 属性的 `<code>` 标签，如 `<code data-type="input" data-value="20" data-key="character_name"></code>`。
        *   对于 `[checkbox:count:key]` 格式，同样生成 `data-key`，其在 `values` 中对应的值将是选中复选框的数量（一个数字）。

### 3. 实现状态更新逻辑

**目标**: 提供一个中心化的函数来更新卡牌状态。

1.  **创建 `updateCardValue` 函数**:
    *   **文件**: `hooks/use-cards.ts`
    *   **操作**:
        *   新增一个名为 `updateCardValue` 的函数。
        *   **函数签名**: `(cardIndex: number, deckType: 'cards' | 'inventory_cards', key: string, value: any) => void`。
        *   **逻辑**: 该函数会定位到指定的卡牌实例，更新其 `values` 对象中对应 `key` 的值，然后通过 `setSheetData` 保存整个 `SheetData` 的变更。

### 4. 在UI层实现交互

**目标**: 将数据绑定到UI组件，并响应用户操作。

1.  **修改卡牌渲染组件**:
    *   **可能涉及的文件**: `components/card-display-section.tsx` 或其子组件。
    *   **操作**:
        *   在渲染卡牌描述时，解析由 `transformCustomSyntax` 生成的HTML。
        *   对于每个带有 `data-key` 的 `<code>` 标签，渲染成对应的React组件（Input, Checkbox等）。
        *   **数据读取**: 组件的初始值从 `card.values[data-key]` 中读取。
        *   **数据写入**: 当用户与组件交互时（例如，在输入框中打字或点击复选框），调用从 `useCards` hook 中获取的 `updateCardValue` 函数，将新的状态持久化。

## 下一步

1. 找到负责渲染卡牌描述的组件
2. 实现 React 组件替换逻辑（将 `<code data-type="input">` 替换为实际的 `<input>` 组件）
3. 实现数据绑定和事件处理
4. 测试完整的数据流：输入 → 保存 → 重新加载 → 恢复状态
