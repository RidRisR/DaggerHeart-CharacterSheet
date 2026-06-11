# Custom Equipment One-off Draft Design

日期：2026-06-06

## 背景

装备包 UI 已接入运行时装备模板，武器选择和护甲选择弹窗可以从 enabled 装备包中选择模板，并写入角色表的 equipment slot。

旧版自定义武器/护甲能力在新选择流程中需要重新设计。新的自定义能力不是本地模板管理系统，也不是装备包 authoring 工具，而是一次性创建当前角色表上的自定义装备。新增需求是：用户在自定义阶段就能写入装备 modifier，而不是先保存装备再去角色表上补修正。

## 目标

- 在武器选择和护甲选择弹窗中恢复自定义入口。
- 自定义结果只一次性写入当前角色表 slot，不进入装备包，也不进入持久化模板库。
- 自定义阶段支持多条 modifier。
- 用户可以基于现有武器/护甲模板创建自定义草稿。
- 保存前不修改 sheetData；只有点击 `保存并选择` 才写入当前 slot。

## 非目标

- 不做可复用自定义装备模板。
- 不保存“基于哪个模板创建”的来源信息。
- 不新增包管理入口。
- 不新增“只套用特性”的独立功能。
- 不支持 modifier `base`，只支持 `kind: "modifier"`。
- 不在一次性自定义草稿阶段单独重做选择列表的多选筛选；选择窗多选筛选作为后续统一能力设计，自定义模式复用同一套筛选逻辑。

## 交互设计

### 默认选择模式

武器/护甲选择弹窗默认保持现有行为：

- 打开弹窗后显示筛选区和装备列表。
- 点击列表中的装备模板，直接写入当前 slot 并关闭弹窗。
- `清除选择` 直接清空当前 slot。

### 自定义草稿模式

点击 `+ 自定义武器` 或 `+ 自定义护甲` 后，当前弹窗进入自定义草稿模式。

自定义草稿模式不是新的弹窗，而是当前选择弹窗内部的状态：

- 弹窗顶部出现自定义草稿区。
- 下方保留原装备列表和筛选能力。
- 如果选择窗已支持多选筛选，自定义草稿模式复用同一套筛选条件和已筛选摘要。
- 自定义模式下，点击下方列表项不再写入 sheetData，而是把该模板复制到上方草稿。
- 点击 `保存并选择` 后，才把草稿写入当前 slot 并关闭弹窗。
- 点击 `退出自定义` 会关闭草稿区，并恢复列表点击即选择的默认行为。

由于列表行为在自定义模式下改变，UI 必须明确提示：

- 草稿区标题附近显示：`自定义模式：点击下方装备会填入草稿，不会立即写入角色表。`
- 列表上方显示提示条：`当前为自定义模式。选择列表中的装备会作为自定义起点；点击“保存并选择”后才会应用。`
- 列表行在自定义模式下的 hover/title 文案应表达 `点击套用到草稿`。

### 基于模板填充草稿

在自定义模式下点击下方任意模板，会把模板整体复制到草稿：

- 武器：名称、等级、类型、属性、伤害类型、负荷、范围、伤害、特性、描述、modifier。
- 护甲：名称、等级、护甲值、阈值、特性、描述、modifier。

填入规则：

- 如果草稿为空或未被用户修改，直接填入。
- 如果草稿已被用户修改，再套用模板前需要确认：`套用此模板会替换当前自定义草稿，是否继续？`
- 套用模板是整体替换草稿，不追加 modifier。

### 退出草稿

如果草稿有未保存修改，点击 `退出自定义` 或关闭弹窗前需要确认：`退出会丢弃当前自定义草稿。`

如果草稿为空或未修改，可以直接退出。

## 表单设计

### 自定义武器

必填字段：

- 名称。
- 类型：主武器 / 副武器。
- 属性。
- 伤害类型。
- 负荷。
- 范围。
- 伤害。

可选字段：

- 等级。
- 特性。
- 描述。
- modifier。

### 自定义护甲

必填字段：

- 名称。
- 护甲值。
- 轻微阈值。
- 严重阈值。

可选字段：

- 等级。
- 特性。
- 描述。
- modifier。

### Modifier 列表

自定义表单支持多条 modifier。

每条 modifier 字段：

- 目标：必须是现有 `EquipmentModifierTargetId`。
- 标签：可选。
- 数值：必填整数，允许 `+2`、`-1`、`0`。
- 删除按钮。

用户可以点击 `添加修正` 新增一行。

保存时：

- 所有 modifier 都生成 `definition.kind = "modifier"`。
- 标签为空时，优先使用特性名；特性名为空时使用装备名。
- 每条 modifier 写入当前 slot 的 `modifierContributions`。

## 数据设计

选择输入扩展为结构化 custom draft。

```ts
type WeaponSelectionInput =
  | { type: "none" }
  | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "weapon" } }
  | { type: "custom"; draft: CustomWeaponDraft }

type ArmorSelectionInput =
  | { type: "none" }
  | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "armor" } }
  | { type: "custom"; draft: CustomArmorDraft }
```

`CustomWeaponDraft` 使用 canonical 字段保存 UI 草稿：

- `name`
- `tier?`
- `weaponType`
- `trait`
- `damageType`
- `burden`
- `range`
- `damage`
- `featureName?`
- `description?`
- `modifierContributions`

`CustomArmorDraft`：

- `name`
- `tier?`
- `baseArmorMax`
- `baseThresholds`
- `featureName?`
- `description?`
- `modifierContributions`

保存时由 sheet store 负责把 draft 转成 `WeaponSlot` 或 `ArmorSlot`：

- 武器字段回填为 sheet 需要的中文展示格式。
- 护甲字段回填为现有 armor slot 结构。
- modifier 生成当前 slot 实例 ID。
- 不写入来源模板 ID。
- 不持久化为本地模板。

## 写入后的行为

自定义装备写入 sheet 后就是普通 slot：

- 可以继续由现有装备 modifier popover 调整、增加、删除 modifier。
- 后续不再知道它是否基于某个模板创建。
- 自定义弹窗不负责编辑已保存 slot，只负责创建或替换当前选择。

## 错误处理

保存自定义草稿时执行表单校验：

- 必填字段缺失时不关闭弹窗，并在对应字段附近显示错误。
- modifier 目标非法时不保存。
- modifier 数值不是整数时不保存。
- 护甲阈值必须能解析为数字，且严重阈值应大于轻微阈值。

套用模板或退出自定义时的确认只在草稿有未保存修改时出现。

## 测试清单

- 默认模式下点击武器模板仍直接写入 slot 并关闭弹窗。
- 自定义模式下点击武器模板只填入草稿，不写入 sheetData。
- 自定义武器保存后写入中文展示字段和 modifier。
- 自定义武器保存后 modifier 参与现有自动化计算。
- 默认模式下点击护甲模板仍直接写入 slot 并关闭弹窗。
- 自定义模式下点击护甲模板只填入草稿，不写入 sheetData。
- 自定义护甲保存后写入 armor slot 和 modifier。
- 草稿已修改后套用模板会触发确认。
- 草稿已修改后退出自定义会触发确认。
- modifier 标签为空时使用特性名或装备名兜底。
- 非整数 modifier 数值阻止保存。
- 护甲阈值非法或顺序错误阻止保存。

## 验收清单

- 武器和护甲选择弹窗都有自定义入口。
- 自定义模式提示清楚说明列表点击行为已改变。
- 用户可以基于现有模板创建草稿。
- 用户可以创建多条 modifier。
- 保存前不会修改 sheetData。
- 保存后自定义装备作为普通 slot 工作。
- 本阶段没有引入可复用自定义模板或额外持久化数据。
