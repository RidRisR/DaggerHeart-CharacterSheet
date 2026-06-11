# Legacy-Compatible Mixed DHCB Design

日期：2026-06-07
状态：已被取代，历史探索记录

> 2026-06-07 更新：本文提出的 root payload mixed DHCB 不再作为当前分支实施方案。
> 当前分支改为只做装备编辑器和 equipment JSON 导出，不改造 `.dhcb` / `.zip` 容器，也不引入 mixed DHCB。
> 当前实施入口见：
>
> - `docs/superpowers/specs/2026-06-07-equipment-editor-json-export-scope-design.md`
>
> 本文只保留为设计探索记录，不能作为实现依据。

## 历史目的

当前分支只做一个可以快速上线的兼容层，让 `.dhcb` / `.zip` 可以同时携带卡牌包和装备包，同时尽量不触碰已经发布很久的卡牌包生态。

核心目标：

1. 保持现有 card-only DHCB / ZIP 导入导出行为不变。
2. 在 zip root 增加可选 `equipment.json`，用于携带装备包。
3. 复用现有 card importer 和 equipment import workflow。
4. 先设计并实现 `/card-editor` 的装备编辑能力。

## 非目标

当前分支不做：

- 不引入 `daggerheart.content-bundle.v1` manifest。
- 不引入 `entries[]`、`assetsPath`、`imagePath`。
- 不重构现有卡牌导入 pipeline。
- 不重写 card import diagnostics。
- 不发布新的 card pack public schema。
- 不解决卡图文件名必须等于 card id 的 legacy 限制。
- 不支持一个 zip 内多个 card pack 或多个 equipment pack。
- 不做完整 index-last atomic bundle commit。

未来 manifest 容器格式探索保留在：

- `docs/superpowers/specs/2026-06-06-content-bundle-editor-and-thin-dhcb-design.md`

## 文件结构

当前分支采用 root payload 约定：

```text
cards.json        optional, legacy card pack payload
equipment.json    optional, equipment pack v1 payload
manifest.json     optional, legacy card DHCB marker only
images/           optional, legacy card images matched by card id
```

规则：

- 至少需要 `cards.json` 或 `equipment.json` 之一。
- `cards.json` 继续使用现有 legacy card pack shape。
- `equipment.json` 使用 `daggerheart.equipment-pack.v1` public schema。
- `manifest.json` 不作为新 content bundle manifest；当前只保留旧 card DHCB 兼容意义。
- `images/*` 继续使用 legacy card image 规则：文件名去扩展名后匹配 card id。

## 导入分流

`.dhcb` / `.zip` import wrapper 只做最小分流：

```text
Read ZIP
  -> Detect root payloads
  -> If cards.json exists:
       delegate to existing card DHCB / ZIP importer
  -> If equipment.json exists:
       read text and delegate to existing equipment import workflow
  -> Return combined result
```

当前阶段不改现有 card importer 内部行为。card-only 包必须继续走原来的路径。

导入行为：

- 只有 `cards.json`：表现应与现有 card DHCB / ZIP 导入一致。
- 只有 `equipment.json`：按 equipment pack 导入。
- 同时有 `cards.json` 和 `equipment.json`：分别交给现有两个 workflow。
- zip 里没有 `cards.json` 和 `equipment.json`：返回 unsupported file diagnostic 或现有错误包装。

## 导出分流

编辑器导出规则：

- 只有 card draft：继续导出 legacy card JSON / legacy-compatible DHCB。
- 只有 equipment draft：导出 `daggerheart.equipment-pack.v1` JSON。
- 同时有 card draft 和 equipment draft：导出 root payload mixed DHCB：

```text
cards.json
equipment.json
manifest.json     optional legacy card marker, if existing export helper writes it
images/
```

导出时不写新 manifest，不写 bundle metadata。

## 原子性边界

当前分支不实现完整 index-last atomic bundle commit，但 mixed import 不能在明显无效时半导入。

最小策略：

- 对 `equipment.json` 先执行 dry run。
- 对 `cards.json` 保持现有 card importer 行为，不在当前分支重写 preflight。
- mixed import 如果 equipment dry run 失败，应阻止 equipment commit，并向用户报告失败。
- 是否阻止 card commit 取决于现有调用点是否能低成本做到；如果需要重构 card importer，则推迟到未来 card import workflow modernization。

这意味着当前分支的“原子性”是 best-effort compatibility guard，不承诺完整事务。

## Card Editor UI 方向

当前 `/card-editor` 增加装备编辑能力时，采用“工具栏右侧内容类型开关”的布局。

页面结构：

- 顶部标题可以逐步从“卡包编辑器”调整为“内容包编辑器”，但不要求一次性完成所有命名迁移。
- 顶部主操作条保留现有位置。
- 主操作条左侧放内容包级操作：`新建`、`导入`、`导出`、`验证`。
- 主操作条右侧固定放内容类型开关：`卡牌` / `装备`。
- `关键字列表` 是 card-only 辅助工具，只在 `卡牌` 模式显示。

模式切换行为：

- `卡牌` 模式下，保留现有二级 tab：`基础信息`、`职业`、`种族`、`社群`、`子职业`、`领域`、`变体`、`预览`。
- `装备` 模式下，同一位置显示装备二级 tab：`基础信息`、`武器`、`护甲`、`预览`。
- 切换模式只切换二级 tab 和主编辑面板，不改变顶部主操作条。
- `导出` 不在按钮文案里暴露复杂格式；点击后根据当前 draft 内容决定 card-only、equipment-only 或 mixed 输出。
- `验证` 是内容包级操作，结果按 `卡牌` / `装备` 分组展示。

基础信息同步规则：

- `卡牌 > 基础信息` 和 `装备 > 基础信息` 在 UI 上都存在。
- 两个基础信息 tab 强制同步，背后只有一份 shared metadata draft。
- 在任一侧修改 `name`、`version`、`author`、`description` 等基础信息，另一侧立即看到相同结果。
- 是否导出 `cards.json` 取决于是否存在真实卡牌内容。
- 是否导出 `equipment.json` 取决于是否存在真实装备内容，例如至少创建过 weapon 或 armor。
- 只编辑共享基础信息，不会单独导致生成 `cards.json` 或 `equipment.json`。
- mixed DHCB 导出时，同一份 shared metadata 写入实际生成的每个 payload。

Payload 存在判定：

- `cards.json` exists if any legacy card array has at least one entry: `profession`、`ancestry`、`community`、`subclass`、`domain`、`variant`。
- `equipment.json` exists if `weapons.length > 0 || armors.length > 0`。
- 空数组、只填 metadata、只切换到某个模式，都不算真实内容。
- 导入已有 payload 后，即使用户没有进入对应模式，只要对应数组非空，导出时仍应保留该 payload。

设计理由：

- 装备不是一种卡牌类型，不应直接塞进现有 card-specific tab。
- 单独一行模式条会更清楚，但会增加页面高度；放在工具栏右侧更贴近当前布局。
- 大多数主操作对卡牌和装备都有效，只有 `关键字列表` 需要按模式显示。
- 这是一种局部扩展，不要求重构现有卡牌表单。

## Equipment Editor UI 方向

装备编辑页应尽量复用当前卡牌条目编辑页的骨架，而不是另起一套管理界面。

`武器` / `护甲` tab 的页面结构：

- 顶部显示当前类型标题和计数，例如 `武器编辑 当前: 1 / 8 件`。
- 顶部保留当前卡牌页相似的条目操作：`上一件`、`下一件`、`新增`、`复制`、`删除`。
- 顶部保留一个快速跳转 select，用于和现有卡牌页交互习惯保持一致。
- 主区域左侧是当前装备条目的结构化编辑表单。
- 主区域右侧不做默认预览，改为 `快速选择` 列表。

右侧 `快速选择`：

- 用紧凑卡片列出当前类型的所有条目。
- 每个条目卡片展示足够识别的信息，例如武器名称、类型、范围、伤害、主要特性；护甲则展示名称、基础阈值、基础护甲值、特性摘要。
- 点击条目卡片切换当前编辑对象。
- 可提供搜索、类型筛选或分组筛选，但这些是辅助功能，不改变主编辑流程。
- 当前选中的条目需要有明确高亮。

设计取舍：

- 不把右侧做成角色卡装备槽预览。角色卡装备槽更适合“已选择后的运行时展示”，在编辑器里信息密度低，且会压缩实际编辑空间。
- 不把装备编辑页改成完整左右列表管理器。那会和现有卡牌页差距太大，增加迁移成本。
- 右侧快速选择比单纯 select 更适合作者在一组装备里扫视和切换，但仍保留顶部 select 以兼容当前使用习惯。
- `查看所有武器` / `查看所有护甲` 可以作为完整列表弹窗保留；高频切换由右侧快速选择承担。
- 移动端或窄屏下，右侧快速选择可以折叠，或移动到表单上方。

当前阶段不要求装备页有实时视觉预览。未来如果需要预览，应优先作为按需查看能力，而不是占用默认右侧区域。

## Equipment Editor 字段范围

第一版装备编辑器应覆盖现有 `daggerheart.equipment-pack.v1` schema 的常用作者字段，并尽量复用当前一次性自定义装备草稿表单的字段语义。

设计原则：

- 以 `components/modals/custom-equipment-draft-form.tsx` 里的 `CustomWeaponDraftState` / `CustomArmorDraftState` 为 UI 字段基线。
- 在一次性草稿字段之外，只额外补上持久装备包必须拥有的 `id`。
- 不引入 schema 外的新字段。
- 不要求第一版支持高级批量编辑、导入修复、或复杂规则模板。

武器最小编辑字段：

- `id`：模板 ID，用于导入冲突检查、运行时查询和引用。
- `name`：武器名称。
- `tier`：`T1` / `T2` / `T3` / `T4`。
- `weaponType`：`primary` / `secondary`。
- `trait`：`agility`、`strength`、`finesse`、`instinct`、`presence`、`knowledge`。
- `damageType`：`physical` / `magic`。
- `range`：`melee`、`veryClose`、`close`、`far`、`veryFar`。
- `burden`：`oneHanded`、`twoHanded`、`offHand`。
- `damage`：伤害表达式，例如 `d8`、`d10+3`。

武器可选但应显示的字段：

- `featureName`：特性名称。
- `description`：特性或说明文本。
- `modifierContributions`：装备带来的数值修正，例如 `+1 Evasion`、`+1 Armor Slot`。

护甲最小编辑字段：

- `id`：模板 ID。
- `name`：护甲名称。
- `tier`：`T1` / `T2` / `T3` / `T4`。
- `baseArmorMax`：基础护甲槽数量。
- `baseThresholds.minor`：轻微伤害阈值。
- `baseThresholds.major`：严重伤害阈值。

护甲可选但应显示的字段：

- `featureName`：特性名称。
- `description`：特性或说明文本。
- `modifierContributions`：装备带来的数值修正。

`id` 编辑策略：

- 新建条目时，根据当前内容包、装备类型和装备名称自动生成 `id`。
- 用户尚未手动改过 `id` 时，修改名称可以同步刷新自动生成的 `id`。
- 用户手动改过 `id` 后，编辑器不再自动覆盖它。
- `id` 应放在“高级”或“标识”区域，避免干扰主编辑流程，但不能完全隐藏。
- 编辑器应在本地检查同一 draft 内的重复 `id`。
- 最终导出前仍以 equipment import workflow / schema validation 作为权威校验。

`modifierContributions` 范围：

- 第一版可以复用现有一次性自定义装备表单的修正行交互。
- 每行包含目标、标签和值。
- 目标枚举继续来自现有 equipment modifier target 定义。
- 如果作者不需要自动数值修正，可以留空；纯文本特性放在 `featureName` / `description`。

仍待细化：

- 导入、验证、导出结果如何展示 card / equipment 分组。

## 验收标准

- 现有 card-only `.dhcb` / `.zip` 导入导出不回归。
- 现有 card-only JSON 导入导出不回归。
- equipment-only JSON 导入导出可用。
- mixed `.dhcb` 可以包含 `cards.json` 与 `equipment.json`。
- `cards.json` / `equipment.json` 的生成取决于是否存在对应内容，而不是用户是否访问过对应基础信息 tab。
- mixed `.dhcb` 不要求 manifest。
- mixed `.dhcb` 不要求新 diagnostics framework。
- 文档明确当前实现不是未来 manifest content bundle v1。

## 后续方向

未来可以单独做：

- `daggerheart.content-bundle.v1` manifest。
- 多 card pack / 多 equipment pack bundle。
- 自定义 card image filename。
- 完整 bundle-level preflight 和 atomic commit。
- card import workflow modernization。
- Legacy Published Format JSON Schema。
