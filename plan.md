好的，这是一个非常棒的功能想法。将UI表现和功能逻辑解耦是一个很好的开发策略。

为了实现这个功能，我们需要修改数据结构、更新UI组件，并调整导出逻辑。下面是一个详细的开发计划，分为几个阶段，以便于我们逐步实现。

---

### 功能开发计划：第三页导出开关

#### 目标

为角色卡第三页添加一个开关，允许用户控制是否在“导出预览”（打印/PDF/HTML）中包含此页面。该开关的状态需要有明确的UI反馈。

#### Phase 1: 数据模型更新

首先，我们需要在核心数据结构中添加一个字段来记录第三页的导出状态。

1.  **修改 `SheetData` 接口**
    *   **文件**: sheet-data.ts
    *   **操作**: 在 `SheetData` 接口中添加一个新的布尔类型字段 `includePageThreeInExport`。
    *   **代码示例**:
        ```typescript
        export interface SheetData {
          // ... existing fields
          includePageThreeInExport: boolean;
        }
        ```

2.  **更新默认数据**
    *   **文件**: default-sheet-data.ts
    *   **操作**: 在 `defaultSheetData` 对象中为新字段设置默认值。默认情况下，我们希望第三页是包含在导出中的，所以设为 `true`。
    *   **代码示例**:
        ```typescript
        export const defaultSheetData: SheetData = {
          // ... existing fields
          includePageThreeInExport: true,
        };
        ```

3.  **更新数据迁移逻辑（必需）**
    *   **文件**: `lib/multi-character-storage.ts`
    *   **操作**: 在 `migrateToMultiCharacterStorage` 函数中，确保迁移的角色数据包含 `includePageThreeInExport: true` 字段。
    *   **位置**: 在创建 `migratedCharacterData` 对象时添加这个字段。

4.  **更新外部数据导入逻辑（必需）**
    *   **文件**: `app/page.tsx`
    *   **操作**: 在 `onImportData` 回调函数中，为导入的数据添加缺失的 `includePageThreeInExport` 字段，默认值为 `true`。
    *   **具体位置**: 在现有的数据合并逻辑中添加这个字段的处理。

5.  **更新HTML导入器兼容性（必需）**
    *   **文件**: `lib/html-importer.ts`（如果存在相关逻辑）
    *   **操作**: 确保从HTML文件导入的角色数据也包含这个字段。

6.  **更新角色复制逻辑（必需）**
    *   **文件**: `lib/multi-character-storage.ts`
    *   **操作**: 在 `duplicateCharacter` 函数中，确保复制的角色数据保持原有的 `includePageThreeInExport` 状态，如果原数据没有此字段，则默认为 `true`。

#### Phase 2: UI 实现

这是最核心的部分，我们需要在主页面上实现一个交互式UI来控制新添加的数据字段。

1.  **创建状态切换处理器**
    *   **文件**: page.tsx
    *   **操作**: 在 `Home` 组件中，创建一个函数，用于切换 `formData.includePageThreeInExport` 的布尔值。
    *   **代码示例**:
        ```tsx
        const toggleIncludePageThreeInExport = () => {
          setFormData(prev => ({
            ...prev,
            includePageThreeInExport: !prev.includePageThreeInExport,
          }));
        };
        ```

2.  **改造第三页的Tab触发器**
    *   **文件**: page.tsx
    *   **操作**: 我们需要将第三页的 `<TabsTrigger>` 组件变得更复杂。它不再只是一个简单的文本按钮，而是一个包含文本和图标按钮的复合组件。
    *   **具体步骤**:
        *   找到 `<TabsList>` 中的第三个 `<TabsTrigger>`。
        *   将其内部结构修改为一个 `div`，使用 Flexbox 布局 (`flex items-center gap-2`)。
        *   在 `div` 中，保留 "第三页" 的文本。
        *   在文本旁边，添加一个 `<button>` 元素。这个按钮将作为我们的开关。
        *   为这个 `<button>` 添加 `onClick` 事件，调用 `toggleIncludePageThreeInExport` 函数。**关键**: 需要阻止事件冒泡 (`e.stopPropagation()`)，这样点击图标按钮时不会触发Tab切换。
        *   根据 `formData.includePageThreeInExport` 的值，动态地显示不同的图标（例如，"可见" 和 "不可见" 的图标）。
        *   使用条件类名（`clsx` 或三元运算符）来改变 `<TabsTrigger>` 的样式。当 `includePageThreeInExport` 为 `false` 时，可以减少其 `padding` 或设置一个固定的短宽度，以达到“缩短”的效果。

3.  **引入图标**
    *   **操作**: 为了实现UI效果，我们可能需要引入新的图标，例如 `lucide-react` 库中的 `Eye` 和 `EyeOff` 图标。如果项目中已经使用了该库，直接导入即可。

#### Phase 3: 功能逻辑实现

最后，我们需要让导出功能遵循 `includePageThreeInExport` 的状态。

1.  **修改导出预览的渲染逻辑**
    *   **文件**: page.tsx
    *   **操作**: 在返回的 JSX 中，找到 `isPrintingAll` 为 `true` 时渲染的打印页面部分。
    *   **具体步骤**:
        *   定位到渲染第三页的代码块 (`<div className="page-three ...">`)。
        *   使用条件渲染，只有当 `formData.includePageThreeInExport` 为 `true` 时，才渲染这个区块。
    *   **代码示例**:
        ```tsx
        {isPrintingAll && (
          <div className="print-all-pages">
            {/* ... Page One and Two ... */}

            {formData.includePageThreeInExport && (
              <div className="page-three flex justify-center items-start min-h-screen">
                <CharacterSheetPageThree /* ...props... */ />
              </div>
            )}

            {/* ... Page Four and Five ... */}
          </div>
        )}
        ```

#### Phase 4: 测试和验证

确保新功能在各种场景下都能正常工作。

1.  **数据完整性测试**
    *   **测试场景**:
        *   创建新角色时，`includePageThreeInExport` 字段应该默认为 `true`
        *   从旧存档迁移时，字段应该被正确添加
        *   导入JSON/HTML文件时，缺失字段应该被补充
        *   复制角色时，开关状态应该被正确保持
    *   **验证方法**: 在浏览器开发者工具中检查localStorage数据，确保所有角色数据都包含此字段

2.  **UI交互测试**
    *   **测试场景**:
        *   点击第三页tab的开关按钮，应该只切换开关状态而不切换到第三页
        *   开关状态变化时，tab的外观应该有明显变化（缩短/恢复）
        *   不同开关状态下，导出预览应该正确包含/排除第三页
    *   **验证方法**: 手动操作UI，确保所有交互符合预期

3.  **导出功能测试**
    *   **测试场景**:
        *   开关开启时：PDF、HTML导出应该包含第三页
        *   开关关闭时：PDF、HTML导出应该不包含第三页
        *   切换开关后，导出结果应该立即反映变化
    *   **验证方法**: 在不同开关状态下进行实际导出操作，检查结果

---

### 开发优先级建议

1.  **高优先级**: Phase 1（数据模型）- 这是基础，必须先完成
2.  **高优先级**: Phase 1中的数据迁移和导入逻辑 - 确保现有用户数据不丢失
3.  **中优先级**: Phase 2（UI实现）- 用户可见的主要功能
4.  **中优先级**: Phase 3（功能逻辑）- 完成整个功能闭环
5.  **低优先级**: Phase 4（测试验证）- 确保质量和稳定性

### 潜在风险和注意事项

1.  **向后兼容性**: 确保所有现有存档在更新后仍能正常工作
2.  **UI响应性**: Tab缩短功能需要仔细调试CSS，确保在不同屏幕尺寸下都表现良好
3.  **事件冒泡**: 开关按钮的点击事件不能触发Tab切换，需要正确处理事件传播
4.  **自动保存**: 开关状态变化应该能触发自动保存机制

---