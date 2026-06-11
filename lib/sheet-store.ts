"use client";

import { create } from "zustand";
import { defaultSheetData } from "./default-sheet-data";
import type { SheetData, AttributeValue, ArmorTemplateData, SheetCardReference } from "./sheet-data";
import { createEmptyCard, type StandardCard } from "@/card/card-types";
import { armorItems } from "@/data/list/armor";
import { allWeapons } from "@/data/list/all-weapons";
import { parseArmorMax, parseArmorThreshold, parseArmorThresholdSide } from "@/automation/equipment/armor-utils";
import {
    createDefaultEquipmentModifierContribution,
    createEquipmentContributionId as createAdHocEquipmentContributionId,
    isEquipmentModifierTargetId,
    sanitizeEquipmentModifierContributions,
} from "@/automation/equipment/contribution-utils";
import { createEmptyArmorSlot, createEmptyWeaponSlot } from "@/automation/equipment/defaults";
import { swapInventoryWeaponWithActiveSlot } from "@/automation/equipment/weapon-slot-utils";
import {
    createArmorSlotFromCustomDraft,
    createArmorSlotFromRuntimeTemplate,
    createArmorSlotFromTemplate,
    createWeaponSlotFromCustomDraft,
    createWeaponSlotFromName,
    createWeaponSlotFromRuntimeTemplate,
    createWeaponSlotFromTemplate,
    type CustomArmorDraft,
    type CustomWeaponDraft,
} from "@/automation/equipment/template-to-slot";
import type { ArmorSlot, EquipmentModifierContribution, EquipmentModifierTargetId, WeaponSlot } from "@/automation/equipment/types";
import type { RuntimeEquipmentTemplate } from "@/equipment/runtime-cache/types";
import type {
    ModifierEntryId,
    ModifierTargetId,
    OtherAdjustment,
    UpgradeState,
    UserModifierContribution,
} from "@/automation/core/types";
import {
    deleteSpecialBase,
    disableAutoCalculationForTarget,
    enableAutoCalculationForTarget,
    reconcileFinalInput,
} from "@/automation/core/final-input-reconciliation";
import { applyAutoCalculationForTargets, isTargetAutoCalculationEnabled } from "@/automation/core/target-sync";
import { writeTargetValue } from "@/automation/core/target-accessors";
import { tryParseNumberExpression } from "@/lib/number-utils";
import { applyHpStressMaxInvariant } from "@/automation/core/hp-stress-invariants";
import { mergeUpgradeState } from "@/automation/core/upgrade-states";
import {
    removeOtherAdjustment as removeOtherAdjustmentFromList,
    sanitizeOtherAdjustments,
    upsertOtherAdjustment as upsertOtherAdjustmentInList,
} from "@/automation/core/other-adjustments";
import { applyLevelEntryAutomationsWithNotifications } from "@/automation/actions/level-entry-actions";
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

let equipmentContributionSequence = 0;

function createEquipmentContributionId(templateId: string): string {
    equipmentContributionSequence += 1;
    return `equipment:${templateId}:${equipmentContributionSequence}`;
}

type WeaponSlotSelection =
    | { slotType: "primary" | "secondary" }
    | { slotType: "inventory"; index: 0 | 1 }

export type WeaponSelectionInput =
    | { type: "none" }
    | { type: "custom"; draft: CustomWeaponDraft }
    | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "weapon" } }

export type ArmorSelectionInput =
    | { type: "none" }
    | { type: "custom"; draft: CustomArmorDraft }
    | { type: "template"; template: RuntimeEquipmentTemplate & { kind: "armor" } }

type EquipmentModifierSlotRef =
    | { type: "weapon"; slot: "primary" | "secondary" }
    | { type: "inventoryWeapon"; index: 0 | 1 }
    | { type: "armor" }

type EquipmentContributionUpdates = {
    editable?: Partial<EquipmentModifierContribution["editable"]>
}

const weaponSlotSelectionId = (selection: WeaponSlotSelection) =>
    selection.slotType === "inventory" ? `inventory-${selection.index}` : selection.slotType

const createWeaponContributionId = (selection: WeaponSlotSelection, templateContributionId: string) => {
    return `equipment:${weaponSlotSelectionId(selection)}:${Date.now()}:${Math.random().toString(36).slice(2)}:${templateContributionId}`;
}

function createSelectedWeaponSlot(selection: WeaponSlotSelection, weaponId: string): WeaponSlot {
    if (weaponId === "none") {
        return createEmptyWeaponSlot()
    }

    const template = allWeapons.find((weapon) => weapon.id === weaponId)
    if (template) {
        return createWeaponSlotFromTemplate(template, (templateContributionId) =>
            createWeaponContributionId(selection, templateContributionId),
        )
    }

    return createWeaponSlotFromName(weaponId)
}

function createSelectedRuntimeWeaponSlot(selection: WeaponSlotSelection, input: WeaponSelectionInput): WeaponSlot {
    if (input.type === "none") {
        return createEmptyWeaponSlot()
    }

    if (input.type === "custom") {
        return createWeaponSlotFromCustomDraft(input.draft, (templateContributionId) =>
            createWeaponContributionId(selection, templateContributionId),
        )
    }

    return createWeaponSlotFromRuntimeTemplate(input.template, (templateContributionId) =>
        createWeaponContributionId(selection, templateContributionId),
    )
}

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
    toggleAttributeChecked: (attribute: keyof SheetData) => void;
    updateGold: (index: number) => void;
    updateHope: (index: number) => void;
    updateArmorBox: (index: number) => void;
    updateProficiency: (index: number) => void;
    updateExperience: (index: number, value: string) => void;
    addExperienceWithModifierValue: (text: string, value: string) => void;
    updateHP: (index: number, checked: boolean) => void;
    updateName: (name: string) => void;
    updateHPMax: (value: number) => void;
    updateStressMax: (value: number) => void;

    // Threshold calculation actions
    updateLevel: (level: string) => void;
    updateArmorBaseThresholds: (baseThresholds: string) => void;
    updateArmorBaseThresholdSide: (side: "minor" | "major", value: string) => void;
    updateArmorBaseMax: (baseArmorMax: string) => void;
    selectArmor: (armorId: string) => void;
    selectArmorSlot: (input: ArmorSelectionInput) => void;
    selectWeaponSlot: (selection: WeaponSlotSelection, weaponId: string) => void;
    selectWeapon: (selection: WeaponSlotSelection, input: WeaponSelectionInput) => void;
    updateActiveWeaponSlot: (slotType: "primary" | "secondary", updates: Partial<WeaponSlot>) => void;
    updateInventoryWeaponSlot: (index: 0 | 1, updates: Partial<WeaponSlot>) => void;
    swapInventoryWeaponToActiveSlot: (index: 0 | 1, targetType: "primary" | "secondary") => void;

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

    setActiveModifierBase: (target: ModifierTargetId, baseId: ModifierEntryId | undefined) => void;
    setTargetAutoCalculation: (target: ModifierTargetId, enabled: boolean) => void;
    commitModifierTargetValue: (target: ModifierTargetId, value: unknown) => void;
    upsertUserModifierContribution: (contribution: UserModifierContribution) => void;
    removeUserModifierContribution: (entryId: ModifierEntryId) => void;
    upsertOtherAdjustment: (adjustment: OtherAdjustment) => void;
    removeOtherAdjustment: (entryId: string) => void;
    removeSpecialBaseContribution: (target: ModifierTargetId, entryId: ModifierEntryId) => void;
    setUpgradeState: (checkKey: string, state: UpgradeState) => void;
    addEquipmentModifierContribution: (slotRef: EquipmentModifierSlotRef) => void;
    updateEquipmentModifierContribution: (
        slotRef: EquipmentModifierSlotRef,
        entryId: ModifierEntryId,
        updates: EquipmentContributionUpdates,
    ) => void;
    changeEquipmentModifierContributionTarget: (
        slotRef: EquipmentModifierSlotRef,
        entryId: ModifierEntryId,
        target: EquipmentModifierTargetId,
    ) => void;
    removeEquipmentModifierContribution: (slotRef: EquipmentModifierSlotRef, entryId: ModifierEntryId) => void;

    // Profession change handler
    handleProfessionChange: (newProfessionRef: SheetCardReference | undefined, newProfessionCard: StandardCard | undefined) => void;
}

const ensureModifierState = (sheetData: SheetData) => ({
    targetStates: {
        ...(sheetData.modifierState?.targetStates ?? {}),
    },
    entryStates: {
        ...(sheetData.modifierState?.entryStates ?? {}),
    },
});

const cleanupTargetState = (state: { activeBaseId?: ModifierEntryId; autoCalculation?: boolean }) => {
    const next: { activeBaseId?: ModifierEntryId; autoCalculation?: boolean } = {};
    if (state.activeBaseId) {
        next.activeBaseId = state.activeBaseId;
    }
    if (state.autoCalculation !== undefined) {
        next.autoCalculation = state.autoCalculation;
    }
    return Object.keys(next).length > 0 ? next : undefined;
};

const setTargetState = (
    targetStates: ReturnType<typeof ensureModifierState>["targetStates"],
    target: ModifierTargetId,
    nextState: { activeBaseId?: ModifierEntryId; autoCalculation?: boolean },
) => {
    const cleaned = cleanupTargetState(nextState);
    if (cleaned) {
        targetStates[target] = cleaned;
    } else {
        delete targetStates[target];
    }
};

function canStoreRawFinalText(target: ModifierTargetId): boolean {
    return (
        target === "evasion" ||
        target === "minorThreshold" ||
        target === "majorThreshold" ||
        target === "agility.value" ||
        target === "strength.value" ||
        target === "finesse.value" ||
        target === "instinct.value" ||
        target === "presence.value" ||
        target === "knowledge.value" ||
        target.startsWith("experienceValues.")
    );
}

function applyModifierTargetValueSubmission(sheetData: SheetData, target: ModifierTargetId, value: unknown): SheetData | undefined {
    const autoCalculation = isTargetAutoCalculationEnabled(sheetData.modifierState?.targetStates?.[target]);
    const finalValue = tryParseNumberExpression(value);
    const storesRawText = canStoreRawFinalText(target);

    if (!autoCalculation) {
        let nextSheetData: SheetData;
        if (finalValue !== undefined) {
            nextSheetData = writeTargetValue(sheetData, target, finalValue);
        } else if (storesRawText) {
            nextSheetData = writeTargetValue(sheetData, target, String(value));
        } else {
            return undefined;
        }

        return applyAutoCalculationForTargets(applyHpStressMaxInvariant(nextSheetData, target));
    }

    if (finalValue === undefined) {
        if (!storesRawText) return undefined;

        return applyAutoCalculationForTargets(writeTargetValue(sheetData, target, String(value)));
    }

    const nextSheetData = reconcileFinalInput(sheetData, target, finalValue);
    return applyAutoCalculationForTargets(applyHpStressMaxInvariant(nextSheetData, target));
}

function equipmentModifierSourceId(slotRef: EquipmentModifierSlotRef): string {
    if (slotRef.type === "weapon") return `weapon:${slotRef.slot}`;
    if (slotRef.type === "inventoryWeapon") return `inventory:${slotRef.index}`;
    return "armor:current";
}

function updateEquipmentModifierSlot(
    sheetData: SheetData,
    slotRef: EquipmentModifierSlotRef,
    updateContributions: (contributions: EquipmentModifierContribution[]) => EquipmentModifierContribution[],
): SheetData {
    const equipment = sheetData.equipment;

    if (slotRef.type === "armor") {
        const contributions = sanitizeEquipmentModifierContributions(equipment.armorSlot.modifierContributions);
        return {
            ...sheetData,
            equipment: {
                ...equipment,
                armorSlot: {
                    ...equipment.armorSlot,
                    modifierContributions: updateContributions(contributions),
                },
            },
        };
    }

    if (slotRef.type === "inventoryWeapon") {
        const inventory = [...equipment.weaponSlots.inventory] as typeof equipment.weaponSlots.inventory;
        const slot = inventory[slotRef.index];
        const contributions = sanitizeEquipmentModifierContributions(slot.modifierContributions);
        inventory[slotRef.index] = {
            ...slot,
            modifierContributions: updateContributions(contributions),
        };
        return {
            ...sheetData,
            equipment: {
                ...equipment,
                weaponSlots: {
                    ...equipment.weaponSlots,
                    inventory,
                },
            },
        };
    }

    const slot = equipment.weaponSlots[slotRef.slot];
    const contributions = sanitizeEquipmentModifierContributions(slot.modifierContributions);
    return {
        ...sheetData,
        equipment: {
            ...equipment,
            weaponSlots: {
                ...equipment.weaponSlots,
                [slotRef.slot]: {
                    ...slot,
                    modifierContributions: updateContributions(contributions),
                },
            },
        },
    };
}

function deleteModifierEntryState(sheetData: SheetData, entryId: ModifierEntryId): SheetData {
    if (!sheetData.modifierState?.entryStates?.[entryId]) return sheetData;

    const modifierState = ensureModifierState(sheetData);
    const entryStates = { ...modifierState.entryStates };
    delete entryStates[entryId];

    return {
        ...sheetData,
        modifierState: {
            ...modifierState,
            entryStates,
        },
    };
}

export const useSheetStore = create<SheetState>((set) => ({
    sheetData: defaultSheetData,
    setSheetData: (updater) => {
        set((state) => {
            const oldData = state.sheetData;
            const rawUpdatedData = typeof updater === 'function' ? updater(oldData) : updater;
            let newData = { ...oldData, ...rawUpdatedData };

            // 检查 armorMax 是否改变，如果改变则清空所有 armorBoxes
            if ('armorMax' in rawUpdatedData && rawUpdatedData.armorMax !== oldData.armorMax) {
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

        return {
            sheetData: applyAutoCalculationForTargets(finalData),
        };
    }),

    // Granular actions
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
        const currentHope = typeof state.sheetData.hope === 'number'
            ? state.sheetData.hope
            : 0
        const hopeMax = state.sheetData.hopeMax || 6

        // 如果点击当前最后一个点亮的位置（index === currentHope - 1），清零
        if (index === currentHope - 1) {
            return {
                sheetData: {
                    ...state.sheetData,
                    hope: 0
                }
            }
        }

        // 否则设置为点击位置 + 1（因为 index 从 0 开始）
        const newHope = Math.min(index + 1, hopeMax)
        return {
            sheetData: {
                ...state.sheetData,
                hope: newHope
            }
        }
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
        let finalCount: number;
        if (index === lastLit && current[index]) {
            finalCount = 0;
        } else {
            finalCount = index + 1;
        }

        const autoCalculation = isTargetAutoCalculationEnabled(state.sheetData.modifierState?.targetStates?.proficiency);
        if (autoCalculation) {
            return {
                sheetData: applyAutoCalculationForTargets(reconcileFinalInput(state.sheetData, "proficiency", finalCount)),
            };
        }

        const newProficiency = current.map((_, i) => i < finalCount);
        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                proficiency: newProficiency
            })
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

    addExperienceWithModifierValue: (text, value) => set((state) => {
        const experience = [...(state.sheetData.experience || ["", "", "", "", ""])];
        const experienceValues = [...(state.sheetData.experienceValues || ["", "", "", "", ""])];
        const trimmedText = text.trim();
        if (!trimmedText) return state;

        const emptySlotIndex = experience.findIndex((item, index) => item === "" && experienceValues[index] === "");
        if (emptySlotIndex === -1) return state;

        experience[emptySlotIndex] = trimmedText;
        const target = `experienceValues.${emptySlotIndex}` as ModifierTargetId;
        const nextSheetData = applyModifierTargetValueSubmission({
            ...state.sheetData,
            experience,
        }, target, value);

        return nextSheetData ? { sheetData: nextSheetData } : state;
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

    updateHPMax: (value) => set((state) => {
        const autoCalculation = isTargetAutoCalculationEnabled(state.sheetData.modifierState?.targetStates?.hpMax);
        const nextSheetData = autoCalculation
            ? reconcileFinalInput(state.sheetData, "hpMax", value)
            : writeTargetValue(state.sheetData, "hpMax", value);
        return {
            sheetData: applyAutoCalculationForTargets(applyHpStressMaxInvariant(nextSheetData, "hpMax")),
        };
    }),

    updateStressMax: (value) => set((state) => {
        const autoCalculation = isTargetAutoCalculationEnabled(state.sheetData.modifierState?.targetStates?.stressMax);
        const nextSheetData = autoCalculation
            ? reconcileFinalInput(state.sheetData, "stressMax", value)
            : writeTargetValue(state.sheetData, "stressMax", value);
        return {
            sheetData: applyAutoCalculationForTargets(applyHpStressMaxInvariant(nextSheetData, "stressMax")),
        };
    }),

    // Threshold calculation actions
    updateLevel: (level) => set((state) => {
        const automationResult = applyLevelEntryAutomationsWithNotifications(state.sheetData, level);
        automationResult.notifications.forEach((notification) => {
            showFadeNotification(notification);
        });

        return {
            sheetData: applyAutoCalculationForTargets({
                ...automationResult.sheetData,
                level,
            }),
        };
    }),

    updateArmorBaseThresholds: (baseThresholds) => set((state) => {
        const armorSlot: ArmorSlot = {
            ...state.sheetData.equipment.armorSlot,
            baseThresholds: parseArmorThreshold(baseThresholds),
        };

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    armorSlot,
                },
            }),
        };
    }),

    updateArmorBaseThresholdSide: (side, value) => set((state) => {
        const baseThresholds = value.includes("/")
            ? parseArmorThreshold(value)
            : {
                ...state.sheetData.equipment.armorSlot.baseThresholds,
                [side]: parseArmorThresholdSide(value),
            };

        const armorSlot: ArmorSlot = {
            ...state.sheetData.equipment.armorSlot,
            baseThresholds,
        };

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    armorSlot,
                },
            }),
        };
    }),

    updateArmorBaseMax: (baseArmorMaxText) => set((state) => {
        const baseArmorMax = parseArmorMax(baseArmorMaxText);

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    armorSlot: {
                        ...state.sheetData.equipment.armorSlot,
                        baseArmorMax,
                    },
                },
            }),
        };
    }),

    selectArmor: (armorId: string) => set((state) => {
        let armorSlot: ArmorSlot;

        if (armorId === "none") {
            armorSlot = createEmptyArmorSlot();
        } else {
            const armor = armorItems.find((armor) => armor.id === armorId);

            if (armor) {
                armorSlot = createArmorSlotFromTemplate(armor, createEquipmentContributionId);
            } else {
                armorSlot = {
                    ...createEmptyArmorSlot(),
                    name: armorId,
                };
            }
        }

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    armorSlot,
                },
            }),
        };
    }),

    selectArmorSlot: (input) => set((state) => {
        const armorSlot = input.type === "none"
            ? createEmptyArmorSlot()
            : input.type === "custom"
                ? createArmorSlotFromCustomDraft(input.draft, createEquipmentContributionId)
                : createArmorSlotFromRuntimeTemplate(input.template, createEquipmentContributionId);

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    armorSlot,
                },
            }),
        };
    }),

    selectWeaponSlot: (selection, weaponId) => set((state) => {
        const slot = createSelectedWeaponSlot(selection, weaponId);
        const weaponSlots = state.sheetData.equipment.weaponSlots;

        if (selection.slotType === "inventory") {
            const inventory = [...weaponSlots.inventory] as typeof weaponSlots.inventory;
            inventory[selection.index] = slot;

            return {
                sheetData: applyAutoCalculationForTargets({
                    ...state.sheetData,
                    equipment: {
                        ...state.sheetData.equipment,
                        weaponSlots: {
                            ...weaponSlots,
                            inventory,
                        },
                    },
                }),
            };
        }

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    weaponSlots: {
                        ...weaponSlots,
                        [selection.slotType]: slot,
                    },
                },
            }),
        };
    }),

    selectWeapon: (selection, input) => set((state) => {
        const slot = createSelectedRuntimeWeaponSlot(selection, input);
        const weaponSlots = state.sheetData.equipment.weaponSlots;

        if (selection.slotType === "inventory") {
            const inventory = [...weaponSlots.inventory] as typeof weaponSlots.inventory;
            inventory[selection.index] = slot;

            return {
                sheetData: applyAutoCalculationForTargets({
                    ...state.sheetData,
                    equipment: {
                        ...state.sheetData.equipment,
                        weaponSlots: {
                            ...weaponSlots,
                            inventory,
                        },
                    },
                }),
            };
        }

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    weaponSlots: {
                        ...weaponSlots,
                        [selection.slotType]: slot,
                    },
                },
            }),
        };
    }),

    updateActiveWeaponSlot: (slotType, updates) => set((state) => ({
        sheetData: applyAutoCalculationForTargets({
            ...state.sheetData,
            equipment: {
                ...state.sheetData.equipment,
                weaponSlots: {
                    ...state.sheetData.equipment.weaponSlots,
                    [slotType]: {
                        ...state.sheetData.equipment.weaponSlots[slotType],
                        ...updates,
                    },
                },
            },
        }),
    })),

    updateInventoryWeaponSlot: (index, updates) => set((state) => {
        const inventory = [...state.sheetData.equipment.weaponSlots.inventory] as typeof state.sheetData.equipment.weaponSlots.inventory;
        inventory[index] = {
            ...inventory[index],
            ...updates,
        };

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                equipment: {
                    ...state.sheetData.equipment,
                    weaponSlots: {
                        ...state.sheetData.equipment.weaponSlots,
                        inventory,
                    },
                },
            }),
        };
    }),

    swapInventoryWeaponToActiveSlot: (index, targetType) => set((state) => ({
        sheetData: applyAutoCalculationForTargets({
            ...state.sheetData,
            equipment: swapInventoryWeaponWithActiveSlot(state.sheetData.equipment, index, targetType),
        }),
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
                sheetData: applyAutoCalculationForTargets({
                    ...state.sheetData,
                    cards: newCards
                })
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
                sheetData: applyAutoCalculationForTargets({
                    ...state.sheetData,
                    cards: newFocusedCards,
                    inventory_cards: newInventoryCards
                })
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
                sheetData: applyAutoCalculationForTargets({
                    ...state.sheetData,
                    cards: newCards
                })
            };
        }
    }),

    setActiveModifierBase: (target, baseId) => set((state) => {
        const modifierState = ensureModifierState(state.sheetData);
        const targetStates = { ...modifierState.targetStates };
        const currentTargetState = targetStates[target] ?? {};
        setTargetState(targetStates, target, {
            ...currentTargetState,
            activeBaseId: baseId,
        });

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                modifierState: {
                    ...modifierState,
                    targetStates,
                },
            }),
        };
    }),

    setTargetAutoCalculation: (target, enabled) => set((state) => {
        if (enabled) {
            return {
                sheetData: applyAutoCalculationForTargets(enableAutoCalculationForTarget(state.sheetData, target)),
            };
        }

        return {
            sheetData: applyAutoCalculationForTargets(disableAutoCalculationForTarget(state.sheetData, target)),
        };
    }),

    commitModifierTargetValue: (target, value) => set((state) => {
        const nextSheetData = applyModifierTargetValueSubmission(state.sheetData, target, value);
        return nextSheetData ? { sheetData: nextSheetData } : state;
    }),

    upsertUserModifierContribution: (contribution) => set((state) => {
        const contributions = state.sheetData.userModifierContributions ?? [];
        const nextContributions = contributions.some(existing => existing.id === contribution.id)
            ? contributions.map(existing => existing.id === contribution.id ? contribution : existing)
            : [...contributions, contribution];

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                userModifierContributions: nextContributions,
            }),
        };
    }),

    removeUserModifierContribution: (entryId) => set((state) => ({
        sheetData: applyAutoCalculationForTargets({
            ...state.sheetData,
            userModifierContributions: (state.sheetData.userModifierContributions ?? []).filter(
                contribution => contribution.id !== entryId,
            ),
        }),
    })),

    upsertOtherAdjustment: (adjustment) => set((state) => {
        const nextSheetData: SheetData = {
            ...state.sheetData,
            otherAdjustments: upsertOtherAdjustmentInList(state.sheetData.otherAdjustments, adjustment),
        };

        return {
            sheetData: applyAutoCalculationForTargets(nextSheetData),
        };
    }),

    removeOtherAdjustment: (entryId) => set((state) => {
        const adjustment = sanitizeOtherAdjustments(state.sheetData.otherAdjustments).find(
            item => item.id === entryId,
        );
        if (!adjustment) return state;

        const nextSheetData: SheetData = {
            ...state.sheetData,
            otherAdjustments: removeOtherAdjustmentFromList(state.sheetData.otherAdjustments, entryId),
        };

        return {
            sheetData: applyAutoCalculationForTargets(nextSheetData),
        };
    }),

    removeSpecialBaseContribution: (target, entryId) => set((state) => ({
        sheetData: applyAutoCalculationForTargets(deleteSpecialBase(state.sheetData, target, entryId)),
    })),

    setUpgradeState: (checkKey, upgradeState) => set((state) => {
        const nextSheetData: SheetData = {
            ...state.sheetData,
            upgradeStates: {
                ...(state.sheetData.upgradeStates ?? {}),
                [checkKey]: mergeUpgradeState(state.sheetData.upgradeStates?.[checkKey], upgradeState),
            },
        };
        delete (nextSheetData as any).checkedUpgrades;
        delete (nextSheetData as any).automationSelections;

        return {
            sheetData: applyAutoCalculationForTargets(nextSheetData),
        };
    }),

    addEquipmentModifierContribution: (slotRef) => set((state) => ({
        sheetData: applyAutoCalculationForTargets(
            updateEquipmentModifierSlot(state.sheetData, slotRef, contributions => [
                ...contributions,
                createDefaultEquipmentModifierContribution(equipmentModifierSourceId(slotRef)),
            ]),
        ),
    })),

    updateEquipmentModifierContribution: (slotRef, entryId, updates) => set((state) => ({
        sheetData: applyAutoCalculationForTargets(
            updateEquipmentModifierSlot(state.sheetData, slotRef, contributions =>
                contributions.map(contribution => {
                    if (contribution.id !== entryId) return contribution;

                    return {
                        ...contribution,
                        editable: {
                            label: updates.editable?.label ?? contribution.editable.label,
                            value: updates.editable?.value ?? contribution.editable.value,
                        },
                    };
                }),
            ),
        ),
    })),

    changeEquipmentModifierContributionTarget: (slotRef, entryId, target) => set((state) => {
        if (!isEquipmentModifierTargetId(target)) return state;

        const sourceId = equipmentModifierSourceId(slotRef);
        let matched = false;
        const updatedSheetData = updateEquipmentModifierSlot(state.sheetData, slotRef, contributions =>
            contributions.map(contribution => {
                if (contribution.id !== entryId) return contribution;
                matched = true;

                return {
                    id: createAdHocEquipmentContributionId(sourceId),
                    definition: {
                        target,
                        kind: "modifier",
                    },
                    editable: contribution.editable,
                };
            }),
        );

        if (!matched) return state;

        return {
            sheetData: applyAutoCalculationForTargets(deleteModifierEntryState(updatedSheetData, entryId)),
        };
    }),

    removeEquipmentModifierContribution: (slotRef, entryId) => set((state) => {
        let matched = false;
        const updatedSheetData = updateEquipmentModifierSlot(state.sheetData, slotRef, contributions =>
            contributions.filter(contribution => {
                if (contribution.id !== entryId) return true;
                matched = true;
                return false;
            }),
        );

        if (!matched) return state;

        return {
            sheetData: applyAutoCalculationForTargets(deleteModifierEntryState(updatedSheetData, entryId)),
        };
    }),

    handleProfessionChange: (newProfessionRef, newProfessionCard) => set((state) => {
        const cards = [...(state.sheetData.cards || [])];
        while (cards.length < 20) {
            cards.push(createEmptyCard());
        }
        cards[0] = newProfessionCard ?? createEmptyCard();

        return {
            sheetData: applyAutoCalculationForTargets({
                ...state.sheetData,
                profession: newProfessionRef?.id ?? "",
                professionRef: newProfessionRef ?? { id: "", name: "" },
                subclass: "",
                subclassRef: { id: "", name: "" },
                cards,
            }),
        };
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
