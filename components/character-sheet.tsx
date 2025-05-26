"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { primaryWeapons } from "@/data/list/primary-weapon"
import { secondaryWeapons } from "@/data/list/secondary-weapon"
import { armorItems } from "@/data/list/armor"
import { ALL_STANDARD_CARDS } from "@/data/card"

// Import modals
import { WeaponSelectionModal } from "@/components/modals/weapon-selection-modal"
import { ArmorSelectionModal } from "@/components/modals/armor-selection-modal"
import { ProfessionSelectionModal } from "@/components/modals/profession-selection-modal"
import { AncestrySelectionModal } from "@/components/modals/ancestry-selection-modal"
import { CommunitySelectionModal } from "@/components/modals/community-selection-modal"

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
import { createEmptyCard, type StandardCard } from "@/data/card/card-types"

// 默认表单数据
const defaultFormData = {
  characterImage: "",
  characterName: "",
  pronouns: "",
  ancestry1: "",
  ancestry2: "",
  community: "",
  subclass: "",
  level: "",
  profession: "",
  professionSubtitle: "",
  agility: { checked: false, value: "" },
  strength: { checked: false, value: "" },
  finesse: { checked: false, value: "" },
  instinct: { checked: false, value: "" },
  presence: { checked: false, value: "" },
  knowledge: { checked: false, value: "" },
  proficiency: Array(6).fill(false),
  evasion: "",
  armorValue: "",
  armorBonus: "",
  armorMax: 6, // 保留默认值
  armorBoxes: Array(12).fill(false),
  hpMax: 6, // 保留默认值
  stressMax: 6, // 保留默认值
  hp: Array(18).fill(false),
  stress: Array(18).fill(false),
  minorThreshold: "",
  majorThreshold: "",
  hope: Array(6).fill(false),
  primaryWeaponName: "",
  primaryWeaponTrait: "",
  primaryWeaponDamage: "",
  primaryWeaponFeature: "",
  secondaryWeaponName: "",
  secondaryWeaponTrait: "",
  secondaryWeaponDamage: "",
  secondaryWeaponFeature: "",
  armorName: "",
  armorBaseScore: "",
  armorThreshold: "", // Added armorThreshold
  armorFeature: "",
  inventory: ["", "", "", "", ""], // 确保有5个空字符串
  inventoryWeapon1Name: "",
  inventoryWeapon1Trait: "",
  inventoryWeapon1Damage: "",
  inventoryWeapon1Feature: "",
  inventoryWeapon1Primary: false,
  inventoryWeapon1Secondary: false,
  inventoryWeapon2Name: "",
  inventoryWeapon2Trait: "",
  inventoryWeapon2Damage: "",
  inventoryWeapon2Feature: "",
  inventoryWeapon2Primary: false,
  inventoryWeapon2Secondary: false,
  gold: Array(20).fill(false),
  experience: ["", "", "", "", ""],
  experienceValues: ["", "", "", "", ""],
  cards: Array(20)
    .fill(0)
    .map(() => (createEmptyCard)),
}

interface CharacterSheetProps {
  formData: any
  setFormData: (data: any) => void
}

export default function CharacterSheet({ formData, setFormData }: CharacterSheetProps) {
  // 模态框状态
  const [weaponModalOpen, setWeaponModalOpen] = useState(false)
  const [currentWeaponField, setCurrentWeaponField] = useState("")
  const [currentWeaponSlotType, setCurrentWeaponSlotType] = useState<"primary" | "secondary" | "inventory">("primary") // Default to primary to avoid null
  const [armorModalOpen, setArmorModalOpen] = useState(false)
  const [professionModalOpen, setProfessionModalOpen] = useState(false)
  const [ancestryModalOpen, setAncestryModalOpen] = useState(false)
  const [currentAncestryField, setCurrentAncestryField] = useState("")
  const [communityModalOpen, setCommunityModalOpen] = useState(false)
  const [importExportModalOpen, setImportExportModalOpen] = useState(false)

  // 使用ref来跟踪是否需要同步卡牌
  const needsSyncRef = useRef(false)
  const initialRenderRef = useRef(true)

  // 确保 formData 和所有必要的子属性都存在
  const safeFormData = {
    ...defaultFormData,
    ...(formData || {}),
    cards: Array.isArray(formData?.cards)
      ? formData.cards
      : Array(20)
          .fill(0)
        .map(() => (createEmptyCard)),
    armorBoxes: Array.isArray(formData?.armorBoxes) ? formData.armorBoxes : Array(12).fill(false),
    hp: Array.isArray(formData?.hp) ? formData.hp : Array(18).fill(false),
    stress: Array.isArray(formData?.stress) ? formData.stress : Array(18).fill(false),
    hope: Array.isArray(formData?.hope) ? formData.hope : Array(6).fill(false),
    gold: Array.isArray(formData?.gold) ? formData.gold : Array(20).fill(false),
    inventory:
      Array.isArray(formData?.inventory) && formData?.inventory.length >= 5 ? formData.inventory : ["", "", "", "", ""],
    experience: Array.isArray(formData?.experience) ? formData.experience : ["", "", "", "", ""],
    experienceValues: Array.isArray(formData?.experienceValues) ? formData.experienceValues : ["", "", "", "", ""],
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
    console.log("Computing updated special cards")
    console.log("Profession:", safeFormData.profession)
    console.log("Ancestry1:", safeFormData.ancestry1)
    console.log("Ancestry2:", safeFormData.ancestry2)
    console.log("Community:", safeFormData.community)

    // 创建卡牌数组的副本
    const newCards = [...safeFormData.cards]

    // 确保 newCards 至少有4个元素
    while (newCards.length < 4) {
      newCards.push(createEmptyCard("unknown"))
    }

    // 同步职业卡（位置0）
    if (safeFormData.profession) {
      const profession = getProfessionById(safeFormData.profession)
      console.log("Profession selected:", profession)

      // 创建职业卡
      newCards[0] = profession
    } else {
      // 如果没有选择职业，清空职业卡
      newCards[0] = createEmptyCard()
    }

    // 同步血统卡1（位置1）
    if (safeFormData.ancestry1) {
      const ancestry = getAncestryById(safeFormData.ancestry1)
      console.log("Ancestry1 selected:", ancestry)

      // 创建血统卡1
      newCards[1] = ancestry
    } else {
      // 如果没有选择血统1，清空血统卡1
      newCards[1] = createEmptyCard()
    }

    // 同步血统卡2（位置2）
    if (safeFormData.ancestry2) {
      const ancestry = getAncestryById(safeFormData.ancestry2)
      console.log("Ancestry2 name:", ancestry)

      // 创建血统卡2
      newCards[2] = ancestry
    } else {
      // 如果没有选择血统2，清空血统卡2
      newCards[2] = createEmptyCard()
    }

    // 同步社区卡（位置3）
    if (safeFormData.community) {
      const community = getCommunityById(safeFormData.community)
      console.log("Community selected:", community)

      // 创建社区卡
      newCards[3] = community
    } else {
      // 如果没有选择社区，清空社区卡
      newCards[3] = createEmptyCard()
    }

    console.log("Computed updated cards:", newCards.slice(0, 4))
    return newCards
  }

  // 同步特殊卡牌 - 仅在需要时更新状态
  const syncSpecialCardsWithCharacterChoices = () => {
    try {
      // 获取更新后的卡牌
      const updatedCards = getUpdatedSpecialCards()

      // 检查是否需要更新
      let needsUpdate = false

      // 只检查前4张特殊卡牌
      for (let i = 0; i < 4; i++) {
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
        console.log("Updating cards in state")
        setFormData((prev: any) => ({
          ...prev,
          cards: updatedCards,
        }))
      } else {
        console.log("No card updates needed")
      }
    } catch (error) {
      console.error("Error syncing special cards:", error)
    }
  }

  // 根据ID获取职业名称
  const getProfessionById = (id: string): StandardCard => {
    const profession = ALL_STANDARD_CARDS.find((card) => card.type === "profession" && card.id === id)
    return profession ? profession : createEmptyCard()
  }

  // 根据ID获取血统名称
  const getAncestryById = (id: string): StandardCard => {
    const ancestry = ALL_STANDARD_CARDS.find((card) => card.type === "ancestry" && card.id === id)
    return ancestry ? ancestry : createEmptyCard()
  }

  // 根据ID获取社区名称
  const getCommunityById = (id: string): StandardCard => {
    const community = ALL_STANDARD_CARDS.find((card) => card.type === "community" && card.id === id)
    return community ? community : createEmptyCard()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleAttributeValueChange = (attribute: string, value: string) => {
    setFormData((prev: any) => {
      // 确保属性对象存在
      const currentAttribute = prev[attribute] || { checked: false, value: "" }
      return {
        ...prev,
        [attribute]: { ...currentAttribute, value },
      }
    })
  }

  const handleCheckboxChange = (field: string, index: number) => {
    setFormData((prev: any) => {
      // 确保prev[field]是一个数组，如果不是则创建一个默认数组
      let currentArray = prev[field]
      if (!Array.isArray(currentArray)) {
        // 根据字段名创建适当大小的默认数组
        if (field === "armorBoxes") currentArray = Array(12).fill(false)
        else if (field === "hp" || field === "stress") currentArray = Array(18).fill(false)
        else if (field === "hope") currentArray = Array(6).fill(false)
        else if (field === "gold") currentArray = Array(20).fill(false)
        else currentArray = [] // 默认空数组
      }

      // 创建新数组并更新值
      const newArray = [...currentArray]
      newArray[index] = !newArray[index]
      return { ...prev, [field]: newArray }
    })
  }

  const handleBooleanChange = (field: string) => {
    if (
      field.includes("agility") ||
      field.includes("strength") ||
      field.includes("finesse") ||
      field.includes("instinct") ||
      field.includes("presence") ||
      field.includes("knowledge")
    ) {
      setFormData((prev: any) => {
        // 确保属性对象存在
        const currentAttribute = prev[field] || { checked: false, value: "" }
        return {
          ...prev,
          [field]: {
            ...currentAttribute,
            checked: !currentAttribute.checked,
          },
        }
      })
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [field]: !prev[field],
      }))
    }
  }

  const handleMaxChange = (field: string, value: string) => {
    const numValue = Number.parseInt(value) || 0
    setFormData((prev: any) => ({ ...prev, [field]: numValue }))
  }

  const handleProfessionChange = (value: string) => {
    console.log("handleProfessionChange called with value:", value)

    if (value === "none") {
      console.log("Clearing profession selection")

      // 清空职业选择
      setFormData((prev: any) => {
        // 创建新的表单数据，清空职业相关字段
        return {
          ...prev,
          profession: "",
          professionSubtitle: "",
        }
      })
    } else {
      // 选择新职业
      const profession = ALL_STANDARD_CARDS.find((p) => p.id === value)
      if (profession) {
        console.log("Setting profession to:", profession.name)

        setFormData((prev: any) => {
          // 创建新的表单数据，设置职业相关字段
          return {
            ...prev,
            profession: value,
          }
        })
      }
    }
    // 标记需要同步卡牌
    needsSyncRef.current = true
  }

  const handleAncestryChange = (field: string, value: string) => {
    if (value === "none" || !value) {
      setFormData((prev: any) => {
        return {
          ...prev,
          [field]: "",
        }
      })
    } else {
      const ancestry = ALL_STANDARD_CARDS.find((a) => a.id === value)
      if (ancestry) {
        setFormData((prev: any) => {
          return {
            ...prev,
            [field]: value,
          }
        })
      }
    }
    // 标记需要同步卡牌
    needsSyncRef.current = true
  }

  const handleCommunityChange = (value: string) => {
    if (value === "none" || !value) {
      setFormData((prev: any) => {
        return {
          ...prev,
          community: "",
        }
      })
    } else {
      const community = ALL_STANDARD_CARDS.find((c) => c.id === value)
      if (community) {
        setFormData((prev: any) => {
          return {
            ...prev,
            community: value,
          }
        })
      }
    }
    // 标记需要同步卡牌
    needsSyncRef.current = true
  }

  const handleWeaponChange = (field: string, weaponId: string, weaponType: "primary" | "secondary") => {
    const weaponList = weaponType === "primary" ? primaryWeapons : secondaryWeapons
    const weapon = weaponList.find((w) => w.名称 === weaponId)

    if (weapon) {
      const weaponDetails = {
        name: weapon.名称,
        trait: `${weapon.属性 || ""}/${weapon.负荷 || ""}/${weapon.范围 || ""}`,
        damage: `${weapon.检定 || ""}: ${weapon.伤害 || ""}`,
        feature: weapon.描述,
      }
      if (field === "primaryWeaponName") {
        setFormData((prev: any) => ({
          ...prev,
          primaryWeaponName: weaponDetails.name,
          primaryWeaponTrait: weaponDetails.trait,
          primaryWeaponDamage: weaponDetails.damage,
          primaryWeaponFeature: weaponDetails.feature,
        }))
      } else if (field === "secondaryWeaponName") {
        setFormData((prev: any) => ({
          ...prev,
          secondaryWeaponName: weaponDetails.name,
          secondaryWeaponTrait: weaponDetails.trait,
          secondaryWeaponDamage: weaponDetails.damage,
          secondaryWeaponFeature: weaponDetails.feature,
        }))
      } else if (field.startsWith("inventoryWeapon")) {
        const inventoryFieldPrefix = field.replace("Name", "")
        setFormData((prev: any) => ({
          ...prev,
          [`${inventoryFieldPrefix}Name`]: weaponDetails.name,
          [`${inventoryFieldPrefix}Trait`]: weaponDetails.trait,
          [`${inventoryFieldPrefix}Damage`]: weaponDetails.damage,
          [`${inventoryFieldPrefix}Feature`]: weaponDetails.feature,
        }))
      }
    } else if (weaponId === "none") {
      if (field === "primaryWeaponName") {
        setFormData((prev: any) => ({
          ...prev,
          primaryWeaponName: "",
          primaryWeaponTrait: "",
          primaryWeaponDamage: "",
          primaryWeaponFeature: "",
        }))
      } else if (field === "secondaryWeaponName") {
        setFormData((prev: any) => ({
          ...prev,
          secondaryWeaponName: "",
          secondaryWeaponTrait: "",
          secondaryWeaponDamage: "",
          secondaryWeaponFeature: "",
        }))
      } else if (field.startsWith("inventoryWeapon")) {
        const prefix = field.replace("Name", "")
        setFormData((prev: any) => ({
          ...prev,
          [`${prefix}Name`]: "",
          [`${prefix}Trait`]: "",
          [`${prefix}Damage`]: "",
          [`${prefix}Feature`]: "",
        }))
      }
    } else if (weaponId) { // 处理自定义武器
      if (field === "primaryWeaponName") {
        setFormData((prev: any) => ({
          ...prev,
          primaryWeaponName: weaponId,
          primaryWeaponTrait: "",
          primaryWeaponDamage: "",
          primaryWeaponFeature: "",
        }))
      } else if (field === "secondaryWeaponName") {
        setFormData((prev: any) => ({
          ...prev,
          secondaryWeaponName: weaponId,
          secondaryWeaponTrait: "",
          secondaryWeaponDamage: "",
          secondaryWeaponFeature: "",
        }))
      } else if (field.startsWith("inventoryWeapon")) {
        const prefix = field.replace("Name", "")
        setFormData((prev: any) => ({
          ...prev,
          [`${prefix}Name`]: weaponId,
          [`${prefix}Trait`]: "",
          [`${prefix}Damage`]: "",
          [`${prefix}Feature`]: "",
        }))
      }
    }
  }

  const handleArmorChange = (value: string) => {
    const armor = armorItems.find((a) => a.名称 === value)
    if (armor) {
      setFormData((prev: any) => ({
        ...prev,
        armorName: armor.名称,
        armorBaseScore: String(armor.基本分),
        armorThreshold: armor.伤害阈值,
        armorFeature: `${armor.特性名称}${armor.特性名称 && armor.描述 ? ": " : ""}${armor.描述}`,
      }))
    } else if (value === "none") {
      setFormData((prev: any) => ({
        ...prev,
        armorName: "",
        armorBaseScore: "",
        armorThreshold: "",
        armorFeature: "",
      }))
    } else if (value) { // 处理自定义护甲
      setFormData((prev: any) => ({
        ...prev,
        armorName: value,
        armorBaseScore: "",
        armorThreshold: "",
        armorFeature: "",
      }))
    }
  }

  // 使用useEffect监听特殊字段的变化，并在需要时同步卡牌
  useEffect(() => {
    // 跳过初始渲染
    if (initialRenderRef.current) {
      initialRenderRef.current = false
      return
    }

    // 检查是否需要同步
    if (needsSyncRef.current && formData) {
      console.log("Syncing cards due to special field change")
      // 重置标记
      needsSyncRef.current = false
      // 执行同步
      syncSpecialCardsWithCharacterChoices()
    }
  }, [formData])

  // 在组件挂载时执行一次同步
  useEffect(() => {
    if (initialRenderRef.current && formData) {
      console.log("Initial card sync")
      syncSpecialCardsWithCharacterChoices()
    }
  }, [formData])

  // Generate boxes based on max values
  const renderBoxes = (field: string, max: number, total: number) => {
    return (
      <div className="flex gap-1 flex-wrap">
        {Array(total)
          .fill(0)
          .map((_, i) => {
            // 确保 safeFormData[field] 存在且是数组
            const fieldArray = Array.isArray(safeFormData[field]) ? safeFormData[field] : Array(total).fill(false)

            return (
              <div
                key={`${field}-${i}`}
                className={`w-4 h-4 border-2 ${
                  i < max ? "border-gray-800 cursor-pointer" : "border-gray-400 border-dashed"
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

  const openProfessionModal = () => {
    setProfessionModalOpen(true)
  }

  const closeProfessionModal = () => {
    setProfessionModalOpen(false)
  }

  const openAncestryModal = (field: string) => {
    setCurrentAncestryField(field)
    setAncestryModalOpen(true)
  }

  const closeAncestryModal = () => {
    setAncestryModalOpen(false)
  }

  const openCommunityModal = () => {
    setCommunityModalOpen(true)
  }

  const closeCommunityModal = () => {
    setCommunityModalOpen(false)
  }

  const openImportExportModal = () => {
    setImportExportModalOpen(true)
  }

  const closeImportExportModal = () => {
    setImportExportModalOpen(false)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      {/* 固定位置的按钮 - 移除建卡指引按钮，因为已经移到父组件 */}
      <div></div>

      <div className="w-full max-w-[210mm] mx-auto my-4">
        <div
          className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm" }}
        >
          {/* Header Section */}
          <HeaderSection
            formData={safeFormData}
            handleInputChange={handleInputChange}
            openProfessionModal={openProfessionModal}
            openAncestryModal={openAncestryModal}
            openCommunityModal={openCommunityModal}
          />

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Left Column */}
            <div className="col-span-1 space-y-2">
              {/* Character Image, Evasion, and Armor */}
              <div className="flex gap-4 mb-2">
                {/* Character Image Upload */}
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 border-2 border-gray-800 flex flex-col items-center justify-center relative overflow-hidden">
                    {safeFormData.characterImage ? (
                      <img
                        src={safeFormData.characterImage || "/placeholder.svg"}
                        alt="Character Portrait"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-[10px] font-bold mb-1">角色图像</div>
                        <div className="text-[8px]">点击上传</div>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="opacity-0 absolute inset-0 cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            if (event.target) {
                              setFormData((prev: any) => ({
                                ...prev,
                                characterImage: event.target?.result as string,
                              }))
                            }
                          }
                          reader.readAsDataURL(e.target.files[0])
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Evasion Box */}
                <div className="flex flex-col items-center justify-start">
                  <div className="w-24 h-24 border-2 border-gray-800 bg-gray-800 flex flex-col items-center justify-center text-white rounded-lg">
                    <div className="text-ms font-bold">闪避</div>
                    <input
                      type="text"
                      name="evasion"
                      value={safeFormData.evasion}
                      onChange={handleInputChange}
                      className="w-10 text-center bg-transparent border-b border-gray-400 focus:outline-none text-xl font-bold print-empty-hide"
                    />
                  </div>
                </div>

                {/* Armor Box and Grid */}
                <div className="flex flex-col">
                  <div className="flex gap-2">
                    <div className="w-24 h-24 border-2 border-gray-800 bg-gray-800 flex flex-col items-center justify-center text-white rounded-lg">
                      <div className="text-ms font-bold">护甲</div>
                      <input
                        type="text"
                        name="armorValue"
                        value={safeFormData.armorValue}
                        onChange={handleInputChange}
                        className="w-10 text-center bg-transparent border-b border-gray-400 focus:outline-none text-xl font-bold print-empty-hide"
                      />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center mb-1">
                        <span className="test-center text-[10px] mr-1">护甲槽</span>
                      </div>
                      {/* Armor Boxes - 3 per row, 4 rows */}
                      <div className="grid grid-cols-3 gap-1">
                        {Array(12)
                          .fill(0)
                          .map((_, i) => (
                            <div
                              key={`armor-box-${i}`}
                              className={`w-4 h-4 border ${i < safeFormData.armorValue
                                  ? "border-gray-800 cursor-pointer"
                                  : "border-gray-400 border-dashed"
                              } ${safeFormData.armorBoxes[i] && i < safeFormData.armorMax ? "bg-gray-800" : "bg-white"}`}
                              onClick={() => i < safeFormData.armorMax && handleCheckboxChange("armorBoxes", i)}
                            ></div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attributes Section */}
              <AttributesSection
                formData={safeFormData}
                handleAttributeValueChange={handleAttributeValueChange}
                handleBooleanChange={handleBooleanChange}
              />

              {/* Hit Points & Stress */}
              <HitPointsSection
                formData={safeFormData}
                handleInputChange={handleInputChange}
                handleMaxChange={handleMaxChange}
                renderBoxes={renderBoxes}
              />

              {/* Hope */}
              <HopeSection formData={safeFormData} handleCheckboxChange={handleCheckboxChange} />

              {/* Experience */}
              <ExperienceSection formData={safeFormData} setFormData={setFormData} />

              {/* Gold */}
              <GoldSection formData={safeFormData} handleCheckboxChange={handleCheckboxChange} />
            </div>

            {/* Right Column */}
            <div className="col-span-1 space-y-2">
              {/* Active Weapons */}
              <div className="py-1 mb-2">
                <h3 className="text-xs font-bold text-center mb-1">ACTIVE WEAPONS</h3>

                <div className="flex items-center gap-0.5 mb-1">
                  <span className="text-[10px]">PROFICIENCY</span>
                  {Array(6)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={`prof-${i}`}
                        className={`w-3 h-3 rounded-full border-2 border-gray-800 cursor-pointer ${
                          safeFormData.proficiency[i] ? "bg-gray-800" : "bg-white"
                        }`}
                        onClick={() => handleCheckboxChange("proficiency", i)}
                      ></div>
                    ))}
                </div>

                <WeaponSection
                  formData={safeFormData}
                  handleInputChange={handleInputChange}
                  openWeaponModal={openWeaponModal}
                  isPrimary={true}
                  fieldPrefix="primaryWeapon"
                />

                <WeaponSection
                  formData={safeFormData}
                  handleInputChange={handleInputChange}
                  openWeaponModal={openWeaponModal}
                  isPrimary={false}
                  fieldPrefix="secondaryWeapon"
                />
              </div>

              {/* Active Armor */}
              <ArmorSection
                formData={safeFormData}
                handleInputChange={handleInputChange}
                openArmorModal={openArmorModal}
              />

              {/* Inventory */}
              <InventorySection formData={safeFormData} setFormData={setFormData} />

              {/* Inventory Weapons */}
              <InventoryWeaponSection
                formData={safeFormData}
                handleInputChange={handleInputChange}
                handleBooleanChange={handleBooleanChange}
                openWeaponModal={openWeaponModal}
                index={1}
              />

              <InventoryWeaponSection
                formData={safeFormData}
                handleInputChange={handleInputChange}
                handleBooleanChange={handleBooleanChange}
                openWeaponModal={openWeaponModal}
                index={2}
              />
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
              setFormData((prev: any) => ({
                ...prev,
                primaryWeaponName: "",
                primaryWeaponTrait: "",
                primaryWeaponDamage: "",
                primaryWeaponFeature: "",
              }))
            } else if (currentWeaponField === "secondaryWeaponName") {
              setFormData((prev: any) => ({
                ...prev,
                secondaryWeaponName: "",
                secondaryWeaponTrait: "",
                secondaryWeaponDamage: "",
                secondaryWeaponFeature: "",
              }))
            } else if (currentWeaponField.startsWith("inventoryWeapon")) {
              const prefix = currentWeaponField.replace("Name", "")
              setFormData((prev: any) => ({
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

      <ProfessionSelectionModal
        isOpen={professionModalOpen}
        onClose={closeProfessionModal}
        onSelect={(professionId) => {
          handleProfessionChange(professionId)
          closeProfessionModal()
        }}
        title="选择职业"
      />

      <AncestrySelectionModal
        isOpen={ancestryModalOpen}
        onClose={() => setAncestryModalOpen(false)}
        field={currentAncestryField}
        title={currentAncestryField === "ancestry1" ? "选择血统一" : "选择血统二"}
        onSelect={(ancestryId, field) => {
          if (ancestryId === "none") {
            handleAncestryChange(field, "")
          } else {
            handleAncestryChange(field, ancestryId)
          }
          setAncestryModalOpen(false)
        }}
      />

      <CommunitySelectionModal
        isOpen={communityModalOpen}
        onClose={closeCommunityModal}
        onSelect={(communityId) => {
          if (communityId === "none") {
            handleCommunityChange("")
          } else {
            handleCommunityChange(communityId)
          }
          closeCommunityModal()
        }}
        title="选择社区"
      />
    </>
  )
}
