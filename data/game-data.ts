// 职业数据
export const professionData = [
  {
    id: "warrior",
    name: "WARRIOR",
    subtitle: "", // 清空subtitle
    description: "Warriors are masters of combat, trained in the art of warfare.",
  },
  {
    id: "rogue",
    name: "ROGUE",
    subtitle: "", // 清空subtitle
    description: "Rogues are masters of stealth and deception, striking from the shadows.",
  },
  {
    id: "mage",
    name: "MAGE",
    subtitle: "", // 清空subtitle
    description: "Mages are wielders of arcane power, capable of bending reality to their will.",
  },
  {
    id: "cleric",
    name: "CLERIC",
    subtitle: "", // 清空subtitle
    description: "Clerics are divine servants, channeling the power of their deity.",
  },
  {
    id: "ranger",
    name: "RANGER",
    subtitle: "", // 清空subtitle
    description: "Rangers are wilderness experts, tracking prey and surviving in harsh environments.",
  },
]

// 血统数据
export const ancestryData = [
  {
    id: "human",
    name: "Human",
    description: "Adaptable and ambitious, humans are the most common heritage.",
  },
  {
    id: "elf",
    name: "Elf",
    description: "Long-lived and graceful, elves have a deep connection to nature and magic.",
  },
  {
    id: "dwarf",
    name: "Dwarf",
    description: "Sturdy and resilient, dwarves are master craftsmen and miners.",
  },
  {
    id: "halfling",
    name: "Halfling",
    description: "Small but brave, halflings value comfort and community.",
  },
  {
    id: "orc",
    name: "Orc",
    description: "Strong and fierce, orcs are natural warriors with a tribal culture.",
  },
  {
    id: "gnome",
    name: "Gnome",
    description: "Curious and inventive, gnomes have a natural affinity for magic and tinkering.",
  },
  {
    id: "tiefling",
    name: "Tiefling",
    description: "Bearing infernal heritage, tieflings are often mistrusted but possess unique abilities.",
  },
  {
    id: "dragonborn",
    name: "Dragonborn",
    description: "Proud and honorable, dragonborn possess draconic heritage and breath weapons.",
  },
]

// 社区数据
export const communityData = [
  {
    id: "city",
    name: "City",
    description: "Urban centers with diverse populations and opportunities.",
  },
  {
    id: "village",
    name: "Village",
    description: "Small, tight-knit communities where everyone knows each other.",
  },
  {
    id: "nomadic",
    name: "Nomadic Tribe",
    description: "Wandering groups that follow seasonal patterns or resources.",
  },
  {
    id: "forest",
    name: "Forest Enclave",
    description: "Secluded communities living in harmony with woodland environments.",
  },
  {
    id: "mountain",
    name: "Mountain Hold",
    description: "Fortress-like settlements carved into mountainsides.",
  },
  {
    id: "coastal",
    name: "Coastal Haven",
    description: "Communities that rely on the sea for sustenance and trade.",
  },
  {
    id: "desert",
    name: "Desert Oasis",
    description: "Settlements built around precious water sources in arid regions.",
  },
  {
    id: "academic",
    name: "Academic Institution",
    description: "Centers of learning and magical study.",
  },
]

// 武器数据
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
    warrior: {
      tier1: [
        { label: "Gain the Battle Strategist ability.", doubleBox: false },
        { label: "Gain the Weapon Mastery ability: +1 damage with your chosen weapon type.", doubleBox: false },
        { label: "Gain the Intimidating Presence ability: Advantage on Intimidation checks.", doubleBox: false },
      ],
      tier2: [
        { label: "Gain the Attack of Opportunity ability.", doubleBox: false },
        { label: "Gain the Shield Master ability: +1 AC when using a shield.", doubleBox: false },
        {
          label: "Gain the Battlefield Commander ability: Grant an ally advantage on their next attack.",
          doubleBox: false,
        },
      ],
      tier3: [
        { label: "Gain the Combat Training ability.", doubleBox: false },
        { label: "Gain the Indomitable ability: Reroll a failed saving throw once per day.", doubleBox: false },
        {
          label: "Gain the Brutal Critical ability: Add one additional damage die on critical hits.",
          doubleBox: false,
        },
      ],
    },
    rogue: {
      tier1: [
        { label: "Gain the Sneak Attack ability.", doubleBox: false },
        { label: "Gain the Thieves' Cant ability: Communicate secretly with other rogues.", doubleBox: false },
        { label: "Gain the Fast Hands ability: Use items as a bonus action.", doubleBox: false },
      ],
      tier2: [
        { label: "Gain the Cunning Action ability.", doubleBox: false },
        { label: "Gain the Uncanny Dodge ability: Reduce damage from attacks you can see.", doubleBox: false },
        { label: "Gain the Expertise ability: Double proficiency bonus in two skills.", doubleBox: false },
      ],
      tier3: [
        { label: "Gain the Evasion ability.", doubleBox: false },
        {
          label: "Gain the Reliable Talent ability: Treat d20 rolls of 9 or lower as 10 for proficient skills.",
          doubleBox: false,
        },
        {
          label: "Gain the Slippery Mind ability: Advantage on saving throws against being charmed or frightened.",
          doubleBox: false,
        },
      ],
    },
    mage: {
      tier1: [
        { label: "Gain the Spellcasting ability.", doubleBox: false },
        {
          label: "Gain the Arcane Focus ability: Ignore material components that don't have a cost.",
          doubleBox: false,
        },
        { label: "Gain the Magical Insight ability: Identify magic items with a short rest.", doubleBox: false },
      ],
      tier2: [
        { label: "Gain the Arcane Recovery ability.", doubleBox: false },
        { label: "Gain the Sculpt Spells ability: Protect allies from your area spells.", doubleBox: false },
        {
          label: "Gain the Potent Cantrip ability: Half damage on successful saves against your cantrips.",
          doubleBox: false,
        },
      ],
      tier3: [
        { label: "Gain the Spell Mastery ability.", doubleBox: false },
        {
          label: "Gain the Empowered Evocation ability: Add Intelligence modifier to damage of evocation spells.",
          doubleBox: false,
        },
        { label: "Gain the Improved Familiar ability: Summon a more powerful familiar.", doubleBox: false },
      ],
    },
    cleric: {
      tier1: [
        { label: "Gain the Divine Channel ability.", doubleBox: false },
        { label: "Gain the Disciple of Life ability: Healing spells restore additional hit points.", doubleBox: false },
        { label: "Gain the Warding Flare ability: Impose disadvantage on attack rolls against you.", doubleBox: false },
      ],
      tier2: [
        { label: "Gain the Divine Intervention ability.", doubleBox: false },
        { label: "Gain the Preserve Life ability: Channel divinity to heal multiple creatures.", doubleBox: false },
        { label: "Gain the War Priest ability: Make weapon attacks as a bonus action.", doubleBox: false },
      ],
      tier3: [
        { label: "Gain the Blessed Healer ability.", doubleBox: false },
        {
          label: "Gain the Potent Spellcasting ability: Add Wisdom modifier to damage of cleric cantrips.",
          doubleBox: false,
        },
        { label: "Gain the Divine Strike ability: Weapon attacks deal extra damage once per turn.", doubleBox: false },
      ],
    },
    ranger: {
      tier1: [
        { label: "Gain the Natural Explorer ability.", doubleBox: false },
        { label: "Gain the Beast Whisperer ability: Communicate simple ideas with beasts.", doubleBox: false },
        { label: "Gain the Favored Enemy ability: Advantage on tracking specific enemy types.", doubleBox: false },
      ],
      tier2: [
        { label: "Gain the Hunter's Mark ability.", doubleBox: false },
        { label: "Gain the Land's Stride ability: Move through difficult terrain without penalty.", doubleBox: false },
        { label: "Gain the Colossus Slayer ability: Deal extra damage to wounded creatures.", doubleBox: false },
      ],
      tier3: [
        { label: "Gain the Primeval Awareness ability.", doubleBox: false },
        {
          label: "Gain the Vanish ability: Hide as a bonus action and can't be tracked by nonmagical means.",
          doubleBox: false,
        },
        { label: "Gain the Feral Senses ability: Detect invisible creatures within 30 feet.", doubleBox: false },
      ],
    },
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
