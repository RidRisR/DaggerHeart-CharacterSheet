// 升级选项数据
export const upgradeOptionsData = {
  // 基础升级选项（所有职业通用）
  baseUpgrades: [
    { label: "Increase two unmarked Character Traits by +1 and mark them.", doubleBox: false },
    { label: "Permanently add one Hit Point Slot.", doubleBox: false },
    { label: "Permanently add one Stress Slot.", doubleBox: false },
    { label: "Increase two Experiences by +1.", doubleBox: false },
    { label: "Permanently add one Armor Slot.", doubleBox: false },
    { label: "Add +1 to your Evasion.", doubleBox: false },
    { label: "Choose an additional domain card at your level or lower.", doubleBox: false },
    { label: "Increase your Major Damage Threshold by +1.", doubleBox: true },
    { label: "Increase your Severe Damage Threshold by +2.", doubleBox: true },
  ],

  // 职业特定升级选项
  professionUpgrades: {
  },

  // 特定等级升级选项
  tierSpecificUpgrades: {
    tier2: [
      {
        label: "Take an upgraded subclass card. Then cross out the multiclass option for this tier.",
        doubleBox: false,
      },
      { label: "Increase your Proficiency by +1.", doubleBox: true },
      {
        label:
          'Multiclass: Choose an additional class for your character, then cross out an unused "Take an upgraded subclass card" and the other multiclass option on this sheet.',
        doubleBox: true,
      },
    ],
    tier3: [
      {
        label: "Take an upgraded subclass card. Then cross out the multiclass option for this tier.",
        doubleBox: false,
      },
      { label: "Increase your Proficiency by +1.", doubleBox: true },
      {
        label:
          'Multiclass: Choose an additional class for your character, then cross out an unused "Take an upgraded subclass card" and the other multiclass option on this sheet.',
        doubleBox: true,
      },
    ],
  },
}
