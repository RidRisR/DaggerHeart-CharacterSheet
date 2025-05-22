export const weaponData = [
  {
    id: "longsword",
    name: "Longsword",
    trait: "Versatile, Melee",
    damage: "1d8",
    feature: "Can be wielded with two hands for 1d10 damage",
  },
  {
    id: "dagger",
    name: "Dagger",
    trait: "Light, Finesse, Thrown (20/60)",
    damage: "1d4",
    feature: "Can be drawn as a free action",
  },
  {
    id: "bow",
    name: "Longbow",
    trait: "Two-handed, Ranged (150/600)",
    damage: "1d8",
    feature: "Requires both hands to use",
  },
  {
    id: "axe",
    name: "Battle Axe",
    trait: "Versatile, Melee",
    damage: "1d8",
    feature: "Can be wielded with two hands for 1d10 damage",
  },
  {
    id: "mace",
    name: "Mace",
    trait: "Melee",
    damage: "1d6",
    feature: "Ignores 2 points of armor",
  },
  {
    id: "staff",
    name: "Quarterstaff",
    trait: "Versatile, Melee",
    damage: "1d6",
    feature: "Can be wielded with two hands for 1d8 damage",
  },
  {
    id: "crossbow",
    name: "Crossbow",
    trait: "Two-handed, Ranged (80/320)",
    damage: "1d8",
    feature: "Takes an action to reload",
  },
  {
    id: "greatsword",
    name: "Greatsword",
    trait: "Two-handed, Heavy, Melee",
    damage: "2d6",
    feature: "Advantage on intimidation checks",
  },
  {
    id: "warhammer",
    name: "Warhammer",
    trait: "Versatile, Melee",
    damage: "1d8",
    feature: "Can be wielded with two hands for 1d10 damage",
  },
  {
    id: "shortbow",
    name: "Shortbow",
    trait: "Two-handed, Ranged (80/320)",
    damage: "1d6",
    feature: "Can be used while mounted",
  },
]

// 护甲数据
export const armorData = [
  {
    id: "leather",
    name: "Leather Armor",
    baseScore: "11 + DEX",
    feature: "Light armor, no disadvantage to stealth",
  },
  {
    id: "chain",
    name: "Chain Mail",
    baseScore: "16",
    feature: "Heavy armor, disadvantage to stealth, requires STR 13",
  },
  {
    id: "plate",
    name: "Plate Armor",
    baseScore: "18",
    feature: "Heavy armor, disadvantage to stealth, requires STR 15",
  },
  {
    id: "shield",
    name: "Shield",
    baseScore: "+2",
    feature: "Can be used with any armor, requires one hand",
  },
  {
    id: "hide",
    name: "Hide Armor",
    baseScore: "12 + DEX (max 2)",
    feature: "Medium armor, no disadvantage to stealth",
  },
  {
    id: "breastplate",
    name: "Breastplate",
    baseScore: "14 + DEX (max 2)",
    feature: "Medium armor, no disadvantage to stealth",
  },
  {
    id: "halfplate",
    name: "Half Plate",
    baseScore: "15 + DEX (max 2)",
    feature: "Medium armor, disadvantage to stealth",
  },
  {
    id: "studded",
    name: "Studded Leather",
    baseScore: "12 + DEX",
    feature: "Light armor, no disadvantage to stealth",
  },
]

// 职业特性数据
export const classFeatureData: Record<string, Array<{ name: string; description: string; list?: string[] }>> = {
  warrior: [
    {
      name: "Battle Strategist",
      description:
        "After a successful attack roll, you can describe how you outmaneuver your target, then mark a Stress to deal them a Stress.",
    },
    {
      name: "Attack of Opportunity",
      description:
        "If an adversary attempts to leave your Melee range, make an Agility reaction roll against their difficulty. Choose one effect on a successful roll, or two on a critical success:",
      list: ["Keep them from moving.", "Deal your primary weapon damage.", "Move with them."],
    },
    {
      name: "Combat Training",
      description:
        "Ignore burden when equipping weapons. Whenever you deal physical damage, add your level to its value.",
    },
  ],
  rogue: [
    {
      name: "Sneak Attack",
      description:
        "When you have advantage on an attack roll, you deal an extra 1d6 damage on a hit. This increases to 2d6 at level 5, 3d6 at level 9, and 4d6 at level 13.",
    },
    {
      name: "Cunning Action",
      description: "You can take a bonus action on each of your turns to Dash, Disengage, or Hide.",
    },
    {
      name: "Evasion",
      description:
        "When subjected to an effect that allows you to make a Dexterity saving throw for half damage, you take no damage on a success, and half damage on a failure.",
    },
  ],
  mage: [
    {
      name: "Spellcasting",
      description:
        "You can cast spells from your spellbook. You prepare a number of spells equal to your Intelligence modifier + your level.",
    },
    {
      name: "Arcane Recovery",
      description:
        "Once per day when you finish a short rest, you can recover spell slots with a combined level equal to half your level (rounded up).",
    },
    {
      name: "Spell Mastery",
      description:
        "At higher levels, you can cast certain spells without expending a spell slot. Choose one 1st-level spell and one 2nd-level spell from your spellbook.",
    },
  ],
  cleric: [
    {
      name: "Divine Channel",
      description: "You can channel divine energy directly from your deity, using that energy to fuel magical effects.",
    },
    {
      name: "Divine Intervention",
      description:
        "You can call on your deity to intervene on your behalf. The chance of success is your cleric level percentage.",
    },
    {
      name: "Blessed Healer",
      description:
        "When you cast a spell that restores hit points to another creature, you regain hit points equal to 2 + the spell's level.",
    },
  ],
  ranger: [
    {
      name: "Natural Explorer",
      description:
        "You are particularly familiar with one type of natural environment and are adept at traveling and surviving in such regions.",
    },
    {
      name: "Hunter's Mark",
      description:
        "You can mark a creature as your quarry. You deal an extra 1d6 damage to the target whenever you hit it with a weapon attack.",
    },
    {
      name: "Primeval Awareness",
      description:
        "You can use your action to focus your awareness on the region around you, allowing you to detect certain types of creatures.",
    },
  ],
}

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
