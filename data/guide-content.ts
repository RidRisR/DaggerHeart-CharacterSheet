import type { StandardCard } from "@/data/card/card-types";
import { isEmptyCard } from "@/data/card/card-types"; // Import isEmptyCard

// 引导内容数据结构
export interface GuideStep {
  id: string
  title: string
  content: string | ((formData: any, allCardsList: StandardCard[]) => string)
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
    content: "请选择您的职业、血统和社区。这些选择将决定您的角色基础能力和特性。",
    validation: (formData) => {
      const isFilled = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';
      return isFilled(formData.profession) && isFilled(formData.ancestry1) && isFilled(formData.community);
    },
  },
  {
    id: "step2",
    title: "职业特性",
    content: (formData: any, allCards: StandardCard[]): string => {
      if (!formData) return "请先填写基本信息";

      const professionId = formData.profession;
      let professionClass = "未选择职业";
      let professionDescription = "请先选择职业以查看详情";

      if (professionId && allCards && allCards.length > 0) {
        const professionCard = allCards.find(
          (card) => card.id === professionId && card.type === "profession"
        );
        if (professionCard) {
          professionClass = professionCard.class || "未知职业类别";
          professionDescription =
            (professionCard.professionSpecial && professionCard.professionSpecial["简介"])
              ? professionCard.professionSpecial["简介"]
              : "该职业暂无详细描述";
        } else {
          professionClass = "职业信息获取失败";
          professionDescription = `未能找到ID为 '${professionId}' 的职业。`;
        }
      }
      return `不同的职业有不同的游玩和扮演风格，您选择的是：<strong>${professionClass}</strong>。 \n ${professionDescription}\n <strong>您可以在此尝试其他角色。如果您想保持建卡引导，点击下一步之后请不要切换您的角色。</strong>`;
    },
    validation: () => true,
  },
  {
    id: "step3",
    title: "属性分配",
    content:
      "现在请分配您的角色属性，角色一共有六种属性，分别是敏捷，力量，灵巧，本能，风度，知识。它们将在大部分的属性检定中使用。\n将修正值 <strong>+2、+1、+1、+0、+0、-1</strong> 以您希望的任何顺序分配给您的角色特性。",
    validation: (formData) => {
      const attributes = [
        formData.agility?.value,
        formData.strength?.value,
        formData.finesse?.value,
        formData.instinct?.value,
        formData.presence?.value,
        formData.knowledge?.value
      ];
      return attributes.filter(val => val !== undefined && val !== null && String(val).trim() !== '').length >= 4;
    },
  },
  {
    id: "step4",
    title: "记录基础数据",
    content: (formData: any, allCards: StandardCard[]): string => {
      if (!formData) return "请先填写基本信息";

      const professionId = formData.profession;
      let evasion = "未知";
      let hp = "未知";

      if (professionId && allCards && allCards.length > 0) {
        const professionCard = allCards.find(
          (card) => card.id === professionId && card.type === "profession"
        );
        if (professionCard && professionCard.professionSpecial) {
          evasion = professionCard.professionSpecial["起始闪避"] !== undefined
            ? String(professionCard.professionSpecial["起始闪避"])
            : "未知";
          hp = professionCard.professionSpecial["起始生命"] !== undefined
            ? String(professionCard.professionSpecial["起始生命"])
            : "未知";
        }
      }
      return `现在记录角色的基础数据：\n在角色表顶部的指定位置记录您的等级。现在请将等级记录为 <strong>1级</strong>。\n闪避值代表您角色避免伤害的能力。您角色的起始闪避值由其职业决定。<strong>您的初始闪避是 ${evasion}</strong>。\n生命值 (HP) 是您身体健康的抽象衡量标准，您的起始最大生命值由职业决定。<strong>您的初始最大生命值是 ${hp}</strong>。`;
    },
    validation: (formData) => {
      if (!formData) return false;

      const isFilled = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';
      return isFilled(formData.level) && isFilled(formData.evasion) && isFilled(formData.hp);
    },
  },
  {
    id: "step5",
    title: "记录压力与希望",
    content: (formData: any, allCards: StandardCard[]): string => {
      const professionId = formData?.profession;
      let hopeFeature = "未知";

      if (professionId && allCards && allCards.length > 0) {
        const professionCard = allCards.find(
          (card) => card.id === professionId && card.type === "profession"
        );
        if (professionCard && professionCard.professionSpecial) {
          hopeFeature = professionCard.professionSpecial["希望特性"]
            ? String(professionCard.professionSpecial["希望特性"])
            : "无特殊希望特性";
        }
      }

      // 获取职业名称
      let professionName = "未知职业";
      if (professionId && allCards && allCards.length > 0) {
        const professionCard = allCards.find(
          (card) => card.id === professionId && card.type === "profession"
        );
        if (professionCard && professionCard.name) {
          professionName = professionCard.name;
        }
      }

      return `压力反映了您承受危险情境的精神和情感压力以及身体消耗的能力。每个PC开始时有<strong>6个压力栏位</strong>。\n希望是一种元货币，可以用于激活经历或者帮助队友。不同职业会有专属的希望特性,可以在希望槽下方查看。${professionName}的希望特性是：\n<strong>${hopeFeature}</strong>\n所有PC开始时有2点希望。<strong>请在在角色表的希望槽中标记2点 </strong>。`;
    },
    validation: (formData) => {
      // 检查希望栏位，确保有且只有2个slot为true
      let hopeSlotCount = 0;

      // 检查hope字段 (HopeSection.tsx中使用的字段)
      if (formData && formData.hope && Array.isArray(formData.hope)) {
        hopeSlotCount = formData.hope.filter((slot: boolean) => slot === true).length;
      }
      // 向后兼容，也检查hopeSlots字段
      else if (formData && formData.hopeSlots && Array.isArray(formData.hopeSlots)) {
        hopeSlotCount = formData.hopeSlots.filter((slot: boolean) => slot === true).length;
      }
      return hopeSlotCount === 2;
    },
  },
  {
    id: "step6",
    title: "选择初始武器",
    content: "现在请选择您的初始武器。请从第 1 阶武器表中选择\n1.<strong>一把双手主武器</strong>;\n2. 或者 <strong>一把单手主武器和一把单手副武器</strong>。\n填写在主武器和副武器栏位上。",
    validation: (formData) => {
      const isFilled = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';
      return isFilled(formData.primaryWeaponName);
    }
  },
  {
    id: "step7",
    title: "选择初始护甲",
    content: (formData: any): string => {
      // 处理护甲值
      const armorValue = formData?.armorBaseScore !== undefined && formData?.armorBaseScore !== null
        ? String(formData.armorBaseScore)
        : "未知";

      // 处理护甲伤害阈值
      let armorThresholdDisplay = "未知";
      if (typeof formData?.armorThreshold === "string" && formData.armorThreshold.trim() !== "") {
        let match = formData.armorThreshold.match(/\(?\s*([0-9]+)\s*\/\s*([0-9]+)\s*\)?/);
        if (match) {
          const t1 = parseInt(match[1], 10) + 1;
          const t2 = parseInt(match[2], 10) + 1;
          armorThresholdDisplay = `(${t1}, ${t2})`;
        } else {
          armorThresholdDisplay = formData.armorThreshold;
        }
      }

      return `现在请选择您的初始护甲。从第 1 阶护甲表中选择并装备一套护甲，然后填写在已装备护甲栏位上。已装备护甲为您提供护甲值和护甲伤害阈值。\n护甲值代表您的护甲可以承受多少次攻击。<strong>您的护甲值是 ${armorValue} </strong>，请填写在角色卡左上角的护甲栏位中。\n护甲伤害阈值是护甲提供的减伤等级。伤害阈值决定了需要造成多少伤害才能真正伤害到您。\n已装备护甲提供基本的护甲阈值，您的等级会提供额外的护甲阈值（初始+1，每升一级额外+1），您的护甲伤害阈值是 <strong>${armorThresholdDisplay}</strong >，填写在'生命值与压力'下方的伤害阈值栏位上。`;
    },
    validation: (formData) => {
      const isFilled = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';
      return isFilled(formData.armorName) && isFilled(formData.armorBaseScore) && isFilled(formData.armorThreshold);
    }
  },
  {
    id: "step8",
    title: "添加初始物品",
    content: (formData: any, allCards: StandardCard[]): string => {
      const professionId = formData?.profession;
      let startingItems = "未知";

      if (professionId && allCards && allCards.length > 0) {
        const professionCard = allCards.find(
          (card) => card.id === professionId && card.type === "profession"
        );
        if (professionCard && professionCard.professionSpecial) {
          startingItems = professionCard.professionSpecial["起始物品"]
            ? String(professionCard.professionSpecial["起始物品"])
            : "无特殊起始物品";
        }
      }

      return `将以下物品添加到角色表的"物品栏"字段中： \n1.一支火把、50 英尺长的绳索、基本补给品和一把金币。（金币标记在角色卡左下方金币栏中）\n2.一瓶次级治疗药水（清除 1d4 点生命值）或者一瓶次级耐力药水（清除 1d4 点压力）。\n3.职业特殊起始物品：<strong>${startingItems} </strong> \n4. 其他GM批准您携带的物品。`;
    },
    validation: () => true,
  },
  {
    id: "step9",
    title: "角色背景与关系",
    content: "现在将角色卡翻到第二页。为您的角色设定一个背景故事，外貌衣着，和您的队友协商您们之间的关系。并填写在角色卡上。",
    validation: () => true,
  },
  {
    id: "step10",
    title: "选择能力卡牌",
    content: (formData: any, allCards: StandardCard[]): string => {
      const professionId = formData?.profession;
      let name = "未知职业";
      let domain1 = "未知";
      let domain2 = "未知";

      if (professionId && allCards && allCards.length > 0) {
        const professionCard = allCards.find(
          (card) => card.id === professionId && card.type === "profession"
        );
        if (professionCard && professionCard.cardSelectDisplay) {
          name = professionCard.name || "未知职业";
          domain1 = professionCard.cardSelectDisplay.item1 || "未知领域";
          domain2 = professionCard.cardSelectDisplay.item2 || "未知领域";
        }
      }

      return `现在点击任意一个空白的卡组位置，为您的角色选择:\n1. 一张${name}的基石（1级）子职业卡;\n2. 以及两张1级领域卡。您可以选择的两个领域是<strong>${domain1}</strong>和<strong>${domain2}</strong>。`;
    },
    validation: (formData) => {
      if (!formData || !formData.cards || !Array.isArray(formData.cards)) {
        return false; // No cards array or formData is invalid
      }
      // Check cards from index 4 onwards (skipping the 4 special card slots)
      var cnt = 0;
      for (let i = 4; i < formData.cards.length; i++) {
        if (formData.cards[i] && !isEmptyCard(formData.cards[i])) {
          cnt++;
          if (cnt === 3) {
            return true; // Found three non-empty cards
          }
        }
      }
      return false; // No non-empty card found after the special slots
    },
  },
  {
    id: "step11",
    title: "添加经历或特质",
    content: "几乎就要完成了，现在将角色卡翻回正面。为您的角色添加两条独特的经历或者特质。您只需要用一个简单的短语就足够了。比如：身经百战、广交朋友或者环游世界。每条经历会为您提供+2的判定加值。",
    validation: (formData) => {
      if (!formData || !Array.isArray(formData.experience) || !Array.isArray(formData.experienceValues)) {
        return false; // formData or experience arrays are invalid
      }
      if (formData.experience.length !== formData.experienceValues.length) {
        return false; // Mismatched array lengths
      }

      for (let i = 0; i < formData.experience.length; i++) {
        const experienceText = formData.experience[i];
        const experienceValue = formData.experienceValues[i];
        if (experienceText && String(experienceText).trim() !== "" && experienceValue) {
          return true; // Found at least one valid experience entry
        }
      }
      return false; // No valid experience entry found
    },
  },
  {
    id: "step12",
    title: "完成创建",
    content: "恭喜您，您的角色卡已经完成创建。别忘了取一个好听的名字，然后点击\"导入/ 导出角色\"保存或导出吧。",
    validation: () => true,
  },
]

// 获取特定职业的步骤内容
export function getProfessionSpecificContent(
  step: GuideStep,
  profession: string,
  formData: any,
  allCards: StandardCard[]
): string {
  // 确保所有参数都有有效值
  if (!step) return "步骤数据丢失";
  formData = formData || {};
  allCards = allCards || [];

  let contentSource: string | ((formData: any, allCardsList: StandardCard[]) => string);

  if (step.professionSpecificContent && profession && step.professionSpecificContent[profession]) {
    contentSource = step.professionSpecificContent[profession];
  } else {
    contentSource = step.content;
  }

  if (typeof contentSource === 'function') {
    try {
      return contentSource(formData, allCards);
    } catch (error) {
      console.error("在处理引导内容时出错:", error);
      return "获取内容时出错，请重试或选择其他选项";
    }
  }
  return contentSource;
}

// 检查步骤是否可以进入下一步
export function canProceedToNextStep(step: GuideStep, formData: any): boolean {
  if (!step.validation) return true;
  return step.validation(formData);
}
