// 升级选项数据
export const upgradeOptionsData = {
  // 基础升级选项（所有职业通用）
  baseUpgrades: [
    { label: "两项未标记的角色属性+1，然后标记属性升级选项。", doubleBox: false, boxCount: 3 },
    { label: "永久增加一个生命值槽。", doubleBox: false, boxCount: 1 },
    { label: "永久增加一个压力槽。", doubleBox: false, boxCount: 1 },
    { label: "选择两项经历获得额外+1。", doubleBox: false, boxCount: 1 },
    { label: "选择一张不高于你当前等级的领域卡加入卡组。", doubleBox: false, boxCount: 1 },
    { label: "获得闪避值+1。", doubleBox: false, boxCount: 1 },
  ],

  // 特定等级升级选项
  tierSpecificUpgrades: {
    tier1: [
    ],
    tier2: [
      { label: "升级你的子职业，你不可再使用T3级别的“兼职”选项。", doubleBox: false, boxCount: 1 },
      { label: "获得熟练度+1。", doubleBox: true, boxCount: 2 },
      { label: "兼职：获得一个额外的职业、子职业和一个领域。你不可再使用T3级别的“升级子职业”选项。也不可使用其他任何“兼职”选项。", doubleBox: true, boxCount: 2 },
    ],
    tier3: [
      { label: "升级你的子职业，你不可再使用T4级别的“兼职”选项。", doubleBox: false, boxCount: 1 },
      { label: "获得熟练度+1。", doubleBox: true, boxCount: 2 },
      { label: "兼职：获得一个额外的职业、子职业和一个领域。你不可再使用T4级别的“升级子职业”选项。也不可使用其他任何“兼职”选项。", doubleBox: true, boxCount: 2 },
    ],
  },
};
