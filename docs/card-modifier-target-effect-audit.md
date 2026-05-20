# 卡牌 Modifier Target 效果审读

日期：2026-05-20

本文审读 `data/cards/builtin-base.json` 中当前内置卡牌文本，整理与现有 modifier target 有关的卡牌效果。目标是为后续“卡牌来源自动化计算”设计提供事实清单。

本文只做效果归类，不定义最终实现方案。

## 审读范围

卡牌包规模：

- 职业：9 张。
- 血统：36 张。
- 社群：9 张。
- 子职业：54 张。
- 领域：189 张。
- 变体：24 张，当前都是野兽形态。

当前已存在的 modifier targets：

- `evasion`
- `armorMax`
- `minorThreshold`
- `majorThreshold`
- `hpMax`
- `stressMax`
- `proficiency`
- `agility.value`
- `strength.value`
- `finesse.value`
- `instinct.value`
- `presence.value`
- `knowledge.value`
- `experienceValues.N`

注意：当前代码中 `armorMax` 实际承载“护甲值”语义，不是“护甲槽上限”这个自然语言概念。卡牌文本中的“护甲值 +1”暂按 `armorMax +1` 记录，但后续设计时应再次确认命名。

## 归类口径

本文把命中项分成三类：

- **直接 target contribution**：能直接映射成现有 target 的 base / modifier / override，例如 `evasion +1`、`hpMax +1`、`majorThreshold + proficiency`。
- **条件或临时 target contribution**：仍作用于现有 target，但需要状态、条件、选择、持续时间或动态公式，例如“处于野兽形态时敏捷 +1 闪避 +2”。
- **近似相关但不应写入当前 target**：文本提到闪避、阈值、护甲槽或熟练度，但实际是单次掷骰、减伤、恢复当前资源、伤害等级降低、召唤物/屏障数值等，不应直接写入角色 Stored Final Value。

## 总体结论

可以直接进入现有 modifier target 模型的卡牌主要有：

- 职业起始生命 / 起始闪避：当前系统已经通过职业来源生成 `hpMax` 和 `evasion` base。
- 血统创建时永久加值：经历、生命槽、压力槽、闪避、阈值。
- 子职业永久加值：阈值、压力槽、生命槽、闪避、严重阈值。
- 领域卡长期/永久加值：`bare-bones`、`untouchable`、`fortified-armor`、`vitality`、`armorer`、`rise-up`、领域恩泽、`master-of-the-craft` 等。
- 野兽形态：几乎每张变体都给临时属性和闪避，部分给临时阈值。

难点主要来自：

- **选择型来源**：例如 `vitality` 选择两项，`master-of-the-craft` 选择经历，德鲁伊希望特性选择属性。
- **条件型来源**：例如“穿着护甲时”“配置中有 4 张某领域卡”“微光或黑暗且被遮蔽时”“希望点至少 2”。
- **状态型来源**：例如野兽形态、狂怒、元素灌注、火力全开。
- **动态公式**：例如 `evasion + agility/2`、阈值 `+ proficiency`、`presence = spellcastTrait`。
- **作用域不是角色面板的效果**：例如“本次攻击熟练度 +1”“本次防御闪避 +1d4”“伤害等级降低一级”。这些不能直接写入全局 `proficiency` 或 `evasion`。

## 职业

### 已有基础来源

所有职业都有 `起始生命` 和 `起始闪避`，对应 `hpMax` 和 `evasion` 的职业 base。当前 `automation/core/source-definitions.ts` 已经消费职业卡中的 `起始生命` 和 `起始闪避`。

| id | 名称 | target | 性质 | 备注 |
|---|---|---|---|---|
| `Bard` | 吟游诗人 | `hpMax = 5`, `evasion = 10` | 创建时 base | 已由职业来源覆盖。 |
| `Druid` | 德鲁伊 | `hpMax = 6`, `evasion = 10` | 创建时 base | 已由职业来源覆盖。 |
| `Guardian` | 守护者 | `hpMax = 7`, `evasion = 9` | 创建时 base | 已由职业来源覆盖。 |
| `Ranger` | 游侠 | `hpMax = 6`, `evasion = 12` | 创建时 base | 已由职业来源覆盖。 |
| `Rogue` | 游荡者 | `hpMax = 6`, `evasion = 12` | 创建时 base | 已由职业来源覆盖。 |
| `Seraph` | 神使 | `hpMax = 7`, `evasion = 9` | 创建时 base | 已由职业来源覆盖。 |
| `Sorcerer` | 术士 | `hpMax = 6`, `evasion = 10` | 创建时 base | 已由职业来源覆盖。 |
| `Warrior` | 战士 | `hpMax = 6`, `evasion = 11` | 创建时 base | 已由职业来源覆盖。 |
| `Wizard` | 法师 | `hpMax = 5`, `evasion = 11` | 创建时 base | 已由职业来源覆盖。 |

### 额外命中效果

| id | 名称 | 字段 | 原文关键句简述 | target | 性质 | 建模备注 |
|---|---|---|---|---|---|---|
| `Druid` | 德鲁伊 | 希望特性 | 花费 3 希望变形成野兽形态时，选择一个属性获得 +1，直到解除野兽形态。 | 六属性 `.value` 之一 | 选择型、临时、形态 | 需要记录激活状态和被选择属性。 |
| `Druid` | 德鲁伊 | 职业特性 | 野兽形态时，获得该形态特性，将形态闪避加值加入闪避值，并使用指定属性攻击。 | `evasion`，以及野兽形态属性 target | 状态型、临时、形态 | 数值来自 `variant` 野兽形态，不在职业卡本身。 |
| `Rogue` | 游荡者 | 希望特性 | 花费 3 希望，闪避值 +2，直到下次攻击成功命中你；否则持续到下次休息。 | `evasion` | 临时、条件结束 | 需要持续状态：被命中或休息时移除。 |

## 血统

| id | 名称 | 原文关键句简述 | target | 性质 | 建模备注 |
|---|---|---|---|---|---|
| `Clank-PurposefulDesign` | 定制设计 | 创建角色时，选择一个经历，永久获得 +1 加值。 | `experienceValues.N` | 创建时、永久、选择型 | 需要用户选择经历索引。 |
| `Faerie-Wings` | 翅膀 | 飞行时，敌人攻击后可标记 1 压力，使该攻击中闪避 +2。 | `evasion` | 单次防御、临时、消耗资源 | 不应写入常驻闪避；适合 roll / defense scoped modifier。 |
| `Galapa-Shell` | 龟甲 | 伤害阈值获得等同于熟练度的加值。 | `minorThreshold`, `majorThreshold` | 永久、动态 | 两个阈值 `+ proficiency`。 |
| `Giant-Endurance` | 坚韧 | 创建角色时获得一个额外生命槽。 | `hpMax` | 创建时、永久 | `hpMax +1`。 |
| `Human-HighStamina` | 精力充沛 | 创建角色时获得一个额外压力槽。 | `stressMax` | 创建时、永久 | `stressMax +1`。 |
| `Simiah-Nimble` | 灵活 | 创建角色时，闪避值永久 +1。 | `evasion` | 创建时、永久 | `evasion +1`。 |

## 社群

无直接命中当前 modifier target 的社群卡。

社群卡主要提供掷骰优势、希望骰替换、动作掷骰临时加值、物品等效果，不改变 `evasion`、阈值、上限、属性或经历值。

## 子职业

| id | 名称 | 原文关键句简述 | target | 性质 | 建模备注 |
|---|---|---|---|---|---|
| `Warden-of-the-Elements-Foundation` | 元素结社基石 | 土元素灌注时，伤害阈值获得等同于熟练度的加值。 | `minorThreshold`, `majorThreshold` | 条件、临时、姿态 | 条件为灌注土元素；持续到严重伤害或下次休息。 |
| `Warden-of-the-Elements-Specialization` | 元素结社专精 | 土元素灵气：盟友力量值 +1。 | `strength.value` | 条件、临时、光环 | 影响盟友，不一定影响自己；当前角色卡系统可能暂不承载盟友 target。 |
| `Warden-of-the-Elements-Mastery` | 元素结社大师 | 火元素：造成伤害的攻击和法术熟练度 +1。 | 近似 `proficiency` | 攻击/法术作用域 | 只影响造成伤害的攻击和法术，不是全局 `proficiency`。 |
| `Warden-of-the-Elements-Mastery` | 元素结社大师 | 风元素：闪避值 +1。 | `evasion` | 条件、临时、姿态 | 条件为灌注风元素。 |
| `Stalwart-Foundation` | 坚毅铁卫基石 | 伤害阈值永久 +1。 | `minorThreshold`, `majorThreshold` | 永久 | 常驻 modifier。 |
| `Stalwart-Specialization` | 坚毅铁卫专精 | 伤害阈值永久 +2。 | `minorThreshold`, `majorThreshold` | 永久 | 常驻 modifier。 |
| `Stalwart-Mastery` | 坚毅铁卫大师 | 伤害阈值永久 +3。 | `minorThreshold`, `majorThreshold` | 永久 | 常驻 modifier。 |
| `Vengeance-Foundation` | 复仇战卫基石 | 获得一个额外压力槽。 | `stressMax` | 永久 | `stressMax +1`。 |
| `Vengeance-Specialization` | 复仇战卫专精 | 敌人伤害近战范围内盟友后，你对该敌人的下一次成功攻击熟练度 +1。 | 近似 `proficiency` | 单次攻击、条件 | 不应改全局熟练度。 |
| `Beastbound-Specialization` | 野兽羁绊专精 | 敌人在伙伴近战范围内攻击你时，对抗该攻击闪避 +2。 | `evasion` | 单次防御、条件 | 依赖伙伴位置。 |
| `Wayfinder-Foundation` | 寻路斥候基石 | 伤害掷骰时可标记 1 压力，使熟练度 +1。 | 近似 `proficiency` | 单次伤害掷骰、消耗资源 | 不应改全局熟练度。 |
| `Wayfinder-Specialization` | 寻路斥候专精 | 专注目标攻击你时，对抗该攻击闪避 +2。 | `evasion` | 单次防御、条件 | 依赖专注目标。 |
| `Nightwalker-Mastery` | 黑夜行者大师 | 闪避值永久 +1。 | `evasion` | 永久 | 常驻 modifier。 |
| `Winged-Sentinel-Mastery` | 翔翼哨兵大师 | 严重伤害阈值永久 +4。 | `majorThreshold` | 永久 | 常驻 modifier。 |
| `Elemental-Origin-Specialization` | 元素起源专精 | 被攻击成功时，标记 1 压力，掷 d6 加到对抗该攻击的闪避值。 | `evasion` | 单次防御、骰值、消耗资源 | 作用域为当前攻击。 |
| `Elemental-Origin-Mastery` | 元素起源大师 | 每长休一次化身，选择两项直到下次休息：严重阈值 +4、一个属性 +1、熟练度 +1、闪避 +2。 | `majorThreshold`, 六属性 `.value`, `proficiency`, `evasion` | 临时、选择型、休息间隔 | 需要记录选择的两项；属性项还需选择具体属性。 |
| `School-of-Knowledge-Foundation` | 知识学派基石 | 运用经历时可标记压力代替希望，且该掷骰的经历调整值翻倍。 | 近似 `experienceValues.N` | 单次掷骰、倍率 | 不改变存储经历值；适合 roll-scoped effective experience。 |
| `School-of-War-Foundation` | 战争学派基石 | 获得一个额外生命槽。 | `hpMax` | 永久 | `hpMax +1`。 |
| `School-of-War-Specialization` | 战争学派专精 | 希望点至少 2 时，将熟练度作为加值加在闪避值上。 | `evasion` | 条件、动态 | `evasion + proficiency`，条件为 hope >= 2。 |

## 领域卡

### 等级 1-3

| id | 名称 | 领域 | 等级 | 原文关键句简述 | target | 性质 | 建模备注 |
|---|---|---|---:|---|---|---|---|
| `i-see-it-coming` | 先见之明 | 骸骨 | 1 | 被近战范围外攻击时，标记 1 压力，获得 `1d4` 闪避加值对抗该攻击。 | `evasion` | 单次防御、骰值、消耗资源 | roll / defense scoped modifier。 |
| `untouchable` | 不可侵犯 | 骸骨 | 1 | 闪避值获得等同于敏捷值一半的加值。 | `evasion`, 依赖 `agility.value` | 长期、动态 | 需要明确向下取整或规则取整；随敏捷变化重算。 |
| `ferocity` | 凶猛残暴 | 骸骨 | 2 | 使敌人标记生命点后，花费 2 希望，闪避提高等同于其标记生命点数，直到下一次对你的攻击后。 | `evasion` | 临时、条件、动态数值 | 需要记录加值数和结束点。 |
| `book-of-ava` | 艾娃之书 | 典籍 | 1 | 塔瓦的护甲：花费 1 希望，使触碰目标护甲值 +1，直到其下次休息或你再次施放。 | `armorMax` | 临时、可施加给目标 | 当前若只支持自己角色卡，需决定是否允许目标为自己。 |
| `gifted-tracker` | 追猎才能 | 贤者 | 1 | 遭遇以此方式追踪到的生物时，与生物对抗时闪避 +1。 | `evasion` | 场景条件、临时 | 条件是“对抗被追踪生物”。 |
| `bare-bones` | 铁骨铮铮 | 勇气 | 1 | 不装备护甲时，基础护甲值为 `3 + 力量`，并按位阶使用基础阈值。 | `armorMax`, `minorThreshold`, `majorThreshold` | 条件、base override、动态 | 更像替代装备 base，不是 additive modifier。 |

近似相关但不应直接写入当前 target：

| id | 名称 | 领域 | 等级 | 相关点 | 说明 |
|---|---|---|---:|---|---|
| `rune-ward` | 符文护符 | 奥术 | 1 | 减少即将到来的伤害 `1d8` | 受伤前减伤，不改变阈值。 |
| `get-back-up` | 卷土重来 | 利刃 | 1 | 严重伤害时降低伤害等级 | damage tier downgrade，不改变阈值。 |
| `scramble` | 快步急闪 | 利刃 | 3 | 避开一次近战伤害 | 避免攻击/伤害，不提供闪避数值。 |
| `brace` | 警戒防备 | 骸骨 | 3 | 额外标记护甲槽来减伤 | 护甲槽消耗规则，不改变 `armorMax`。 |
| `invisibility` | 无影无踪 | 优雅 | 3 | 对隐形目标攻击带劣势 | 状态效果，不改变闪避。 |
| `conjure-swarm` | 召唤虫群 | 贤者 | 2 | 装甲甲虫降低下一次伤害等级 | 临时 ward，不改变阈值。 |
| `voice-of-reason` | 理性之声 | 辉耀 | 3 | 所有压力槽被标记时，伤害掷骰熟练度 +1 | 仅伤害掷骰作用域，不改变全局 `proficiency`。 |
| `i-am-your-shield` | 吾身为盾 | 勇气 | 1 | 替盟友承受攻击时可标记任意数量护甲槽 | 护甲槽消耗规则，不改变 `armorMax`。 |

### 等级 4-6

| id | 名称 | 领域 | 等级 | 原文关键句简述 | target | 性质 | 建模备注 |
|---|---|---|---:|---|---|---|---|
| `deadly-focus` | 致命专注 | 利刃 | 4 | 选择目标后获得 +1 熟练，直到攻击另一个生物、击败该目标或战斗结束。 | `proficiency` | 临时、目标锁定 | 可能是全局熟练度加值，但持续条件依赖目标和战斗状态。 |
| `fortified-armor` | 强化护甲 | 利刃 | 4 | 穿着护甲时，所有伤害阈值 +2。 | `minorThreshold`, `majorThreshold` | 条件、长期 | 条件为穿着护甲。 |
| `vitality` | 蓬勃生命 | 利刃 | 5 | 选择永久获得两项：压力槽、生命槽、所有伤害阈值 +2。 | `stressMax`, `hpMax`, `minorThreshold`, `majorThreshold` | 永久、选择型 | 需要选择两项；卡牌进入宝库后贡献仍保留。 |
| `armorer` | 护甲大师 | 勇气 | 5 | 穿着护甲时，护甲值 +1。 | `armorMax` | 条件、长期 | 条件为穿着护甲。 |
| `rise-up` | 奋起直追 | 勇气 | 6 | 严重伤害阈值获得等同于熟练度的加值。 | `majorThreshold` | 长期、动态 | `majorThreshold + proficiency`。 |

近似相关但不应直接写入当前 target：

| id | 名称 | 领域 | 等级 | 相关点 | 说明 |
|---|---|---|---:|---|---|
| `book-of-exota` | 埃索塔之书 | 典籍 | 4 | 构装体必要时共享你的闪避和属性 | 召唤物读取角色数值，不改变角色本身。 |
| `wild-fortress` | 荒野壁垒 | 贤者 | 5 | 圆顶阈值 15/30 | 场景实体阈值，不改变角色阈值。 |

### 等级 7-10

| id | 名称 | 领域 | 等级 | 原文关键句简述 | target | 性质 | 建模备注 |
|---|---|---|---:|---|---|---|---|
| `blade-touched` | 利刃恩泽 | 利刃 | 7 | 配置中有 4 张或更多利刃领域卡时，严重伤害阈值 +4。 | `majorThreshold` | 条件、长期 | 条件为利刃领域卡数量 >= 4。 |
| `frenzy` | 狂怒出击 | 利刃 | 8 | 狂怒状态时，严重伤害阈值 +8。 | `majorThreshold` | 临时、状态 | 持续到视野范围内无敌人；不能标记护甲槽是额外结算限制。 |
| `bone-touched` | 骸骨恩泽 | 骸骨 | 7 | 配置中有 4 张或更多骸骨领域卡时，敏捷 +1。 | `agility.value` | 条件、长期 | 条件为骸骨领域卡数量 >= 4。 |
| `copycat` | 如法炮制 | 优雅 | 9 | 模仿另一玩家配置中 8 级或更低领域卡特性，持续到下次休息或被模仿卡进入宝库。 | 动态，可能任意 target | 复制效果 | 应引用被复制卡牌效果，不应固定成一条 contribution。 |
| `master-of-the-craft` | 技艺大师 | 优雅 | 9 | 两项经历永久 +2，或一项经历永久 +3。 | `experienceValues.N` | 永久、选择型 | 需要选择经历索引和模式。 |
| `shadowhunter` | 暗影猎手 | 午夜 | 8 | 微光或黑暗中被遮蔽时，闪避 +1。 | `evasion` | 环境条件、临时 | 条件为 dim/dark + obscured。 |
| `splendor-touched` | 辉耀恩泽 | 辉耀 | 7 | 配置中至少 4 张辉耀领域卡时，严重伤害阈值 +3。 | `majorThreshold` | 条件、长期 | 条件为辉耀领域卡数量 >= 4。 |
| `overwhelming-aura` | 威压灵光 | 辉耀 | 9 | 成功并花费希望后，直到下次长休，风度属性值等于施法属性值。 | `presence.value` | 临时、override | 不是加值；是 `presence = spellcastTrait`。 |
| `valor-touched` | 勇气恩泽 | 勇气 | 7 | 配置中有 4 张或更多勇气领域卡时，护甲值 +1。 | `armorMax` | 条件、长期 | 条件为勇气领域卡数量 >= 4。 |
| `full-surge` | 火力全开 | 勇气 | 8 | 每长休一次，标记 3 压力，所有角色属性 +2，直到下次休息。 | 六属性 `.value` | 临时、状态、休息间隔 | 对六项属性各 `+2`。 |

近似相关但不应直接写入当前 target：

| id | 名称 | 领域 | 等级 | 相关点 | 说明 |
|---|---|---|---:|---|---|
| `deathrun` | 死亡奔袭 | 骸骨 | 10 | 第一个目标的武器伤害骰熟练度 +1 | 动作内伤害作用域，不改变全局 `proficiency`。 |
| `sage-touched` | 贤者恩泽 | 贤者 | 7 | 一次敏捷或本能掷骰可使属性翻倍 | 掷骰级属性 override，不改变面板属性。 |
| `codex-touched` | 典籍恩泽 | 典籍 | 7 | 可把熟练度加到一次施法掷骰 | 掷骰加值，不改变 `proficiency`。 |
| `shield-aura` | 护盾灵光 | 辉耀 | 8 | 标记护甲槽时额外降低攻击严重程度 | 护甲槽/伤害等级结算，不改变 `armorMax`。 |
| `forest-sprites` | 森林精魂 | 贤者 | 8 | 盟友标记护甲槽时可额外标记 1 护甲槽 | 护甲槽消耗规则，不改变 `armorMax`。 |
| `unyielding-armor` | 不灭甲胄 | 勇气 | 10 | 本应标记护甲槽时可能降低阈值而无需标记 | 防御结算，不改变 `armorMax` 或阈值。 |

## 变体：野兽形态

所有 24 张变体都是野兽形态。它们的结构化“角色属性”和“闪避值”天然适合建模为形态激活时的临时 card source。部分形态还有临时阈值，少数形态有单次攻击熟练度加值。

| id | 名称 | 位阶 | 直接 target contribution | 近似 / 作用域效果 | 建模备注 |
|---|---|---:|---|---|---|
| `breast-transform-001` | 迅捷斥候 | 1 | `agility.value +1`, `evasion +2` | 无 | 形态激活时应用。 |
| `breast-transform-002` | 居家伴侣 | 1 | `instinct.value +1`, `evasion +2` | 无 | 形态激活时应用。 |
| `breast-transform-003` | 灵巧食草者 | 1 | `agility.value +1`, `evasion +3` | 受攻击本应成功时，可 `evasion +1d4` 对抗该攻击 | 固定形态 contribution 与单次防御 contribution 分开建模。 |
| `breast-transform-004` | 群居捕食者 | 1 | `strength.value +2`, `evasion +1` | 无 | 形态激活时应用。 |
| `breast-transform-005` | 深洋斥候 | 1 | `agility.value +1`, `evasion +2` | 无 | 形态激活时应用。 |
| `breast-transform-006` | 追猎蜘蛛 | 1 | `finesse.value +1`, `evasion +2` | 无 | “灵巧”映射 `finesse.value`。 |
| `breast-transform-007` | 甲壳哨兵 | 2 | `strength.value +1`, `evasion +1` | 壳中减伤使用护甲值 | 壳中规则不改变 `armorMax`。 |
| `breast-transform-008` | 健步行者 | 2 | `agility.value +1`, `evasion +2` | 无 | 形态激活时应用。 |
| `breast-transform-009` | 猛扑捕食者 | 2 | `instinct.value +1`, `evasion +3` | 扑倒时本次攻击熟练度 +2 | 熟练度为攻击内作用域。 |
| `breast-transform-010` | 强大野兽 | 2 | `strength.value +1`, `evasion +3`, `minorThreshold +2`, `majorThreshold +2` | 攻击前标记压力使该攻击熟练度 +1 | 阈值为形态期间临时 contribution。 |
| `breast-transform-011` | 突袭毒蛇 | 2 | `finesse.value +1`, `evasion +2` | 无 | 形态激活时应用。 |
| `breast-transform-012` | 翔空猛禽 | 2 | `finesse.value +1`, `evasion +3`, `minorThreshold -2`, `majorThreshold -2` | 无 | 阈值是形态期间减值。 |
| `breast-transform-013` | 巨型捕食者 | 3 | `strength.value +2`, `evasion +2` | 成功攻击后可花费希望使本次攻击熟练度 +1 | 熟练度为攻击内作用域。 |
| `breast-transform-014` | 翔空巨禽 | 3 | `finesse.value +2`, `evasion +3` | 无 | 形态激活时应用。 |
| `breast-transform-015` | 传奇野兽 | 3 | 被升级形态使用的属性 `+1`, `evasion +2` | 伤害掷骰 +6 | 需要绑定一个位阶 1 形态；属性 target 动态决定。 |
| `breast-transform-016` | 巨型蜥种 | 3 | `instinct.value +2`, `evasion +1`, `minorThreshold +3`, `majorThreshold +3` | 无 | 形态激活时应用。 |
| `breast-transform-017` | 深洋捕食者 | 3 | `agility.value +2`, `evasion +4` | 成功攻击后可花费希望使本次攻击熟练度 +1 | 熟练度为攻击内作用域。 |
| `breast-transform-018` | 传奇混种生物 | 3 | `strength.value +2`, `evasion +3` | 继承所选低位阶形态特性 | 需要组合所选形态的 modifiers。 |
| `breast-transform-019` | 庞然巨兽 | 4 | `strength.value +3`, `evasion +1`, `minorThreshold +2`, `majorThreshold +2` | 无 | “所有伤害阈值”映射当前两个阈值。 |
| `breast-transform-020` | 神话空猎者 | 4 | `finesse.value +3`, `evasion +4` | 无 | 形态激活时应用。 |
| `breast-transform-021` | 神话野兽 | 4 | 被升级形态使用的属性 `+2`, `evasion +3` | 伤害掷骰 +9、伤害骰升级 | 需要绑定一个位阶 1 或 2 形态；属性 target 动态决定。 |
| `breast-transform-022` | 可怖蜥种 | 4 | `strength.value +3`, `evasion +2` | 无 | 形态激活时应用。 |
| `breast-transform-023` | 史诗海兽 | 4 | `agility.value +3`, `evasion +3` | 本应标记护甲槽时可能降低伤害等级 | 防御结算不改变 `armorMax`。 |
| `breast-transform-024` | 神话混种生物 | 4 | `strength.value +3`, `evasion +2` | 继承所选形态特性 | 需要组合所选形态的 modifiers。 |

## 不能直接落入现有 modifier target 的常见效果

审读中反复出现以下效果。它们与战斗结算有关，但不应直接作为当前角色 modifier target：

- 攻击掷骰、施法掷骰、动作掷骰、反应掷骰获得加值或优势。
- 伤害掷骰获得加值、额外骰、骰级提升、最低伤害。
- 恢复当前生命点、清除当前压力点、清除或恢复当前护甲槽。
- 降低即将受到的伤害、降低伤害等级、避免一次攻击、让攻击失败。
- 施加状态，例如隐匿、束缚、脆弱、中毒、眩晕。
- 召唤物、屏障、圆顶、构装体拥有自己的阈值、生命或共享角色数值。
- 对盟友或敌人的 target 产生影响，但当前角色卡只保存自己。

这些效果如果未来要自动化，需要另一个结算层或状态层，而不是直接塞进当前 `Reference Total + Other -> Final Value` 的角色面板数值模型。

## 后续设计要点

后续讨论卡牌自动化时，至少需要回答这些问题：

- 卡牌来源是否作为新的 Known Source 类型进入 registry，例如 `sourceType: "card"`。
- 卡牌 contribution 是否允许条件表达式、动态值、override 值，而不仅是静态 number。
- 临时状态如何启用、关闭、过期，例如野兽形态、狂怒、元素灌注、火力全开。
- 选择型卡牌如何保存参数，例如选择经历、选择属性、选择 `vitality` 的两项。
- 作用域为“单次攻击 / 单次防御 / 单次掷骰”的效果是否进入当前 modifier 系统，还是留给未来 roll/damage resolution 系统。
- 影响盟友、召唤物、屏障或敌人的效果是否属于当前角色卡自动化范围。

