# Equipment Provider Panel Design

## 背景

装备现在已经是 modifier provider：主武器、副武器、备用武器和护甲都可以持有 `modifierContributions`。这些 contributions 由 registry 读取，active equipment 会进入 target panel 和最终值计算；备用武器只保存自己的 contributions，不进入 active registry，直到被切换为 active slot。

当前缺少 provider 侧编辑界面。用户只能在 target panel 看到装备来源，但无法直接在装备界面管理某把武器或某件护甲提供的修正。

## 目标

为武器和护甲增加 provider panel，用于编辑该装备 slot 自己持有的修正来源。

第一阶段覆盖：

- 主武器。
- 副武器。
- 两个备用武器。
- 当前护甲。

第一阶段不做独立的装备库、装备模板编辑器或批量管理界面。

## 总体方案

采用轻量 popover 布局，入口样式参考当前 target modifier 入口。

用户在每个装备 slot 上打开对应的 provider panel。面板标题实时读取当前装备名称：

- 有名称时：`<装备名> 来源`。
- 无名称时使用 fallback：`主武器来源`、`副武器来源`、`备用武器 1 来源`、`备用武器 2 来源`、`护甲来源`。

target panel 中显示的装备来源 label 也应继续使用 registry 的动态格式化逻辑。也就是说，装备名称变化后，target panel 里的来源前缀应随之变化；contribution 自己只保存短 label，不复制装备名。

## 面板内容

面板采用分区式布局：

- 标题栏：装备来源标题。
- 护甲只读摘要：护甲面板可显示基础护甲值和阈值摘要，但不在 provider panel 内编辑。
- 修正列表：显示该 slot 当前的 `modifierContributions`。
- 新增入口：点击后直接创建一个新修正。

护甲的 `baseArmorMax` 和 `baseThresholds` 继续保留在外部护甲栏编辑。provider panel 只管理额外长期修正。

## Contribution 编辑规则

装备 provider panel 是来源侧 UI，所以它可以编辑装备 contribution 的来源事实。

每条装备 contribution 支持：

- 修改 target。
- 修改 label。
- 修改 value。
- 删除该 contribution。

`kind` 第一阶段固定为 `modifier`，不提供 base/modifier 切换。

修改 target 时，UI 表现为编辑；数据层语义仍然是删除旧 contribution 并创建新 contribution。实现上应替换 `id` 和 `definition.target`，同时保留原有 `editable.label` 和 `editable.value`。

这样可以保持原架构约束：同一个 entry id 的 identity 不会原地改变。

## Target 范围

装备 provider 面板的 target 下拉开放所有 `EquipmentModifierTargetId`，也就是排除经历 target 之外的可装备修正目标。

第一阶段不按武器/护甲类型限制 target。用户自定义装备可以提供任意长期修正。

默认新增 target 使用固定默认值 `evasion`。用户创建后可以立即改 target。

## 新增行为

点击新增按钮时直接创建新 contribution，不进入独立“新建表单”状态。

新增 contribution：

- `definition.kind`: `modifier`
- `definition.target`: 默认 `evasion`
- `editable.label`: 空字符串 `""`
- `editable.value`: `0`

UI 输入框通过 placeholder 表达未命名状态：

- 修正 label placeholder：`未命名修正`

placeholder 不写入存档，不参与 registry label 拼接，也不被当作真实 label 导出。

这个规则也应与 target panel 中新增自定义项保持一致：新增项可以直接创建，但真实 label 为空，UI 用 placeholder 提醒用户命名。

## 模板与自定义装备

选择装备模板仍然替换整个 slot，包括模板自带的 `modifierContributions`。

模板 contributions 被实例化到角色卡 slot 后，就变成该 slot 自己的数据。用户可以在 provider panel 中自由修改或删除这些实例化后的 contributions；模板数据本身不受影响。

直接编辑装备名称、特性、伤害等字段时，不应重置 contributions。

## 与 Target Panel 的关系

target panel 仍然是消费侧 UI：

- 展示 active registry 中与当前 target 相关的 entries。
- 不允许在 target panel 中修改装备 contribution 的 target。
- 不允许在 target panel 中删除装备 contribution。

装备 contribution 的来源事实只能在装备 provider panel 中编辑。

## 数据与存储

不新增全局 provider store。

装备 contributions 继续存储在对应 slot：

- `equipment.weaponSlots.primary.modifierContributions`
- `equipment.weaponSlots.secondary.modifierContributions`
- `equipment.inventoryWeaponSlots[index].modifierContributions`
- `equipment.armorSlot.modifierContributions`

新增或 target 变更时需要生成全局唯一 id。id 只要求在角色卡内唯一，不要求跨存档稳定。

## 验证范围

实现时至少覆盖：

- 主武器 provider panel 可以新增、编辑、删除修正。
- 副武器 provider panel 可以新增、编辑、删除修正。
- 备用武器 provider panel 保存修正，但不进入 active registry。
- 备用武器切换为 active 后，其修正进入 target panel 和计算。
- 护甲 provider panel 可以管理额外修正，基础护甲和阈值仍在外部编辑。
- 修改装备名称后，target panel 来源前缀实时更新。
- 修改 contribution target 后，旧 target 不再显示该 entry，新 target 显示该 entry。
- 新增空 label 时，UI 显示 placeholder，存档中保持空字符串。

## 非目标

本阶段不做：

- 装备模板编辑器。
- 批量编辑装备来源。
- 装备来源的 base 类型 contribution。
- 复杂的 target 推荐或按装备类型过滤。
- 旧存档以外的额外向后兼容逻辑。当前功能尚未发布，未发布分支中的中间态不需要兼容。
