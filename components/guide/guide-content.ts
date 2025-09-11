import type { StandardCard } from "@/card/card-types";
import { isEmptyCard } from "@/card/card-types"; // Import isEmptyCard
import { CardType } from "@/card"; // Only import CardType since we no longer use getStandardCardsByTypeAsync

// 工具函数：将简单的Markdown格式转换为HTML或移除格式
function convertMarkdownToHtml(text: string): string {
    if (!text) return text;
    
    // 转换 **粗体** 为 <strong>粗体</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 转换 *斜体* 为 <em>斜体</em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 转换换行符
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// 工具函数：移除Markdown格式符号，只保留纯文本
function stripMarkdown(text: string): string {
    if (!text) return text;
    
    // 移除 **粗体** 标记，保留内容
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // 移除 *斜体* 标记，保留内容
    text = text.replace(/\*(.*?)\*/g, '$1');
    
    // 移除其他常见的Markdown符号
    text = text.replace(/`(.*?)`/g, '$1'); // 代码标记
    text = text.replace(/_{2}(.*?)_{2}/g, '$1'); // __粗体__
    text = text.replace(/_(.*?)_/g, '$1'); // _斜体_
    
    return text;
}

// 引导内容数据结构
export interface GuideStep {
    id: string
    title: string
    content: string | ((formData: any, allCardsList: StandardCard[]) => string)
    // 如果需要根据职业显示不同内容，则使用这个字段
    professionSpecificContent?: Record<string, string>
    // 验证条件，返回true表示可以进入下一步
    validation?: (formData: any, allCards?: StandardCard[]) => boolean
}

const isFilled = (val: any) => val !== undefined && val !== null && String(val).trim() !== '';

// 引导步骤数据
export const guideSteps: GuideStep[] = [
    {
        id: "step1",
        title: "选择职业",
        content: (formData: any, allCardsList: StandardCard[]): string => {
            if (!isFilled(formData.professionRef?.id)) {
                return "请点开角色卡左上方<strong>'选择职业'</strong>选项框查看并选择自己的职业，不同的职业有不同的游玩和扮演风格。";
            }
            // Use allCardsList instead of synchronous API call
            const professionCards = allCardsList.filter(card => card.type === CardType.Profession);
            const professionCard = professionCards.find(
                (card) => card.id === formData.professionRef?.id
            );
            const professionClass = professionCard?.class || "未知职业";
            const professionHint = professionCard?.hint || "";
            return `您选择的职业是：<strong>${professionClass}</strong> \n${professionHint}\n请问您确定吗,您可以尝试切换其他职业，点击下一步按钮继续。`;
        },
        validation: (formData, allCards) => { // allCards might be unused
            return isFilled(formData.professionRef?.id);
        },
    },
    {
        id: "step2",
        title: "选择子职业",
        content: (formData: any, allCardsList: StandardCard[]): string => {
            if (!isFilled(formData.subclass)) {
                return "请点开角色卡右上方<strong>'选择子职业'</strong>选项框查看并选择自己的子职业。子职业为您的角色提供额外的能力和风格。";
            }
            // Use allCardsList instead of synchronous API call
            const subclassCards = allCardsList.filter(card => card.type === CardType.Subclass);
            const subclassCard = subclassCards.find(
                (card) => card.id === formData.subclass
            );
            const subclassName = subclassCard?.headerDisplay || "未知子职业";
            const subclassSpell = subclassCard?.cardSelectDisplay?.item3 || "未知施法属性";
            return `您选择的子职业是：<strong>${subclassName}</strong> \n选定子职业的同时，您也决定了角色的施法属性，${subclassName}的施法属性是:<strong>${subclassSpell}</strong>\n\n请问您确定吗,您可以尝试切换其他子职业，点击下一步按钮继续。`;
        },
        validation: (formData, allCards) => { // allCards might be unused
            return isFilled(formData.subclass);
        },
    },
    {
        id: "step3",
        title: "选择种族",
        content: (formData: any, allCardsList: StandardCard[] = []): string => {
            const ancestry1 = formData?.ancestry1;
            const ancestry2 = formData?.ancestry2;
            // Use allCardsList instead of synchronous API call
            const ancestryCards = allCardsList.filter(card => card.type === CardType.Ancestry);
            const ancestry1Card = ancestryCards.find((card) => card.id === ancestry1);
            const ancestry2Card = ancestryCards.find((card) => card.id === ancestry2);
            if (!isFilled(ancestry1) && !isFilled(ancestry2)) {
                return "请移动至职业选项框右侧，选择您的种族，您可以选择两种种族，并各自从中继承一项能力。";
            }
            // 只选择了一种
            if (Number(isFilled(ancestry1)) + Number(isFilled(ancestry2)) === 1) {
                const ancestryCard = ancestry1Card || ancestry2Card;
                const ancestryClass = ancestryCard?.class || "未知种族";
                const ancestryName = ancestryCard?.name || "未知能力";
                const ancestryHint = ancestryCard?.hint || "";
                return `您已经选择的种族是：${ancestryClass}，您继承了对应的${ancestryName}能力。`;
            }
            // 两种都选择了
            let ancestry1Class = ancestry1Card?.class || "未知种族";
            let ancestry2Class = ancestry2Card?.class || "未知种族";
            let ancestry1Hint = ancestry1Card?.hint || "";
            let ancestry2Hint = ancestry2Card?.hint || "";
            return `您选择的种族是：${ancestry1Class} 和 ${ancestry2Class} \n请问您确定吗,您可以尝试切换种族，点击下一步按钮继续。`;
        },
        validation: (formData, allCards = []) => { // allCards might be unused
            return isFilled(formData.ancestry1) && isFilled(formData.ancestry2);
        },
    },
    {
        id: "step4",
        title: "选择社群",
        content: (formData: any, allCardsList: StandardCard[]): string => {
            if (!isFilled(formData.community)) {
                return "请点开子职业选项框上方的<strong>'选择社群'</strong>选项框查看并选择自己的社群。社群描述了你的角色成长的文化或环境。您的角色很可能在成长过程中曾加入过众多社群，这个选择代表了对角色个性和技能影响最大的那个社群。";
            }
            // Use allCardsList instead of synchronous API call
            const communityCards = allCardsList.filter(card => card.type === CardType.Community);
            const communityCard = communityCards.find(
                (card) => card.id === formData.community
            );
            const communityName = communityCard?.name || "未知社群";
            const communityHint = communityCard?.hint || "";
            return `您选择的社群是：<strong>${communityName}</strong> \n${communityHint}\n请问您确定吗,您可以尝试切换其他社群，点击下一步按钮继续。`;
        },
        validation: (formData, allCards) => {
            return isFilled(formData.community);
        },
    },
    {
        id: "step5",
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
            return attributes.filter(val => val !== undefined && val !== null && String(val).trim() !== '').length >= 6;
        },
    },
    {
        id: "step6",
        title: "记录基础数据",
        content: (formData: any, allCardsList: StandardCard[]): string => {
            if (!formData) return "请先填写基本信息";

            const professionId = formData.profession;
            let evasion = "未知";
            let hp = "未知";

            if (professionId) {
                // Use allCardsList instead of synchronous API call
                const professionCards = allCardsList.filter(card => card.type === CardType.Profession);
                const professionCard = professionCards.find(
                    (card) => card.id === professionId
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
        validation: (formData, allCards) => { // allCards might be unused
            if (!formData) return false;
            if (!isFilled(formData.level) || !isFilled(formData.evasion) || !isFilled(formData.hpMax)) {
                return false;
            }
            // 检查 hpMax 是否等于职业卡的起始生命
            const professionId = formData.profession;
            let expectedHp: any = undefined;
            if (professionId && allCards) {
                const professionCards = allCards.filter(card => card.type === CardType.Profession);
                const professionCard = professionCards.find(
                    (card) => card.id === professionId
                );
                if (professionCard && professionCard.professionSpecial && professionCard.professionSpecial["起始生命"] !== undefined) {
                    expectedHp = professionCard.professionSpecial["起始生命"];
                }
            }
            console.log("Expected HP:", expectedHp, "Form HP Max:", formData.hpMax);
            if (expectedHp !== undefined && String(formData.hpMax || 6) !== String(expectedHp)) {
                return false;
            }
            return true;
        },
    },
    {
        id: "step7",
        title: "记录压力与希望",
        content: (formData: any, allCardsList: StandardCard[]): string => {
            const professionId = formData?.profession;
            let hopeFeature = "未知";
            let professionName = "未知职业";

            if (professionId) {
                const professionCards = allCardsList.filter(card => card.type === CardType.Profession);
                const professionCard = professionCards.find(
                    (card) => card.id === professionId
                );
                if (professionCard) {
                    professionName = professionCard.name || "未知职业";
                    if (professionCard.professionSpecial) {
                        const rawHopeFeature = professionCard.professionSpecial["希望特性"];
                        hopeFeature = rawHopeFeature 
                            ? convertMarkdownToHtml(String(rawHopeFeature))
                            : "无特殊希望特性";
                    }
                }
            }

            return `压力反映了您承受危险情境的精神和情感压力以及身体消耗的能力。每个PC开始时有<strong>6个压力栏位</strong>。\n希望是一种元货币，可以用于激活经历或者帮助队友。不同职业会有专属的希望特性,可以在希望槽下方查看。${professionName}的希望特性是：\n<strong>${hopeFeature}</strong>\n\n所有角色开始游戏时有2点希望。`;
        },
        validation: (formData) => {
            return true;
        },
    },
    {
        id: "step8",
        title: "选择初始武器",
        content: "现在请选择您的初始武器。请从<strong>T1</strong>武器表中选择\n1.<strong>一把双手主武器</strong>;\n2. 或者 <strong>一把单手主武器和一把单手副武器</strong>。\n填写在主武器和副武器栏位上。",
        validation: (formData) => {
            return isFilled(formData.primaryWeaponName);
        }
    },
    {
        id: "step9",
        title: "选择初始护甲",
        content: (formData: any): string => {
            const isArmorSelected = formData?.armorName && formData?.armorBaseScore !== undefined && formData?.armorThreshold !== undefined && String(formData.armorName).trim() !== '';
            if (!isArmorSelected) {
                return "现在请选择您的初始护甲。请从<strong>T1</strong>护甲表中选择并装备一套护甲，然后填写在装备-护甲栏位上。已装备护甲为您提供护甲值和护甲伤害阈值。\n<strong>护甲值</strong>代表您的护甲可以承受多少次攻击。<strong>伤害阈值</strong>是护甲提供的减伤等级,决定了需要造成多少伤害才能真正伤害到您。";
            }
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
            return `<strong>您的护甲值是 ${armorValue} </strong>，意味着您的护甲在维修前可以承受 ${armorValue} 次攻击，请填写在角色卡左上角的护甲栏位中。\n已装备护甲提供基本的护甲阈值，您的等级会提供额外的等级加成，加成和当前等级相同（如一级+1）。<strong>您的护甲伤害阈值是 ${armorThresholdDisplay}</strong >。 \n<strong>请填写</strong>在'生命值与压力'下方的<strong>伤害阈值</strong>栏位上。`;
        },
        validation: (formData) => {
            return isFilled(formData.armorName)
                && isFilled(formData.armorValue)
                && isFilled(formData.majorThreshold)
                && isFilled(formData.minorThreshold);
        }
    },
    {
        id: "step10",
        title: "添加初始物品",
        content: (formData: any, allCardsList: StandardCard[]): string => {
            const professionId = formData?.profession;
            let startingItems = "未知";

            if (professionId) {
                const professionCards = allCardsList.filter(card => card.type === CardType.Profession);
                const professionCard = professionCards.find(
                    (card) => card.id === professionId
                );
                if (professionCard && professionCard.professionSpecial) {
                    const rawStartingItems = professionCard.professionSpecial["起始物品"];
                    startingItems = rawStartingItems
                        ? convertMarkdownToHtml(String(rawStartingItems))
                        : "无特殊起始物品";
                }
            }

            return `将以下物品添加到角色表的\"物品栏\"字段中： \n1.一支火把、50 英尺长的绳索、基本补给品。 \n2.一瓶次级治疗药水（回复 1d4 点生命值）<strong>或</strong>一瓶次级耐力药水（清除 1d4 点压力）。\n3.职业特殊起始物品：<strong>${startingItems} </strong> \n4. 其他GM批准您携带的物品。\n5. 在角色卡左下角<strong>金币栏</strong>中，<strong>添加一把金币。</strong>`;
        },
        validation: () => true,
    },
    {
        id: "step11",
        title: "角色背景与关系",
        content: "现在将角色卡翻到第二页。为您的角色设定一个背景故事，外貌衣着，和您的队友协商您们之间的关系。并填写在角色卡上。",
        validation: () => true,
    },
    {
        id: "step12",
        title: "选择能力卡牌",
        content: (formData: any, allCardsList: StandardCard[]): string => {
            const professionId = formData?.profession;
            let name = "未知职业";
            let domain1 = "未知";
            let domain2 = "未知";

            if (professionId) {
                const professionCards = allCardsList.filter(card => card.type === CardType.Profession);
                const professionCard = professionCards.find(
                    (card) => card.id === professionId
                );
                if (professionCard && professionCard.cardSelectDisplay) {
                    name = professionCard.name || "未知职业";
                    domain1 = professionCard.cardSelectDisplay.item1 || "未知领域";
                    domain2 = professionCard.cardSelectDisplay.item2 || "未知领域";
                }
            }

            return `现在点击任意一个空白的卡组位置，为您的角色选择:\n两张1级<strong>领域卡</strong>。您可以选择的两个领域是<strong>${domain1}</strong>和<strong>${domain2}</strong>。`;
        },
        validation: (formData) => {
            if (!formData || !formData.cards || !Array.isArray(formData.cards)) {
                return false; // No cards array or formData is invalid
            }
            // Check cards from index 4 onwards (skipping the 4 special card slots)
            var cnt = 0;
            for (let i = 5; i < formData.cards.length; i++) {
                if (formData.cards[i] && !isEmptyCard(formData.cards[i])) {
                    cnt++;
                    if (cnt === 2) {
                        return true; // Found three non-empty cards
                    }
                }
            }
            return false; // No non-empty card found after the special slots
        },
    },
    {
        id: "step13",
        title: "添加经历或特质",
        content: "几乎就要完成了，现在将角色卡翻回正面。为您的角色添加<strong>两条</strong>独特的经历或者特质。您只需要用一个简单的短语就足够了。比如：身经百战、广交朋友或者环游世界。\n\n每条经历会为您提供+2的判定加值。",
        validation: (formData) => {
            if (!formData || !Array.isArray(formData.experience) || !Array.isArray(formData.experienceValues)) {
                return false; // formData or experience arrays are invalid
            }
            if (formData.experience.length !== formData.experienceValues.length) {
                return false; // Mismatched array lengths
            }

            let validCount = 0;
            for (let i = 0; i < formData.experience.length; i++) {
                const experienceText = formData.experience[i];
                const experienceValue = formData.experienceValues[i];
                if (experienceText && String(experienceText).trim() !== "" && experienceValue) {
                    validCount++;
                }
            }
            return validCount >= 2; // 至少两条有效经历
        },
    },
    {
        id: "step14",
        title: "完成创建",
        content: "恭喜您，您的角色卡已经创建完成。别忘了取一个好听的名字！点击\"存档与重置\"可以保存这个角色，点击\"导出PDF\"可以导出为PDF。",
        validation: () => true,
    },
]

// 获取特定职业的步骤内容
export function getProfessionSpecificContent(
    step: GuideStep,
    profession: string,
    formData: any,
    allCards: StandardCard[] // This allCards parameter might become redundant if content functions are self-sufficient with getStandardCardsByType
): string {
    // 确保所有参数都有有效值
    if (!step) return "步骤数据丢失";
    formData = formData || {};
    // allCards = allCards || []; // Potentially remove if not used by content functions

    let contentSource: string | ((formData: any, allCardsList: StandardCard[]) => string);

    if (step.professionSpecificContent && profession && step.professionSpecificContent[profession]) {
        contentSource = step.professionSpecificContent[profession];
    } else {
        contentSource = step.content;
    }

    if (typeof contentSource === 'function') {
        try {
            // Pass an empty array or handle differently if allCards is truly no longer needed by any content function
            return contentSource(formData, allCards); // or contentSource(formData, [])
        } catch (error) {
            console.error("在处理引导内容时出错:", error);
            return "获取内容时出错，请重试或选择其他选项";
        }
    }
    return contentSource;
}

// 检查步骤是否可以进入下一步
export function canProceedToNextStep(step: GuideStep, formData: any, allCards?: StandardCard[]): boolean { // allCards might be unused
    if (!step.validation) return true;
    // Pass an empty array or handle differently if allCards is truly no longer needed by any validation function
    return step.validation(formData, allCards); // or step.validation(formData, [])
}
