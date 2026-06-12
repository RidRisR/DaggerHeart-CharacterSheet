# Equipment Validation UI Parity Design

日期：2026-06-12
状态：设计已确认，待实施计划

## 背景

`/card-editor` 现在同时支持卡牌包和装备包编辑。卡牌包验证弹窗的体验更完整：它有清晰的顶部状态、快速概览、按优先级/具体卡片/类型/全部的浏览结构、可折叠分组、友好的中文错误说明和修复建议。

装备包验证弹窗已经具备基本的 tab 分组、中文诊断映射和定位能力，但信息层级较弱：缺少快速概览，可读性和卡牌包验证弹窗不一致，成功态和失败态的行动提示也更薄。

本设计的目标是先把装备包验证界面追平卡牌包验证界面的体验。暂不抽象共享验证结果组件，后续等两边形态稳定后再评估是否统一组件。

## 目标

1. 装备包验证弹窗的信息层级追平卡牌包验证弹窗。
2. 保留装备包领域文案，不机械复刻卡牌包里的“卡片”“卡牌包质量”等表达。
3. 保留现有装备诊断映射和定位能力。
4. 加强装备诊断中文化：标题、描述、修复建议都应面向作者可理解，避免直接透出英文 pipeline message；同一套装备诊断中文化应服务编辑器 dry-run 验证和内容包管理的正式装备包导入详情。
5. 把装备侧 summary/group 计算整理为可测试的纯函数，避免复杂展示逻辑堆在 JSX 中。
6. 不改卡牌包验证弹窗，不抽共享组件。

## 非目标

- 不重构 `app/card-editor/components/validation-results.tsx`。
- 不创建通用 `ContentPackValidationResults` 组件。
- 不改变装备包验证 pipeline、schema、dry-run 语义或导入准入规则。
- 不新增字段级滚动聚焦。定位仍只切换到基础信息、武器或护甲 tab，并选择对应装备条目。
- 不让验证成功弹窗直接执行导出。导出仍由工具栏的“导出装备包”按钮触发。
- 不把验证失败解释为阻止编辑器导出草稿。验证失败只说明当前草稿不能作为正式装备包导入/安装使用。
- 不处理卡牌包导入错误文案。卡牌包导入来自另一套 importer 和字符串错误数组，后续可单独统一。
- 不重做内容包管理的 `GlobalImportPanel` 布局。正式装备包导入详情本次只复用中文化 message，保留现有 code/path/value 技术详情结构。
- 不重做武器/护甲选择弹窗布局。若它们通过装备 UI diagnostic view 显示初始化错误，本次只允许 message 中文化的连带影响。

## 用户体验

### 文案对象

装备编辑器验证弹窗面向 **Pack Author**。错误描述必须解释作者需要修改的草稿内容；不要使用只面向 **Pack User** 的模糊结果文案，例如单独的 `导入失败`、`文件不可用`。只有在说明正式安装或内容包管理准入时才使用“导入”。

### 顶部状态

失败态标题保持领域化：

- 标题：`需要修复一些装备问题`
- 描述：`检测到 X 个关键问题和 Y 个警告，影响 基础信息、武器、护甲。`

成功态标题和描述强调装备包可用性：

- 标题：`装备包检查通过`
- 描述：`装备包包含 X 件武器和 Y 件护甲，当前检查通过。`

成功态可以保留卡牌包弹窗的绿色成功区结构，但文案应偏工具化，例如：

- `装备包可以导出并用于内容包管理导入。`
- 避免使用 `质量优秀`、`放心使用` 这类偏评价式文案。

### 快速概览

失败态在 tab 上方展示四个统计块：

1. `关键错误`：severity 为 `error` 的诊断数量。
2. `警告`：severity 为 `warning` 的诊断数量。
3. `问题类型`：受影响的 groupType 数量和名称，例如 `基础信息、武器、护甲`。
4. `装备条目`：`weaponCount + armorCount`，副文案为 `武器 + 护甲`。

`装备条目` 表示作者正在编辑的装备条目数量。基础信息问题不计入这个数字，但会出现在 `问题类型` 中。

### 问题浏览

保留现有四个 tab：

- `按优先级`
- `按位置`
- `按类型`
- `全部`

tab 内容采用卡牌包验证弹窗的密度和结构：

- 分组头部可折叠。
- 错误分组使用红色边框/背景，警告分组使用琥珀色边框/背景。
- 分组头显示图标、标题和数量 badge。
- 默认展开，便于用户第一次看到问题。

`按优先级` 的分组：

- `必须修复（正式导入前）`
- `建议修复（提升质量）`

`按位置` 的分组使用现有 `specificGroup`。这里不用 `按装备`，因为基础信息和系统问题也可能出现在这个视图中：

- `基础信息`
- `第1件武器`
- `第1件护甲`
- `系统问题`

`按类型` 的分组使用现有 `groupType`：

- `基础信息问题`
- `武器问题`
- `护甲问题`
- `系统问题`

### 单条诊断

单条诊断卡片保留当前友好映射，例如：

- `第1件武器的名称有问题`
- `第1件护甲的伤害阈值有问题`
- `装备包基础信息的版本号有问题`

展示结构追平卡牌包验证弹窗：

- 标题
- 字段 badge，例如 `字段: 名称`
- severity badge，例如 `错误` 或 `警告`
- 描述
- 蓝色修复建议块
- 可定位时显示定位按钮。基础信息问题显示 `定位基础信息`，武器和护甲问题显示 `定位装备`。

#### 诊断中文化

当前装备侧只对少数 code 写了中文解释，其他诊断会退回英文 `diagnostic.message` 或非常泛的 `请检查并修正该字段内容`。内容包管理的正式装备包导入详情也会经由 `toDiagnosticView()` 展示 pipeline message。两处会让作者或导入者不知道具体哪里错、为什么错、下一步该怎么改。本次追平应把装备诊断中文化视为共享 UI 体验的一部分，不只是编辑器布局调整。

实现应为已知 `EquipmentPackImportErrorCode` 和 `EquipmentPackImportWarningCode` 提供领域化中文描述和建议。至少覆盖：

- 文件和来源问题：`SOURCE_READ_FAILED`、`INVALID_JSON`、`FILE_TOO_LARGE`
- 包格式问题：`INVALID_FORMAT`
- 结构问题：`MISSING_FIELD`、`UNKNOWN_FIELD`、`INVALID_TYPE`、`FIELD_TOO_LONG`、`TEMPLATE_LIMIT_EXCEEDED`
- 枚举问题：`INVALID_ENUM`
- ID 和冲突问题：`DUPLICATE_ID`、`ID_CONFLICT`
- 装备语义问题：`EMPTY_EQUIPMENT`、`INVALID_THRESHOLD_ORDER`、`INVALID_CONTRIBUTION_TARGET`
- 存储和运行时问题：`PACK_LIMIT_EXCEEDED`、`PACK_ID_GENERATION_FAILED`、`STORAGE_QUOTA_EXCEEDED`、`STORAGE_SERIALIZE_FAILED`、`STORAGE_WRITE_FAILED`、`RUNTIME_CACHE_BUILD_FAILED`、`RUNTIME_CACHE_DUPLICATE_TEMPLATE_ID`
- 警告：`MISSING_TEMPLATE_DESCRIPTION`、`DESCRIPTION_LONG`

覆盖策略采用“重点 code 特化 + 类别默认”：

- 重点特化：`MISSING_FIELD`、`UNKNOWN_FIELD`、`INVALID_TYPE`、`INVALID_ENUM`、`FIELD_TOO_LONG`、`DUPLICATE_ID`、`ID_CONFLICT`、`EMPTY_EQUIPMENT`、`INVALID_THRESHOLD_ORDER`、`MISSING_TEMPLATE_DESCRIPTION`、`DESCRIPTION_LONG`。
- 类别默认：文件读取/JSON/格式、存储、运行时、限制类错误各有明确中文 fallback。
- 不要求每个 storage/runtime code 都有完全不同的句子，但不能英文透出。

中文化输出应符合这些规则：

- `description` 说明当前值为什么不符合要求，例如 `该字段不能为空`、`该字段不是装备包支持的选项`、`此 ID 已被其他装备使用`。
- `suggestion` 给出可执行下一步，例如 `请填写名称后重新验证`、`请从编辑器下拉选项中选择一个有效值`、`请修改其中一个装备 ID，确保每件装备唯一`。
- 如果 `diagnostic.value` 可用，可以在建议中谨慎展示当前问题值，例如 `当前值为 T9`，但不要输出大段对象。
- `relatedPaths` 可用于重复 ID 提示，说明存在另一个相关位置；第一阶段可以不做可点击跳转，但文案应提示“另一个重复项也需要检查”。
- fallback 不应直接显示英文 message。未知 code 的 fallback 应使用中文通用描述：`当前字段未通过装备包校验`，建议为 `请检查该字段的格式和取值，然后重新验证`。
- 系统/存储/运行时错误也应中文化，避免只显示 `Storage write failed`、`Runtime cache build failed` 这类英文。

#### 正式导入详情复用

内容包管理的装备包正式导入详情也应使用同一套装备诊断中文化 mapper：

- 失败 summary 不应只显示 `装备包导入失败`。应显示错误/警告规模，例如 `装备包导入失败：发现 3 个错误和 1 个警告`；如果 warning 为 0，则显示 `装备包导入失败：发现 3 个错误`。
- 成功 summary 保持 `导入 N 个装备模板`。如果成功导入仍带 warning diagnostics，详情中的 warning message 也应复用共享中文化，让用户看到“已导入，但有可改进项”。
- 导入详情可以继续显示 `code` 和 `path` 作为技术定位信息。
- 导入详情继续按现有方式显示 `value` 技术详情；共享中文主文案不要塞入大对象。
- `message` 应改为共享 mapper 生成的中文摘要，不直接使用英文 `diagnostic.message`。
- 正式导入详情的 `message` 使用 `{description}。{suggestion}` 合成一行短句，例如 `该字段不能为空。请补全后重新导入。`。
- 正式导入场景可以不显示 `suggestion` 的完整蓝色建议块，但文案来源应和编辑器验证一致，避免同一 code 在两个入口出现两种解释。
- 本次不把正式导入详情改成编辑器弹窗式诊断卡片。
- 卡牌包导入错误文案不进入本次范围。

定位行为不变，但按钮文案按目标类型区分：

- metadata 诊断显示 `定位基础信息`，点击后切到基础信息 tab。
- weapon 诊断显示 `定位装备`，点击后切到武器 tab 并选择对应 index。
- armor 诊断显示 `定位装备`，点击后切到护甲 tab 并选择对应 index。
- system 诊断不显示定位按钮。

### 底部操作

失败态底部提示：

`你仍可导出草稿；若要作为装备包导入使用，请先修复错误并点击工具栏的"验证装备包"按钮重新检查。`

按钮：

- `关闭`

成功态按钮：

- `关闭`
- `返回编辑器`

`返回编辑器` 只关闭弹窗，不触发导出。用户如需导出，应回到工具栏点击“导出装备包”。

## 代码设计

### 诊断映射层

继续使用 `app/card-editor/equipment/equipment-validation.ts` 中的 `mapEquipmentDiagnosticsToFriendly()`、`targetFromDiagnosticPath()` 和 `FriendlyEquipmentDiagnostic`，但中文化 mapper 不应只藏在 editor 组件私有逻辑里。

建议新增或移动为装备 UI 可复用 mapper，例如：

```ts
export type EquipmentDiagnosticCopyContext = "editorValidation" | "contentImport"

export interface LocalizedEquipmentDiagnosticCopy {
  description: string
  suggestion: string
}

export function localizeEquipmentDiagnostic(
  diagnostic: EquipmentPackApplicationDiagnostic,
  context: EquipmentDiagnosticCopyContext,
  field?: string,
): LocalizedEquipmentDiagnosticCopy
```

`descriptionAndSuggestion()` 应扩展为完整的装备诊断中文化 mapper。建议拆出小型常量或函数，按 `diagnostic.code` 生成：

- `description`
- `suggestion`

同一 code 的 `description` 尽量共用；`suggestion` 应按 context 调整下一步动作：

- `editorValidation`：引导作者修改草稿后 `重新验证`。
- `contentImport`：引导用户修改文件后 `重新导入`。

字段显示继续使用 `fieldLabel()`，但字段表应补齐当前公开 schema 和编辑器里会出现的字段，包括 modifier contribution 相关字段。路径无法映射到具体字段时，仍应给出中文 title 和中文 fallback。

`equipment/ui/types.ts` 的 `toDiagnosticView()` 或调用方应复用同一套 mapper，把正式装备包导入详情中的 `message` 改为中文摘要。不要让 editor dry-run 和 content manager commit import 各维护一份文案表。

如果 `toDiagnosticView()` 作为共享入口更新，武器/护甲选择弹窗中的装备数据初始化错误也会显示中文 message。这是允许的连带影响，但不要求修改这些弹窗的布局或交互。

新增或导出装备侧展示 helper：

```ts
export interface EquipmentValidationDisplaySummary {
  criticalIssues: number
  warningIssues: number
  affectedTypes: string[]
  equipmentItems: number
}

export interface EquipmentValidationGroups {
  critical: FriendlyEquipmentDiagnostic[]
  warnings: FriendlyEquipmentDiagnostic[]
  bySpecificGroup: Record<string, FriendlyEquipmentDiagnostic[]>
  byGroupType: Record<string, FriendlyEquipmentDiagnostic[]>
}
```

建议函数：

```ts
export function createEquipmentValidationDisplaySummary(
  diagnostics: FriendlyEquipmentDiagnostic[],
  summary: EquipmentPackApplicationImportResult["summary"],
): EquipmentValidationDisplaySummary

export function groupEquipmentValidationDiagnostics(
  diagnostics: FriendlyEquipmentDiagnostic[],
): EquipmentValidationGroups
```

这些 helper 只处理展示统计和分组，不改变验证结果，不判断业务准入。

### React 组件层

`app/card-editor/equipment/components/equipment-validation-results.tsx` 负责渲染：

- 顶部状态。
- 快速概览。
- tabs。
- 可折叠分组。
- 单条诊断卡片。
- 成功态。
- 底部操作。

组件内部可以保留装备侧专用的 `DiagnosticGroup` 和 `DiagnosticCard`，但结构应对齐卡牌包验证弹窗。

为了降低首轮风险，不移动卡牌包验证弹窗代码，也不尝试共享 `ErrorGroup`。

## 测试设计

### `equipment-validation.test.ts`

扩展现有装备验证测试或新增用例，覆盖：

- 每个主要诊断 code 都能产生中文 `description` 和中文 `suggestion`。
- 重点特化 code 有专门文案；文件读取/JSON/格式、存储、运行时、限制类 code 至少各有一个类别默认测试。
- fallback 不直接透出英文 `diagnostic.message`。
- `UNKNOWN_FIELD`、`FIELD_TOO_LONG`、`EMPTY_EQUIPMENT`、`ID_CONFLICT`、`MISSING_TEMPLATE_DESCRIPTION`、`DESCRIPTION_LONG` 等当前缺失或模糊的 code 有明确文案。
- `createEquipmentValidationDisplaySummary()` 正确统计错误、警告、受影响类型和装备条目数。
- 基础信息、武器、护甲、系统诊断都能进入对应 group。
- 重复 groupType 只在 affectedTypes 中出现一次。

### `equipment-validation-results.test.tsx`

扩展现有 DOM 测试，覆盖：

- 失败态显示快速概览四个统计块，包括 `装备条目`。
- 失败态描述包含关键问题、警告和受影响类型。
- 四个 tab 仍存在。
- 分组标题和数量 badge 可见。
- 单条诊断显示字段 badge、severity badge、描述和蓝色修复建议。
- 单条诊断不显示英文 pipeline 原始消息作为主要说明。
- 基础信息诊断显示 `定位基础信息`；武器和护甲诊断显示 `定位装备`；系统问题不显示定位按钮。
- 点击 `定位装备` 仍调用原有 target。
- 成功态显示武器/护甲数量和工具化成功文案。
- 成功态的主按钮只关闭弹窗，不触发导出行为。

### 内容包管理导入测试

扩展 `components/content-pack-manager/__tests__/import-content-pack.test.ts` 或相关测试，覆盖：

- 失败的装备包正式导入详情使用中文诊断 message。
- 同一装备诊断 code 在 editor dry-run 和 content manager import 中使用同一套中文化来源。
- 卡牌包导入错误文案行为不变。

### 装备 UI 诊断视图测试

扩展 `equipment/ui` 相关测试，覆盖：

- `toDiagnosticView()` 对 runtime/storage 初始化错误输出中文 message。
- 选择弹窗不需要新增布局测试；只验证共享 diagnostic view 的 message。

## 风险与取舍

当前方案会让装备包和卡牌包验证组件存在一定重复。这是有意取舍：第一步先改善装备包作者体验，不扩大到卡牌包验证弹窗重构，避免引入 card editor 回归。

后续如果两边验证结果弹窗继续收敛，可以再评估共享展示组件。共享组件应在两边 UI 语义稳定后提炼，而不是在装备包还未追平时提前抽象。

装备诊断中文化 mapper 是本次可以提前共享的例外：它属于领域诊断解释，不是弹窗布局抽象。共享它能避免编辑器验证和正式导入详情对同一 **Import Diagnostic** 给出不一致解释。

## 验收标准

1. 装备包验证失败时，用户能先看到错误/警告/问题类型/装备条目概览。
2. 装备包诊断能按优先级、位置、类型和全部浏览。
3. 装备包诊断标题、描述和修复建议都为中文，并保持装备领域表达。
4. 常见错误和警告不再显示模糊 fallback 或英文 pipeline message。
5. 内容包管理中的装备包正式导入详情复用同一套装备诊断中文化，不再直接显示英文 pipeline message。
6. 可定位诊断仍能跳转到对应装备编辑 tab 和条目。
7. 成功态和失败态的底部提示与当前工具栏工作流一致。
8. 卡牌包验证弹窗和卡牌包导入错误文案行为不变。
9. 新增和更新的单元测试通过。
