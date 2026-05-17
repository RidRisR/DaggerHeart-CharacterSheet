# Upgrade States Provider Migration Design

日期：2026-05-18

状态：已定稿

## 目的

本文记录升级项状态与 upgrade provider 迁移的设计决策。

本文只覆盖原议题二：把升级勾选状态和 provider 参数收敛到单一结构，并定义 v1 旧存档如何迁移到该结构。

本文不是实现计划。

## 背景

当前实现使用两个顶层字段表达升级相关状态：

```ts
checkedUpgrades?: CheckedUpgrades
automationSelections?: AutomationSelections
```

其中：

- `checkedUpgrades` 保存 UI 勾选状态。
- `automationSelections` 保存 provider 参数，并由 registry 生成 upgrade modifier entries。

这个结构会把同一个升级格子的 UI 状态和 provider source fact 分开保存。正常 UI 路径会同时写两边，但数据模型本身允许两者不一致。

v2 尚未发布，因此不需要兼容当前开发分支中间态的 `automationSelections`。最终 v2 运行时应只保留一个升级状态结构。

## 核心决策

新增统一结构：

```ts
interface UpgradeState {
  checked: boolean
  params?: UpgradeStateParams
}

type UpgradeStates = Record<string, UpgradeState>
```

`upgradeStates` 以完整 `checkKey` 为 key。

示例：

```ts
upgradeStates: {
  "tier1-1-0": {
    checked: true,
    params: { target: "hpMax" },
  },
  "tier1-1-1": {
    checked: true,
    params: { target: "hpMax" },
  },
  "tier1-5-0": {
    checked: true,
    params: { target: "evasion" },
  },
  "tier1-0-2": {
    checked: true,
    params: { attributes: ["agility", "strength"] },
  },
  "tier2-1": {
    checked: true,
    params: { target: "proficiency" },
  },
}
```

v2 运行时移除：

```ts
checkedUpgrades
automationSelections
```

## Params 类型

`params` 使用类型化 union，不使用开放的 `Record<string, unknown>`。

```ts
type UpgradeStateParams =
  | { target: "hpMax" | "stressMax" | "evasion" | "proficiency" }
  | { attributes: AttributeKey[] }
  | { experienceIndexes: number[] }
```

语义：

- `checked: true` 且 `params` 完整有效：UI 显示已勾选，registry 生成对应 upgrade provider entry。
- `checked: true` 但 `params` 缺失或无效：UI 显示已勾选，但 registry 不生成 provider entry。这个状态表示迁移历史丢失了具体选择参数。
- `checked: false`：UI 未勾选，registry 不生成 provider entry。

## Upgrade Option Metadata

升级选项数据应新增机器可读 automation metadata。

迁移和运行时逻辑使用 metadata 判断 provider 参数，不再依赖中文 label includes。

第一阶段 metadata 覆盖四类：

```ts
type UpgradeAutomationMetadata =
  | { kind: "fixedTarget"; target: "hpMax" | "stressMax" | "evasion" | "proficiency" }
  | { kind: "attributeSelection"; count: 2 }
  | { kind: "experienceSelection"; count: 2 }
  | { kind: "none" }
```

说明：

- `fixedTarget`：重新勾选或迁移时可自动生成 `{ target }` params。
- `attributeSelection`：需要用户选择属性，生成 `{ attributes }` params。
- `experienceSelection`：需要用户选择经历，生成 `{ experienceIndexes }` params。
- `none`：非 modifier 升级，例如领域卡、子职业、兼职等。

领域卡、子职业、兼职等非 modifier 升级使用 `kind: "none"`，不把 modal 行为塞进 modifier automation metadata。

## 多格与 DoubleBox

固定 target 多格升级按 checkKey 粒度表达。

每个 `checked: true` 且 params 有效的 checkKey 生成一条 `+1` provider entry。

示例：

```ts
"tier1-1-0": { checked: true, params: { target: "hpMax" } }
"tier1-1-1": { checked: true, params: { target: "hpMax" } }
```

生成两条独立的 `hpMax +1` entries。

`doubleBox` 升级仍按一个 checkKey、一条 provider entry 处理。两个格子只是 UI 成本，不代表两个规则效果。

示例：

```ts
"tier2-1": { checked: true, params: { target: "proficiency" } }
```

生成一条 `proficiency +1` entry。

## Registry 生成规则

registry 从 `upgradeStates` 读取 provider facts。

只处理：

```text
checked === true
params 完整有效
```

entry id 继续使用：

```text
upgrade:${checkKey}:${target}
```

示例：

```text
upgrade:tier1-1-0:hpMax
upgrade:tier1-5-0:evasion
upgrade:tier1-0-2:agility.value
```

这个规则保证：

- 多格同 target 升级不会冲突。
- 参数化升级同一个 checkKey 下多个 target 不会冲突。

## 取消与重新勾选

取消/反选升级时清空该 checkKey 的 params，只保留：

```ts
{ checked: false }
```

取消表示撤销这次配置。用户重新勾选参数化升级时，应重新选择属性或经历。

固定 target 升级重新勾选时，不依赖旧 params；系统按升级选项 metadata 自动写入对应 params。

示例：

```ts
{ checked: true, params: { target: "hpMax" } }
```

## V1 -> V2 迁移

v1 只有 `checkedUpgrades`，没有 provider selection。

迁移规则：

1. 读取 legacy `checkedUpgrades`。
2. 对所有 `checked=true` 的 checkKey 创建：

   ```ts
   upgradeStates[checkKey] = { checked: true }
   ```

3. 如果该 checkKey 对应升级选项有明确 fixed target metadata，补充 params：

   ```ts
   upgradeStates[checkKey] = {
     checked: true,
     params: { target },
   }
   ```

4. 参数化升级不从历史勾选状态自动推断 params，例如：

   - 两项属性 +1。
   - 两项经历 +1。

5. 非 modifier 升级只保留 checked 状态。
6. 迁移完成后删除 legacy 字段：

   ```ts
   checkedUpgrades
   automationSelections
   ```

## Final Value Preservation

迁移必须先生成 `upgradeStates` 和对应 provider entries，再计算 `未知迁移差额` 来保留 legacy final value。

顺序必须是：

```text
legacy checkedUpgrades
-> upgradeStates
-> registry sees upgrade provider entries
-> preserve legacy final through unknown migration difference
```

原因：固定 target 升级不应同时表达为 provider entry 和迁移差额。

对于参数化升级：

- 迁移只保留 `checked: true`。
- 不生成 provider entry。
- legacy final 如果超出 reference，由 `未知迁移差额` 解释。

## 缺少 Params 的历史升级

如果迁移后存在：

```ts
upgradeStates[checkKey] = { checked: true }
```

且该选项需要参数，例如属性或经历选择：

- UI 显示已勾选。
- registry 不生成 provider entry。
- 取消时只设置 `checked: false`。
- 提示用户历史选择参数缺失。
- 不做 provider 回滚。
- 不直接修改 final value。

原因：系统不知道应回滚哪些具体属性或经历。

## 非目标

本文不处理：

- “其他”模型的实现细节，见 `2026-05-18-modifier-other-adjustments-design.md`。
- 装备/护甲旧存档是否自动接入 provider。
- 阈值双 target 的联合 UI。
- 实现计划和测试矩阵。
