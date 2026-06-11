# Custom Equipment Pack UI Integration Design

日期：2026-06-06

## 背景

阶段 1-3 已经完成装备包公开契约、导入 pipeline、storage repository、application service、runtime cache view 和基础测试。下一阶段需要把这些能力接入真实 UI，让用户可以：

- 在管理页面导入、查看、启用、禁用、删除装备包。
- 在武器选择和护甲选择页面看到 enabled 装备包提供的模板。
- 选择装备包模板后，正常写入角色卡 equipment slot，并继续参与自动化 modifier 计算。

本阶段不是新的导入契约阶段，也不重新设计 storage 格式。UI 只消费已经建立的 application service、runtime cache service 和后续 UI-facing store。

## 已决策

### 页面入口

继续使用现有 `/card-manager` 路由，但页面外层重设计为 **内容包管理**。

原因：

- Card Pack 和 Equipment Pack 都属于 Content Pack。
- 现有 `card-manager` URL 已经存在，短期不做路由迁移。
- 页面文案可以从“卡牌管理”升级为“内容包管理”，避免继续把装备包塞进卡牌术语里。

### 页面外层结构

内容包管理页采用 data-dense 管理工具布局，而不是左右两栏卡片布局。

结构：

```text
Header
  - 标题：内容包管理
  - 返回主站
  - 创作指南
  - 卡包编辑器

Content Pack Stats
  - 卡牌包数量 / enabled 数
  - 装备包数量 / enabled 数
  - 自定义卡牌数量
  - 装备模板数量：武器数 / 护甲数

Global Import Panel
  - 导入任意支持的内容包
  - 自动识别 Card Pack / Equipment Pack
  - 展示用户友好的导入状态与结果
  - 技术 diagnostics 折叠展示

Tabs
  - 卡牌包
  - 装备包

Current Tab
  - 已安装包列表

Advanced Maintenance
  - 默认折叠
  - 重置所有本地数据
```

列表是主工作区。包数量增长时，列表使用完整页面宽度自然向下扩展，不使用“左侧导入 / 右侧列表”的长期不平衡布局。

### 桌面与移动布局

桌面：

- 使用完整宽度表格展示已安装包。
- 桌面表格从 `lg` 断点开始展示，避免手机横屏、折叠屏或窄平板误触发表格布局。
- 卡牌包 tab 和装备包 tab 使用同一种表格语义，避免“卡牌包卡片 / 装备包表格”的割裂。
- tab 内不再单独显示“卡牌包管理 / 装备包管理”的重复标题卡。
- 搜索、状态筛选和“查看所有”类动作合并到表格工具栏。
- 导入区是 tabs 之上的全局导入面板，不从属于卡牌包 tab 或装备包 tab。
- 导入面板使用明显的 drop zone 和主按钮，不压缩成窄工具条。
- 导入结果在导入面板内显示。

移动端：

- 已安装包以紧凑卡片列表展示。
- 1024px 以下优先使用紧凑卡片，而不是在 `md` 宽度就切到桌面表格。
- 移动端卡片是桌面表格 row 的响应式呈现，共享同一个 row read model，不引入额外字段或不同语义。
- 顶部仍保留返回主站、创作指南、卡包编辑器入口。
- 移动端导入保留文件选择；拖拽导入不作为移动端核心交互。

### 存储统计

移除或降级现有不准确的 localStorage 容量统计。

本阶段不尝试提供“全站本地存储容量”指标，因为真实占用涉及：

- 角色存档。
- 卡牌包。
- 装备包。
- 图片缓存。
- IndexedDB。
- 其他系统设置。

内容包管理页只展示业务统计，不展示容易误导的 localStorage 容量估算。

### 高级维护

`强制初始化所有数据` 继续留在内容包管理页，但改为 **高级维护** 区。

规则：

- 默认折叠。
- 放在页面底部或低优先级区域。
- 文案明确这是全站本地数据操作，不是卡牌包或装备包操作。
- 必须说明会删除角色存档、自定义卡牌包、装备包、图片缓存和系统设置。
- 后续实现应提供比单句 `confirm()` 更明确的二次确认。

### 卡牌包 Tab

卡牌包 tab 包住现有卡牌包管理能力，但外层结构跟随内容包管理页重设计。

本阶段不要求重写所有卡牌包内部导入逻辑。

卡牌包 tab 不包含自己的导入入口。导入统一由全局导入面板处理，导入成功后根据包类型刷新对应 tab 的列表和统计。

卡牌包已安装列表必须展示内容构成：

- 包名。
- 卡牌总数。
- 卡牌类别摘要。
- enabled / disabled 状态。
- 导入时间。
- 来源文件或来源说明。
- 操作：查看、启用/禁用、删除。

卡牌包列表桌面端使用统一表格布局：

- 包名。
- 内容摘要。
- 状态。
- 来源。
- 导入时间。
- 操作。

卡牌包列表移动端使用紧凑卡片布局：

- 第一行显示包名和 enabled / disabled 状态。
- 第二行显示来源说明和导入时间。
- 第三行显示内容摘要。
- 底部显示图标按钮操作。

卡牌包列表规则：

- tab 内不再显示重复的标题说明卡。
- 搜索、状态筛选和“查看所有卡牌”合并到工具栏。
- 不在列表卡片中显示批次 ID。
- 不在列表卡片中显示作者 / 版本；这些信息即使存在于读模型中，也不作为当前列表 UI 的核心信息。
- 操作区使用图标按钮：查看、启用/禁用、删除。
- 系统内置包删除按钮保留 disabled 状态以维持列宽和视觉整齐。
- 来源列显示用户友好的来源说明，而不是底层 id；系统内置包显示 `系统内置`，用户导入包显示 `导入文件：<文件名>`，缺失来源时显示 `本地导入`。

卡牌类别摘要使用 badges，展示原始卡牌类型，例如：

- `profession`。
- `ancestry`。
- `community`。
- `subclass`。
- `domain`。
- `variant`。

列表中的内容摘要不直接铺满所有类别 badge，而是显示 `N 类别` 摘要。`N 类别` 可 hover 或点击查看类别明细；具体卡牌仍在查看详情中展示。

### 装备包 Tab

装备包 tab 接入 equipment application service 和 runtime cache。

必须支持：

- 列出已安装装备包。
- 查看装备包内容。
- 启用 / 禁用装备包。
- 删除装备包。

装备包 tab 不包含自己的导入入口。导入统一由全局导入面板处理，导入成功后根据包类型刷新对应 tab 的列表和统计。

装备包已安装列表必须展示内容构成：

- 包名。
- 武器模板数。
- 护甲模板数。
- 装备类别摘要。
- enabled / disabled 状态。
- 导入时间。
- 来源说明。
- 操作：查看、启用/禁用、删除。

装备包列表桌面端使用与卡牌包一致的表格列：

- 包名。
- 内容摘要。
- 状态。
- 来源。
- 导入时间。
- 操作。

装备包列表移动端使用与卡牌包一致的紧凑卡片骨架。

装备类别摘要例如：

- 主武器。
- 副手 / 副武器。
- 护甲。

列表中的内容摘要显示 `X 武器 / Y 护甲 · N 类别`。`N 类别` 可 hover 或点击查看类别明细。作者、content version、pack id、原始来源文件等低频信息放在详情 modal，不放在列表主视图。

### 全局导入面板

导入面板不从属于卡牌包 tab 或装备包 tab。

原因：

- 用户导入的是 Content Pack，不一定需要先选择包类型。
- 系统可以根据文件扩展名、格式标识或解析结果区分 Card Pack / Equipment Pack。
- 统一入口减少重复 UI，也避免未来新增其他 Content Pack 类型时继续增加 tab 内导入区。

导入面板默认状态：

- 主区域是全宽 drop zone。
- 中央放主按钮：`选择文件`。
- 显示支持的文件类型和大小限制。
- 桌面端支持拖拽；移动端以文件选择为主。
- 不使用固定左右分栏。
- 没有导入结果时，不为了填充空间展示大块帮助文档。
- 使用一行短说明提示支持的包类型和常见失败反馈即可。

默认提示应面向使用者，而不是作者校验清单。示例：

- 支持 JSON 装备包、JSON 卡牌包、DHCB / ZIP 卡牌包。
- 导入后内容会保存在本地浏览器中。
- 已禁用的包不会出现在角色选择流程中。
- 如果导入失败，通常是文件格式不受支持、文件过大、包版本不兼容、内容 id 冲突，或文件内容损坏。
- 导入成功后可在对应 tab 中启用、禁用、查看或删除。

导入面板根据导入结果展示状态：

- idle：显示使用者提示。
- running：显示正在读取 / 校验 / 导入。
- success：显示成功摘要。
- failed：显示用户友好的失败摘要。
- result 区域只在有导入结果时出现，并使用完整宽度。

自动识别导入类型：

- `.dhcb` / `.zip` 文件走现有卡牌包 DHCB / ZIP importer。
- `.json` 文件先读取 JSON。
- 如果 JSON 的 `format === "daggerheart.equipment-pack.v1"`，走装备包 import pipeline。
- 如果 JSON 符合现有卡牌包 JSON 结构，走卡牌包 importer。
- 如果无法识别，显示“无法识别内容包类型”的用户友好失败摘要，并把技术 diagnostics 折叠到详细信息。
- 当前 active tab 不参与导入类型判断。

导入成功后的页面行为：

- 自动切换到导入结果对应的 tab。
- 成功结果区提供“查看包”和“切到对应列表”操作。
- 对应 tab 的列表和顶部统计必须刷新。

多文件导入：

- 全局导入面板继续支持多文件选择，因为现有卡牌包导入已有多文件能力。
- 每个文件独立识别类型、独立导入、独立产生结果。
- 结果按文件分组展示。
- 如果部分成功、部分失败，显示“部分文件导入失败”的汇总状态。
- 成功后切到最后一个成功文件对应的 tab；如果没有成功文件，则保留当前 tab。
- 装备包仍然逐文件执行 import pipeline 和 storage transaction，不做跨文件原子事务。

### 导入 Diagnostics 展示

导入失败：

- 默认展示用户友好的失败摘要。
- 失败摘要必须说明“发生了什么”和“用户可以怎么处理”。
- 技术 diagnostics 默认折叠在“详细信息”中。
- 详细信息展开后显示 code、path、message，必要时显示 value。
- Diagnostics 列表使用完整宽度展示，不能塞进窄侧栏。
- Diagnostics 很多时，先显示前 N 条，再提供“显示全部”入口。

导入成功但存在 warning：

- 成功摘要默认展示。
- warning diagnostics 默认折叠。
- 显示“有 N 条提示”的可展开入口。
- 展开后显示 code、path、message，必要时显示 value。
- Warning diagnostics 很多时，先显示前 N 条，再提供“显示全部”入口。

原因：

- 管理页主要面向 Pack User，不应让 warning 打扰普通导入流程。
- Warning Diagnostic 仍对 Pack Author 有价值，因此不能丢弃。
- Error Diagnostic 的原始 code/path 对 Pack Author 有价值，但对普通 Pack User 不够友好，因此不能作为失败反馈的唯一内容。

### 查看装备包内容

装备包列表必须提供只读查看功能。

查看详情展示：

- 包名。
- 作者。
- content version。
- pack id。
- importedAt。
- enabled / disabled 状态。
- source filename / origin。
- 武器模板列表。
- 护甲模板列表。

武器模板字段：

- template id。
- 名称。
- tier。
- weaponType：主武器 / 副手。
- trait。
- damageType。
- range。
- burden。
- damage。
- featureName。
- description。

护甲模板字段：

- template id。
- 名称。
- tier。
- baseThresholds。
- baseArmorMax。
- featureName。
- description。

查看详情不支持编辑，不支持从这里选择到角色卡。

装备包详情呈现方式：

- 本阶段使用 modal。
- 移动端使用同一个 modal 的全屏化响应式布局。
- 不使用 drawer 或页面内展开行。
- 原因：现有卡牌详情已有 modal 模式，改动更小；drawer 和行展开需要额外交互设计。

### UI-Facing Equipment Store

本阶段实现全局单例 **equipment UI store**。

定位：

```text
Application Service = 业务编排
Runtime Cache Service = 稳定可查询视图
Equipment UI Store = React/UI 读写入口
```

Store 不直接实现 storage transaction，不直接解析导入文件契约，不直接调用 `localStorage.setItem`。这些职责仍属于 repository、import pipeline 和 application service。

Store 是纯内存全局单例，不使用 Zustand `persist` 持久化装备数据、runtime cache 或 storage snapshot。

持久化边界：

- 装备包数据由 repository 管理，通过 `dh_equipment_index` 和 `dh_equipment_pack:*` 存储。
- Runtime cache view 是从内置装备和 recovered storage snapshot 重建出的内存 read model，不持久化。
- `initialized`、`initializing`、`lastResult`、`lastDiagnostics` 等 UI 状态属于当前 session，不持久化。
- UI 偏好如上次打开的 tab、排序、筛选条件，本阶段也不持久化；后续如有明确需求再单独设计。

Store 提供：

- `initialized`
- `initializing`
- `ensureInitialized()`
- `refreshFromStorage()`
- `querySelectableTemplates(criteria)`
- `getSelectableTemplateById(templateId)`
- `getPackSummaries()`
- `getPackDetail(packId)`
- `importPackFromFile(file)`
- `removePack(packId)`
- `setPackDisabled(packId, disabled)`
- `lastResult`
- `lastDiagnostics`

Store 不把 `EquipmentPackStorageSnapshot` 作为主要 UI contract 暴露给组件。

管理页不直接消费 `EquipmentPackSnapshotEntry`。Store / management reader 需要提供面向 UI 的 read model：

```ts
interface EquipmentPackListItem {
  packId: string
  name: string
  author: string
  contentVersion?: string
  importedAt: string
  disabled: boolean
  sourceLabel?: string
  weaponCount: number
  armorCount: number
  categoryBadges: EquipmentPackCategoryBadge[]
}

interface EquipmentPackDetail {
  pack: EquipmentPackListItem
  weapons: RuntimeEquipmentTemplateWithSource[]
  armor: RuntimeEquipmentTemplateWithSource[]
}
```

`categoryBadges` 由当前 pack 内容派生，不持久化：

- 存在 `weapon.weaponType === "primary"` 时显示 `主武器`。
- 存在 `weapon.weaponType === "secondary"` 时显示 `副武器`。
- 存在 armor template 时显示 `护甲`。
- 当前最多 3 个类别；未来装备类别扩展后再考虑 `+N`。

Disabled Equipment Pack 仍然在管理页列表和详情中完整可见。`disabled` 只表示其模板不进入 selectable runtime read model，不影响管理页查看 pack 内容。

### 初始化策略

使用 lazy `ensureInitialized()`。

触发点：

- 内容包管理页 mount 时调用。
- 武器选择弹窗打开时调用。
- 护甲选择弹窗打开时调用。

规则：

- 如果已经 initialized，则不重复重建。
- 如果正在 initializing，则复用同一个初始化过程。
- 导入、删除、启用、禁用由 store 调用 application service；成功后同步 UI 可读状态。
- 不在应用启动时强制初始化装备包系统，避免拖慢首页。

初始化失败 UI：

- 管理页仍然打开，不显示阻塞式错误页。
- 如果 storage snapshot 可读但 runtime cache build 失败，装备包 tab 显示能够读取的管理内容，并在页面顶部显示非阻塞错误提示。
- 错误提示文案应说明：“装备包运行时视图初始化失败，部分装备可能无法在选择窗口显示。”
- 错误提示提供“重新初始化”操作。
- 选择窗打开时调用 `ensureInitialized()`；初始化中显示 loading。
- 选择窗初始化失败时显示错误提示和空列表，不静默展示空结果。
- 选择窗错误提示提供“重试”操作。

### 武器与护甲选择弹窗

武器和护甲没有本质区别，必须一起接入。

现有 `WeaponSelectionModal` 和 `ArmorSelectionModal` 不再直接读取静态 `allWeapons` / `armorItems` 作为最终选择来源。它们改为通过 equipment UI store 查询 selectable runtime templates。

本阶段保持现有“表格快速选择”操作模型：

- 桌面端和移动端使用同一套表格交互模型。
- 点击表格行直接选择。
- 不增加右侧预览。
- 不增加二次确认。
- 不把移动端改成独立卡片列表；移动端允许横向滚动表格。
- 移动端选择窗的单独重设计作为后续优化项。

规则：

- `WeaponSelectionModal` 查询 `kind: "weapon"`。
- `ArmorSelectionModal` 查询 `kind: "armor"`。
- 内置装备和 enabled 装备包模板在同一个列表中展示。
- disabled 装备包的模板不出现在选择弹窗。
- 来源用于筛选，但不作为表格主列展示；来源值显示为 `内置` 或装备包名称，不在主界面显示 pack id。
- 现有筛选能力必须保留。
- 文本搜索、来源筛选和重置筛选放在列表上方工具行。
- 表头中可筛选字段使用下拉菜单入口；入口只显示字段名和展开图标，不显示选中胶囊或小点，避免撑高表头。
- 特性名称和特性描述拆成两列。
- 特性描述保持单行显示；超出时截断，完整文本可通过 `title` 或 tooltip 查看。

武器筛选至少保留：

- 文本搜索。
- tier 多选。
- weaponType 多选。
- trait 多选。
- damageType 多选。
- range 多选。
- burden 多选。
- source 多选。
- featureName。

护甲筛选至少保留：

- 文本搜索。
- tier 多选。
- source 多选。
- featureName。

多选筛选规则：

- 每个筛选字段是一个条件组。
- 同一条件组内多个值表示 OR，例如 `等级：T1、T2`。
- 不同条件组之间表示 AND，例如 `来源：内置、中文装备包` 且 `等级：T1、T2`。
- 未选择任何值表示不限制该字段，等价于选择全部当前可用值；这不是“没有匹配值”。
- 不在菜单中提供虚拟的 `全部` 选项；菜单底部提供 `清除本字段筛选`。
- 多选菜单点击立即生效，不需要 `应用` 按钮。
- 多选菜单在连续勾选时保持打开，点击外部关闭。
- `重置筛选` 清除所有条件组和文本搜索。

筛选选项来源：

- 来源选项从当前选择器可见的 selectable templates 派生。
- 武器弹窗的来源选项只来自当前武器槽可见的武器模板；主武器槽不显示只含副武器或护甲的来源。
- 护甲弹窗的来源选项只来自可选护甲模板。
- disabled pack 不出现在来源选项中。
- tier、weaponType、trait、damageType、range、burden 使用固定领域枚举，不随当前结果动态收窄。

已筛选摘要：

- 具体选中值统一显示在列表上方的 `已筛选` 行，不塞进表头。
- 每个字段显示一个 chip。
- 1-2 个值直接展示，例如 `来源：内置、中文装备包`。
- 3 个及以上显示前 2 个值和数量，例如 `来源：内置、中文装备包 +2`。
- chip 的 `title` / tooltip 显示完整值列表。
- 点击 chip 上的清除按钮会清空整个字段。

筛选状态生命周期：

- 筛选状态只存在当前 modal 组件内。
- 不写入 URL。
- 不写入 Zustand persist。
- 不写入角色存档。
- 关闭弹窗后重置筛选状态。
- 自定义模式复用同一套筛选逻辑；自定义模式只改变列表点击行为，不改变筛选能力。

武器表格列：

- 等级。
- 名称。
- 类型。
- 伤害类型。
- 负荷。
- 范围。
- 属性。
- 伤害。
- 特性名称。
- 特性描述。

护甲表格列：

- 名称。
- 等级。
- 伤害阈值。
- 护甲值。
- 特性名称。
- 特性描述。

### Canonical Runtime Template

选择弹窗直接使用 canonical runtime template 字段，不通过旧 `AllWeapon` / `ArmorItem` shape 作为中间 UI adapter。

原因：

- 装备包导入、内置装备、runtime cache 已经统一到 canonical model。
- 继续维持旧 shape 会让 UI、导入、自动化之间出现重复映射。
- 长期应让 UI 选择流程以 runtime template 作为唯一内容来源。

### 选择写入角色卡

本阶段必须保证选中装备包模板后可以完整写入角色卡，并参与自动化 modifier 计算。

需要迁移的路径：

- `selectWeaponSlot()`。
- `selectArmor()`。
- `template-to-slot` helper。

本阶段引入结构化选择输入，避免继续用一个 `string` 同时表达 template id、`none`、JSON payload 和自定义名称。

建议新增接口：

```ts
type WeaponSelectionInput =
  | { type: "none" }
  | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "weapon" } }

type ArmorSelectionInput =
  | { type: "none" }
  | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "armor" } }

selectWeapon(selection: WeaponSlotSelection, input: WeaponSelectionInput): void
selectArmorSlot(input: ArmorSelectionInput): void
```

Slot 实例化 helper 新增或迁移为：

- `createWeaponSlotFromRuntimeTemplate(template, idFactory)`。
- `createArmorSlotFromRuntimeTemplate(template, idFactory)`。

规则：

- `none` 仍清空 slot。
- Runtime template 由选择窗直接传入，不在 `sheet-store` 中按 template id 二次查询。
- Runtime template 输入实例化成角色卡 equipment slot。
- modifierContributions 必须实例化进入 slot。
- 旧接口 `selectWeaponSlot(selection, weaponId)` / `selectArmor(armorId)` 暂时保留为兼容路径。
- 新 UI 不再调用旧 string 接口。
- 本阶段删除旧 JSON 自定义 payload 选择流和相关兜底逻辑；后续如需要自定义装备，重新设计独立能力。

### 手动自定义装备输入

现有“自定义武器 / 自定义护甲”手动输入功能本阶段移除。

规则：

- 选择窗不再显示“自定义武器 / 自定义护甲”按钮。
- 选择窗不再通过 `JSON.stringify()` 传递自定义装备 payload。
- `sheet-store` 不再解析自定义装备 JSON payload。
- 本阶段只支持从内置装备或 enabled 装备包模板选择，或者清空 slot。
- 后续如需要自定义装备，应单独设计“临时装备 / 自定义装备编辑”能力。

## 实现边界

### 卡牌包内部逻辑重构深度

本阶段只优化内容包管理页外层结构，不重写卡牌包存储、导入、图片或批次管理逻辑。

允许做的改动：

- 把现有卡牌包管理能力适配到新的 tab 布局。
- 抽取必要的展示组件，降低页面复杂度。
- 为卡牌包列表补齐内容类别摘要展示。

不做的改动：

- 不重写卡牌包 importer。
- 不迁移卡牌包 storage key。
- 不重构卡牌图片缓存。
- 不改变现有卡牌包批次禁用语义。

### 包管理列表规模

本阶段不做分页或虚拟化。

必须支持：

- 列表自然滚动。
- 包名 / 作者搜索。
- enabled / disabled 状态筛选。
- 内容类别摘要展示。

原因：

- 装备包文件大小和包数量都有上限。
- 预期包数量不足以让虚拟化成为第一阶段必须项。
- 先保持实现简单，后续如真实数据量增长再单独优化。

## 验收条件

- `/card-manager` 显示为内容包管理页，而不是纯卡牌管理页。
- 桌面端使用完整宽度列表作为主工作区。
- 移动端不出现横向溢出；已安装包以卡片列表展示。
- 卡牌包 tab 仍能完成原有核心管理能力。
- 全局导入入口能导入装备包；装备包 tab 能查看、启用/禁用、删除装备包。
- 全局导入入口能根据文件自动识别卡牌包或装备包。
- 全局导入入口支持多文件导入，并按文件分组展示结果。
- 导入成功后自动切到对应 tab 并刷新列表和统计。
- 部分文件导入失败时显示汇总状态和每个文件的结果。
- 导入失败 error 默认可见。
- 导入成功 warning 默认折叠但可查看。
- 已安装卡牌包列表显示卡牌类别摘要。
- 已安装装备包列表显示装备类别摘要。
- 装备包查看详情可展示武器和护甲模板。
- 武器选择弹窗显示 built-in + enabled custom weapons。
- 护甲选择弹窗显示 built-in + enabled custom armor。
- 选择弹窗保持表格快速选择模型，点击行直接选择。
- 选择弹窗支持来源、等级、武器类型、属性、伤害类型、范围、负荷的多选筛选。
- 选择弹窗使用统一 `已筛选` 摘要行展示多选状态，不把选中值塞进表头。
- 来源用于筛选，但不作为表格主列展示。
- 选择弹窗将特性名称和特性描述拆成独立列。
- Disabled 装备包模板不出现在选择弹窗。
- 选择装备包武器或护甲模板后能写入角色卡 equipment slot。
- 装备包模板的 modifierContributions 能继续参与自动化计算。
- 旧手动自定义武器 / 护甲输入入口被移除。

## 测试方向

- Equipment UI store 初始化、重复初始化、初始化失败 diagnostics。
- 管理页初始化失败时显示非阻塞错误提示，并允许重试。
- 选择窗初始化失败时显示错误提示和空列表，不静默显示空结果。
- 全局导入多文件时按文件分组展示成功/失败结果。
- 多文件部分失败时显示汇总状态。
- 管理页装备包导入成功、失败、warning 折叠展示。
- 管理页启用 / 禁用后，选择弹窗可见性变化。
- 管理页删除后，选择弹窗不再显示该包模板。
- 武器选择弹窗支持来源、等级、武器类型、属性、伤害类型、范围、负荷多选筛选。
- 护甲选择弹窗支持来源、等级多选筛选。
- 多选筛选即时生效，并且关闭弹窗后重置。
- 选择 built-in weapon / armor 后，角色卡 slot 与现有行为一致。
- 选择 custom equipment pack weapon / armor 后，角色卡 slot 正确写入。
- 装备包模板 modifierContributions 实例化后参与自动化计算。
- 选择窗不再显示手动自定义武器 / 护甲入口。
- `sheet-store` 不再通过 JSON payload 解析手动自定义装备。
- 移动端内容包管理页无横向滚动，核心入口可见。
