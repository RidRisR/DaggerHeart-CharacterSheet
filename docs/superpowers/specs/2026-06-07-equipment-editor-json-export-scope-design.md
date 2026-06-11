# Equipment Editor JSON Export Scope Design

日期：2026-06-07
状态：当前分支实施设计草案

## 目的

当前分支只做可快速上线的装备编辑能力和 equipment JSON 导出，不再改造 `.dhcb` / `.zip` 容器。

这个收窄是为了避免在没有重构现有卡牌校验、诊断和提交流程的情况下，过早引入 mixed DHCB。未来如果 `.dhcb` 同时包含卡牌和装备，它必须做到 bundle-level 原子成功或原子失败；当前分支不承担这个改造。

核心目标：

1. 保持现有 card-only JSON / DHCB / ZIP 导入导出行为不变。
2. 在 `/card-editor` 增加装备编辑能力。
3. 装备页面导出 `daggerheart.equipment-pack.v1` JSON。
4. 卡牌包和装备包分开导出；装备包内部的武器和护甲作为一个整体导出。
5. 不新增 mixed DHCB 导入、导出或诊断流程。

## 非目标

当前分支不做：

- 不把装备包包进 `.dhcb`。
- 不在 zip root 增加 `equipment.json` 兼容层。
- 不实现 root payload mixed DHCB。
- 不引入 `daggerheart.content-bundle.v1` manifest。
- 不引入 `entries[]`、`assetsPath`、`imagePath`。
- 不重构现有卡牌导入 pipeline。
- 不重写 card import diagnostics。
- 不做跨 card / equipment payload 的原子导入。
- 不改变 card-only 默认导出格式。
- 不要求一次性导出编辑器里所有内容。

未来 manifest 容器格式探索保留在：

- `docs/superpowers/specs/2026-06-06-content-bundle-editor-and-thin-dhcb-design.md`

被本设计取代的旧 mixed DHCB 草案：

- `docs/superpowers/specs/2026-06-07-legacy-compatible-mixed-dhcb-design.md`

## 导出边界

导出不应默认等于“导出当前编辑器里所有内容”。当前阶段只在卡牌包和装备包之间分离导出；装备包内部的 weapons 和 armor 是同一个 equipment pack payload，不再拆分成单独武器包或护甲包。

当前分支采用分离导出：

- `卡牌` 模式：沿用现有卡包导出行为。
- `装备` 模式：导出完整 equipment pack JSON，包含当前 equipment draft 内所有 weapons 和 armor。
- 不提供 mixed DHCB 导出。
- 不提供“一键导出所有内容”。

导出限制：

- equipment draft 必须至少包含一个 weapon 或 armor。
- 如果 equipment draft 没有任何 weapon 或 armor，导出应被阻止并提示。
- 导出时不执行完整验证，也不调用 import workflow dry run。作者可能需要导出半成品，这一点与现有卡包编辑器导出行为保持一致。
- 导出只做最低限度的结构生成和文件下载；主动质量检查由 `验证` 按钮承担。

文件格式：

- 导出文件是普通 `.json`。
- JSON 顶层使用 `daggerheart.equipment-pack.v1`。
- 不引入新的 `weapon-pack` 或 `armor-pack` format identifier。
- 装备包导出不自动修改 `name`。
- 导出文件名沿用现有卡包 JSON 导出风格：`${equipmentName || '装备包'}.json`。

## 导入范围

当前分支不改 `.dhcb` / `.zip` 导入。

导入行为：

- card JSON / card DHCB / card ZIP 继续走现有卡牌导入流程。
- equipment JSON 继续走现有 equipment import workflow。
- 在装备模式下点击 `导入`，应把 equipment JSON 导入为装备编辑器草稿，用于继续编辑，而不是直接导入到系统的已安装装备包列表。
- 装备模式导入只替换当前 equipment draft，不合并到当前 draft。
- 装备模式导入不做“追加导入”“按 ID 覆盖”或“冲突解决”。
- 如果当前 equipment draft 已经包含 weapons 或 armor，导入前应提示确认：导入会替换当前装备包草稿。
- 如果当前 equipment draft 没有任何 weapons 或 armor，可以直接替换。
- 当前阶段不做浏览器刷新、关闭页面或切换模式时的未保存提示。
- 导入装备 JSON 不影响当前 card draft。
- 不新增 mixed DHCB reader。
- 不新增 zip root `equipment.json` 检测。

装备模式导入到编辑器时采用宽松恢复，而不是正式导入系统的严格准入：

- JSON 必须可解析。
- 顶层必须是对象。
- `format` 如果存在，必须是 `daggerheart.equipment-pack.v1`。
- `equipment` 如果存在，必须是对象。
- `equipment.weapons` 如果存在，必须是数组。
- `equipment.armor` 如果存在，必须是数组。
- `weapons` / `armor` 数组内的每个条目必须是对象。

这些情况可以恢复为可编辑 draft：

- `name`、`version`、`author`、`description` 缺失时补为空字符串。
- `equipment` 缺失时补 `{ weapons: [], armor: [] }`。
- `equipment.weapons` 缺失时补 `[]`。
- `equipment.armor` 缺失时补 `[]`。
- 单个装备条目缺少字段时保留条目，并由编辑器用空值或默认值渲染。

这些情况必须拒绝导入编辑器：

- JSON 解析失败。
- 顶层不是对象。
- `format` 存在但不是 `daggerheart.equipment-pack.v1`。
- `equipment` 存在但不是对象。
- `equipment.weapons` / `equipment.armor` 存在但不是数组。
- `weapons` / `armor` 数组内存在非对象条目。

导入编辑器成功不代表这个 equipment JSON 已经是正式可导入系统的装备包。正式可用性仍由 `验证` 按钮调用 equipment schema / import workflow 能力判断。

设计理由：

- 当前 card importer 没有为 bundle-level preflight / atomic commit 做好准备。
- mixed DHCB 一旦发布，用户会期待它和普通 DHCB 一样可靠；如果只能 best-effort，会增加诊断和兼容性债务。
- 独立 JSON 导出已经满足当前装备编辑器的主要价值：创作者可以制作和分发装备包。
- 当前装备编辑器是装备包作者工具，不是装备包合并器。合并会过早引入 metadata 取舍、ID 冲突、重复条目处理和诊断映射问题。

## 架构边界

当前卡牌编辑器已经能完整支撑卡包作者工作流，但内部实现是一个历史累积较多的 card-only editor。当前分支不借装备编辑能力重构旧卡牌编辑器。

实现约束：

- 卡牌模式继续使用现有 `card-editor-store.ts`、现有 card tabs、现有 card import/export helper、现有 card validation service。
- 装备模式使用新的 equipment editor draft 模块，不把 equipment draft、equipment import/export、equipment validation 或 equipment UI state 塞进 `card-editor-store.ts`。
- `/card-editor` 页面外壳只负责 mode switch、toolbar 分发、当前模式的 tab 渲染和少量共享页面布局。
- 装备导入导出 helper 必须独立于 card import/export helper，避免误触 card image IndexedDB、card pair/triple repair 或 card-specific toast/diagnostic 行为。
- 装备编辑器不应直接 import `local-storage-adapter`、`local-storage-repository` 或直接读写 `window.localStorage`。
- 如果装备编辑器需要已安装装备包状态或冲突上下文，应通过 application service / repository port / 默认服务入口获得，而不是绕过服务层读取具体存储。
- 当前装备包导入核心流程已经有 `EquipmentPackRepository` port；当前分支可以保留 localStorage 作为默认实现，但默认实现的创建应逐步集中到 service composition root，避免 UI store 承担“选择存储后端”的职责。
- 装备的增删改复制、ID 生成、导入导出、验证包装应放在 equipment editor 模块里，而不是散落在 React 表单组件内。
- 当前阶段不抽象统一的 `ContentPackEditorStore` 或通用 `ItemEditorTab`。等装备实现稳定后，再评估是否有足够重复值得抽象。

建议模块形态：

```text
app/card-editor/
  store/card-editor-store.ts          # 旧卡牌逻辑，当前分支不重构
  equipment/
    equipment-editor-store.ts         # 装备草稿和装备 UI 状态
    equipment-draft.ts                # draft 类型、默认值、增删改复制
    equipment-import-export.ts        # equipment JSON 导入导出
    equipment-validation.ts           # 调用现有 equipment import pipeline / schema 能力
    equipment-id.ts                   # id 生成、去重、手动编辑状态
    components/
      equipment-tabs.tsx
      equipment-metadata-tab.tsx
      equipment-item-tab.tsx
      equipment-quick-switch.tsx
```

本次实现必须先做一个小的服务组装边界抽离：

```text
equipment/
  services/
    default-equipment-services.ts     # 创建默认 repository / application service / runtime cache
  ui/
    equipment-ui-store.ts             # 只接收或调用默认服务入口，不直接组装 localStorage
```

这不是一次后端迁移，也不要求实现 backend repository。它只把“当前默认使用 localStorage”的决定收拢到服务组装层，确保后续替换存储时不需要修改业务用例或编辑器 store。

实施顺序上，这个抽离应作为装备编辑器实现的前置步骤。完成后，新增的 equipment editor store 不允许复制 `equipment-ui-store.ts` 旧有的 localStorage 组装逻辑。

设计理由：

- 这次的主要目标是增加装备编辑能力，不是修复卡牌编辑器历史债。
- 装备编辑器可以作为未来重构卡牌编辑器的参照实现，但不能反向拖动当前卡牌编辑器大改。
- 保持 card / equipment 的业务模块分离，可以降低回归现有卡包导入导出、卡图、ID 迁移和特殊卡组逻辑的风险。
- 存储后端是部署和架构选择，不应由 UI store 或 editor store 直接决定。当前默认实现可以继续使用 localStorage，但依赖方向必须允许未来替换为后端存储。

## Equipment Draft 心智模型

装备编辑器底层维护一份 `Equipment Editor Draft`。它的核心心智模型是：编辑器一直在编辑一份 equipment pack JSON。

当前阶段不引入单独的 draft format：

- 不新增 `daggerheart.equipment-draft.v1`。
- 不新增 `daggerheart.equipment-editor-draft.v1`。
- `draft.format` 固定为 `daggerheart.equipment-pack.v1`。
- 导出时仍输出 equipment pack shape。

Draft shape 应稳定接近公开格式：

```ts
type EquipmentEditorDraft = {
  format: "daggerheart.equipment-pack.v1"
  name: string
  version: string
  author: string
  description: string
  equipment: {
    weapons: WeaponEditorDraft[]
    armor: ArmorEditorDraft[]
  }
}
```

新建 equipment draft 的默认值：

```json
{
  "format": "daggerheart.equipment-pack.v1",
  "name": "未命名装备包",
  "version": "1.0.0",
  "author": "",
  "description": "",
  "equipment": {
    "weapons": [],
    "armor": []
  }
}
```

当前阶段不调整 equipment schema 对 `version` 的要求。虽然严格 semver 对一般作者可能偏高，放松 version 规则应作为后续单独修复处理，不夹在本次装备编辑器第一版范围内。

Draft 与正式可导入装备包的区别：

- Draft 可以是半成品。
- Draft 可以暂时不通过 `equipment-pack.v1` JSON Schema。
- Draft 里的必填字段可以暂时为空。
- Draft 必须保持顶层结构稳定，确保编辑器始终可渲染。
- 验证按钮负责判断当前 draft 是否能作为正式装备包被系统读取或导入。
- 导出按钮不强制验证，可能导出一个结构正确但内容未完成的 equipment pack JSON。

数字字段的 draft 表达：

- Draft 内数字字段使用 `number | null`。
- `number` 表示作者已经填了合法数字。
- `null` 表示作者尚未填写，或导入的半成品缺少该数字字段。
- 输入框内部可以短暂使用 string 保存输入过程中的中间态，例如空字符串、`1.` 等。
- 输入框提交到 draft 时，空输入写回 `null`，合法数字写回 `number`，非法数字不应污染 draft。
- 导出半成品时保留数字字段并写 `null`，而不是省略字段。
- 写出 `null` 的 equipment JSON 可能无法通过正式 equipment pack schema；这是允许导出半成品的结果。重新导入编辑器时应能恢复为可继续编辑的 draft。
- 验证或正式导入系统前，`null` 必须作为缺失必填数字处理并报错。

Editor-only state 仍待决：

- 当前已确认不引入导出的 draft format。
- 不引入需要持久化或导出的 `editorState`。
- 当前 tab、当前选中武器、当前选中护甲、验证结果展示状态等属于运行时 UI state，只存在于编辑器 store / React state，不进入导出的 equipment JSON。
- 不引入 `idLocked`。装备 ID 使用机械生成和机械前缀替换规则，不需要记录某个 ID 是否由用户手动编辑过。
- 如果实现中存在 editor-only UI state，它不能混入最终导出的 equipment pack JSON。

## Card Editor UI 方向

当前 `/card-editor` 增加装备编辑能力时，采用“工具栏右侧内容类型开关”的布局。

页面结构：

- 顶部标题可以逐步从“卡包编辑器”调整为“内容包编辑器”，但不要求一次性完成所有命名迁移。
- 顶部主操作条保留现有位置。
- 主操作条左侧放当前编辑器操作：`新建`、`导入`、`导出`、`验证`。
- 主操作条右侧固定放内容类型开关：`卡牌` / `装备`。
- `关键字列表` 是 card-only 辅助工具，只在 `卡牌` 模式显示。

模式切换行为：

- `卡牌` 模式下，保留现有二级 tab：`基础信息`、`职业`、`种族`、`社群`、`子职业`、`领域`、`变体`、`预览`。
- `装备` 模式下，同一位置显示装备二级 tab：`基础信息`、`武器`、`护甲`。
- 装备模式第一版隐藏 `预览` tab，不做 disabled 空页或占位内容。
- 切换模式只切换二级 tab 和主编辑面板，不改变顶部主操作条。
- `导入` 是 mode-aware 操作：卡牌模式导入卡包到卡牌草稿；装备模式导入 equipment JSON 到装备草稿。
- `导出` 是 mode-aware 操作：卡牌模式导出卡包；装备模式直接导出 equipment JSON，不弹出范围选择 UI。
- 装备模式下，无论当前位于 `基础信息`、`武器`、`护甲` 还是 `预览` tab，`导出` 都导出完整 equipment draft。
- `验证` 是 mode-aware 操作：卡牌模式验证卡包；装备模式验证完整 equipment draft。当前不做跨模式统一验证，也不把验证绑定到导出动作。
- 装备验证结果应尽量保持与现有卡牌验证结果相似的交互体验，包括弹窗、摘要、分组、友好文案和定位按钮。

`新建` 语义：

- 卡牌模式的顶部 `新建` 继续表示新建卡包。
- 装备模式的顶部 `新建` 表示新建装备包草稿。
- 当前阶段可以把卡牌包和装备包当成同一编辑器里的两个独立部分，不要求一个 `新建` 同时重置两边。
- 装备模式点击顶部 `新建` 只重置 equipment draft，不影响 card draft。
- 如果当前 equipment draft 已经包含 weapons 或 armor，新建前应提示确认：新建会清空当前装备包草稿。
- 如果当前 equipment draft 没有任何 weapons 或 armor，可以直接重置。
- 新建 equipment draft 使用装备自己的默认 metadata，不自动复制当前 card metadata。
- 如果作者想复用卡包基础信息，应使用手动复制按钮。
- 当前阶段只对 `新建` 和 `导入` 这类会覆盖 equipment draft 且当前已有 weapons / armor 的操作做确认；不引入完整 dirty tracking。
- `武器` / `护甲` tab 内的 `新增` 才表示新增当前类型条目。

基础信息独立与手动复制：

- `卡牌 > 基础信息` 和 `装备 > 基础信息` 在 UI 上都存在。
- 两个基础信息 tab 不强制同步；背后应有独立的 card metadata draft 和 equipment metadata draft。
- 新建内容时，编辑器可以用同一份初始 metadata 填充两侧，降低重复输入成本。
- 后续编辑时，两侧 metadata 独立变化，互不自动覆盖。
- `卡牌 > 基础信息` 可以提供 `复制到装备基础信息` 按钮。
- `装备 > 基础信息` 可以提供 `从卡牌基础信息复制` 按钮。
- 手动复制应覆盖目标侧的 `name`、`version`、`author`、`description` 等基础信息，并最好需要确认，避免误覆盖。
- 导出卡包时，只使用 card metadata draft。
- 导出装备 JSON 时，只使用 equipment metadata draft。
- 只编辑装备基础信息，不会单独导致生成可导出的装备 JSON；equipment draft 仍必须包含至少一个 weapon 或 armor。

设计理由：

- 装备不是一种卡牌类型，不应直接塞进现有 card-specific tab。
- 单独一行模式条会更清楚，但会增加页面高度；放在工具栏右侧更贴近当前布局。
- 大多数主操作对卡牌和装备都有效，但行为应按当前模式收敛，避免用户误以为会导出所有内容。
- 当前阶段不导出统一 bundle；卡包和装备包是两个独立 payload，因此基础信息也必须允许独立维护。
- 装备包内部的 weapons 和 armor 是同一个 payload 的两个数组，不应在第一阶段拆成独立导出物。
- 手动复制按钮保留了同项目内容快速同步基础信息的便利，但不把不同导出包强行绑定。
- 导出不触发验证，避免阻止作者保存和分发半成品草稿；验证是显式动作。
- 这是一种局部扩展，不要求重构现有卡牌表单。

## Equipment Validation UI

装备模式点击 `验证` 时，验证对象永远是完整 equipment draft。验证不写入系统，不导入已安装装备包，也不绑定到导出动作。

验证结果 UI 应与当前卡牌验证弹窗保持相似：

- 使用大弹窗展示结果。
- 顶部展示成功 / 失败状态和摘要说明。
- 失败时展示统计概览，例如关键错误、警告、问题类型、检查总数。
- 问题列表提供类似 tabs：
  - `按优先级`
  - `按装备`
  - `按类型`
  - `全部`
- 每条问题应尽量映射成友好信息：
  - 标题
  - 字段 badge
  - 错误 / 警告 badge
  - 描述
  - 修复建议
- 能定位到具体装备或基础信息时，提供 `定位装备` 或等价按钮。

装备验证分组规则：

- 按类型分组为 `基础信息`、`武器`、`护甲`、`系统`。
- 按装备分组为 `第 N 件武器`、`第 N 件护甲`、`基础信息`、`系统问题`。
- `/equipment/weapons/{index}/...` 定位到 `武器` tab 的第 `index + 1` 件武器。
- `/equipment/armor/{index}/...` 定位到 `护甲` tab 的第 `index + 1` 件护甲。
- `/name`、`/version`、`/author`、`/description`、`/format` 定位到装备 `基础信息` tab。
- 无法映射的 path 留在结果列表中，不强行跳转。

措辞应优先保持与现有卡牌验证体验一致。当前卡牌验证弹窗使用 `必须修复（阻止导出）` 这类文案，即使导出本身并不强制拦截；装备验证可以沿用这种作者质量检查语气，不要求文案逐字反映导出按钮的真实拦截逻辑。

第一版不要求把验证错误挂到每个 input 下方。字段级 inline error 可以作为后续增强，避免第一版把 equipment diagnostics 和表单字段强耦合。

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

当前阶段不实现装备 `预览` tab 的实质内容，并且第一版直接隐藏装备 `预览` tab。不要在第一阶段做 JSON 预览、角色卡槽位预览或复杂视觉预览。未来如果需要预览，应优先作为按需查看能力，而不是占用默认右侧区域。

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

- 新建条目时，根据当前装备包名称、作者、装备类型和随机短码自动生成 `id`。
- 推荐格式为 `<equipment-pack-name>-<author>-weapon-<random>` 或 `<equipment-pack-name>-<author>-armor-<random>`。
- `equipment-pack-name`、`author`、`type` 片段应使用和卡牌编辑器相近的清理、截断和类型缩写策略。
- 修改装备包基础信息里的 `name` 或 `author` 时，编辑器应尝试识别现有 ID 的旧标准前缀。
- 如果现有 ID 能识别为旧标准前缀，则替换为新标准前缀，并保留原随机短码或后缀。
- 如果现有 ID 不能识别为旧标准前缀，则保持不变；这类 ID 视为作者自定义或外部导入 ID。
- 修改单个装备的名称不触发 ID 变化。
- `id` 应放在名称字段下方，参考当前卡牌编辑器的 ID 展示与编辑位置；不要完全隐藏，也不要放到很深的高级折叠区。
- 编辑器应在本地检查同一 draft 内的重复 `id`。
- `验证` 按钮仍以 equipment schema / import workflow 能力作为权威检查来源；导出动作本身不强制通过验证。

`modifierContributions` 范围：

- 第一版可以复用现有一次性自定义装备表单的修正行交互。
- 每行包含目标、标签和值。
- 目标枚举继续来自现有 equipment modifier target 定义。
- 如果作者不需要自动数值修正，可以留空；纯文本特性放在 `featureName` / `description`。

装备条目表单第一版可按以下区域组织：

- `基础字段`：装备名称、ID、tier，以及武器 / 护甲各自的核心字段。
- `特性`：`featureName` 和 `description`。
- `修正`：`modifierContributions`。

布局应优先参考当前卡牌条目编辑页，而不是重新发明一套完全不同的表单结构。`name` 和 `id` 应在视觉上靠近，方便作者理解 ID 与当前装备条目的关系。修正区域可以低优先级展示或折叠；如果已有修正内容，则应明显可见。具体细节可以在实现阶段继续微调。

## 验收标准

- 现有 card-only `.dhcb` / `.zip` 导入导出不回归。
- 现有 card-only JSON 导入导出不回归。
- equipment JSON 导入导出可用。
- 默认 equipment service 组装从 UI store 中抽离，UI store 和 equipment editor store 不直接创建 localStorage repository。
- 装备模式导出完整 equipment pack JSON，包含当前 equipment draft 内所有 weapons 和 armor。
- 装备导出不弹出 modal 或菜单。
- 装备导出不执行完整验证，允许导出半成品。
- 装备模式顶部 `新建` 新建装备包草稿，不影响卡牌包草稿。
- 当前分支不生成 mixed DHCB。
- 当前分支不读取 mixed DHCB。
- 当前分支不要求新 diagnostics framework。
- 文档明确当前实现不是未来 manifest content bundle v1。

## 后续方向

未来可以单独做：

- `daggerheart.content-bundle.v1` manifest。
- 多 card pack / 多 equipment pack bundle。
- mixed DHCB 导入导出。
- bundle-level preflight 和 atomic commit。
- 自定义 card image filename。
- card import workflow modernization。
- Legacy Published Format JSON Schema。
- 放松 equipment pack `version` 的严格 semver 要求。
