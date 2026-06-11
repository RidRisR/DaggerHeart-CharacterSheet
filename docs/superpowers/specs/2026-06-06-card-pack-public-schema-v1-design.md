# Card Pack Public Schema v1 Deferred Exploration

日期：2026-06-06
状态：Obsolete for current branch / 未来探索记录

> 本文不再作为当前分支的实施设计依据。
>
> `daggerheart.card-pack.v1` 仅保留为未来国际化或全新生态阶段的探索参考。当前分支不实现、不导出、不内部化该格式。
>
> 当前分支设计见：
>
> `docs/superpowers/specs/2026-06-06-content-bundle-editor-and-thin-dhcb-design.md`

## 目的

本文记录 `daggerheart.card-pack.v1` 的探索过程和已经形成的字段命名参考。它建立在 `2026-06-06-card-pack-schema-discovery.md` 的事实调研之上，但当前结论是：**不在近期推出新的 card pack public schema，不把 v1 作为默认导出格式，也不把 v1 作为 card-only 分发格式。**

核心原因：

- 当前 legacy card pack JSON、legacy DHCB `cards.json` 和现有 editor export 已经对外发布，属于 **Legacy Published Format**。
- card-only pack 若改用新格式，会破坏旧版本兼容预期，并撕裂创作者生态。
- 本轮重构的初衷是解决卡牌导入和加载 workflow 的技术债，而不是重定义已经公布很久的公开契约。
- 现有问题可以在完善 Legacy Published Format 导入 workflow 的基础上解决。

本文后续内容只作为内部 normalized model、命名讨论和未来可能的 v1-only 能力参考。任何实现计划都不应把本文当作近期 public schema 交付依据。

## 当前决策

- **推迟 `daggerheart.card-pack.v1`。**
- **Legacy Published Format 继续作为近期公开卡包契约。**
- **可以公开 Legacy Published Format JSON Schema，用来标准化旧格式，而不是发布新格式。**
- **card-only export 默认继续输出 legacy-compatible JSON / DHCB。**
- **card import refactor 的近期目标是 workflow modernization：format detection、structured diagnostics、validation、normalize、conflict check、atomic commit、index-last visibility。**
- **近期内部只使用保守的 Card Pack Import Model 作为导入 staging shape；它不是 public schema，不要求创作者理解，也不作为默认导出格式。**
- **只有当 legacy 格式无法表达明确的新卡牌能力时，才重新评估 public v1。**
- **若未来启用 v1，必须先设计 compatibility export / downgrade diagnostics，且不能让 card-only 默认导出旧版本不可读文件。**

## 已定原则

- 以下原则仅适用于 future v1 的历史探索参考，不代表近期公开格式承诺；Card Pack Import Model 不应直接继承本文字段设计。
- 若未来重新启用 v1，新增能力才在 `daggerheart.card-pack.v1` 上演进。
- Future v1 使用英文 JSON 字段名。
- 旧中文字段格式继续兼容导入，并作为 Legacy Published Format 保留导出能力；但不作为新增能力的主要演进目标。
- 新版本编辑器不能默认制造旧版本不可读的卡包。
- 若未来重新启用 v1，编辑器导出也必须保持 legacy-compatible export 为 card-only 默认路径；v1 / content bundle export 只能作为显式面向新版本和未来能力的路径。
- 如果卡包使用了 v1-only 能力，legacy export 必须给出 downgrade diagnostics；可降级则提示信息损失，不可降级则阻止导出并说明原因。
- `version` 是 pack author 维护的内容版本字符串，不要求 semver；只做字符串类型、trim 后非空和最大长度校验。
- 顶层 `profession` 改名为 `class`。
- 不引入通用 `definitions` / `customFieldDefinitions` 结构。
- 内容本身是主要事实来源；可从卡牌内容推导的概念列表不要求作者重复定义。
- Future v1 的字段命名优先采用官方规则书 card anatomy 术语。
- 内部 runtime / canonical model 可以保留实现术语，但必须由 adapter 明确映射到公开 schema 术语。
- 不为了跨卡型统一而覆盖官方术语；例如领域卡官方叫 `Type` / `Feature`，公开 schema 就使用 `type` / `feature`。
- 官方术语优先不能强迫 Legacy Published Format 做语义拆分。Future v1 必须能从已发布旧格式稳定、低损转换。
- `name`、`class`、`domain`、`variant type` 等概念引用值可以是中文。
- 不自动生成不可预测的概念 id。外部包应能通过 `"class": "战士"` 把子职业挂到系统已有职业上。
- Card `id` 仍然是卡牌身份标识，必须稳定且唯一。
- Future v1 按卡牌领域分区；领域内部只在有天然父子结构时分组。
- `footer` 是每张卡自己的可选底部文字，偏风味或展示，不参与规则解析。
- `description` 只用于 package / group metadata，或官方 anatomy 明确使用 description 的位置；单张卡规则正文不因为 legacy `描述` 而机械命名为 `description`。
- 图片字段暂不进入核心 schema 示例；DHCB / bundle asset 关系由 container 和 adapter 处理。

## 命名原则

若未来重新启用 Public Schema v1，它将面向 pack author、AI 生成工具和编辑器导出。字段名应优先匹配官方规则书中的 card anatomy，而不是旧中文字段名或当前 runtime model 字段名。

命名优先级：

1. 官方 card anatomy 英文术语。
2. 能从 Legacy Published Format 稳定、低损转换的字段边界。
3. 已被系统和创作者长期理解的领域概念名，例如 `class`、`domain`、`community`、`ancestry`。
4. 为了避免 JSON 上下文歧义而增加的限定词，例如 `recallCost`。
5. 内部实现术语只允许出现在 canonical / runtime / adapter 层，不直接暴露为 Public Schema 字段。

已确认的官方术语：

| Card Area | Official Term | Public v1 Field |
| --- | --- | --- |
| Class | Domains | `domains` |
| Class | Starting Evasion | `startingEvasion` |
| Class | Starting Hit Points | `startingHitPoints` |
| Class | Class Items | `classItems` |
| Class | Hope Feature | `hopeFeature` |
| Class | Class Features | `classFeatures` |
| Domain | Level | `level` |
| Domain | Domain | `domain` |
| Domain | Recall Cost | `recallCost` |
| Domain | Title | `name` |
| Domain | Type | `type` |
| Domain | Feature | `featureText` |
| Ancestry | Ancestry title | group `name` |
| Ancestry | Ancestry description | group `description` |
| Ancestry | Ancestry Features | group `cards` with per-card `featureText` |
| Community | Community description | `description` |
| Community | Community Feature title | `feature` |
| Community | Community Feature text | `featureText` |
| Subclass | Subclass intro / play guidance | group `description` |
| Subclass | Foundation Feature(s) | `cards.foundation.featureText` |
| Subclass | Specialization Feature | `cards.specialization.featureText` |
| Subclass | Mastery Feature | `cards.mastery.featureText` |

仍需进一步复核的区域：

- 通用底部文字是否存在官方名称；当前暂用 `footer` 表示未来卡牌底部展示文字。

## 顶层结构

草案结构：

```json
{
  "format": "daggerheart.card-pack.v1",
  "name": "Example Card Pack",
  "version": "First Release",
  "author": "Author",
  "description": "Optional package description",
  "cards": {
    "class": [],
    "ancestry": [],
    "community": [],
    "subclass": [],
    "domain": [],
    "variants": []
  }
}
```

顶层字段语义：

- `format`：固定为 `daggerheart.card-pack.v1`。
- `name`：卡牌包显示名称。
- `version`：作者自定义内容版本字符串。
- `author`：可选作者信息。
- `description`：可选包级描述；这里是 package metadata，不是卡牌规则正文。
- `cards`：按卡牌领域组织的内容。

## 分组策略

采用“按领域分区 + 必要处结构化分组”：

- `class`：数组，每项是一张职业卡。
- `domain`：数组，每项是一张领域卡。
- `community`：数组，每项是一张社群卡。
- `subclass`：分组数组，每项是一个完整子职业，内部包含三张阶段卡。
- `ancestry`：分组数组，每项是一个完整种族，内部包含两张特性卡。
- `variants`：分组数组，每项是一类变体卡，内部包含该类型下的变体卡。

分组不是为了抽象统一模型，而是为了保留作者实际维护的领域结构：

- 子职业天然是 `class + subclass name + foundation/specialization/mastery`。
- 种族天然是同一种族下的两张特性卡。
- 变体天然需要按 `type` 分组，避免不同变体类型在一个数组里随机混排。

## 通用卡牌字段

多数卡牌至少包含身份和显示字段：

```json
{
  "id": "string",
  "name": "string",
  "footer": "optional string"
}
```

字段语义：

- `id`：卡牌身份标识，包内不可重复，导入时还要检查与系统已有卡牌冲突。
- `name`：卡牌显示名。
- `footer`：可选底部文字，偏风味或展示。

规则正文使用 `featureText`，除非官方术语和现有数据边界已经提供更明确的字段，例如职业卡的 `hopeFeature` / `classFeatures`。`feature` 只在存在独立 feature title，且它不是该卡的 `name` 时使用；目前只用于 `community`。

## Class

`cards.class` 每项是一张职业卡：

```json
{
  "id": "warrior",
  "name": "战士",
  "footer": "战士是训练有素的武斗者。",
  "hint": "适合希望站在前线、承受压力并稳定输出的角色。",
  "domains": ["剑刃", "骸骨"],
  "startingHitPoints": 6,
  "startingEvasion": 11,
  "classItems": "一把基础武器、一套基础护甲、若干个人物品。",
  "hopeFeature": "当你使用希望特性时，...",
  "classFeatures": "当你进行近战攻击时，..."
}
```

字段映射：

| Public v1 | Legacy |
| --- | --- |
| `id` | `id` |
| `name` | `名称` |
| `hint` | `简介` |
| `domains[0]` | `领域1` |
| `domains[1]` | `领域2` |
| `startingHitPoints` | `起始生命` |
| `startingEvasion` | `起始闪避` |
| `classItems` | `起始物品` |
| `hopeFeature` | `希望特性` |
| `classFeatures` | `职业特性` |
| `footer` | legacy 无稳定来源 |

校验规则：

- `id` 必须是非空字符串，并满足 card id 规则。
- `name` 是职业概念名，可以是中文。
- `hint` 建议必填，因为它承接当前职业选择 UI 的实际用途。
- `footer` 可选。
- `domains` 必须刚好包含两个非空字符串。
- `domains` 的值是领域概念引用，可以引用系统已有领域，也可以引用同包 `cards.domain[].domain`。
- `startingHitPoints` 必须是正整数。
- `startingEvasion` 必须是非负整数。
- `classItems` 暂时保持字符串，不在 card schema 中结构化成装备引用。
- `hopeFeature` 和 `classFeatures` 是 markdown-capable string。

## Domain

`cards.domain` 每项是一张领域卡：

```json
{
  "id": "rune-ward",
  "name": "符文护符",
  "level": 1,
  "domain": "奥术",
  "recallCost": 0,
  "type": "法术",
  "featureText": "你拥有一件意义深远的个人小饰品，可以注入防护魔法，...",
  "footer": "可选的底部文字。"
}
```

字段映射：

| Public v1 | Legacy |
| --- | --- |
| `id` | `id` |
| `name` | `名称` |
| `level` | `等级` |
| `domain` | `领域` |
| `recallCost` | `回想` |
| `type` | `属性` |
| `featureText` | `描述` |
| `footer` | legacy 无稳定来源 |

校验规则：

- `id` 必须是非空字符串，并满足 card id 规则。
- `name` 是领域卡标题。
- `level` 必须是 1 到 10 的整数。
- `domain` 是领域概念名，可以被 `cards.class[].domains` 引用。
- `recallCost` 必须是非负整数。
- `type` 使用官方 Domain Card Type。Future v1 可先保持字符串，允许中文值；adapter 可以支持英文 alias。
- `featureText` 是 markdown-capable string。
- `footer` 可选。

## Ancestry

`cards.ancestry` 每项是一个完整种族 group。虽然官方文本称为 Ancestry Features，但当前系统和 Legacy Published Format 中每个 feature 都是独立 ancestry card，因此 Future v1 可保留 `cards` 容器和每张卡的 `id`。

```json
{
  "name": "精灵",
  "description": "精灵通常是高挑的类人生物，拥有尖耳和敏锐感官。...",
  "cards": [
    {
      "id": "Elf-QuickReactions",
      "name": "快速反应",
      "featureText": "标记 1 压力点，在反应掷骰上获得优势。",
      "footer": "可选的底部文字。"
    },
    {
      "id": "Elf-CelestialTrance",
      "name": "星界冥想",
      "featureText": "休息期间，你可以进入冥想状态，选择一个额外的休整行动。"
    }
  ]
}
```

字段映射：

| Public v1 | Legacy |
| --- | --- |
| group `name` | 每张 legacy ancestry card 的 `种族` |
| group `description` | 每张 legacy ancestry card 的 `简介` |
| `cards[]` order | legacy `类别` 排序结果 |
| card `id` | `id` |
| card `name` | `名称` |
| card `featureText` | `效果` |
| card `footer` | legacy 无稳定来源 |

校验规则：

- group `name` 是种族概念名，可以是中文。
- group `description` 可选但推荐。
- `cards` 必须刚好包含两张 ancestry card。
- 每张 ancestry card 必须有 `id`、`name`、`featureText`。
- 每张 ancestry card 的 `id` 必须全局唯一。
- `footer` 可选。
- Future v1 不保留 legacy `类别` 字段；Legacy Source Adapter 可按 `类别` 排序后写入 `cards`。
- 如果同一种族两张 legacy card 的 `简介` 不一致，adapter 应给出 warning，并优先使用第一张非空简介。

## Community

`cards.community` 每项是一张社群卡：

```json
{
  "id": "HIGHBORNE",
  "name": "高城之民",
  "description": "作为高城之民的一分子，意味着你在充满优雅、奢华和极具声望的上流社会中生活。",
  "feature": "高人一等",
  "featureText": "你在与贵族交际、议价或利用你的声誉来达到目的的掷骰中具有优势。",
  "footer": "可选的底部文字。"
}
```

字段映射：

| Public v1 | Legacy |
| --- | --- |
| `id` | `id` |
| `name` | `名称` |
| `description` | `简介` |
| `feature` | `特性` |
| `featureText` | `描述` |
| `footer` | legacy 无稳定来源 |

校验规则：

- `id` 必须是非空字符串，并满足 card id 规则。
- `name` 是社群概念名，可以是中文。
- `description` 对应官方 community description，可选但推荐。
- `feature` 是 Community Feature 标题。
- `featureText` 是 Community Feature 规则正文，使用 markdown-capable string。
- `footer` 可选。
- 官方文本中的 adjectives 不进入 Future v1 核心 schema。
- Legacy aliases 例如 `社群`、`社群能力`、`效果` 属于 adapter 兼容细节，不进入 Future v1。

## Subclass

`cards.subclass` 每项是一个完整子职业 group：

官方文本会把阶段内容写成 Foundation / Specialization / Mastery Feature(s)，但 Legacy Published Format 只有每张阶段卡的一整段 `描述`。Future v1 不应要求把这段 markdown 拆成 feature title 和 feature body，避免无法从旧格式稳定、低损映射。

```json
{
  "class": "吟游诗人",
  "name": "游唱乐手",
  "spellcastTrait": "风度",
  "description": "Play the Troubadour if you want to inspire allies with music and performance.",
  "cards": {
    "foundation": {
      "id": "Troubadour-Foundation",
      "name": "游唱乐手基石",
      "featureText": "***天赋艺者：*** 描述你如何为他人演奏乐曲。...",
      "footer": "可选的底部文字。"
    },
    "specialization": {
      "id": "Troubadour-Specialization",
      "name": "游唱乐手专精",
      "featureText": "***首席乐师：*** 你的激励之歌能让聆听者勇气倍增。..."
    },
    "mastery": {
      "id": "Troubadour-Mastery",
      "name": "游唱乐手大师",
      "featureText": "***乐坛泰斗：*** 你已臻技艺巅峰，造诣深不可测。..."
    }
  }
}
```

字段映射：

| Public v1 | Legacy |
| --- | --- |
| group `class` | 每张 legacy subclass card 的 `主职` |
| group `name` | 每张 legacy subclass card 的 `子职业` |
| group `spellcastTrait` | 每张 legacy subclass card 的 `施法` |
| group `description` | legacy 无稳定来源 |
| `cards.foundation` | `等级 === "基石"` 的 legacy subclass card |
| `cards.specialization` | `等级 === "专精"` 的 legacy subclass card |
| `cards.mastery` | `等级 === "大师"` 的 legacy subclass card |
| phase card `id` | `id` |
| phase card `name` | `名称` |
| phase card `featureText` | `描述` |
| phase card `footer` | legacy 无稳定来源 |

校验规则：

- `class` 是职业概念引用，可以引用系统已有 class，也可以引用同包 `cards.class[].name`。
- `name` 是子职业概念名。
- 同一个最终内容集合中，`class + name` 不能重复定义同一个子职业。
- `spellcastTrait` 是施法属性或不可施法标记，具体枚举由后续字段细化决定。
- `description` 可选，对应官方 subclass intro / play guidance。
- `cards` 必须刚好包含 `foundation`、`specialization`、`mastery`。
- Future v1 不暴露 legacy `未知` 阶段。
- 三张阶段卡的 `id` 必须全局唯一。
- 每张阶段卡必须有 `id`、`name`、`featureText`。
- Legacy adapter 导入旧平铺 subclass 时，按 `主职 + 子职业` 分组三张卡。
- 缺少阶段卡在 Future v1 中是错误；legacy compatibility 层是否自动补全属于 adapter 兼容策略，必须给出 warning。
- `backgroundQuestions` / `connections` 不进入 Future v1 核心 schema。

## Variants

`cards.variants` 使用分组结构。字段名保持 `variants`，不引入 `variantGroups`。

Variant 是项目扩展卡型，不是稳定的官方 card anatomy。Future v1 应优先满足 Low-Loss Legacy Mapping，不解析 Beastform 或其他 variant 的 markdown 正文。

结构：

```json
{
  "type": "野兽形态",
  "cards": [
    {
      "id": "wolf-form",
      "name": "狼形态",
      "subtype": "狼",
      "level": 1,
      "featureText": "（狼等）\n***角色属性***：力量+2 闪避值+1\n\n***攻击掷骰***：近战 力量 d8+2 物理\n\n...",
      "summaryItems": {
        "item1": "T1",
        "item2": "力量"
      },
      "footer": "可选的底部文字。"
    }
  ]
}
```

已定原则：

- `type` 是变体类型概念名，可以是中文。
- `type` 不需要预先出现在 `definitions` 中。
- 同一组内的卡牌不重复写 `variantType`。
- `subtype` 是可选显示/分类字段，对应 legacy `子类别`。
- `level` 是可选等级字段，对应 legacy `等级`。
- `featureText` 是规则正文，对应 legacy `效果`。
- `summaryItems` 是可选选择列表显示信息，对应 legacy `简略信息`。Future v1 可保留 `item1` / `item2` / `item3`，不强行推断语义字段。
- 旧 `customFieldDefinitions.variantTypes` 是 legacy input；adapter 可以用它辅助分组，但 Future v1 不承诺保留其中的 `description`、`subclasses` 或 `levelRange`。
- 不解析 Beastform 正文中的 `角色属性`、`攻击掷骰`、`获得优势` 等 markdown 段落。

## 尚未细化

后续需要继续逐项确认：

- `spellcastTrait` 枚举值是否沿用中文属性名，还是允许英文 canonical alias。
- 图片与 asset reference 在 JSON schema、DHCB 和 content bundle 中的边界。
- Legacy compatibility matrix：纯 JSON、legacy DHCB、editor export、新 content bundle 中分别允许哪些输入形态。
