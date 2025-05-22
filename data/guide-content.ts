// 引导内容数据结构
export interface GuideStep {
  id: string
  title: string
  content: string
  // 如果需要根据职业显示不同内容，则使用这个字段
  professionSpecificContent?: Record<string, string>
  // 验证条件，返回true表示可以进入下一步
  validation?: (formData: any) => boolean
}

// 引导步骤数据
export const guideSteps: GuideStep[] = [
  {
    id: "step1",
    title: "基础角色信息",
    content: "请选择你的职业、血统和社区。这些选择将决定你的角色基础能力和特性。",
    validation: (formData) => {
      return !!formData.profession && !!formData.ancestry1 && !!formData.community
    },
  },
  {
    id: "step2",
    title: "职业特性",
    content: "根据你选择的职业，你将获得不同的特性和能力。",
    professionSpecificContent: {
      warrior:
        "作为一名战士，你擅长近战战斗和使用各种武器。你的主要属性是力量和体质。战士拥有较高的生命值和护甲值，能够在前线抵挡敌人的攻击。",
      rogue:
        "作为一名盗贼，你擅长隐匿和精准打击。你的主要属性是敏捷和灵巧。盗贼能够造成高额的单体伤害，并且有机会躲避攻击。",
      mage: "作为一名法师，你掌握强大的奥术魔法。你的主要属性是智力和感知。法师能够施放各种强力法术，但物理防御较弱。",
      cleric:
        "作为一名牧师，你拥有神圣的治疗能力。你的主要属性是智慧和魅力。牧师能够治疗队友，并且拥有对抗邪恶的神圣力量。",
      ranger:
        "作为一名游侠，你精通自然环境和远程攻击。你的主要属性是敏捷和智慧。游侠能够追踪敌人，并且在野外环境中有额外优势。",
    },
    validation: () => true, // 这一步不需要验证，总是可以进入下一步
  },
  {
    id: "step3",
    title: "属性分配",
    content:
      "现在，请为你的角色分配属性点。根据你的职业选择，某些属性对你更为重要。\n\n力量：影响近战攻击和负重能力\n敏捷：影响闪避和远程攻击\n体质：影响生命值和耐力\n智力：影响法术能力和知识技能\n感知：影响感知环境和意志力\n魅力：影响社交互动和某些特殊能力",
    validation: (formData) => {
      // 检查是否至少有一个属性值不为空
      return !!(
        formData.agility?.value ||
        formData.strength?.value ||
        formData.finesse?.value ||
        formData.instinct?.value ||
        formData.presence?.value ||
        formData.knowledge?.value
      )
    },
  },
  {
    id: "step4",
    title: "装备选择",
    content:
      "选择你的武器和护甲。不同的职业适合不同类型的装备。\n\n战士：适合重型护甲和各种武器\n盗贼：适合轻型护甲和灵巧武器\n法师：适合法杖和轻型护甲\n牧师：适合中型护甲和钝器\n游侠：适合中型护甲和远程武器",
    validation: (formData) => {
      // 检查是否选择了武器或护甲
      return !!(formData.primaryWeaponName || formData.armorName)
    },
  },
  {
    id: "step5",
    title: "卡牌选择",
    content:
      "现在你可以选择你的卡牌。卡牌代表你的角色特殊能力和技能。\n\n基础卡牌：包括你的职业、血统和社区卡牌，这些已经自动添加到你的卡组中。\n\n领域卡牌：你可以根据自己的喜好和角色定位选择额外的领域卡牌，增强特定方面的能力。",
    validation: () => true, // 这一步不需要验证，总是可以进入下一步
  },
  {
    id: "step6",
    title: "角色背景",
    content:
      "为你的角色添加一些背景故事和个性特点。这些内容将帮助你在游戏中更好地扮演你的角色。\n\n你可以描述角色的外貌、性格、动机和过去的经历。这些细节将使你的角色更加丰满和独特。",
    validation: () => true, // 这一步不需要验证，总是可以进入下一步
  },
  {
    id: "step7",
    title: "完成创建",
    content:
      "恭喜！你已经完成了角色创建的所有步骤。现在你可以保存你的角色，或者继续调整各项数值和选择。\n\n记得定期保存你的角色数据，以防数据丢失。你可以使用导入/导出功能来备份你的角色数据。",
    validation: () => true,
  },
]

// 获取特定职业的步骤内容
export function getProfessionSpecificContent(step: GuideStep, profession: string): string {
  if (step.professionSpecificContent && profession && step.professionSpecificContent[profession]) {
    return step.professionSpecificContent[profession]
  }
  return step.content
}

// 检查步骤是否可以进入下一步
export function canProceedToNextStep(step: GuideStep, formData: any): boolean {
  if (!step.validation) return true
  return step.validation(formData)
}
