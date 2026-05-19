# Stress Base Design

日期：2026-05-19

状态：已确认

## 目的

所有角色卡都应拥有 6 点基础压力上限，作为 `stressMax` 的 base 来源参与 modifier 自动计算。这个基础值应像熟练度的基础值一样由系统来源提供，而不是依赖用户手动输入或导入迁移估算。

## 设计

`collectSystemModifierEntries` 新增一个稳定系统 base entry：

- `id`: `level:base:stressMax`
- `sourceId`: `level:base`
- `target`: `stressMax`
- `kind`: `base`
- `label`: `基础压力上限`
- `value`: `6`
- `sourceType`: `level`
- `priority`: `100`

该 entry 与 `level:base:proficiency` 同属 level source。只要当前等级是有效角色等级，系统就提供基础压力上限。自动计算开启时，最终压力上限等于：

```text
6 + 压力升级 + 装备修正 + Other Adjustments
```

## 迁移合并规则

导入旧角色卡时，如果旧数据包含显式 `stressMax`：

- `stressMax = 6`：使用系统 base `level:base:stressMax`，不再创建 `user:stressMax:estimated-base`。
- `stressMax > 6` 或 `< 6`：使用系统 base 6，并用 `unknownMigrationDifference` 保存差额，确保迁移后 Final Value 不变。
- 已有 `user:stressMax:estimated-base` 且值为 6 的当前数据，应在归一化时被移除，让 active base 回落到系统 base。
- 非 6 的 estimated stress base 暂不自动删除，避免误伤已经表达真实差异的旧数据。

## UI 和数据流

生命与压力区仍通过现有 `ModifierFieldAnchor target="stressMax"` 展示来源。用户编辑压力上限时继续走 `commitModifierTargetValue("stressMax", value)`，由自动计算边界决定是写 Final Value、创建手动基础值，还是创建 Other Adjustment。

不新增 UI 控件，不改变压力格点击行为。

## 测试范围

- `collectSystemModifierEntries` 产生 `stressMax` 基础 6，并与压力升级项合计。
- `applyAutoCalculationForTargets(defaultSheetData)` 将压力上限同步为 6。
- 迁移 `stressMax: 6` 不创建 estimated base。
- 迁移 `stressMax: 8` 保留 Final Value 8，并记录相对系统 base 的差额 2。
- 当前数据中 estimated stress base 6 被归一化移除，active base 使用 `level:base:stressMax`。

## 非目标

- 不为生命上限新增固定系统 base。
- 不改变职业生命上限 base 的来源规则。
- 不改变熟练度等级阈值规则。
