# Card Import Business Equivalence Test Scope

## 背景

真实卡包回归测试已经能用旧生产导入流程生成 expected snapshot，并用当前重构后的 commit path 生成 actual snapshot。第一轮对比显示：19 个真实卡包都能成功导入，卡牌数量、卡牌 id 集合、图片数量、图片 hash 都一致，但 raw legacy storage snapshot 不是字节级一致。

这些差异暴露出一个架构风险：业务代码不应长期依赖 legacy storage 的具体形状，否则 metadata 补全规则变化也可能变成未来业务回归。

但在当前阶段，直接重构业务读取路径会引入新的回归风险。因此本阶段只补测试边界和差异报告，不主动重写 runtime / UI / store 的业务读取模型。

## 当前决策

1. 不把 raw localStorage byte-level 相等作为真实卡包回归的默认通过条件。
2. 回归测试的核心目标改为证明“导入后的业务事实等价”。
3. raw storage 差异继续记录为报告，用于人工判断和后续架构治理。
4. 现阶段不改 UI/runtime/store 业务消费路径。
5. storage -> runtime read model 的解耦作为后续阶段设计，不并入当前测试框架落地。
6. 旧生产 baseline 不需要每次回归都重新生成；已有 expected snapshot 代表旧流程导入结果，日常测试只比较 expected 与 actual 在后续业务流程中的输出是否等价。

## Baseline 使用方式

当前 `.local-fixtures/card-packs/expected/` 是旧生产导入流程的结果。建立完成后，它不应在每次测试时重新从旧分支生成。

旧 baseline generator 只在以下场景使用：

- 新增真实卡包 fixture，需要为这些输入建立旧流程 expected；
- 怀疑某个 expected snapshot 生成错误，需要重新核对；
- 决定更换历史 baseline commit 或发布版本。

日常回归流程应是：

```text
inputs
  -> current commit path
  -> actual storage snapshot

expected storage snapshot
  -> business output projection

actual storage snapshot
  -> business output projection

assert businessOutput(expected) == businessOutput(actual)
```

也就是说，测试目标不是：

```text
expected raw storage JSON == actual raw storage JSON
```

而是：

```text
businessOutput(expected storage) == businessOutput(actual storage)
```

raw storage diff 仍然保留为报告，用于观察 storage shape 是否继续漂移，但默认不作为失败条件。

## 已观察到的新旧差异

旧 expected 与当前 actual 的第一轮差异分类如下：

| 差异 | 范围 | 当前业务影响判断 |
| --- | --- | --- |
| `index.batches[packId].version` / `author` 多写 | 19/19 | 当前 UI 不展示、不搜索；repository snapshot 不消费。 |
| `batch.metadata.description` 多写 | 19/19 | 当前管理 UI 不展示、不搜索；runtime 不依赖。 |
| card `batchName` 多写 | 19/19 | 当前值等于 batch name；旧流程缺失时也会 fallback 到 batch id 查名。 |
| `index.size` 不同 | 19/19 | 由 storedData JSON 长度派生；当前 quota 不依赖该字段。 |
| `customFieldDefinitions.variants` 多写 | 19/19 | 会进入聚合字段，但当前主选择器变体类型来自 `aggregatedVariantTypes` key 和实际 card index。 |
| `variantTypes.description/subclasses/levelRange` 不同 | 8/19 | 当前主选择器主要依赖 type key 和实际 card；未来展示说明或恢复 `getVariantLevelOptions()` 时可能有影响。 |
| `batch.metadata.totalImageSize = 0` | 5/19 | 图片内容和 hash 一致；当前显示、删除、rollback、迁移不依赖；metadata 语义不真实。 |
| variant card `cardSelectDisplay.item4: ""` 多写 | 6 个包 / 72 张卡 | UI truthy 判断，不显示空 badge；导出/存储会有无意义空 key。 |

## 测试分层

当前阶段只落地前两层。

```text
Layer 1: Storage Commit Equivalence
Layer 2: Runtime Read Model Equivalence
Layer 3: Minimal UI / E2E Smoke
```

Layer 3 后续再做，不进入当前实现范围。

## Layer 1: Storage Commit Equivalence

### 目标

验证真实卡包经过当前 commit path 后，写入 storage 的核心事实与旧生产基线等价。

### 建议位置

```text
tests/local-fixtures/card-import-storage-equivalence.test.ts
tests/local-fixtures/card-import-equivalence.ts
```

也可以先在现有文件中改造：

```text
tests/local-fixtures/card-import-local-fixtures.test.ts
```

长期建议拆分，避免一个测试文件同时负责 raw snapshot 生成、业务等价比较和 runtime 等价比较。

### 必须比较

- pack 存在；
- card id 集合一致；
- card 顺序一致，或明确只要求集合一致；
- card count 一致；
- card type 分布一致；
- 每张卡的业务关键字段一致：
  - `id`
  - `name`
  - `type`
  - `description`
  - `class`
  - `level`
  - `variantSpecial`
  - `hasLocalImage`
  - `batchId`
  - `source`
- image ownership 一致；
- image count 一致；
- image MIME type / byte length / SHA-256 一致；
- disabled 状态一致。

### 默认不作为失败条件

- `index.size`；
- `index.version` / `index.author`；
- `batch.metadata.description`；
- `batch.metadata.totalImageSize`；
- card `batchName`；
- 空字符串字段噪音，例如 `cardSelectDisplay.item4: ""`；
- `customFieldDefinitions.variants`；
- `variantTypes.description`；
- `variantTypes.levelRange`；
- `variantTypes.subclasses`，前提是实际 card `variantSpecial.subCategory` 与 runtime index 等价。

### 需要报告但不失败

这些字段应进入 diff report：

- raw index entry key diff；
- raw metadata key diff；
- raw card key diff；
- `variantTypes` key 集合 diff；
- `variantTypes` metadata diff；
- `customFieldDefinitions` diff；
- `totalImageSize` diff；
- card display-only field diff。

报告的作用是让我们知道 storage shape 是否继续漂移，而不是阻止业务等价测试通过。

## Layer 2: Runtime Read Model Equivalence

### 目标

验证当前 storage 写入结果被 runtime/store 加载后，业务实际消费的读模型等价。

这层是最重要的切面。它不覆盖所有 UI，但覆盖 UI 依赖的数据来源。

### 建议位置

```text
tests/local-fixtures/card-import-runtime-equivalence.test.ts
tests/local-fixtures/card-import-equivalence.ts
```

### 输入

可以使用 Layer 1 的 actual storage，也可以在测试内重新导入真实 fixture 后直接加载 runtime。

推荐第一版做法：

1. 对每个 fixture 用当前 commit path 写入 in-memory storage 和 image backend；
2. 用当前 runtime refresh / store load 边界加载；
3. 生成 runtime equivalence snapshot；
4. 与旧 baseline 经过同样规则生成的 runtime snapshot 比较。

如果旧 baseline 的 runtime snapshot 暂时不容易自动生成，可以先比较当前 runtime 与 expected storage 派生出的业务事实。

### 必须比较

- runtime cards id 集合；
- `cardsByType` 各类型数量；
- `aggregatedVariantTypes` 的 key 集合；
- variant card 的 `variantSpecial.realType` / `subCategory` / `level`；
- `subclassCardIndex`；
- `levelCardIndex`；
- batch keyword index；
- batch level index；
- 每个带图 card 通过 `cardId + batchId` 可读到图片；
- 删除 pack 后，runtime card 和 pack-scoped images 不再可见。

### 默认不比较

- `variantTypes.description`；
- `variantTypes.levelRange`；
- `variantTypes.subclasses`，除非当前 runtime 实际消费它们；
- 管理 UI 不展示的 metadata；
- raw storage byte length。

## Layer 3: Minimal UI / E2E Smoke

后续再做，当前不进入实现范围。

建议未来只覆盖少数代表流程：

- 导入一个真实 JSON 包；
- 导入一个真实 DHCB 包；
- 卡包管理列表出现；
- 选卡弹窗可见新增卡牌类型；
- 带图卡可以显示图片；
- 删除 pack 后卡牌和图片不可见。

真实包批量回归不应放在 UI/E2E 层。

## 当前风险判断

当前发现的差异都不构成“必须修”的业务回归证据。更准确的判断是：

- 当前主业务路径大概率不受影响；
- raw storage 严格兼容已经不成立；
- `variantTypes` 和 `totalImageSize` 是最值得继续观察的 metadata；
- 如果未来 UI 或 editor 开始消费这些 metadata，需要把它们升级为业务契约。

## 后续建议

1. 先把 local fixture test 从 raw snapshot string compare 改成 Layer 1 business equivalence compare。
2. 保留 raw diff report，报告但不失败。
3. 补 Layer 2 runtime equivalence test。
4. 暂不改 UI/runtime/store 业务读取路径。
5. 后续单独设计 storage -> runtime read model 边界，避免业务长期依赖 legacy storage shape。
