"use client";

import { create } from "zustand";
import { defaultSheetData } from "./default-sheet-data";
import type { SheetData, AttributeValue, ArmorTemplateData } from "./sheet-data";
import { createEmptyCard, type StandardCard } from "@/card/card-types";
import { armorItems, type ArmorItem } from "@/data/list/armor";
import { showFadeNotification } from "@/components/ui/fade-notification";

// 施法属性映射关系
const SPELLCASTING_ATTRIBUTE_MAP: Record<string, keyof SheetData> = {
    "敏捷": "agility",
    "力量": "strength",
    "灵巧": "finesse",
    "本能": "instinct",
    "风度": "presence",
    "知识": "knowledge"
};

// 按显示长度智能分割文本到两行的函数
const splitFeatureText = (text: string): [string, string] => {
    if (!text) return ["", ""];

    // 估算每行可容纳的字符数（基于输入框宽度和字体大小）
    const maxCharsPerLine = 29; // 匹配输入框的maxLength

    // 如果文本长度小于等于一行容量，全部放在第一行
    if (text.length <= maxCharsPerLine) {
        return [text, ""];
    }

    // 寻找合适的分割点
    let splitIndex = maxCharsPerLine;

    // 只在空格处分割，或者下一行开头是标点符号时才在标点符号处分割
    for (let i = maxCharsPerLine; i >= Math.max(0, maxCharsPerLine - 5); i--) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        // 在空格处分割
        if (char === ' ') {
            splitIndex = i + 1;
            break;
        }
        
        // 只有当下一行开头是标点符号时，才在标点符号处分割
        const punctuation = ['，', '。', '：', ';', ',', ':'];
        if (punctuation.includes(char) && nextChar && punctuation.includes(nextChar)) {
            splitIndex = i + 1;
            break;
        }
    }

    return [
        text.substring(0, splitIndex).trim(),
        text.substring(splitIndex).trim()
    ];
};

// 同步子职业施法属性的函数
const syncSubclassSpellcasting = (newData: SheetData, oldData: SheetData): SheetData => {
    // 获取旧的和新的子职业施法属性
    const oldSubclassCard = oldData.cards?.[1];
    const newSubclassCard = newData.cards?.[1];

    const oldSpellcastingAttr = oldSubclassCard?.cardSelectDisplay?.item3;
    const newSpellcastingAttr = newSubclassCard?.cardSelectDisplay?.item3;

    // 如果施法属性没有变化，直接返回
    if (oldSpellcastingAttr === newSpellcastingAttr) {
        return newData;
    }

    const result = { ...newData };

    // 清除旧的施法属性标记
    if (oldSpellcastingAttr && SPELLCASTING_ATTRIBUTE_MAP[oldSpellcastingAttr]) {
        const oldAttrKey = SPELLCASTING_ATTRIBUTE_MAP[oldSpellcastingAttr];
        const oldAttr = result[oldAttrKey] as AttributeValue;
        if (oldAttr && typeof oldAttr === "object" && "spellcasting" in oldAttr) {
            (result[oldAttrKey] as AttributeValue) = { ...oldAttr, spellcasting: false };
        }
    }

    // 设置新的施法属性标记
    if (newSpellcastingAttr && SPELLCASTING_ATTRIBUTE_MAP[newSpellcastingAttr]) {
        const newAttrKey = SPELLCASTING_ATTRIBUTE_MAP[newSpellcastingAttr];
        const newAttr = result[newAttrKey] as AttributeValue;
        if (newAttr && typeof newAttr === "object" && "spellcasting" in newAttr) {
            (result[newAttrKey] as AttributeValue) = { ...newAttr, spellcasting: true };
        }
    }

    return result;
};

interface SheetState {
    sheetData: SheetData;
    setSheetData: (data: Partial<SheetData> | ((prevState: SheetData) => Partial<SheetData>)) => void;
    replaceSheetData: (data: SheetData) => void;
    
    // Granular actions for better performance and cleaner code
    updateAttribute: (attribute: keyof SheetData, value: string) => void;
    toggleAttributeChecked: (attribute: keyof SheetData) => void;
    updateGold: (index: number) => void;
    updateHope: (index: number) => void;
    updateArmorBox: (index: number) => void;
    updateProficiency: (index: number) => void;
    updateExperience: (index: number, value: string) => void;
    updateExperienceValues: (index: number, value: string) => void;
    updateHP: (index: number, checked: boolean) => void;
    updateHPMax: (value: number) => void;
    updateStressMax: (value: number) => void;
    updateName: (name: string) => void;
    updateLevel: (level: string) => void;
    
    // Threshold calculation actions
    updateLevelWithThreshold: (level: string) => void;
    updateArmorThresholdWithDamage: (armorThreshold: string) => void;
    selectArmor: (armorId: string) => void;
    
    // Card management actions
    deleteCard: (index: number, isInventory: boolean) => void;
    moveCard: (fromIndex: number, fromInventory: boolean, toInventory: boolean) => boolean;
    updateCard: (index: number, card: StandardCard, isInventory: boolean) => void;
    
    // Armor template actions
    updateArmorTemplateField: (field: keyof ArmorTemplateData, value: any) => void;
    updateUpgradeSlot: (index: number, checked: boolean, text: string) => void;
    updateUpgradeSlotText: (index: number, text: string) => void;
    updateUpgrade: (tier: string, upgradeName: string, value: boolean | boolean[]) => void;
    updateScrapMaterial: (category: string, index: number, value: number | string) => void;
}

export const useSheetStore = create<SheetState>((set) => ({
    sheetData: defaultSheetData,
    setSheetData: (updater) => {
        set((state) => {
            const oldData = state.sheetData;
            const rawUpdatedData = typeof updater === 'function' ? updater(oldData) : updater;
            let newData = { ...oldData, ...rawUpdatedData };

            // 检查 armorValue 是否改变，如果改变则清空所有 armorBoxes
            if ('armorValue' in rawUpdatedData && rawUpdatedData.armorValue !== oldData.armorValue) {
                newData = {
                    ...newData,
                    armorBoxes: Array(12).fill(false)
                };
            }

            // 应用子职业施法属性同步
            const finalData = syncSubclassSpellcasting(newData, oldData);

            return { sheetData: finalData };
        });
    },
    replaceSheetData: (newData) => set((state) => {
        // 应用子职业施法属性同步
        const finalData = syncSubclassSpellcasting(newData, state.sheetData);
        return { sheetData: finalData };
    }),
    
    // Granular actions
    updateAttribute: (attribute, value) => set((state) => {
        const currentAttribute = state.sheetData[attribute];
        if (typeof currentAttribute === "object" && currentAttribute !== null && "checked" in currentAttribute) {
            return {
                sheetData: {
                    ...state.sheetData,
                    [attribute]: { ...currentAttribute, value },
                }
            };
        }
        return state;
    }),
    
    toggleAttributeChecked: (attribute) => set((state) => {
        const currentAttribute = state.sheetData[attribute];
        if (typeof currentAttribute === "object" && currentAttribute !== null && "checked" in currentAttribute) {
            return {
                sheetData: {
                    ...state.sheetData,
                    [attribute]: { 
                        ...currentAttribute, 
                        checked: !currentAttribute.checked 
                    },
                }
            };
        }
        return state;
    }),
    
    updateGold: (index: number) => set((state) => {
        const gold = state.sheetData.gold || [];

        if (index == 20) {
            // 特殊处理：如果点击的是第 20 个金币（最后一个），只反转20的状态
            const newGold = [...gold];
            newGold[20] = !newGold[20];
            return {
                sheetData: {
                    ...state.sheetData,
                    gold: newGold
                }
            };
        }

        // 计算属于哪一段
        const segment = Math.floor(index / 10); // 0, 1, 2
        const start = segment * 10;
        const end = Math.min(start + 10, gold.length); // 修正：防止越界
        const segmentGold = gold.slice(start, end);

        // 找到该段最后一个被点亮的金币
        const lastLit = segmentGold.lastIndexOf(true);

        let newSegmentGold: boolean[];
        if ((index - start) === lastLit && segmentGold[index - start]) {
            // 如果点击的是该段最后一个被点亮的金币，则该段全部熄灭
            newSegmentGold = segmentGold.map(() => false);
        } else {
            // 否则点亮前 n 个
            newSegmentGold = segmentGold.map((_, i) => i <= (index - start));
        }

        // 拼接新金币数组
        const newGold = [
            ...gold.slice(0, start),
            ...newSegmentGold,
            ...gold.slice(end)
        ];

        return {
            sheetData: {
                ...state.sheetData,
                gold: newGold
            }
        };
    }),
    
    updateHope: (index: number) => set((state) => {
        const current = state.sheetData.hope || [];
        // 找到最后一个被点亮的 hope 的下标
        const lastLit = current.lastIndexOf(true);
        // 如果点击的正好是最后一个被点亮的 hope，则全部熄灭
        if (index === lastLit && current[index]) {
            return {
                sheetData: {
                    ...state.sheetData,
                    hope: current.map(() => false)
                }
            };
        }
        // 其它情况，点亮前 n 个
        const newHope = current.map((_, i) => i <= index);
        return {
            sheetData: {
                ...state.sheetData,
                hope: newHope
            }
        };
    }),
    
    updateArmorBox: (index: number) => set((state) => {
        const current = state.sheetData.armorBoxes || [];
        // 找到最后一个被点亮的 armorBox 的下标
        const lastLit = current.lastIndexOf(true);
        // 如果点击的正好是最后一个被点亮的 armorBox，则全部熄灭
        if (index === lastLit && current[index]) {
            return {
                sheetData: {
                    ...state.sheetData,
                    armorBoxes: current.map(() => false)
                }
            };
        }
        // 其它情况，点亮前 n 个
        const newArmorBoxes = current.map((_, i) => i <= index);
        return {
            sheetData: {
                ...state.sheetData,
                armorBoxes: newArmorBoxes
            }
        };
    }),
    
    updateProficiency: (index: number) => set((state) => {
        const current = Array.isArray(state.sheetData.proficiency) ? state.sheetData.proficiency : [];
        // 找到最后一个被点亮的 proficiency 的下标
        const lastLit = current.lastIndexOf(true);
        // 如果点击的正好是最后一个被点亮的 proficiency，则全部熄灭
        if (index === lastLit && current[index]) {
            return {
                sheetData: {
                    ...state.sheetData,
                    proficiency: current.map(() => false)
                }
            };
        }
        // 其它情况，点亮前 n 个
        const newProficiency = current.map((_, i) => i <= index);
        return {
            sheetData: {
                ...state.sheetData,
                proficiency: newProficiency
            }
        };
    }),
    
    updateExperience: (index, value) => set((state) => {
        const newExperience = [...(state.sheetData.experience || [])];
        newExperience[index] = value;
        return {
            sheetData: {
                ...state.sheetData,
                experience: newExperience
            }
        };
    }),
    
    updateExperienceValues: (index, value) => set((state) => {
        const newExperienceValues = [...(state.sheetData.experienceValues || [])];
        newExperienceValues[index] = value;
        return {
            sheetData: {
                ...state.sheetData,
                experienceValues: newExperienceValues
            }
        };
    }),
    
    updateHP: (index, checked) => set((state) => {
        const newHP = [...(state.sheetData.hp || [])];
        newHP[index] = checked;
        return {
            sheetData: {
                ...state.sheetData,
                hp: newHP
            }
        };
    }),

    updateHPMax: (value) => set((state) => {
        // 限制范围 1-18
        const clampedValue = Math.min(Math.max(value, 1), 18);

        const newData: Partial<SheetData> = { hpMax: clampedValue };

        // 同步调整 hp 数组
        const currentHP = Array.isArray(state.sheetData.hp) ? state.sheetData.hp : [];
        const checkedCount = currentHP.filter(Boolean).length;

        // 如果当前勾选的数量超过新上限，截断到新上限
        if (checkedCount > clampedValue) {
            const newHP = Array(18).fill(false);
            for (let i = 0; i < clampedValue; i++) {
                newHP[i] = true;
            }
            newData.hp = newHP;
        }

        return {
            sheetData: {
                ...state.sheetData,
                ...newData
            }
        };
    }),

    updateStressMax: (value) => set((state) => {
        // 限制范围 1-12
        const clampedValue = Math.min(Math.max(value, 1), 12);

        const newData: Partial<SheetData> = { stressMax: clampedValue };

        // 同步调整 stress 数组
        const currentStress = Array.isArray(state.sheetData.stress) ? state.sheetData.stress : [];
        const checkedCount = currentStress.filter(Boolean).length;

        // 如果当前勾选的数量超过新上限，截断到新上限
        if (checkedCount > clampedValue) {
            const newStress = Array(18).fill(false);
            for (let i = 0; i < clampedValue; i++) {
                newStress[i] = true;
            }
            newData.stress = newStress;
        }

        return {
            sheetData: {
                ...state.sheetData,
                ...newData
            }
        };
    }),

    updateName: (name) => set((state) => ({
        sheetData: {
            ...state.sheetData,
            name
        }
    })),
    
    updateLevel: (level) => set((state) => ({
        sheetData: {
            ...state.sheetData,
            level
        }
    })),
    
    // Threshold calculation actions
    updateLevelWithThreshold: (level) => set((state) => {
        const updates: Partial<SheetData> = { level };
        
        // 如果等级为空字符串，只更新等级，不计算阈值
        if (level === "") {
            return {
                sheetData: {
                    ...state.sheetData,
                    ...updates
                }
            };
        }
        
        const levelNum = parseInt(level);
        
        // 验证等级范围 (1-10)，如果无效则只更新等级值，不计算阈值
        if (isNaN(levelNum) || levelNum < 1 || levelNum > 10) {
            return {
                sheetData: {
                    ...state.sheetData,
                    ...updates
                }
            };
        }
        
        // 如果有护甲阈值，计算伤害阈值
        if (state.sheetData.armorThreshold) {
            const thresholds = state.sheetData.armorThreshold.split('/');
            if (thresholds.length === 2) {
                const minor = parseInt(thresholds[0]?.trim());
                const major = parseInt(thresholds[1]?.trim());
                
                if (!isNaN(minor) && !isNaN(major)) {
                    const newMinor = minor + levelNum;
                    const newMajor = major + levelNum;
                    updates.minorThreshold = String(newMinor);
                    updates.majorThreshold = String(newMajor);

                    // 显示通知
                    showFadeNotification({
                        message: `因等级更新，自动更新伤害阈值`,
                        type: "success"
                    });
                }
            }
        }
        
        return {
            sheetData: {
                ...state.sheetData,
                ...updates
            }
        };
    }),
    
    updateArmorThresholdWithDamage: (armorThreshold) => set((state) => {
        const updates: Partial<SheetData> = { armorThreshold };
        
        // 解析护甲阈值
        const thresholds = armorThreshold.split('/');
        if (thresholds.length !== 2) {
            // 无效格式，只更新护甲阈值
            return {
                sheetData: {
                    ...state.sheetData,
                    ...updates
                }
            };
        }
        
        const minor = parseInt(thresholds[0]?.trim());
        const major = parseInt(thresholds[1]?.trim());
        
        if (isNaN(minor) || isNaN(major)) {
            // 无效数字，只更新护甲阈值
            return {
                sheetData: {
                    ...state.sheetData,
                    ...updates
                }
            };
        }
        
        // 如果有等级，计算伤害阈值
        const levelNum = parseInt(state.sheetData.level);
        if (!isNaN(levelNum) && levelNum >= 1 && levelNum <= 10) {
            const newMinor = minor + levelNum;
            const newMajor = major + levelNum;
            updates.minorThreshold = String(newMinor);
            updates.majorThreshold = String(newMajor);

            // 显示通知
            showFadeNotification({
                message: `因护甲信息更新，自动更新伤害阈值`,
                type: "success"
            });
        }
        
        return {
            sheetData: {
                ...state.sheetData,
                ...updates
            }
        };
    }),
    
    selectArmor: (armorId: string) => set((state) => {
        const updates: Partial<SheetData> = {};
        
        if (armorId === "none") {
            // 清空所有护甲相关字段
            updates.armorName = "";
            updates.armorBaseScore = "";
            updates.armorThreshold = "";
            updates.armorFeature = "";
            updates.minorThreshold = "";
            updates.majorThreshold = "";

            // 显示通知
            showFadeNotification({
                message: "护甲信息无效或清空，伤害阈值已重置",
                type: "info"
            });
        } else {
            // 首先检查是否为JSON格式（自定义护甲）
            let isCustomArmor = false;
            let customArmorData: any = null;
            
            try {
                customArmorData = JSON.parse(armorId);
                isCustomArmor = true;
            } catch (e) {
                // 不是JSON格式，继续处理
            }
            
            if (isCustomArmor && customArmorData) {
                // 处理自定义护甲
                updates.armorName = customArmorData.名称 || armorId;
                updates.armorBaseScore = String(customArmorData.护甲值 || "");
                updates.armorThreshold = customArmorData.伤害阈值 || "";
                const featureText = `${customArmorData.特性名称 ? customArmorData.特性名称 + ': ' : ''}${customArmorData.描述 || ''}`.trim();
                const [feature1, feature2] = splitFeatureText(featureText);
                updates.armorFeature = feature2 ? `${feature1}\n${feature2}` : feature1;
                
                // 计算伤害阈值
                if (customArmorData.伤害阈值) {
                    const thresholds = customArmorData.伤害阈值.split('/');
                    if (thresholds.length === 2) {
                        const minor = parseInt(thresholds[0]?.trim());
                        const major = parseInt(thresholds[1]?.trim());
                        const levelNum = parseInt(state.sheetData.level);
                        
                        if (!isNaN(minor) && !isNaN(major) && !isNaN(levelNum) && levelNum >= 1 && levelNum <= 10) {
                            const newMinor = minor + levelNum;
                            const newMajor = major + levelNum;
                            updates.minorThreshold = String(newMinor);
                            updates.majorThreshold = String(newMajor);

                            // 显示通知
                            showFadeNotification({
                                message: `因护甲信息更新，自动更新伤害阈值`,
                                type: "success"
                            });
                        }
                    }
                }
            } else {
                // 尝试从预设护甲列表中查找
                const armor = armorItems.find((a: ArmorItem) => a.名称 === armorId);
                
                if (armor) {
                    // 使用预设护甲
                    updates.armorName = armor.名称;
                    updates.armorBaseScore = String(armor.护甲值);
                    updates.armorThreshold = armor.伤害阈值;
                    const featureText = `${armor.特性名称}${armor.特性名称 && armor.描述 ? ": " : ""}${armor.描述}`;
                    const [feature1, feature2] = splitFeatureText(featureText);
                    updates.armorFeature = feature2 ? `${feature1}\n${feature2}` : feature1;
                    
                    // 计算伤害阈值
                    const thresholds = armor.伤害阈值.split('/');
                    if (thresholds.length === 2) {
                        const minor = parseInt(thresholds[0]?.trim());
                        const major = parseInt(thresholds[1]?.trim());
                        const levelNum = parseInt(state.sheetData.level);
                        
                        if (!isNaN(minor) && !isNaN(major) && !isNaN(levelNum) && levelNum >= 1 && levelNum <= 10) {
                            const newMinor = minor + levelNum;
                            const newMajor = major + levelNum;
                            updates.minorThreshold = String(newMinor);
                            updates.majorThreshold = String(newMajor);

                            // 显示通知
                            showFadeNotification({
                                message: `因护甲信息更新，自动更新伤害阈值`,
                                type: "success"
                            });
                        }
                    }
                } else {
                    // 既不是JSON也不在预设列表中，作为纯文本名称处理
                    updates.armorName = armorId;
                    updates.armorBaseScore = "";
                    updates.armorThreshold = "";
                    updates.armorFeature = "";
                }
            }
        }
        
        return {
            sheetData: {
                ...state.sheetData,
                ...updates
            }
        };
    }),
    
    // Card management actions
    deleteCard: (index, isInventory) => set((state) => {
        // 检查特殊卡位保护：聚焦卡组的前5个位置不能删除
        if (!isInventory && index < 5) {
            console.log('[Store] 特殊卡位不能删除');
            return state;
        }
        
        const emptyCard = createEmptyCard();
        
        if (isInventory) {
            // 删除库存卡牌
            const newInventoryCards = [...(state.sheetData.inventory_cards || [])];
            // 确保数组长度为20
            while (newInventoryCards.length < 20) {
                newInventoryCards.push(createEmptyCard());
            }
            newInventoryCards[index] = emptyCard;
            
            return {
                sheetData: {
                    ...state.sheetData,
                    inventory_cards: newInventoryCards
                }
            };
        } else {
            // 删除主卡组卡牌
            const newCards = [...(state.sheetData.cards || [])];
            // 确保数组长度为20
            while (newCards.length < 20) {
                newCards.push(createEmptyCard());
            }
            newCards[index] = emptyCard;
            
            return {
                sheetData: {
                    ...state.sheetData,
                    cards: newCards
                }
            };
        }
    }),
    
    moveCard: (fromIndex, fromInventory, toInventory) => {
        let success = false;
        
        set((state) => {
            if (fromInventory === toInventory) {
                success = false;
                return state; // 不需要移动
            }
            
            // 确保两个卡组都存在且长度为20
            const newFocusedCards = [...(state.sheetData.cards || [])];
            const newInventoryCards = [...(state.sheetData.inventory_cards || [])];
            
            while (newFocusedCards.length < 20) {
                newFocusedCards.push(createEmptyCard());
            }
            while (newInventoryCards.length < 20) {
                newInventoryCards.push(createEmptyCard());
            }
            
            // 获取要移动的卡牌
            const sourceCards = fromInventory ? newInventoryCards : newFocusedCards;
            const targetCards = toInventory ? newInventoryCards : newFocusedCards;
            const cardToMove = sourceCards[fromIndex];
            
            if (!cardToMove || cardToMove.name === '') {
                success = false;
                return state; // 空卡不能移动
            }
            
            // 检查特殊卡位保护：不能从聚焦卡组的特殊卡位(前5位)移动出去
            if (!fromInventory && fromIndex < 5) {
                console.log('[Store] 特殊卡位不能移动到库存卡组');
                success = false;
                return state;
            }
            
            // 检查特殊卡位保护：不能移动到聚焦卡组的特殊卡位(前5位)
            // 从库存移动到聚焦卡组时，不能放入特殊卡位
            if (!toInventory && fromInventory) {
                console.log('[Store] 从库存移动到聚焦卡组，不能占用特殊卡位');
                // 这种情况下会在后面的逻辑中自动跳过特殊卡位，从第6位开始查找
            }
            
            // 找到目标卡组中第一个空位（跳过特殊卡位）
            let targetIndex = -1;
            const startIndex = toInventory ? 0 : 5; // 移动到聚焦卡组时从第6位开始查找
            
            for (let i = startIndex; i < targetCards.length; i++) {
                if (!targetCards[i] || targetCards[i].name === '') {
                    targetIndex = i;
                    break;
                }
            }
            
            if (targetIndex === -1) {
                success = false;
                return state; // 目标卡组已满
            }
            
            // 执行移动：源位置用空卡替换，目标位置放入卡牌
            sourceCards[fromIndex] = createEmptyCard();
            targetCards[targetIndex] = cardToMove;
            
            success = true;
            return {
                sheetData: {
                    ...state.sheetData,
                    cards: newFocusedCards,
                    inventory_cards: newInventoryCards
                }
            };
        });
        
        return success;
    },
    
    // Armor template actions
    updateArmorTemplateField: (field, value) => set((state) => ({
        sheetData: {
            ...state.sheetData,
            armorTemplate: {
                ...state.sheetData.armorTemplate,
                [field]: value
            }
        }
    })),

    updateUpgradeSlot: (index, checked, text) => set((state) => {
        const current = [...(state.sheetData.armorTemplate?.upgradeSlots || [])];
        
        // 复选框逻辑：实现与其他组件相同的行为
        // 找到最后一个被点亮的插槽的下标
        let lastLit = -1;
        for (let i = current.length - 1; i >= 0; i--) {
            if (current[i]?.checked === true) {
                lastLit = i;
                break;
            }
        }
        
        // 如果点击的正好是最后一个被点亮的插槽，则全部熄灭
        if (index === lastLit && current[index]?.checked) {
            const slots = current.map(slot => ({ 
                checked: false, 
                text: slot?.text || '' 
            }));
            return {
                sheetData: {
                    ...state.sheetData,
                    armorTemplate: {
                        ...state.sheetData.armorTemplate,
                        upgradeSlots: slots
                    }
                }
            };
        }
        
        // 其它情况，点亮前 n+1 个插槽
        const slots = current.map((slot, i) => ({
            checked: i <= index,
            text: slot?.text || ''
        }));
        
        return {
            sheetData: {
                ...state.sheetData,
                armorTemplate: {
                    ...state.sheetData.armorTemplate,
                    upgradeSlots: slots
                }
            }
        };
    }),

    updateUpgradeSlotText: (index, text) => set((state) => {
        const slots = [...(state.sheetData.armorTemplate?.upgradeSlots || [])];
        slots[index] = { checked: slots[index]?.checked || false, text };
        return {
            sheetData: {
                ...state.sheetData,
                armorTemplate: {
                    ...state.sheetData.armorTemplate,
                    upgradeSlots: slots
                }
            }
        };
    }),

    updateUpgrade: (tier, upgradeName, value) => set((state) => {
        const currentArmor = state.sheetData.armorTemplate || {};
        const currentUpgrades = currentArmor.upgrades || { basic: {}, tier2: {}, tier3: {}, tier4: {} };
        const currentTierUpgrades = currentUpgrades[tier as keyof typeof currentUpgrades] || {};
        
        return {
            sheetData: {
                ...state.sheetData,
                armorTemplate: {
                    ...currentArmor,
                    upgrades: {
                        ...currentUpgrades,
                        [tier]: {
                            ...currentTierUpgrades,
                            [upgradeName]: value
                        }
                    }
                }
            }
        };
    }),

    updateScrapMaterial: (category, index, value) => set((state) => {
        const currentArmor = state.sheetData.armorTemplate || {};
        const currentMaterials = currentArmor.scrapMaterials || {
            fragments: [],
            metals: [],
            components: [],
            relics: []
        };
        
        const updatedMaterials = { ...currentMaterials };
        
        if (category === 'fragments' || category === 'metals' || category === 'components') {
            const array = [...(updatedMaterials[category] || [])];
            array[index] = value as number;
            updatedMaterials[category] = array;
        } else if (category === 'relics') {
            const array = [...(updatedMaterials[category] || [])];
            array[index] = value as string;
            updatedMaterials[category] = array;
        }
        
        return {
            sheetData: {
                ...state.sheetData,
                armorTemplate: {
                    ...currentArmor,
                    scrapMaterials: updatedMaterials
                }
            }
        };
    }),
    
    updateCard: (index, card, isInventory) => set((state) => {
        if (isInventory) {
            // 更新库存卡牌
            const newInventoryCards = [...(state.sheetData.inventory_cards || [])];
            // 确保数组长度为20
            while (newInventoryCards.length < 20) {
                newInventoryCards.push(createEmptyCard());
            }
            newInventoryCards[index] = card;
            
            return {
                sheetData: {
                    ...state.sheetData,
                    inventory_cards: newInventoryCards
                }
            };
        } else {
            // 更新主卡组卡牌
            const newCards = [...(state.sheetData.cards || [])];
            // 确保数组长度为20
            while (newCards.length < 20) {
                newCards.push(createEmptyCard());
            }
            newCards[index] = card;
            
            return {
                sheetData: {
                    ...state.sheetData,
                    cards: newCards
                }
            };
        }
    }),
}));

// Selector functions for better performance
export const useSheetName = () => useSheetStore(state => state.sheetData.name);
export const useSheetLevel = () => useSheetStore(state => state.sheetData.level);
export const useSheetGold = () => useSheetStore(state => state.sheetData.gold);
export const useSheetHope = () => useSheetStore(state => state.sheetData.hope);
export const useSheetArmorBoxes = () => useSheetStore(state => state.sheetData.armorBoxes);
export const useSheetProficiency = () => useSheetStore(state => state.sheetData.proficiency);
export const useSheetHP = () => useSheetStore(state => state.sheetData.hp);
export const useSheetExperience = () => useSheetStore(state => state.sheetData.experience);

// Helper function to safely merge data, filtering out undefined values
const safelyMergeData = (defaultData: SheetData, userData: Partial<SheetData>): SheetData => {
    const result = { ...defaultData };
    
    // Only copy defined values from userData
    Object.keys(userData).forEach(key => {
        const value = userData[key as keyof SheetData];
        if (value !== undefined) {
            (result as any)[key] = value;
        }
    });
    
    return result;
};

// Safe data selector with default values - using a memoized approach
let cachedSafeData: SheetData | null = null;
let lastSheetData: SheetData | null = null;

export const useSafeSheetData = () => useSheetStore(state => {
    // Only recalculate if sheetData has changed
    if (state.sheetData !== lastSheetData) {
        lastSheetData = state.sheetData;
        cachedSafeData = safelyMergeData(defaultSheetData, state.sheetData);
    }
    return cachedSafeData!;
});
export const useSheetAttributes = () => useSheetStore(state => ({
    agility: state.sheetData.agility,
    finesse: state.sheetData.finesse,
    knowledge: state.sheetData.knowledge,
    strength: state.sheetData.strength,
    instinct: state.sheetData.instinct,
    presence: state.sheetData.presence,
}));

// Card-specific selectors
export const useSheetCards = () => useSheetStore(state => state.sheetData.cards);
export const useSheetInventoryCards = () => useSheetStore(state => state.sheetData.inventory_cards);

// Cache the card actions object to avoid infinite loops
let cachedCardActions: {
    deleteCard: (index: number, isInventory: boolean) => void;
    moveCard: (fromIndex: number, fromInventory: boolean, toInventory: boolean) => boolean;
    updateCard: (index: number, card: StandardCard, isInventory: boolean) => void;
} | null = null;

export const useCardActions = () => {
    return useSheetStore(state => {
        if (!cachedCardActions) {
            cachedCardActions = {
                deleteCard: state.deleteCard,
                moveCard: state.moveCard,
                updateCard: state.updateCard,
            };
        }
        return cachedCardActions;
    });
};
