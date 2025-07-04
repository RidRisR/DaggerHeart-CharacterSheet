### **自定义卡牌创建功能设计方案**

本文档旨在为“Daggerheart 角色卡”应用设计一个允许用户在应用内创建单张自定义卡牌，并直接集成到角色数据中的功能。

#### **1. 核心目标**

*   **通用性**: 支持创建所有核心卡牌类型（如血脉、职业、领域等）。
*   **易用性**: 提供一个直观、包含预设选项的界面，降低用户操作门槛。
*   **一致性**: 新创建的卡牌在数据结构 (`StandardCard`) 和显示上与预设卡牌完全一致。
*   **复用性**: 最大限度地复用项目中已有的组件和逻辑，尤其是 `card-converter.ts` 中的转换函数和 `card-display-section.tsx` 显示组件。

---

#### **2. 交互逻辑 (UI/UX) 设计**

用户界面的设计将遵循引导式、所见即所得的原则。

##### **2.1. 功能入口**

1.  在 card-selection-modal.tsx 和 generic-card-selection-modal.tsx 模态框的显眼位置（如底部），添加一个名为 **“创建自定义卡牌”** 的按钮。

##### **2.2. 自定义卡牌创建模态框**

1.  点击该按钮后，弹出一个全新的模态框 (`CustomCardCreationModal`)。
2.  模态框采用左右布局：**左侧为表单填写区**，**右侧为卡牌实时预览区**。

##### **2.3. 创建流程**

**步骤一：选择卡牌类型**
*   **界面**: 表单区的第一个字段是必填的下拉菜单，标签为“选择卡牌类型”。
*   **逻辑**: 选项包括所有可自定义的卡牌类型（`Ancestry`, `Profession`, `Domain` 等），此选择将决定下方表单的结构。

**步骤二：填写卡牌信息**
*   **界面**:
    *   根据所选卡牌类型，动态生成相应的表单字段。
    *   **对于有预设值的字段** (如“施法属性” `ATTRIBUTE_CLASS_NAMES` 或“子职业等级” `SUBCLASS_LEVEL_NAMES`):
        *   控件为单选框
    *   **对于有预设值但也可以自定义的字段** (如领域):    
        *   控件为 **“可输入的多选组合框” (ComboBox)**。
        *   用户既可以从下拉列表中选择一个或多个 **系统预设值**，也可以直接输入 **新的自定义值** 并添加。
    *   **对于无预设值的字段** (如“卡牌名称” `name` 或“描述” `description`):
        *   使用标准的单行或多行文本输入框。
    *   **对于可变长列表** (如“特性” `features`):
        *   提供“添加一项”和“删除”按钮，允许用户动态增删条目。
*   **逻辑**:
    *   创建一个 `data/predefined-fields.ts` 文件来存储所有预设值。
    *   表单生成逻辑会根据字段特性，选择渲染普通输入框还是带预设值的组合框。

**步骤三：实时预览与保存**
*   **界面**:
    *   当用户在左侧表单中输入或修改内容时，右侧的预览区会 **实时更新** 卡牌样式。
    *   预览将直接复用 card-display-section.tsx 组件，确保视觉效果的统一。
*   **逻辑**:
    *   模态框底部的“保存卡牌”按钮，在所有必填字段都填写完毕前保持禁用状态。

##### **2.4. 完成与数据回传**

1.  用户点击“保存卡牌”后，`CustomCardCreationModal` 关闭。
2.  新创建的 `StandardCard` 对象被回传给父模态框。
3.  父模态框自动选中这张新卡牌，并将其添加到 `SheetData` 的 `cards` 或 `inventory_cards` 数组中，然后关闭。

---

#### **3. 功能逻辑 (Data Flow) 设计**

后端逻辑的核心在于 **数据转换** 和 **状态管理**。

##### **3.1. 新增文件与模块**

*   **`components/modals/CustomCardCreationModal.tsx`**: 全新的React组件，负责UI和交互。它将接收 `onSave` 回调和 `targetArray` ('cards' | 'inventory_cards') 作为 props。
*   **custom-card-manager.ts**: 存放自定义卡牌创建的核心辅助函数。
*   **`data/predefined-fields.ts`**: 集中管理系统中所有字段的预设值（如 `DAMAGE_TYPES`, `WEAPON_TRAITS` 等），便于维护。

##### **3.2. 核心数据转换逻辑**

此部分是整个功能的技术核心，位于 custom-card-manager.ts 中。

1.  **定义字段生成规则**:
    *   创建函数 `getFieldsForCardType(cardType)`。它会返回一个配置对象数组，定义该卡牌类型所需的所有表单字段及其属性（`name`, `label`, `controlType` (e.g., 'text', 'textarea', 'combobox'), `required`, `predefinedData?`）。

2.  **创建 `StandardCard` 的转换函数**:
    *   创建核心函数 `createStandardCardFromCustomInput(formData, cardType)`。
    *   **职责**:
        a.  接收来自模态框的扁平化表单数据 (`formData`) 和卡牌类型 (`cardType`)。
        b.  **生成唯一ID和来源**: 为新卡牌生成一个唯一的ID（如 `single-${Date.now()}`），并设置其 `source` 字段为 `'single'`，以便追踪和区分。
        c.  **构建单卡原始对象**: 根据 `cardType`，将扁平的 `formData` **直接重构成一个对应类型的单卡原始对象**（例如，一个 `RawProfessionCard` 对象，而不是一个包含卡牌数组的包）。
        d.  **复用现有转换器**: 调用 card-converter.ts 中已存在的、对应的单卡转换函数（如 `convertProfessionCard(rawCard)`)，将上一步构建的原始卡牌对象转换为最终的 `StandardCard` 格式。
        e.  返回这个创建好的 `StandardCard` 对象。

##### **3.3. 数据存储流程**

1.  父模态框调用 `CustomCardCreationModal`，并传递 `onSave` 回调和 `targetArray`。
2.  用户在 `CustomCardCreationModal` 中完成创建并保存。
3.  `CustomCardCreationModal` 内部调用 `createStandardCardFromCustomInput`，生成 `StandardCard` 对象。
4.  `CustomCardCreationModal` 调用 `onSave` 回调，将生成的 `StandardCard` 对象和 `targetArray` 传出。
5.  父模态框的 `onSave` 回调函数被触发，它根据 `targetArray` 的值，将新的 `StandardCard` 添加到 `SheetData` 中对应的数组里。
6.  通过 `use-cards.ts` hook 或其他状态管理机制，保存更新后的 `SheetData`。

---

## 4. 方案检查与优化

### 方案检查结果

经过深入分析项目代码，该方案总体**合理可行**，但需要以下几点优化：

1. **转换器调用方式需要修正**：
   - 现有转换器位于各个子目录中（如 `profession-card/convert.ts`），调用方式为 `professionCardConverter.toStandard()`
   - 不是直接调用 `card-converter.ts` 中的函数，而是通过 `CustomCardManager` 的转换器注册系统

2. **预设字段管理已有现成方案**：
   - 项目已有 `card-predefined-field.ts` 文件，包含 `ATTRIBUTE_CLASS_NAMES`、`SUBCLASS_LEVEL_NAMES` 等预设值
   - 可以直接复用，无需重新创建 `data/predefined-fields.ts`

3. **卡牌类型映射需要完善**：
   - 需要基于 `示例卡牌包.json` 的结构，创建表单字段到原始卡牌对象的映射关系

4. **源文件位置调整**：
   - `custom-card-manager.ts` 应该放在 `card/` 目录下，而不是根目录

---

## 5. 详细分阶段执行计划

### 阶段一：基础设施与数据准备 (1-2天)

#### 1.1 复用现有预设字段系统
- **文件**: 直接使用现有的 `card/card-predefined-field.ts` 和 `card/card-ui-config.ts`
- **获取方式**:
  - 职业选项：`getProfessionCardNames()`
  - 血统选项：`getAncestryCardNames()`
  - 社群选项：`getCommunityCardNames()`
  - 领域选项：`getDomainCardNames()`
  - 属性选项：`ATTRIBUTE_CLASS_NAMES`
  - 子职业等级：`SUBCLASS_LEVEL_NAMES`
- **优势**: 这些函数已经包含了所有内置和自定义的选项，无需重新实现

#### 1.2 分析卡牌类型结构
- **任务**: 深入分析每种卡牌类型的原始数据结构
- **参考**: `示例卡牌包.json` 和各转换器文件（如 `profession-card/convert.ts`）
- **输出**: 每种卡牌类型的字段映射表

#### 1.3 创建字段配置定义
- **文件**: `card/single-card-field-configs.ts`
- **内容**:
  - 定义每种卡牌类型的表单字段配置
  - 包括字段名、标签、控件类型、是否必填、预设值等
  - 支持不同控件类型：text、textarea、select、combobox、number等

### 阶段二：核心逻辑开发 (3-4天)

#### 2.1 实现核心管理类
- **文件**: `card/single-card-manager.ts`
- **功能**:
  - `getFieldsForCardType(cardType)`: 根据卡牌类型返回表单字段配置
  - `createStandardCardFromCustomInput(formData, cardType)`: 表单数据转换为StandardCard
  - `validateFormData(formData, cardType)`: 表单数据验证

#### 2.2 实现数据转换逻辑
- **关键函数**: `createStandardCardFromCustomInput`
- **流程**:
  1. 根据 `cardType` 创建对应的原始卡牌对象（如 `ProfessionCard`）
  2. 填充必要字段（ID生成、source设置为"single"）
  3. 调用现有转换器（如 `professionCardConverter.toStandard()`）
  4. 返回 `StandardCard` 对象

#### 2.3 实现表单验证
- **验证内容**:
  - 必填字段检查
  - 数据类型验证
  - 预设值有效性检查
  - ID唯一性验证

### 阶段三：UI开发与集成 (4-5天)

#### 3.1 开发自定义卡牌创建模态框
- **文件**: `components/modals/CustomCardCreationModal.tsx`
- **功能模块**:
  - 卡牌类型选择器
  - 动态表单渲染器
  - 预设值组合框组件
  - 实时预览组件
  - 表单验证与提交

#### 3.2 开发辅助UI组件
- **ComboBox组件**: 支持预设值选择和自定义输入
- **DynamicFormField组件**: 根据字段配置渲染不同类型的输入控件
- **CardPreview组件**: 实时预览卡牌效果

#### 3.3 集成到现有模态框
- **修改文件**: 
  - `components/modals/card-selection-modal.tsx`
  - `components/modals/generic-card-selection-modal.tsx`
- **集成内容**:
  - 添加"创建自定义卡牌"按钮
  - 实现回调函数处理
  - 处理数据回流和状态更新

### 阶段四：测试与优化 (2-3天)

#### 4.1 功能测试
- **测试项目**:
  - 各卡牌类型的创建流程
  - 预设值选择和自定义输入
  - 实时预览准确性
  - 数据保存和加载
  - 错误处理和提示

#### 4.2 用户体验优化
- **优化内容**:
  - 表单交互细节
  - 错误提示友好化
  - 移动端响应式适配
  - 加载状态和进度提示

#### 4.3 性能优化
- **优化方向**:
  - 表单渲染性能
  - 预览更新节流
  - 内存使用优化

### 阶段五：文档与维护 (1天)

#### 5.1 技术文档
- 代码注释完善
- API文档编写
- 架构说明文档

#### 5.2 用户指引
- 功能使用说明
- 常见问题解答
- 最佳实践建议

---

## 6. 关键技术细节

### 6.1 数据转换流程
```typescript
// 示例：职业卡牌数据转换
const formData = { name: "自定义法师", domain1: "奥术", domain2: "元素" };
const rawCard: ProfessionCard = {
  id: `single-${Date.now()}`,
  名称: formData.name,
  领域1: formData.domain1,
  领域2: formData.domain2,
  // ... 其他字段
};
const standardCard = professionCardConverter.toStandard(rawCard);
standardCard.source = "single";
```

### 6.2 字段配置示例
```typescript
import { getProfessionCardNames, getDomainCardNames, ATTRIBUTE_CLASS_NAMES } from '@/card/card-predefined-field';

const PROFESSION_FIELDS = [
  { name: 'name', label: '职业名称', type: 'text', required: true },
  { 
    name: 'domain1', 
    label: '领域1', 
    type: 'combobox', 
    required: true, 
    predefined: getDomainCardNames().map(value => ({ value, label: value }))
  },
  { 
    name: 'domain2', 
    label: '领域2', 
    type: 'combobox', 
    required: true, 
    predefined: getDomainCardNames().map(value => ({ value, label: value }))
  },
  // ... 其他字段
];
```

这个详细的执行计划考虑了项目的实际结构和现有代码，确保了方案的可行性和高效实现。
