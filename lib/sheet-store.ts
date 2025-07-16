"use client";

import { create } from "zustand";
import { defaultSheetData } from "./default-sheet-data";
import type { SheetData, AttributeValue } from "./sheet-data";
import { createEmptyCard, type StandardCard } from "@/card/card-types";

// 施法属性映射关系
const SPELLCASTING_ATTRIBUTE_MAP: Record<string, keyof SheetData> = {
    "敏捷": "agility",
    "力量": "strength",
    "灵巧": "finesse",
    "本能": "instinct",
    "风度": "presence",
    "知识": "knowledge"
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
    updateName: (name: string) => void;
    updateLevel: (level: string) => void;
    
    // Card management actions
    deleteCard: (index: number, isInventory: boolean) => void;
    moveCard: (fromIndex: number, fromInventory: boolean, toInventory: boolean) => boolean;
    updateCard: (index: number, card: StandardCard, isInventory: boolean) => void;
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
