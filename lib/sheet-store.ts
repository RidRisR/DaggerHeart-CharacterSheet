"use client";

import { create } from "zustand";
import { defaultSheetData } from "./default-sheet-data";
import type { SheetData, AttributeValue } from "./sheet-data";

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
    updateExperience: (index: number, value: string) => void;
    updateExperienceValues: (index: number, value: string) => void;
    updateHP: (index: number, checked: boolean) => void;
    updateName: (name: string) => void;
    updateLevel: (level: string) => void;
}

export const useSheetStore = create<SheetState>((set) => ({
    sheetData: defaultSheetData,
    setSheetData: (updater) => {
        set((state) => {
            const oldData = state.sheetData;
            const rawUpdatedData = typeof updater === 'function' ? updater(oldData) : updater;
            const newData = { ...oldData, ...rawUpdatedData };

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
        const current = state.sheetData.hope;
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
}));

// Selector functions for better performance
export const useSheetName = () => useSheetStore(state => state.sheetData.name);
export const useSheetLevel = () => useSheetStore(state => state.sheetData.level);
export const useSheetGold = () => useSheetStore(state => state.sheetData.gold);
export const useSheetHope = () => useSheetStore(state => state.sheetData.hope);
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
