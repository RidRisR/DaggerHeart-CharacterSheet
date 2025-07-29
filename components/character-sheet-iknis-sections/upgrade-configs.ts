import type { UpgradeConfig } from './types'

// 强化件配置数据
export const UPGRADE_CONFIGS: UpgradeConfig[] = [
  // 基础强化件
  {
    title: "力量：+1伤害",
    checkboxes: 2,
    cost: {
      fragments: { '齿轮': 3, '镜头': 2 },
      metals: { '铝': 4 },
      components: { '电容器': 1 }
    }
  },
  {
    title: "屏蔽：+1护甲值",
    cost: {
      fragments: { '缆线': 3, '水晶': 2 },
      metals: { '银': 2, '铂金': 2 },
      components: { '保险丝': 3 }
    }
  },
  {
    title: "收敛：+1攻击检定",
    cost: {
      fragments: { '线圈': 4, '水晶': 2 },
      metals: { '金': 5 },
      components: { '圆盘': 3 }
    }
  },
  {
    title: "增幅：额外掷一个伤害骰，然后弃掉结果中最小的一个",
    cost: {
      fragments: { '水晶': 4 },
      metals: { '钴': 4, '铜': 4 },
      components: { '电容器': 4 }
    }
  },
  {
    title: "扩域：将攻击范围增加一级（近战到邻近等）",
    checkboxes: 2,
    cost: {
      fragments: { '镜头': 5 },
      metals: { '银': 3 },
      components: { '电路': 2, '继电器': 2 }
    }
  },
  {
    title: "拒绝：+2护甲值",
    cost: {
      fragments: { '线圈': 6, '缆线': 3 },
      metals: { '铜': 2 },
      components: { '电池': 4 }
    }
  },
  {
    title: "指针：+2攻击检定",
    cost: {
      fragments: { '缆线': 10 },
      metals: { '金': 7 },
      components: { '保险丝': 5, '电路': 5, '电池': 2 }
    }
  },
  {
    title: "拆分：当你进行攻击时，标记一个压力点以瞄准范围内的另一个生物",
    cost: {
      fragments: { '齿轮': 12, '镜头': 5 },
      metals: { '铝': 15 },
      components: { '继电器': 9 }
    }
  },
  {
    title: "修复：当你造成严重伤害时，恢复一点生命值",
    checkboxes: 2,
    cost: {
      fragments: { '线圈': 6, '缆线': 4, '水晶': 1 },
      metals: { '钴': 5, '银': 5 },
      components: { '继电器': 7, '电池': 2 }
    }
  },
  {
    title: "震慑：当你的攻击骰出关键成功时，目标必须标记一点压力",
    cost: {
      fragments: { '扳机': 6 },
      metals: { '铜': 8, '铝': 9 },
      components: { '圆盘': 10 }
    }
  }
]

// 预编译强化件配置
export const PRECOMPILED_TIER2_CONFIGS: UpgradeConfig[] = [
  {
    title: "烧录：+2伤害",
    checkboxes: 2,
    tier: "预编译：二阶",
    cost: {
      fragments: { '扳机': 11 },
      metals: { '铂金': 11 },
      components: { '电路': 11, '圆盘': 7 }
    }
  },
  {
    title: "捕获：你可以在受到伤害时额外标记一个护甲槽",
    tier: "预编译：二阶",
    cost: {
      fragments: { '齿轮': 26 },
      metals: { '金': 13 },
      components: { '继电器': 15, '电池': 8 }
    }
  },
  {
    title: "触发：在成功命中后，你可以标记两点压力让目标多标记一点生命值",
    tier: "预编译：二阶",
    cost: {
      fragments: { '扳机': 33, '水晶': 13 },
      metals: { '钴': 23 },
      components: { '圆盘': 16 }
    }
  }
]

export const PRECOMPILED_TIER3_CONFIGS: UpgradeConfig[] = [
  {
    title: "阻塞：+3护甲值；-1闪避",
    tier: "预编译：三阶",
    cost: {
      fragments: { '水晶': 27 },
      metals: { '铝': 67 },
      components: { '继电器': 33, '电容器': 4, '电池': 5 }
    }
  },
  {
    title: "压缩：在攻击的同时，你可以移动至远距离范围内的任意地点",
    tier: "预编译：三阶",
    cost: {
      fragments: { '线圈': 37 },
      metals: { '银': 43 },
      components: { '保险丝': 67, '电容器': 12 }
    }
  },
  {
    title: "隐藏：+3伤害",
    checkboxes: 2,
    tier: "预编译：三阶",
    cost: {
      fragments: { '扳机': 28 },
      components: { '电路': 28, '继电器': 28 },
      relics: { '遗物': 1 }
    }
  }
]

export const PRECOMPILED_TIER4_CONFIGS: UpgradeConfig[] = [
  {
    title: "追踪：你可以标记2点压力以重新进行一次攻击检定",
    tier: "预编译：四阶",
    cost: {
      fragments: { '齿轮': 75, '镜头': 67 },
      metals: { '铜': 30 },
      components: { '电路': 33 }
    }
  },
  {
    title: "覆写：你的攻击掷骰具有优势",
    tier: "预编译：四阶",
    cost: {
      fragments: { '缆线': 63 },
      metals: { '金': 71 },
      components: { '圆盘': 58 },
      relics: { '遗物': 5 }
    }
  }
]