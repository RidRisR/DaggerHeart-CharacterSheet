# Card Automation Phase 1 Fixture Matrix

日期：2026-06-22

状态：Draft for confirmation / 待确认清单

## Purpose

本文列出 Card Automation DSL Phase 1 的候选验收 fixture。它不是实现计划，也不是卡牌规则完整自动化承诺。

主设计文档只定义能力边界；本文把边界落到具体卡牌上，供实现计划和测试用例确认。

## Sources Checked

- `data/cards/builtin-base.json`
- `.local-fixtures/card-packs/actual/void1.5-10.31-ris-.dhcb.storage.json`
- `.local-fixtures/card-packs/actual/void1.5卡牌整合包10.31-贡献-ris-酸奶-c5bd67b7.storage.json`

Void1.5 来源是本地 fixture，不是公开 fixture 契约。实现计划可以把其中确认过的条目转成稳定 regression fixture。

## Inclusion Rules

进入 Phase 1 must-support 的卡牌必须满足：

- 自动化结果能收敛为现有 modifier 系统的 `base` 或 `modifier` contribution。
- 只读取 pre-card snapshot、卡牌实例 IR 和 `CardAbilityState`。
- 不依赖战斗窗口、攻击过程、休息资源、骰子、敌人、距离、场景或 GM 即时裁定。
- 不要求 resolver 写入角色存档。
- 若需要用户输入，输入必须能表达为 Phase 1 choice。

同一张卡可以只支持其中稳定可推导的一部分。未纳入部分必须在测试 fixture 中显式标注为 deferred，而不是静默忽略。

## Must Support From `builtin-base`

| Source group | Card id | Card name | Phase 1 automation | Expected contribution | Required IR capability | Deferred text |
| --- | --- | --- | --- | --- | --- | --- |
| `ancestry` | `Simiah-Nimble` | 灵活 | 创建角色时闪避永久 +1 | `evasion` modifier +1 | fixed modifier | 无 |
| `ancestry` | `Giant-Endurance` | 坚韧 | 创建角色时生命槽 +1 | `hpMax` modifier +1 | fixed modifier | 无 |
| `ancestry` | `Human-HighStamina` | 精力充沛 | 创建角色时压力槽 +1 | `stressMax` modifier +1 | fixed modifier | 无 |
| `ancestry` | `Clank-PurposefulDesign` | 定制设计 | 创建角色时选择一个经历，永久 +1 | selected `experienceValues.N` modifier +1 | targetSelectMany experiences, permanentOnceClaimed | 决定创造者和创造目的的叙事文本 |
| `ancestry` | `Galapa-Shell` | 龟甲 | 伤害阈值 += 熟练度 | `minorThreshold` modifier + proficiency; `majorThreshold` modifier + proficiency | read proficiency, emit modifier | 无 |
| `subclass` | `Stalwart-Foundation` | 坚毅铁卫基石 | 伤害阈值永久 +1 | `minorThreshold` modifier +1; `majorThreshold` modifier +1 | fixed modifier | 额外标记护甲槽降低伤害等级 |
| `subclass` | `Stalwart-Specialization` | 坚毅铁卫专精 | 伤害阈值永久 +2 | `minorThreshold` modifier +2; `majorThreshold` modifier +2 | fixed modifier | 替邻近盟友标记护甲槽降低伤害等级 |
| `subclass` | `Stalwart-Mastery` | 坚毅铁卫大师 | 伤害阈值永久 +3 | `minorThreshold` modifier +3; `majorThreshold` modifier +3 | fixed modifier | 冲刺替盟友承受伤害 |
| `subclass` | `Nightwalker-Mastery` | 黑夜行者大师 | 闪避永久 +1 | `evasion` modifier +1 | fixed modifier | 阴影移动距离、隐匿状态和压力消耗 |
| `subclass` | `School-of-War-Foundation` | 战争学派基石 | 额外生命槽 +1 | `hpMax` modifier +1 | fixed modifier | 恐惧成功时额外魔法伤害 |
| `subclass` | `Vengeance-Foundation` | 复仇战卫基石 | 额外压力槽 +1 | `stressMax` modifier +1 | fixed modifier | 近战敌人攻击成功后的反击 |
| `subclass` | `Winged-Sentinel-Mastery` | 翔翼哨兵大师 | 严重伤害阈值永久 +4 | `majorThreshold` modifier +4 | fixed modifier | 飞行时辉光羽翼额外伤害 |
| `domain` | `fortified-armor` | 强化护甲 | 穿着护甲时，所有伤害阈值 +2 | `minorThreshold` modifier +2; `majorThreshold` modifier +2 | equipmentSlotFilled armor, emitWhen | 无 |
| `domain` | `bare-bones` | 铁骨铮铮 | 未装备护甲时提供基础护甲和基础阈值 | `armorMax` base = 3 + strength; `minorThreshold` base by tier; `majorThreshold` base by tier | equipmentSlotEmpty, read attribute, valueByTier, emitBase | 无 |
| `domain` | `vitality` | 蓬勃生命 | 从三项奖励中选择两项永久获得 | choice 后输出所选两项：`stressMax` +1, `hpMax` +1, 或 thresholds +2 | selectMany static options, permanentOnceClaimed, option effects | “然后将此牌永久放入宝库” lifecycle |
| `domain` | `master-of-the-craft` | 技艺大师 | 选择两项经历 +2，或一项经历 +3 | selected `experienceValues.N` modifier +2/+3 | linear choice chain, targetSelectMany experiences, emitEachSelectedTarget | “然后将此卡牌永久放入宝库” lifecycle |
| `domain` | `untouchable` | 不可侵犯 | 闪避值 += 敏捷值一半，默认向上取整 | `evasion` modifier + ceil(agility / 2) | read attribute, divide, ceil, emit modifier | 无 |
| `domain` | `armorer` | 护甲大师 | 穿着护甲时，护甲值 +1 | `armorMax` modifier +1 | equipmentSlotFilled armor, emitWhen | 休息期间修理护甲时盟友清除护甲槽 |
| `domain` | `rise-up` | 奋起直追 | 严重伤害阈值 += 熟练度 | `majorThreshold` modifier + proficiency | read proficiency, emit modifier | 因攻击标记生命点时清除压力 |

### Domain Touched Cards From `builtin-base`

领域恩泽类卡牌只纳入能稳定产出当前自动化 target 的部分。攻击掷骰、施法掷骰、每次休息一次、资源替代、伤害骰等部分暂不进入 Phase 1。

| Source group | Card id | Card name | Phase 1 automation | Expected contribution | Required IR capability | Deferred text |
| --- | --- | --- | --- | --- | --- | --- |
| `domain` | `blade-touched` | 利刃恩泽 | 当前配置中利刃领域卡 >= 4 时，严重伤害阈值 +4 | `majorThreshold` modifier +4 | cardCount by domain/classification, emitWhen | 攻击掷骰 +2 |
| `domain` | `bone-touched` | 骸骨恩泽 | 当前配置中骸骨领域卡 >= 4 时，敏捷 +1 | `agility` modifier +1 | cardCount by domain/classification, emitWhen | 花费希望点使攻击失败 |
| `domain` | `splendor-touched` | 辉耀恩泽 | 当前配置中辉耀领域卡 >= 4 时，严重伤害阈值 +3 | `majorThreshold` modifier +3 | cardCount by domain/classification, emitWhen | 生命点伤害替代支付压力 / 希望 |
| `domain` | `valor-touched` | 勇气恩泽 | 当前配置中勇气领域卡 >= 4 时，护甲值 +1 | `armorMax` modifier +1 | cardCount by domain/classification, emitWhen | 标记生命且未标记护甲槽时恢复护甲槽 |

以下领域恩泽类暂不纳入 Phase 1 must-support，因为其增益不落入当前 automation target 或依赖运行时语境：

- `arcana-touched` / 奥术恩泽：施法掷骰、休息一次交换希望 / 恐惧。
- `codex-touched` / 典籍恩泽：施法掷骰加熟练度、宝库换牌。
- `grace-touched` / 优雅恩泽：资源替代、伤害标记替代。
- `midnight-touched` / 午夜恩泽：0 希望、恐惧点、成功攻击后伤害。
- `sage-touched` / 贤者恩泽：自然环境、掷骰前临时属性翻倍。

## Must Support From Void1.5

| Source group | Card id | Card name | Phase 1 automation | Expected contribution | Required IR capability | Deferred text |
| --- | --- | --- | --- | --- | --- | --- |
| `profession` | `VOID-1.5整合卡牌包-RidRisR-prof-格斗家` | 格斗家 | 未装备任何武器时闪避 +1 | `evasion` modifier +1 | all(primaryWeapon empty, secondaryWeapon empty), emitWhen | 徒手攻击视为武器、伤害骰、连击骰、升级连击骰 |
| `ancestry` | `VOID-1.5整合卡牌包-RidRisR-ance-石肤` | 石肤 | 护甲值和伤害阈值 +1 | `armorMax` modifier +1; `minorThreshold` modifier +1; `majorThreshold` modifier +1 | fixed modifier | 无 |
| `subclass` | `VOID-1.5整合卡牌包-RidRisR-subc-重拳主宰专精` | 重拳主宰专精 | 严重伤害阈值永久 +3 | `majorThreshold` modifier +3 | fixed modifier | 蛮力巨擘目标数、以眼还眼反应掷骰 |
| `variant` | `VOID-1.5整合卡牌包-RidRisR-vari-稳健` | 稳健 | 闪避 -1 | `evasion` modifier -1 | fixed modifier | 成功攻击造成伤害时额外伤害骰并弃最低 |
| `variant` | `VOID-1.5整合卡牌包-RidRisR-vari-坚定` | 坚定 | 伤害阈值 +2 | `minorThreshold` modifier +2; `majorThreshold` modifier +2 | fixed modifier | 无法被强制移动 |

## Explicitly Not In Phase 1

这些卡牌或能力出现在已检查来源中，但不应作为第一阶段自动化验收：

| Source | Card id / name | Reason |
| --- | --- | --- |
| `builtin-base` | `Simiah-NaturalClimber` / 天生攀爬者 | 特定情境下敏捷掷骰优势，不是稳定 sheet target |
| `builtin-base` | `Giant-Reach` / 长臂 | 武器 / 能力范围解释，不是 current modifier target |
| `builtin-base` | `Human-Adaptability` / 随机应变 | 掷骰失败后标记压力重掷 |
| `builtin-base` | `Galapa-Retract` / 缩壳 | 临时状态、压力消耗、抗性、劣势、移动限制 |
| `builtin-base` | `School-of-War-Specialization` / 召唤护盾 | 希望点至少 2 时闪避 += 熟练度；依赖当前 hope，Phase 1 不读取 |
| `builtin-base` | `unbreakable` / 坚不可摧 | 标记最后生命点时改为恢复生命并入宝库，运行时触发 |
| Void1.5 | `VOID-1.5整合卡牌包-RidRisR-ance-坚定难移` / 坚定难移 | 无法被违愿移动，不是 current modifier target |
| Void1.5 | `VOID-1.5整合卡牌包-RidRisR-subc-重拳主宰基石` / 重拳主宰基石 | 徒手伤害骰、攻击目标数、压力 / 希望触发 |
| Void1.5 | `VOID-1.5整合卡牌包-RidRisR-subc-重拳主宰大师` / 重拳主宰大师 | 关键成功、希望、压力、熟练度临时加值 |
| Void1.5 | `VOID-1.5整合卡牌包-RidRisR-subc-武艺达人*` | 架势表、专注点、休息 / 场景状态和当前形态管理 |

## Confirmed Fixture Decisions

- 上述 `Must Support` 表是 Phase 1 第一批验收卡牌清单。
- 领域恩泽类只纳入当前 target 可稳定表达的部分；deferred text 不阻止同一张卡的稳定 contribution 自动化。
- `Simiah-Nimble`、`Giant-Endurance`、`Human-HighStamina` 这类“创建角色时”永久加值按 `whileInLoadout` 处理，不使用 `permanentOnceClaimed`。
- `untouchable` / 不可侵犯加入 Phase 1；“一半”默认向上取整。
