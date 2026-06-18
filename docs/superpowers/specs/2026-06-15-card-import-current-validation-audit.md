# 卡牌导入当前校验行为审计

日期：2026-06-15

本文记录当前代码中卡牌导入、编辑器导入、编辑器校验、`.dhcb` 处理的实际行为。目标是先确认现状，不在本文里设计新实现。

## 入口

当前有四条主要路径：

1. Formal Import / JSON：`components/content-pack-manager/import-content-pack.ts` 解析 `.json`，如果不是装备包且包含任一非空卡牌数组，就调用 `importCustomCards()`。
2. Formal Import / DHCB：`.dhcb` 或 `.zip` 总是按卡牌包处理，调用 `importDhcbCardPackage()`。
3. Editor Draft Import / JSON：`app/card-editor/utils/import-export.ts` 解析 JSON，做编辑器恢复。
4. Editor Draft Import / DHCB：`app/card-editor/utils/zip-import.ts` 读取 root `cards.json`，导入编辑器图片，做编辑器恢复。

## Formal Import 当前行为

### 文件识别

- `.json` 文件先看 `format === "daggerheart.equipment-pack.v1"`，命中则走装备导入。
- 否则只要存在 `profession`、`ancestry`、`community`、`subclass`、`domain`、`variant` 中任一非空数组，就认为是 Card Pack。
- 空卡包 JSON 在全局导入面板会被识别为 unknown，而不是进入卡牌导入后报 `No valid card data found in import`。
- `.dhcb` / `.zip` 目前不看 manifest kind，也不支持装备路由；扩展名命中后总是当作卡牌包。

### Store Import 顺序

`store.importCards()` 的顺序是：

1. 初始化卡牌系统。
2. 调用 `preprocessVariantFormat()`。
3. `_validateImportData()`。
4. 检查和现有卡牌 ID 冲突。
5. `_convertImportData()` 转成 `StandardCard`。
6. 写入 batch 和 cards。
7. 同步 localStorage。
8. 重建聚合字段、类型索引、subclass/level/batch keyword 索引。

### Variant 预处理

`preprocessVariantFormat()` 会把 `customFieldDefinitions.variants` 转为 `customFieldDefinitions.variantTypes`，并删除 `variants`。

重要细节：

- 它会原地修改 `customFieldDefinitions` 对象。
- 如果同时存在 `variants` 和 `variantTypes`，会优先 `variants` 并删除原 `variantTypes`。
- `variantTypes.levelRange` 会从实际卡牌等级推导，没有等级时默认 `[1, 10]`。

这说明现在已经存在一个早期 adapter/normalization 行为，只是它藏在 store import 内部。

### Validation Context

Formal Import 的详细校验不是只看输入包本身。它会合并：

- builtin-base.json 的 `customFieldDefinitions`
- 当前已启用 batch 的聚合 custom fields / variant types
- 当前输入包的 `customFieldDefinitions`

因此同一个外部卡包，在不同用户本地状态下可能得到不同校验结果。

### Blocking Rules

当前 formal import 会阻断：

- 输入不是 object。
- 没有任何非空卡牌数组。
- 类型校验失败。
- 和现有任意卡牌 ID 冲突。
- 转换阶段抛错。

`.dhcb` 额外阻断：

- 缺少 root `cards.json`。
- 导入卡牌成功后发现孤儿图片。
- 图片写入 IndexedDB 失败。

### Non-Blocking / Missing Rules

当前 formal import 不做这些校验：

- 不校验 unknown top-level fields。
- 不校验 unknown card fields。
- 不校验同一个导入包内部的重复 ID。内部重复 ID 可能在 `Map` 写入时覆盖，但 batch `cardIds` 仍可能记录重复。
- 不校验 ancestry 必须成对。
- 不校验 subclass 必须三张一组。
- 不要求 `format`。
- 不要求 `customFieldDefinitions` 必填；但自定义关键词如果既不在 builtin/current state，也不在输入 definitions，就会失败。

### Fallback 风险

`_validateImportData()` 如果调用详细验证器抛错，会 fallback 到“只检查 ID 是否存在”。这可能让本来应该阻断的错误通过。

## Editor 当前行为

### Editor Draft Import

编辑器 JSON 和 DHCB 导入都会做恢复：

- `ensureAncestryPairs()` 会自动补齐 ancestry 类别 1/2。
- `ensureSubclassTriples()` 会自动补齐 subclass 的 基石/专精/大师。

恢复生成的是可继续编辑的 draft，不代表 formal import 有效。

### Editor Draft Export

编辑器导出不做校验：

- JSON 导出直接写当前 `CardPackageState`，移除 `isModified` 和 `lastSaved`。
- DHCB 导出写 legacy root `cards.json` 和 root `images/*`。
- 导出有图片时，若 card 有本地图片，会写 `hasLocalImage: true` 并移除 `imageUrl`。

### Editor Draft Validation

编辑器校验当前使用 `validationService.validatePackage()`，不是 formal dry-run。

它和 formal import 的差异：

- 只使用当前编辑器 package 的 definitions，不合并 builtin/current installed batch。
- 额外校验 ancestry pair 完整性。
- 不校验 subclass triple 完整性。
- 单卡字段校验只支持 `profession`、`ancestry`、`variant`，其他类型单卡会返回“不支持的卡牌类型”。

## Type Validator 当前规则

所有标准卡验证都依赖 `ValidationContext`。

### Profession

必需：

- `id` string
- `名称` 在 `customFields.professions`
- `简介` string
- `领域1` / `领域2` 在 `customFields.domains`
- `起始生命` number 且 `>= 1`
- `起始闪避` number 且 `>= 0`
- `起始物品` string
- `希望特性` string
- `职业特性` string

### Ancestry

必需：

- `id` string
- `名称` string
- `种族` 在 `customFields.ancestries`
- `简介` string
- `效果` string
- `类别` number

### Community

必需：

- `id` string
- `名称` 在 `customFields.communities`
- `特性` string
- `简介` string
- `描述` string

### Subclass

必需：

- `id` string
- `名称` string
- `描述` string
- `主职` 在 `customFields.professions`
- `子职业` string
- `等级` 在 `基石`、`专精`、`大师`、`未知`
- `施法` 在 `力量`、`敏捷`、`灵巧`、`风度`、`本能`、`知识`、`不可施法`

注意：当前校验不会要求同一个 subclass 有三张卡。

### Domain

必需：

- `id` string
- `名称` string
- `领域` 在 `customFields.domains`
- `描述` string
- `等级` number 且 1-10
- `属性` string
- `回想` number 且 `>= 0`

### Variant

必需：

- `id` string
- `名称` string
- `类型` string，且必须能在 `variantTypes` 或 `customFields.variants` 中找到。
- `效果` string

可选：

- `子类别` 如果提供，必须是 string；如果 `variantTypes[类型].subclasses` 存在，则必须在列表中。
- `等级` 如果提供，必须是非负整数；如果有 `levelRange`，还必须在范围内。
- `简略信息` 如果提供，必须是 object 且不能是 array。

## 关键偏差

1. Formal Import 和 Editor Draft Validation 不统一。
   - Formal Import 不做 ancestry pair 校验。
   - Editor Draft Validation 做 ancestry pair 校验。
   - 两者都不做 subclass triple 校验。
   - 设计结论：formal import 应继续不检查 ancestry / subclass 张数，以免破坏已发布隐式约定；editor validation 可以通过 editor-local authoring diagnostics 检查这些正规化规则。

2. definitions 的真实字段名和 TypeScript 类型不一致。
   - `ImportData` 类型写的是 `profession` / `ancestry` / `community` / `domain`。
   - builtin、编辑器默认数据、validator 实际读取的是 `professions` / `ancestries` / `communities` / `domains`。
   - 如果外部包按 TypeScript 类型写 singular definitions，当前校验大概率不会按预期使用它们。

3. 当前校验依赖本地安装状态。
   - Formal Import 会合并当前已启用 batch 的 definitions。
   - 这会让卡包有效性不完全由文件自身决定。
   - 第一阶段只做 dry-run validation，不进入 conflict check；新的 dry-run 不应读取 current imported card storage 作为校验输入。

4. Variant adapter 已经存在，但位置不对。
   - `preprocessVariantFormat()` 实际是 adapter/normalization。
   - 现在它在 store import 内部执行，并且会原地修改输入。

5. `.dhcb` manifest 行为不一致。
   - Formal DHCB Import 不读取 manifest。
   - Editor DHCB Import 会解析 manifest；manifest JSON 损坏会导致编辑器导入失败。

6. Formal DHCB 的图片规则比 Editor DHCB 严格。
   - Formal Import 拒绝孤儿图片并回滚。
   - Editor Import 忽略孤儿图片，只导入能保存的图片。
   - 这和“编辑器宽松、正式导入严格”的方向一致。

7. 旧的 StandardCard `cards` 数组路径看起来是遗留代码。
   - Editor zip import 发现 `cards` 数组只打印日志，不转换。
   - `card/stores/image-service/batch-import.ts` 读写 `cards` 数组，但当前搜索没有发现调用点。

## 对第一阶段设计的影响

第一阶段进入开发前，至少需要用 characterization tests 固定这些现有行为和兼容约定：

- legacy JSON 无 `format` 可导入。
- legacy DHCB root `cards.json` 可导入。
- Editor Draft Import 会补 ancestry pair 和 subclass triple。
- Editor Draft Export 不校验。
- Formal Import 不自动补卡。
- Formal Import 当前不校验 ancestry pair / subclass triple；这个行为应保留。
- Formal Import 当前合并 builtin/current/input definitions。
- `customFieldDefinitions.variants` 会被转换为 `variantTypes`。
- DHCB orphan image 会导致 formal import 回滚。
- unknown / empty JSON 在全局导入面板的识别行为。

同时，第一阶段重构应优先把以下行为显式化：

- Adapter / dry-run validation model 构建从 store import 中移出；第一阶段不做 storage/runtime normalization。
- Dry-run validation context 来源固定为 source payload / adapter output / schema-derived effective definitions，不读取 current imported card storage。
- Editor Draft Validation 改为 formal dry-run diagnostics + editor-local authoring diagnostics，而不是第二套 installability validator。
- definitions 字段名统一成明确的 legacy adapter 输入和 internal schema 输出。
