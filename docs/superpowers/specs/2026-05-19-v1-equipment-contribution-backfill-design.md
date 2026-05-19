# V1 Equipment Contribution Backfill Design

日期：2026-05-19

状态：已确认

## 目的

从 v1 老存档迁移到 v2 装备结构时，旧武器和护甲槽位没有 `modifierContributions`。如果这些装备实际上来自当前内置模板，迁移应尽量补齐模板提供的长期无条件装备来源，让角色卡的 Known Sources 更完整。

该补齐只服务 v1 -> v2 历史迁移。已经是 v2 的存档不做模板匹配，也不自动补齐缺失的装备 contributions。

## 范围

本设计包含：

- v1 -> v2 迁移期间，为刚迁移出的主武器、副武器、两个备用武器和当前护甲尝试补齐 `modifierContributions`。
- 使用装备名称和特性文本匹配当前内置模板。
- 只在槽位没有合法 contributions 时补齐。
- 补齐后仍保持旧存档 Final Value 不跳变。

本设计不包含：

- 对 current-schema v2 数据做 repair。
- 根据模板更新覆盖已有合法装备 contributions。
- 根据武器伤害、trait、护甲值或阈值匹配模板。
- 为匹配失败的装备生成 Unknown Migration Difference 之外的新解释。
- UI 提示、人工确认或批量修复入口。

## 匹配规则

迁移只在 `migrateV1ToV2` 中执行匹配。`normalizeCurrentSheetData` 不执行匹配。

每个装备槽位独立处理：

- 主武器只匹配 primary weapon 模板。
- 副武器只匹配 secondary weapon 模板。
- 备用武器可以匹配所有 weapon 模板，因为旧备用槽没有稳定的 primary/secondary 类型语义。
- 护甲只匹配 armor 模板。

候选模板必须同时满足：

```text
slot.name === template slot name
slot.feature === template-derived feature text
```

模板特性文本使用现有 `template-to-slot` 语义：

```text
featureName + ": " + description
```

如果没有 `featureName`，则只使用 `description`。如果没有 `description`，则只使用 `featureName`。两者都没有时为空字符串。

匹配结果必须唯一。没有候选或多个候选时，不补齐。

## 补齐规则

只有槽位的 `modifierContributions` 在 sanitize 后为空时，才允许补齐。

匹配成功后，复制模板的 `modifierContributions`，并为每个 contribution 创建新的运行时 id。运行时 id 继续使用现有 `createEquipmentContributionId` 机制，不能直接保存模板 contribution id。

补齐只写入 `modifierContributions`，不改写任何用户可见装备字段：

- 不改 `name`。
- 不改 `trait`。
- 不改 `damage`。
- 不改 `feature`。
- 不改护甲 `baseArmorMax`。
- 不改护甲 `baseThresholds`。

如果模板没有 `modifierContributions` 或数组为空，匹配成功也等价于不补齐。

## Final Value 保留

补齐必须发生在 `migrateV1ToV2` 的 `preserveLegacyModifierFinals` 之前。

原因是补齐后的装备 contributions 会成为 Known Sources。随后 legacy final preservation 会基于更新后的 Reference Total 计算是否需要 `Unknown Migration Difference`，从而保证旧存档导入后的 Final Value 不因为新增 Known Sources 而跳变。

示例：

```text
旧存档 evasion Final Value = 12
职业 base = 10
迁移补齐链甲：重型 -1
Reference Total = 9
Unknown Migration Difference = +3
迁移后 Final Value 仍为 12
```

如果没有旧显式 Final Value，补齐的 Known Sources 正常参与自动计算和后续同步边界。

## 数据边界

v2 数据保持实例化语义：保存到 `SheetData.equipment` 后，装备实例不再长期依赖模板。模板匹配只是一段一次性迁移逻辑，不应在普通 normalization、store replacement 或自动计算边界中重复运行。

已有合法 contributions 被视为用户或历史数据已经表达过 source intent，不会被模板覆盖。非法 contributions 仍由现有 sanitize 逻辑移除。

## 测试范围

- v1 主武器按名称和特性文本匹配模板后补齐 contributions。
- v1 副武器按名称和特性文本匹配模板后补齐 contributions。
- v1 护甲按名称和特性文本匹配模板后补齐 contributions。
- v1 备用武器可按名称和特性文本匹配任意 weapon 模板后补齐 contributions。
- 已有合法 contributions 的槽位不被覆盖。
- v2 current-schema 数据不会自动补齐空 contributions。
- 名称匹配但特性文本不匹配时不补齐。
- 补齐 contribution 后，旧显式 Final Value 通过 migration preservation 保持不变。

## 非目标

- 不追踪模板 id 到装备实例。
- 不为自定义装备建立相似度匹配。
- 不修复用户已经保存为 v2 的缺失 contributions 数据。
- 不改变装备加值编辑器或 target modifier 面板行为。
