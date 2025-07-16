"use client"

import type React from "react"
import type { SheetData } from "@/lib/sheet-data"

import { useState, useEffect, useRef } from "react"
import { primaryWeapons, Weapon } from "@/data/list/primary-weapon"
import { secondaryWeapons } from "@/data/list/secondary-weapon"
import { ArmorItem, armorItems } from "@/data/list/armor"
import {
  getAllStandardCardsAsync,
  getStandardCardsByTypeAsync,
  CardType, // Import CardType
} from "@/card"
import { useAllCards } from "@/card/card-store"
import { useSheetStore } from "@/lib/sheet-store"

// Import modals
import { WeaponSelectionModal } from "@/components/modals/weapon-selection-modal"
import { ArmorSelectionModal } from "@/components/modals/armor-selection-modal"
import { GenericCardSelectionModal } from "@/components/modals/generic-card-selection-modal"

// Import sections
import { HeaderSection } from "@/components/character-sheet-sections/header-section"
import { AttributesSection } from "@/components/character-sheet-sections/attributes-section"
import { HitPointsSection } from "@/components/character-sheet-sections/hit-points-section"
import { HopeSection } from "@/components/character-sheet-sections/hope-section"
import { ExperienceSection } from "@/components/character-sheet-sections/experience-section"
import { GoldSection } from "@/components/character-sheet-sections/gold-section"
import { WeaponSection } from "@/components/character-sheet-sections/weapon-section"
import { ArmorSection } from "@/components/character-sheet-sections/armor-section"
import { InventorySection } from "@/components/character-sheet-sections/inventory-section"
import { InventoryWeaponSection } from "@/components/character-sheet-sections/inventory-weapon-section"
import ProfessionDescriptionSection from "@/components/character-sheet-sections/profession-description-section"
import { createEmptyCard, type StandardCard } from "@/card/card-types";
import { defaultSheetData } from "@/lib/default-sheet-data"; // Import the unified defaultFormData
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { ImageUploadCrop } from "@/components/ui/image-upload-crop"

export default function CharacterSheet() {
  const { sheetData: formData, setSheetData: setFormData } = useSheetStore();

  // 添加一个安全的表达式计算函数
  const safeEvaluateExpression = (expression: string): number => {
    if (!expression || typeof expression !== 'string') {
      return 0;
    }

    // 移除空格
    const cleanExpression = expression.replace(/\s/g, '');

    // 只允许数字、+、-、*、/、()和小数点
    if (!/^[0-9+\-*/().]+$/.test(cleanExpression)) {
      // 如果包含非法字符，尝试解析为普通数字
      const parsed = parseInt(cleanExpression, 10);
      return isNaN(parsed) ? 0 : parsed;
    }

    try {
      // 使用 Function 构造函数来安全地计算表达式
      const result = new Function(`return ${cleanExpression}`)();

      // 确保结果是有效数字
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.ceil(result); // 向上取整，确保是整数
      }

      return 0;
    } catch (error) {
      // 如果计算失败，尝试解析为普通数字
      const parsed = parseInt(expression, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
  };

  // 使用全局卡牌Store
  const {
    cards: allStandardCards,
    loading: cardsLoading,
    error: cardsError,
    fetchAllCards
  } = useAllCards();

  // 在组件加载时触发卡牌数据加载
  useEffect(() => {
    fetchAllCards();
  }, [fetchAllCards]);

  // 模态框状态
  const [weaponModalOpen, setWeaponModalOpen] = useState(false)
  const [currentWeaponField, setCurrentWeaponField] = useState("")
  const [currentWeaponSlotType, setCurrentWeaponSlotType] = useState<"primary" | "secondary" | "inventory">("primary") // Default to primary to avoid null
  const [armorModalOpen, setArmorModalOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentModal, setCurrentModal] = useState<{ type: "profession" | "ancestry" | "community" | "subclass"; field?: string; levelFilter?: number }>({ type: "profession" })

  const needsSyncRef = useRef(true)
  const initialRenderRef = useRef(true)

  // 确保 formData 和所有必要的子属性都存在
  // 适配 gold、experience、hope、hp、stress、armorBoxes 等字段为数组类型
  const safeFormData = {
    ...defaultSheetData,
    ...(formData || {}),
    // Ensure new Ref fields are initialized if not present in formData
    professionRef: formData?.professionRef || { id: "", name: "" },
    ancestry1Ref: formData?.ancestry1Ref || { id: "", name: "" },
    ancestry2Ref: formData?.ancestry2Ref || { id: "", name: "" },
    communityRef: formData?.communityRef || { id: "", name: "" },
    subclassRef: formData?.subclassRef || { id: "", name: "" },

    gold: Array.isArray(formData?.gold) ? formData.gold : Array(20).fill(false),
    experience: Array.isArray(formData?.experience) ? formData.experience : ["", "", "", "", ""],
    hope: Array.isArray(formData?.hope) ? formData.hope : Array(6).fill(false),
    hpMax: formData?.hpMax || 6,
    hp: Array.isArray(formData?.hp) ? formData.hp : Array(18).fill(false),
    stressMax: formData?.stressMax || 6,
    stress: Array.isArray(formData?.stress) ? formData.stress : Array(18).fill(false),
    armorBoxes: Array.isArray(formData?.armorBoxes) ? formData.armorBoxes : Array(12).fill(false),
    armorMax: formData?.armorMax || 0, // 保留默认值
    companionExperience: Array.isArray(formData?.companionExperience) ? formData.companionExperience : ["", "", "", "", ""],
    companionExperienceValue: Array.isArray(formData?.companionExperienceValue) ? formData.companionExperienceValue : ["", "", "", "", ""],
    companionStress: Array.isArray(formData?.companionStress) ? formData.companionStress : Array(6).fill(false),
    cards: Array.isArray(formData?.cards)
      ? formData.cards // 只允许 StandardCard[]
      : Array(20).fill(0).map(() => createEmptyCard()),
    // 确保属性对象存在
    agility: formData?.agility || { checked: false, value: "" },
    strength: formData?.strength || { checked: false, value: "" },
    finesse: formData?.finesse || { checked: false, value: "" },
    instinct: formData?.instinct || { checked: false, value: "" },
    presence: formData?.presence || { checked: false, value: "" },
    knowledge: formData?.knowledge || { checked: false, value: "" },
    proficiency: Array.isArray(formData?.proficiency) ? formData.proficiency : Array(6).fill(false),
  }

  // 同步特殊卡牌与角色选择 - 不直接修改状态，而是返回新的卡牌数组
  const getUpdatedSpecialCards = () => {
    console.log(`getUpdatedSpecialCards: Called. Profession ID: ${safeFormData.professionRef?.id}`);
    const newCards = [...safeFormData.cards];

    while (newCards.length < 5) {
      newCards.push(createEmptyCard("unknown"));
    }

    // 同步职业卡（位置0）
    if (safeFormData.professionRef?.id) {
      // 仅在ID不匹配时才更新
      if (newCards[0]?.id !== safeFormData.professionRef.id) {
        const professionCard = getProfessionById(safeFormData.professionRef.id);
        newCards[0] = professionCard;
      }
    } else {
      newCards[0] = createEmptyCard();
    }

    // 同步子职业卡（位置1）
    if (safeFormData.subclassRef?.id) {
      // 仅在ID不匹配时才更新
      if (newCards[1]?.id !== safeFormData.subclassRef.id) {
        const subclassCard = getSubclassById(safeFormData.subclassRef.id);
        newCards[1] = subclassCard;
      }
    } else {
      newCards[1] = createEmptyCard();
    }

    // 同步血统卡1（位置2）
    if (safeFormData.ancestry1Ref?.id) {
      // 仅在ID不匹配时才更新
      if (newCards[2]?.id !== safeFormData.ancestry1Ref.id) {
        const ancestry1Card = getAncestryById(safeFormData.ancestry1Ref.id);
        newCards[2] = ancestry1Card;
      }
    } else {
      newCards[2] = createEmptyCard();
    }

    // 同步血统卡2（位置3）
    if (safeFormData.ancestry2Ref?.id) {
      // 仅在ID不匹配时才更新
      if (newCards[3]?.id !== safeFormData.ancestry2Ref.id) {
        const ancestry2Card = getAncestryById(safeFormData.ancestry2Ref.id);
        newCards[3] = ancestry2Card;
      }
    } else {
      newCards[3] = createEmptyCard();
    }

    // 同步社群卡（位置4）
    if (safeFormData.communityRef?.id) {
      // 仅在ID不匹配时才更新
      if (newCards[4]?.id !== safeFormData.communityRef.id) {
        const communityCard = getCommunityById(safeFormData.communityRef.id);
        newCards[4] = communityCard;
      }
    } else {
      newCards[4] = createEmptyCard();
    }
    console.log(`getUpdatedSpecialCards: Returning newCards IDs: ${newCards.slice(0, 5).map(c => c.id)}`);
    return newCards;
  }

  // 同步特殊卡牌 - 仅在需要时更新状态
  const syncSpecialCardsWithCharacterChoices = () => {
    try {
      console.log(`syncSpecialCardsWithCharacterChoices: Called. Profession ID: ${safeFormData.professionRef?.id}`);
      // 获取更新后的卡牌
      const updatedCards = getUpdatedSpecialCards()

      // 检查是否需要更新
      let needsUpdate = false

      // 只检查前5张特殊卡牌
      for (let i = 0; i < 5; i++) {
        if (
          !safeFormData.cards[i] ||
          !updatedCards[i] ||
          safeFormData.cards[i].name !== updatedCards[i].name ||
          safeFormData.cards[i].type !== updatedCards[i].type
        ) {
          needsUpdate = true
          break
        }
      }

      // 只有在需要更新时才调用setFormData
      if (needsUpdate) {
        setFormData((prev) => ({
          ...prev,
          cards: updatedCards,
        }))
      } else {
        // console.log("No card updates needed") // Kept commented out as per previous logic
      }
    } catch (error) {
      console.error("Error syncing special cards:", error)
    }
  }

  // 根据ID获取职业名称
  const getProfessionById = (id: string): StandardCard => {
    if (cardsLoading || !allStandardCards.length) {
      return createEmptyCard();
    }
    const profession = allStandardCards.find((card) => card.id === id && card.type === CardType.Profession);
    return profession ? profession : createEmptyCard();
  }

  // 根据ID获取血统名称
  const getAncestryById = (id: string): StandardCard => {
    if (cardsLoading || !allStandardCards.length) {
      return createEmptyCard();
    }
    const ancestry = allStandardCards.find((card) => card.id === id && card.type === CardType.Ancestry);
    return ancestry ? ancestry : createEmptyCard();
  }

  // 根据ID获取社群名称
  const getCommunityById = (id: string): StandardCard => {
    if (cardsLoading || !allStandardCards.length) {
      return createEmptyCard();
    }
    const community = allStandardCards.find((card) => card.id === id && card.type === CardType.Community);
    return community ? community : createEmptyCard();
  }

  // 根据ID获取子职业名称
  const getSubclassById = (id: string): StandardCard => {
    if (cardsLoading || !allStandardCards.length) {
      return createEmptyCard();
    }
    const subclass = allStandardCards.find((card) => card.id === id && card.type === CardType.Subclass);
    return subclass ? subclass : createEmptyCard();
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updatedFormData = { ...prev, [name]: value };

      // 如果修改的是 armorValue，则更新 armorMax
      if (name === "armorValue") {
        const parsedValue = parseInt(value, 10);
        updatedFormData.armorMax = isNaN(parsedValue) ? 0 : parsedValue;
      }

      return updatedFormData;
    });
  }

  const handleAttributeValueChange = (attribute: keyof SheetData, value: string) => {
    // console.log("Updating attribute:", attribute, "with value:", value); // Removed this log
    setFormData((prev) => {
      const currentAttribute = prev[attribute]
      if (typeof currentAttribute === "object" && currentAttribute !== null && "checked" in currentAttribute) {
        return {
          ...prev,
          [attribute]: { ...currentAttribute, value },
        }
      }
      return prev
    })
  }

  const handleCheckboxChange = (field: keyof SheetData, index: number) => {
    setFormData((prev) => {
      let currentArray = prev[field] as boolean[] | undefined
      if (!Array.isArray(currentArray)) {
        if (field === "armorBoxes") currentArray = Array(12).fill(false)
        else if (field === "hp" || field === "stress") currentArray = Array(18).fill(false)
        else if (field === "hope") currentArray = Array(6).fill(false)
        else if (field === "gold") currentArray = Array(20).fill(false)
        else currentArray = []
      }
      const newArray = [...currentArray]
      newArray[index] = !newArray[index]
      return { ...prev, [field]: newArray }
    })
  }

  const handleBooleanChange = (field: keyof SheetData) => {
    setFormData((prev) => {
      const currentAttribute = prev[field]
      if (typeof currentAttribute === "object" && currentAttribute !== null && "checked" in currentAttribute) {
        return {
          ...prev,
          [field]: {
            ...currentAttribute,
            checked: !currentAttribute.checked,
          },
        }
      } else if (typeof currentAttribute === "boolean") {
        return {
          ...prev,
          [field]: !currentAttribute,
        }
      }
      return prev
    })
  }

  const handleMaxChange = (field: keyof SheetData, value: string) => {
    const numValue = Number.parseInt(value) || 0
    setFormData((prev) => ({ ...prev, [field]: numValue }))
  }

  // Helper function to map modal string type to CardType enum
  const getModalCardType = (modalType: "profession" | "ancestry" | "community" | "subclass"): Exclude<CardType, CardType.Domain> => {
    switch (modalType) {
      case "profession":
        return CardType.Profession;
      case "ancestry":
        return CardType.Ancestry;
      case "community":
        return CardType.Community;
      case "subclass":
        return CardType.Subclass;
      // No default needed as modalType is a constrained union type
    }
  };

  const handleProfessionChange = (value: string) => {
    console.log(`handleProfessionChange called with ID: ${value}`);

    if (value === "none") {
      // console.log("Clearing profession selection"); // Removed this log
      setFormData((prev) => {
        const updatedFormData = {
          ...prev,
          profession: "",
          professionRef: { id: "", name: "" },
          subclass: "",
          subclassRef: { id: "", name: "" },
        };
        return updatedFormData;
      });
    } else {
      if (cardsLoading || !allStandardCards.length) {
        console.warn('handleProfessionChange: Cards not loaded yet');
        return;
      }
      const professionCard = allStandardCards.find((p) => p.id === value && p.type === CardType.Profession);
      if (professionCard) {
        setFormData((prev) => {
          const updatedFormData = {
            ...prev,
            profession: professionCard.id,
            professionRef: { id: professionCard.id, name: professionCard.name },
            subclass: "",
            subclassRef: { id: "", name: "" },
          };
          return updatedFormData;
        });
      } else {
        console.warn(`handleProfessionChange: Profession card not found for ID: ${value}`);
      }
    }
    needsSyncRef.current = true;
  }

  const handleAncestryChange = (field: string, value: string) => {
    console.log(`handleAncestryChange called for field: ${field}, ID: ${value}`);
    const refField = field === "ancestry1" ? "ancestry1Ref" : "ancestry2Ref";

    if (value === "none" || !value) {
      setFormData((prev) => {
        const updatedFormData = {
          ...prev,
          [field]: "",
          [refField]: { id: "", name: "" },
        };
        return updatedFormData;
      })
    } else {
      if (cardsLoading || !allStandardCards.length) {
        console.warn('handleAncestryChange: Cards not loaded yet');
        return;
      }
      const ancestryCard = allStandardCards.find((a) => a.id === value && a.type === CardType.Ancestry);
      if (ancestryCard) {
        setFormData((prev) => {
          const updatedFormData = {
            ...prev,
            [field]: ancestryCard.id,
            [refField]: { id: ancestryCard.id, name: ancestryCard.name },
          };
          return updatedFormData;
        })
      } else {
        console.warn(`handleAncestryChange: Ancestry card not found for ID: ${value} in field: ${field}`);
      }
    }
    needsSyncRef.current = true
  }

  const handleCommunityChange = (value: string) => {
    console.log(`handleCommunityChange called with ID: ${value}`);
    if (value === "none" || !value) {
      setFormData((prev) => {
        const updatedFormData = {
          ...prev,
          community: "",
          communityRef: { id: "", name: "" },
        };
        return updatedFormData;
      })
    } else {
      if (cardsLoading || !allStandardCards.length) {
        console.warn('handleCommunityChange: Cards not loaded yet');
        return;
      }
      const communityCard = allStandardCards.find((c) => c.id === value && c.type === CardType.Community);
      if (communityCard) {
        setFormData((prev) => {
          const updatedFormData = {
            ...prev,
            community: communityCard.id,
            communityRef: { id: communityCard.id, name: communityCard.name },
          };
          return updatedFormData;
        })
      } else {
        console.warn(`handleCommunityChange: Community card not found for ID: ${value}`);
      }
    }
    needsSyncRef.current = true
  }

  const handleWeaponChange = (field: string, weaponId: string, weaponType: "primary" | "secondary") => {
    const weaponList = weaponType === "primary" ? primaryWeapons : secondaryWeapons
    const weapon = weaponList.find((w: Weapon) => w.名称 === weaponId)

    if (weapon) {
      const weaponDetails = {
        name: weapon.名称,
        trait: `${weapon.属性 || ""}/${weapon.负荷 || ""}/${weapon.范围 || ""}`,
        damage: `${weapon.检定 || ""}: ${weapon.伤害 || ""}`,
        feature: weapon.描述,
      }
      if (field === "primaryWeaponName") {
        setFormData((prev) => ({
          ...prev,
          primaryWeaponName: weaponDetails.name,
          primaryWeaponTrait: weaponDetails.trait,
          primaryWeaponDamage: weaponDetails.damage,
          primaryWeaponFeature: weaponDetails.feature,
        }))
      } else if (field === "secondaryWeaponName") {
        setFormData((prev) => ({
          ...prev,
          secondaryWeaponName: weaponDetails.name,
          secondaryWeaponTrait: weaponDetails.trait,
          secondaryWeaponDamage: weaponDetails.damage,
          secondaryWeaponFeature: weaponDetails.feature,
        }))
      } else if (field.startsWith("inventoryWeapon")) {
        const inventoryFieldPrefix = field.replace("Name", "")
        setFormData((prev) => ({
          ...prev,
          [`${inventoryFieldPrefix}Name`]: weaponDetails.name,
          [`${inventoryFieldPrefix}Trait`]: weaponDetails.trait,
          [`${inventoryFieldPrefix}Damage`]: weaponDetails.damage,
          [`${inventoryFieldPrefix}Feature`]: weaponDetails.feature,
        }))
      }
    } else if (weaponId === "none") {
      if (field === "primaryWeaponName") {
        setFormData((prev) => ({
          ...prev,
          primaryWeaponName: "",
          primaryWeaponTrait: "",
          primaryWeaponDamage: "",
          primaryWeaponFeature: "",
        }))
      } else if (field === "secondaryWeaponName") {
        setFormData((prev) => ({
          ...prev,
          secondaryWeaponName: "",
          secondaryWeaponTrait: "",
          secondaryWeaponDamage: "",
          secondaryWeaponFeature: "",
        }))
      } else if (field.startsWith("inventoryWeapon")) {
        const prefix = field.replace("Name", "")
        setFormData((prev) => ({
          ...prev,
          [`${prefix}Name`]: "",
          [`${prefix}Trait`]: "",
          [`${prefix}Damage`]: "",
          [`${prefix}Feature`]: "",
        }))
      }
    } else if (weaponId) { // 处理自定义武器
      let weaponDetails;

      // 尝试解析JSON格式的自定义武器数据
      try {
        const customWeaponData = JSON.parse(weaponId);
        weaponDetails = {
          name: customWeaponData.名称 || weaponId,
          trait: `${customWeaponData.属性 || ""}/${customWeaponData.负荷 || ""}/${customWeaponData.范围 || ""}`.replace(/\/+$/, '').replace(/^\/+/, ''),
          damage: customWeaponData.检定 && customWeaponData.伤害 ? `${customWeaponData.检定}: ${customWeaponData.伤害}` : (customWeaponData.伤害 || ""),
          feature: `${customWeaponData.特性名称 ? customWeaponData.特性名称 + ': ' : ''}${customWeaponData.描述 || ''}`.trim(),
        };
      } catch (e) {
        // 如果不是JSON格式，按旧方式处理（只有名称）
        weaponDetails = {
          name: weaponId,
          trait: "",
          damage: "",
          feature: "",
        };
      }

      if (field === "primaryWeaponName") {
        setFormData((prev) => ({
          ...prev,
          primaryWeaponName: weaponDetails.name,
          primaryWeaponTrait: weaponDetails.trait,
          primaryWeaponDamage: weaponDetails.damage,
          primaryWeaponFeature: weaponDetails.feature,
        }))
      } else if (field === "secondaryWeaponName") {
        setFormData((prev) => ({
          ...prev,
          secondaryWeaponName: weaponDetails.name,
          secondaryWeaponTrait: weaponDetails.trait,
          secondaryWeaponDamage: weaponDetails.damage,
          secondaryWeaponFeature: weaponDetails.feature,
        }))
      } else if (field.startsWith("inventoryWeapon")) {
        const prefix = field.replace("Name", "")
        setFormData((prev) => ({
          ...prev,
          [`${prefix}Name`]: weaponDetails.name,
          [`${prefix}Trait`]: weaponDetails.trait,
          [`${prefix}Damage`]: weaponDetails.damage,
          [`${prefix}Feature`]: weaponDetails.feature,
        }))
      }
    }
  }

  const handleArmorChange = (value: string) => {
    const armor = armorItems.find((a: ArmorItem) => a.名称 === value)
    if (armor) {
      setFormData((prev) => ({
        ...prev,
        armorName: armor.名称,
        armorBaseScore: String(armor.护甲值),
        armorThreshold: armor.伤害阈值,
        armorFeature: `${armor.特性名称}${armor.特性名称 && armor.描述 ? ": " : ""}${armor.描述}`,
      }))
    } else if (value === "none") {
      setFormData((prev) => ({
        ...prev,
        armorName: "",
        armorBaseScore: "",
        armorThreshold: "",
        armorFeature: "",
      }))
    } else if (value) { // 处理自定义护甲
      let armorDetails;

      // 尝试解析JSON格式的自定义护甲数据
      try {
        const customArmorData = JSON.parse(value);
        armorDetails = {
          name: customArmorData.名称 || value,
          baseScore: String(customArmorData.护甲值 || ""),
          threshold: customArmorData.伤害阈值 || "",
          feature: `${customArmorData.特性名称 ? customArmorData.特性名称 + ': ' : ''}${customArmorData.描述 || ''}`.trim(),
        };
      } catch (e) {
        // 如果不是JSON格式，按旧方式处理（只有名称）
        armorDetails = {
          name: value,
          baseScore: "",
          threshold: "",
          feature: "",
        };
      }

      setFormData((prev) => ({
        ...prev,
        armorName: armorDetails.name,
        armorBaseScore: armorDetails.baseScore,
        armorThreshold: armorDetails.threshold,
        armorFeature: armorDetails.feature,
      }))
    }
  }

  // 使用useEffect监听特殊字段的变化，并在需要时同步卡牌
  useEffect(() => {
    // 关键修复：如果卡牌数据仍在加载，则直接返回，不执行任何同步操作。
    // 这可以防止在卡牌列表（allStandardCards）准备好之前就尝试去查找卡牌，从而避免了将卡牌替换为空白卡的问题。
    if (cardsLoading) {
      return;
    }

    // 只有在首次渲染完成且卡牌加载完毕后，或者在角色选择（如职业）发生变化需要同步时，才执行同步。
    if (initialRenderRef.current || needsSyncRef.current) {
      syncSpecialCardsWithCharacterChoices();

      // 同步后重置标记，避免不必要的重复执行。
      if (initialRenderRef.current) {
        initialRenderRef.current = false;
      }
      if (needsSyncRef.current) {
        needsSyncRef.current = false;
      }
    }
  }, [formData, cardsLoading]); // 添加 cardsLoading 作为依赖项

  // Generate boxes based on max values
  const renderBoxes = (field: keyof SheetData, max: number, total: number) => {
    return (
      <div className="flex gap-1 flex-wrap">
        {Array(total)
          .fill(0)
          .map((_, i) => {
            const fieldArray = Array.isArray(safeFormData[field]) ? (safeFormData[field] as boolean[]) : Array(total).fill(false)
            return (
              <div
                key={`${String(field)}-${i}`}
                className={`w-4 h-4 border-2 ${i < max ? "border-gray-800 cursor-pointer" : "border-gray-400 border-dashed"
                  } ${fieldArray[i] ? "bg-gray-800" : "bg-white"}`}
                onClick={() => i < max && handleCheckboxChange(field, i)}
              ></div>
            )
          })}
      </div>
    )
  }

  // 模态框控制函数
  const openWeaponModal = (fieldName: string, slotType: "primary" | "secondary" | "inventory") => {
    setCurrentWeaponField(fieldName)
    setCurrentWeaponSlotType(slotType)
    setWeaponModalOpen(true)
  }

  const closeWeaponModal = () => {
    setWeaponModalOpen(false)
  }

  const openArmorModal = () => {
    setArmorModalOpen(true)
  }

  const closeArmorModal = () => {
    setArmorModalOpen(false)
  }

  const openGenericModal = (
    type: "profession" | "ancestry" | "community" | "subclass", // Add subclass type
    field?: string,
    levelFilter?: number,
  ) => {
    setCurrentModal({ type, field, levelFilter })
    setModalOpen(true)
  }

  const closeGenericModal = () => {
    setModalOpen(false)
  }

  const openProfessionModal = () => openGenericModal("profession")
  const openAncestryModal = (field: string) => openGenericModal("ancestry", field, field === "ancestry1" ? 1 : 2)
  const openCommunityModal = () => openGenericModal("community")
  const openSubclassModal = () => openGenericModal("subclass") // Ensure subclass type is supported

  const handlePrint = () => {
    window.print()
  }

  const handleSubclassChange = (value: string) => {
    console.log(`handleSubclassChange called with ID: ${value}`);
    if (value === "none" || !value) {
      setFormData((prev) => {
        const updatedFormData = {
          ...prev,
          subclass: "",
          subclassRef: { id: "", name: "" },
        };
        return updatedFormData;
      })
    } else {
      if (cardsLoading || !allStandardCards.length) {
        console.warn('handleSubclassChange: Cards not loaded yet');
        return;
      }
      const subclassCard = allStandardCards.find((s) => s.id === value && (s.type === CardType.Subclass || s.type === CardType.Profession));
      if (subclassCard) {
        setFormData((prev) => {
          const updatedFormData = {
            ...prev,
            subclass: subclassCard.id,
            subclassRef: { id: subclassCard.id, name: subclassCard.name },
          };
          return updatedFormData;
        })
      } else {
        console.warn(`handleSubclassChange: Subclass card not found for ID: ${value}`);
      }
    }
    needsSyncRef.current = true;
  }

  const handleSpellcastingToggle = (attribute: keyof SheetData) => {
    setFormData((prev) => {
      const currentAttribute = prev[attribute]
      if (typeof currentAttribute === "object" && currentAttribute !== null && "spellcasting" in currentAttribute) {
        return {
          ...prev,
          [attribute]: {
            ...currentAttribute,
            spellcasting: !currentAttribute.spellcasting,
          },
        }
      }
      return prev
    })
  }

  return (
    <>
      {/* 固定位置的按钮 - 移除建卡指引按钮，因为已经移到父组件 */}
      <div></div>

      <div className="w-full max-w-[210mm] mx-auto">
        <div
          className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm" }}
        >
          {/* Header Section */}
          <HeaderSection
            onOpenProfessionModal={openProfessionModal}
            onOpenAncestryModal={openAncestryModal}
            onOpenCommunityModal={openCommunityModal}
            onOpenSubclassModal={openSubclassModal}
          />

          {/* Main Content - Two Section Layout */}
          <div className="flex flex-col gap-2 mt-1">
            {/* Top Section */}
            <div className="grid grid-cols-2 gap-2">
              {/* Top Left */}
              <div className="flex flex-col">
                {/* Character Image, Evasion, and Armor */}
                <div className="flex gap-4">
                  {/* Character Image Upload */}
                  <div className="flex flex-col items-center">
                    <ImageUploadCrop
                      currentImage={safeFormData.characterImage}
                      onImageChange={(imageBase64) =>
                        setFormData((prev) => ({ ...prev, characterImage: imageBase64 }))
                      }
                      width="6rem"
                      height="6rem"
                      placeholder={{ title: "角色图像", subtitle: "点击上传" }}
                      inputId="character-image-upload"
                    />
                  </div>

                  {/* Evasion Box */}
                  <div className="flex flex-col items-center justify-start">
                    <div className="w-24 h-24 border-2 border-gray-800 bg-gray-800 flex flex-col items-center justify-center text-white rounded-lg">
                      <div className="text-ms font-bold">闪避值</div>
                      <input
                        type="text"
                        name="evasion"
                        value={safeFormData.evasion}
                        onChange={handleInputChange}
                        placeholder={safeFormData.cards[0]?.professionSpecial?.["起始闪避"]?.toString() || ""}
                        className="w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none text-xl font-bold print-empty-hide"
                      />
                    </div>
                  </div>

                  {/* Armor Box and Grid */}
                  <div className="flex flex-col">
                    <div className="flex gap-2">
                      <div className="w-24 h-24 border-2 border-gray-800 bg-gray-800 flex flex-col items-center justify-center text-white rounded-lg">
                        <div className="text-ms font-bold">护甲值</div>
                        <input
                          type="text"
                          name="armorValue"
                          value={safeFormData.armorValue}
                          onChange={handleInputChange}
                          className="w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none text-xl font-bold print-empty-hide"
                        />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="test-center text-[10px] mr-1">护甲槽</span>
                        </div>
                        {/* Armor Boxes - 3 per row, 4 rows */}
                        <div className="grid grid-cols-3 gap-1">
                          {(() => {
                            const calculatedArmorValue = safeEvaluateExpression(safeFormData.armorValue || "0");
                            return Array(12)
                              .fill(0)
                              .map((_, i) => (
                                <div
                                  key={`armor-box-${i}`}
                                  className={`w-4 h-4 border ${i < calculatedArmorValue
                                    ? "border-gray-800 cursor-pointer"
                                    : "border-gray-400 border-dashed"
                                    } ${safeFormData.armorBoxes[i] && i < calculatedArmorValue ? "bg-gray-800" : "bg-white"}`}
                                  onClick={() => i < calculatedArmorValue && handleCheckboxChange("armorBoxes", i)}
                                ></div>
                              ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attributes Section */}
                <AttributesSection />

                {/* Hit Points & Stress */}
                <HitPointsSection />
              </div>

              {/* Top Right */}
              <div className="flex flex-col space-y-1">
                {/* Active Weapons */}
                <div className="py-0 ">
                  <h3 className="text-xs font-bold text-center print:mb-2">装备</h3>

                  <div className="flex items-center gap-0.5 mb-1">
                    <span className="text-[10px]">熟练度</span>
                    {Array(6)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={`prof-${i}`}
                          className={`w-3 h-3 rounded-full border-2 border-gray-800 cursor-pointer ${safeFormData.proficiency[i] ? "bg-gray-800" : "bg-white"
                            }`}
                          onClick={() => handleCheckboxChange("proficiency", i)}
                        ></div>
                      ))}
                  </div>

                  <WeaponSection
                    isPrimary={true}
                    fieldPrefix="primaryWeapon"
                    onOpenWeaponModal={openWeaponModal}
                  />

                  <WeaponSection
                    isPrimary={false}
                    fieldPrefix="secondaryWeapon"
                    onOpenWeaponModal={openWeaponModal}
                  />
                </div>

                {/* Active Armor */}
                <ArmorSection onOpenArmorModal={openArmorModal} />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-2 gap-2 p-1">
              {/* Bottom Left */}
              <div className="col-span-1 space-y-1">
                {/* Hope */}
                <HopeSection />

                {/* Experience */}
                <ExperienceSection />

                {/* Profession Description */}
                <h3 className="text-xs font-bold text-center">职业特性</h3>
                <ProfessionDescriptionSection description={safeFormData.cards[0]?.description} />
              </div>

              {/* Bottom Right */}
              <div className="col-span-1 space-y-1.5 -mt-1.5">
                {/* Inventory */}
                <InventorySection />

                {/* Inventory Weapons */}
                <h3 className="text-xs font-bold text-center">库存武器</h3>
                <InventoryWeaponSection
                  index={1}
                  onOpenWeaponModal={openWeaponModal}
                />

                <InventoryWeaponSection
                  index={2}
                  onOpenWeaponModal={openWeaponModal}
                />

                {/* Gold */}
                <GoldSection />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <WeaponSelectionModal
        isOpen={weaponModalOpen}
        onClose={() => setWeaponModalOpen(false)}
        weaponSlotType={currentWeaponSlotType} // Ensured not null
        onSelect={(weaponId, weaponType) => {
          if (weaponId === "none") {
            if (currentWeaponField === "primaryWeaponName") {
              setFormData((prev) => ({
                ...prev,
                primaryWeaponName: "",
                primaryWeaponTrait: "",
                primaryWeaponDamage: "",
                primaryWeaponFeature: "",
              }))
            } else if (currentWeaponField === "secondaryWeaponName") {
              setFormData((prev) => ({
                ...prev,
                secondaryWeaponName: "",
                secondaryWeaponTrait: "",
                secondaryWeaponDamage: "",
                secondaryWeaponFeature: "",
              }))
            } else if (currentWeaponField.startsWith("inventoryWeapon")) {
              const prefix = currentWeaponField.replace("Name", "")
              setFormData((prev) => ({
                ...prev,
                [`${prefix}Name`]: "",
                [`${prefix}Trait`]: "",
                [`${prefix}Damage`]: "",
                [`${prefix}Feature`]: "",
              }))
            }
            setWeaponModalOpen(false)
            return
          }
          handleWeaponChange(currentWeaponField, weaponId, weaponType)
          setWeaponModalOpen(false)
        }}
        title="选择武器"
      />

      <ArmorSelectionModal
        isOpen={armorModalOpen}
        onClose={closeArmorModal}
        onSelect={(armorId) => {
          handleArmorChange(armorId)
          closeArmorModal()
        }}
        title="选择护甲"
      />

      {modalOpen && (
        <GenericCardSelectionModal
          isOpen={modalOpen}
          onClose={closeGenericModal}
          onSelect={(cardId, field) => {
            console.log(`GenericModal onSelect: Type: ${currentModal.type}, ID: ${cardId}, Field: ${field}`);
            if (currentModal.type === "profession") {
              handleProfessionChange(cardId)
            } else if (currentModal.type === "ancestry" && field) {
              handleAncestryChange(field, cardId)
            } else if (currentModal.type === "community") {
              handleCommunityChange(cardId)
            } else if (currentModal.type === "subclass") {
              handleSubclassChange(cardId)
            }
            closeGenericModal()
          }}
          title={
            currentModal.type === "profession"
              ? "选择职业"
              : currentModal.type === "ancestry"
                ? "选择血统"
                : currentModal.type === "community"
                  ? "选择社群"
                  : "选择子职业"
          }
          cardType={getModalCardType(currentModal.type)} // Use the helper function here
          field={currentModal.field}
          levelFilter={currentModal.levelFilter}
        />
      )}
    </>
  )
}
