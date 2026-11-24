export const MARTIAL_STANCES = [
  { id: 'favored', tier: 1, name: '应手', english: 'Favored', effect: '你的伤害掷骰获得等同于一项你选择的属性的加值。' },
  { id: 'invigorating', tier: 1, name: '振奋', english: 'Invigorating', effect: '攻击成功时，掷一个 d4，若掷出 4，则获得 1 专注点。' },
  { id: 'quick', tier: 1, name: '迅捷', english: 'Quick', effect: '进行攻击掷骰时，你可以花费 1 专注点或标记 1 压力点，额外攻击攻击范围内的另一个生物。' },
  { id: 'reliable', tier: 1, name: '可靠', english: 'Reliable', effect: '你的攻击掷骰获得 +1 加值。' },
  { id: 'aggressive', tier: 2, name: '激进', english: 'Aggressive', effect: '你的闪避值 -1。攻击成功时，额外掷一个伤害骰，然后弃掉骰值最低的一个骰子。' },
  { id: 'anchored', tier: 2, name: '锚定', english: 'Anchored', effect: '你的伤害阈值获得 +2 加值。处于此架势时，你无法被强制移动。' },
  { id: 'defensive', tier: 2, name: '防御', english: 'Defensive', effect: '近战范围内对你的攻击掷骰具有劣势，除非攻击者标记 1 压力点来抵消此劣势。' },
  { id: 'otherworldly', tier: 2, name: '异界', english: 'Otherworldly', effect: '攻击成功时，你可以造成物理伤害或魔法伤害。' },
  { id: 'grappling', tier: 3, name: '擒抱', english: 'Grappling', effect: '近战范围内成功攻击时，你可以花费 1 专注点或标记 1 压力点，使目标暂时处于束缚状态，或将目标抛掷至最多近距离范围。' },
  { id: 'scary', tier: 3, name: '可怕', english: 'Scary', effect: '成功攻击时，迫使目标标记 1 压力点。' },
  { id: 'stable', tier: 3, name: '稳固', english: 'Stable', effect: '你可以花费 1 专注点，而非标记护甲槽来减少伤害。' },
  { id: 'vigilant', tier: 3, name: '警戒', english: 'Vigilant', effect: '当你成为攻击目标时，你可以标记 1 压力点使对抗本次攻击的闪避值获得 d6 加值。' },
  { id: 'crushing', tier: 4, name: '碾碎', english: 'Crushing', effect: '当你造成严重伤害时，你可以花费 1 希望点迫使目标额外标记 1 生命点。' },
  { id: 'exacting', tier: 4, name: '严苛', english: 'Exacting', effect: '当你掷出一枚伤害骰的结果为 1 时，你可以将其视为该骰子的最高值。' },
  { id: 'honed', tier: 4, name: '淬炼', english: 'Honed', effect: '在进行攻击掷骰前，花费 1 专注点，使本次攻击的熟练值获得 +1 加值。' },
  { id: 'isolating', tier: 4, name: '孤立', english: 'Isolating', effect: '当你与目标周围邻近范围内没有其他生物时，你的攻击掷骰具有优势。' },
] as const

export type MartialStanceId = typeof MARTIAL_STANCES[number]['id']
export const MARTIAL_STANCE_TIERS = [1, 2, 3, 4] as const
export const MAX_FOCUS = 6

export function isMartialStanceId(value: unknown): value is MartialStanceId {
  return MARTIAL_STANCES.some(stance => stance.id === value)
}

export const MARTIAL_STANCE_RULES = [
  { title: '架势与掌握', text: '架势是武艺达人在战斗中用于攻击、反应或防御的特殊身体姿态，激活时提供不同的能力、加值或特性。当你首次获得武艺达人子职业的基础卡时，从位阶 1 中选择两种架势。标记圆圈表示已掌握并可启用。每次角色升级时，从你当前位阶或更低位阶中选择一种新架势进行标记。' },
  { title: '专注点 FOCUS', text: '专注点代表角色的沉着、明晰与控制力。每次休息一次，平静时刻时你可以清空思绪，重新梳理你的武艺本能。清空你的专注槽，然后掷等量于你本能的 d6，获得等同于最高掷骰结果的专注点。你最多可持有 6 个专注点。' },
  { title: '转换架势', text: '你可以花费 1 专注点，转入一种已标记为已知的武术架势并获得其效果。该架势成为当前激活架势，直到你退出。你无法同时转换或拥有多个激活架势。在转入架势前，你被视为不处于任何架势。' },
  { title: '退出架势', text: '转入另一种不同的架势时，你会自动退出先前激活的架势。承受严重伤害、标记最后一个生命点或当前场景结束时，你也会退出当前激活的架势，并失去该架势提供的所有持续增益。承受严重伤害或场景结束时，请点击“退出架势”。' },
] as const
