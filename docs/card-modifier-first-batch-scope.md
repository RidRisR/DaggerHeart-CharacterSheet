# 卡牌自动化第一批范围筛选

日期：2026-05-20

本文基于 `docs/card-modifier-target-effect-audit.md` 再做一轮收窄，只保留第一批适合进入角色卡 modifier 自动化的卡牌效果。

第一批目标不是覆盖所有规则自动化，而是只覆盖能稳定反映在角色卡 target 上的数值来源。

## 第一批筛选口径

保留条件：

- 效果会改变当前角色自己的 modifier target。
- 效果能由角色卡上的稳定数据推导，例如已配置卡牌、职业/血统/子职业、装备槽是否有护甲、领域卡数量、等级/位阶、当前熟练度、当前属性值、用户保存的永久选择。
- 效果结果能进入当前 `Reference Total + Other -> Final Value` 模型，或能作为明确的 base / modifier / dynamic modifier / override。

排除条件：

- 依赖战斗现场、敌我位置、具体目标、视野中是否有敌人、是否正在攻击、是否受到攻击、是否造成伤害。
- 依赖临时状态或手动开关状态，例如狂怒、野兽形态、元素灌注、隐匿、遮蔽、飞行、护盾灵光、直到下次休息的法术。
- 依赖休息期间动作，或效果本身只在休息时发生。
- 只影响当前资源或一次性资源流转，例如扣除/恢复生命点、压力点、护甲槽、希望点。
- 只影响攻击掷骰、伤害掷骰、施法掷骰、动作掷骰、反应掷骰，或只给单次掷骰优势/劣势。
- 只影响召唤物、屏障、盟友、敌人，不能稳定写入当前角色卡自己的 target。

## 已覆盖但不属于新增范围

职业卡的 `起始生命` 和 `起始闪避` 已经由当前系统读取并生成职业 base：

- `hpMax`
- `evasion`

因此职业基础值不作为第一批新增工作，只作为现有行为保留。

德鲁伊野兽形态、德鲁伊希望特性、游荡者希望特性都被排除：它们依赖形态或临时持续状态，不属于第一批。

## 第一批新增候选

### 血统

| id | 名称 | 入选效果 | target | 类型 | 参数 |
|---|---|---|---|---|---|
| `Clank-PurposefulDesign` | 定制设计 | 创建角色时，选择一个经历永久 +1。 | `experienceValues.N` | 永久 modifier | 选择经历索引。 |
| `Galapa-Shell` | 龟甲 | 伤害阈值获得等同于熟练度的加值。 | `minorThreshold`, `majorThreshold` | 动态 modifier | 依赖当前 `proficiency`。 |
| `Giant-Endurance` | 坚韧 | 创建角色时获得一个额外生命槽。 | `hpMax` | 永久 modifier | 无。 |
| `Human-HighStamina` | 精力充沛 | 创建角色时获得一个额外压力槽。 | `stressMax` | 永久 modifier | 无。 |
| `Simiah-Nimble` | 灵活 | 创建角色时，闪避值永久 +1。 | `evasion` | 永久 modifier | 无。 |

排除的血统效果主要是飞行时单次闪避、掷骰优势、伤害/武器用法、治疗或叙事能力。

### 子职业

| id | 名称 | 入选效果 | target | 类型 | 参数 |
|---|---|---|---|---|---|
| `Stalwart-Foundation` | 坚毅铁卫基石 | 伤害阈值永久 +1。 | `minorThreshold`, `majorThreshold` | 永久 modifier | 无。 |
| `Stalwart-Specialization` | 坚毅铁卫专精 | 伤害阈值永久 +2。 | `minorThreshold`, `majorThreshold` | 永久 modifier | 无。 |
| `Stalwart-Mastery` | 坚毅铁卫大师 | 伤害阈值永久 +3。 | `minorThreshold`, `majorThreshold` | 永久 modifier | 无。 |
| `Vengeance-Foundation` | 复仇战卫基石 | 获得一个额外压力槽。 | `stressMax` | 永久 modifier | 无。 |
| `Nightwalker-Mastery` | 黑夜行者大师 | 闪避值永久 +1。 | `evasion` | 永久 modifier | 无。 |
| `Winged-Sentinel-Mastery` | 翔翼哨兵大师 | 严重伤害阈值永久 +4。 | `majorThreshold` | 永久 modifier | 无。 |
| `School-of-War-Foundation` | 战争学派基石 | 获得一个额外生命槽。 | `hpMax` | 永久 modifier | 无。 |

排除的子职业效果包括：

- 元素灌注、元素灵气、超凡化形等临时状态。
- 敌人在伙伴近战范围内攻击你、专注目标攻击你、受到攻击成功时等战斗时机。
- 伤害掷骰时熟练度 +1、下一次成功攻击熟练度 +1 等单次掷骰作用域。
- 影响盟友的光环或伙伴升级。
- 运用经历时经历调整值翻倍，因为它不改变存储的 `experienceValues.N`。

### 领域卡

| id | 名称 | 领域 | 等级 | 入选效果 | target | 类型 | 参数 / 条件 |
|---|---|---|---:|---|---|---|---|
| `untouchable` | 不可侵犯 | 骸骨 | 1 | 闪避值获得等同于敏捷值一半的加值。 | `evasion` | 动态 modifier | 依赖 `agility.value`；需确认取整规则。 |
| `bare-bones` | 铁骨铮铮 | 勇气 | 1 | 不装备护甲时，基础护甲值为 `3 + 力量`，并按位阶使用基础伤害阈值。 | `armorMax`, `minorThreshold`, `majorThreshold` | 条件 base / override | 条件为当前未装备护甲；依赖 `strength.value` 和位阶。 |
| `fortified-armor` | 强化护甲 | 利刃 | 4 | 穿着护甲时，所有伤害阈值 +2。 | `minorThreshold`, `majorThreshold` | 条件 modifier | 条件为当前装备护甲。 |
| `vitality` | 蓬勃生命 | 利刃 | 5 | 选择永久获得两项：压力槽、生命槽、所有伤害阈值 +2。 | `stressMax`, `hpMax`, `minorThreshold`, `majorThreshold` | 永久、选择型 modifier | 选择两个选项；阈值选项同时影响两个阈值。 |
| `armorer` | 护甲大师 | 勇气 | 5 | 穿着护甲时，护甲值 +1。 | `armorMax` | 条件 modifier | 条件为当前装备护甲。 |
| `rise-up` | 奋起直追 | 勇气 | 6 | 严重伤害阈值获得等同于熟练度的加值。 | `majorThreshold` | 动态 modifier | 依赖当前 `proficiency`。 |
| `blade-touched` | 利刃恩泽 | 利刃 | 7 | 配置中有 4 张或更多利刃领域卡时，严重伤害阈值 +4。 | `majorThreshold` | 条件 modifier | 条件为当前配置利刃领域卡数量 >= 4。 |
| `bone-touched` | 骸骨恩泽 | 骸骨 | 7 | 配置中有 4 张或更多骸骨领域卡时，敏捷 +1。 | `agility.value` | 条件 modifier | 条件为当前配置骸骨领域卡数量 >= 4。 |
| `splendor-touched` | 辉耀恩泽 | 辉耀 | 7 | 配置中至少 4 张辉耀领域卡时，严重伤害阈值 +3。 | `majorThreshold` | 条件 modifier | 条件为当前配置辉耀领域卡数量 >= 4。 |
| `valor-touched` | 勇气恩泽 | 勇气 | 7 | 配置中有 4 张或更多勇气领域卡时，护甲值 +1。 | `armorMax` | 条件 modifier | 条件为当前配置勇气领域卡数量 >= 4。 |
| `master-of-the-craft` | 技艺大师 | 优雅 | 9 | 两项经历永久 +2，或一项经历永久 +3。 | `experienceValues.N` | 永久、选择型 modifier | 选择模式和经历索引。 |

排除的领域卡效果包括：

- `i-see-it-coming`、`ferocity`、`gifted-tracker`：依赖受到攻击、敌人标记生命点或遭遇特定生物。
- `book-of-ava`：临时施法，持续到休息或再次施放。
- `deadly-focus`：依赖选择目标、是否攻击其他生物、目标是否被击败、战斗是否结束。
- `frenzy`：狂怒状态和视野中是否有敌人都不在第一批角色卡稳定数据范围内。
- `shadowhunter`：依赖光照、遮蔽和环境。
- `overwhelming-aura`：施法成功后的临时 override，持续到下次长休。
- `full-surge`：临时状态，持续到下次休息。
- `copycat`：依赖另一玩家配置和临时复制目标。
- 所有攻击/伤害/施法掷骰加值、资源恢复、伤害等级降低、召唤物或屏障效果。

## 变体：野兽形态

24 张野兽形态变体本身有大量属性、闪避和阈值加值，但全部依赖“处于野兽形态”这一临时状态。因此它们不进入第一批。

这些卡适合放到后续“状态型卡牌来源”或“形态系统”设计中处理，而不是混进第一批常驻/结构化 target 自动化。

## 第一批候选能力类型

筛选后，第一批只需要支持以下能力类型：

- 静态永久 modifier：固定 `+N` 或 `-N`。
- 选择型永久 modifier：用户选择经历或升级选项后保存参数。
- 动态 modifier：值依赖当前 `proficiency`、属性值或等级/位阶。
- 角色卡可推导条件 modifier：装备是否有护甲、某领域卡配置数量是否达到 4 张。
- 条件 base / override：`bare-bones` 这类无护甲时替代护甲与阈值基础来源。

第一批不需要支持：

- 临时状态开关。
- 回合、战斗、目标、敌人、盟友、位置、视野、环境条件。
- 单次掷骰或伤害结算作用域。
- 资源消耗和恢复。
- 召唤物、屏障、盟友或敌人的独立数值。

## 第一批新增候选汇总

按新增工作量估算，第一批候选共有：

- 血统：5 个效果。
- 子职业：7 个效果。
- 领域卡：11 个效果。
- 职业：0 个新增效果，起始生命和起始闪避已由现有职业来源覆盖。
- 社群：0 个效果。
- 变体：0 个效果，留到状态型来源设计。

合计：23 个新增卡牌自动化候选效果。

