"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  CardType, // Import CardType
} from "@/card"
import { useCardStore } from "@/card/stores/unified-card-store"
import { useSheetStore, useSheetArmorBoxes, useSheetProficiency, useSafeSheetData, type ArmorSelectionInput, type WeaponSelectionInput } from "@/lib/sheet-store"

// Import modals
import { WeaponSelectionModal } from "@/components/modals/weapon-selection-modal"
import { ArmorSelectionModal } from "@/components/modals/armor-selection-modal"
import { GenericCardSelectionModal } from "@/components/modals/generic-card-selection-modal"
import { useCardAutomationSetupPrompt } from "@/components/card-automation-setup"

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
import { ImageUploadCrop } from "@/components/ui/image-upload-crop"
import { ModifierFieldAnchor } from "@/components/modifiers/modifier-field-anchor"
import { EquipmentProviderAnchor } from "@/components/modifiers/equipment-provider-popover"
import { parseNumberExpressionOr } from "@/lib/number-utils"
import {
  deleteCharacterImageAsset,
  setCharacterImageAsset,
} from "@/character/storage/character-image-actions"

type WeaponSlotSelection =
  | { slotType: "primary" | "secondary" }
  | { slotType: "inventory"; index: 0 | 1 }

interface CharacterSheetProps {
  currentCharacterId?: string | null
}

export default function CharacterSheet({ currentCharacterId }: CharacterSheetProps) {
  const {
    setSheetData: setFormData,
    replaceSheetData,
    selectCharacterChoiceCard,
    clearCharacterChoiceCard,
    handleProfessionChange: changeProfessionCard,
    setCardAbilityChoiceValuesForInstance,
    auditCardInstancesOnLoad,
    updateArmorBox,
    updateProficiency,
    selectArmorSlot,
    selectWeapon,
    commitModifierTargetValue,
    sheetLoadRevision,
  } = useSheetStore();
  const armorBoxes = useSheetArmorBoxes();
  const proficiency = useSheetProficiency();
  const safeFormData = useSafeSheetData();

  // 使用全局卡牌Store
  const store = useCardStore();
  const cardsInitialized = store.initialized;
  const cardsLoading = store.loading;
  const getRuntimeCardById = store.getCardById;
  const lastAuditedSheetLoadRevisionRef = useRef<number | null>(null)

  // 在组件加载时确保系统已初始化
  useEffect(() => {
    if (!store.initialized) {
      store.initializeSystem();
    }
  }, [store.initialized, store.initializeSystem]);

  useEffect(() => {
    if (
      !cardsInitialized ||
      cardsLoading ||
      lastAuditedSheetLoadRevisionRef.current === sheetLoadRevision
    ) {
      return
    }

    lastAuditedSheetLoadRevisionRef.current = sheetLoadRevision
    auditCardInstancesOnLoad((templateId) => getRuntimeCardById(templateId) ?? undefined)
  }, [auditCardInstancesOnLoad, cardsInitialized, cardsLoading, getRuntimeCardById, sheetLoadRevision])

  // 模态框状态
  const [weaponModalOpen, setWeaponModalOpen] = useState(false)
  const [currentWeaponSlot, setCurrentWeaponSlot] = useState<WeaponSlotSelection>({ slotType: "primary" })
  const [armorModalOpen, setArmorModalOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentModal, setCurrentModal] = useState<{ type: "profession" | "ancestry" | "community" | "subclass"; field?: string; levelFilter?: number }>({ type: "profession" })
  const [armorMaxDraft, setArmorMaxDraft] = useState<string | null>(null)
  const [evasionDraft, setEvasionDraft] = useState<string | null>(null)
  const setupPrompt = useCardAutomationSetupPrompt({
    sheetData: safeFormData,
    onSaveAbility: setCardAbilityChoiceValuesForInstance,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "armorMax") {
      setArmorMaxDraft(value)
      return
    }

    if (name === "evasion") {
      setEvasionDraft(value)
      return
    }

    setFormData((prev) => {
      return { ...prev, [name]: value };
    });
  }

  const handleModifierTargetCommit = (e: React.FocusEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget
    if (name === "evasion" || name === "armorMax") {
      commitModifierTargetValue(name, value)
      if (name === "armorMax") {
        setArmorMaxDraft(null)
      }
      if (name === "evasion") {
        setEvasionDraft(null)
      }
    }
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

    if (value === "none" || !value) {
      const result = changeProfessionCard(undefined, undefined)
      setupPrompt.handleSelectionResult(result)
    } else {
      if (cardsLoading) {
        console.warn('handleProfessionChange: Cards not loaded yet');
        return;
      }
      const professionCard = store.getCardById(value);
      if (professionCard && professionCard.type === CardType.Profession) {
        // 构建完整的职业名称，包含卡牌选择信息
        let fullName = professionCard.name;
        if (professionCard.cardSelectDisplay?.item1 && professionCard.cardSelectDisplay?.item2) {
          fullName = `${professionCard.name}  -  ${professionCard.cardSelectDisplay.item1}&${professionCard.cardSelectDisplay.item2}`;
        }

        const newRef = { id: professionCard.id, name: fullName };

        const result = changeProfessionCard(newRef, professionCard);
        setupPrompt.handleSelectionResult(result);
      } else {
        console.warn(`handleProfessionChange: Profession card not found for ID: ${value}`);
      }
    }
  }

  const handleAncestryChange = (field: string, value: string) => {
    console.log(`handleAncestryChange called for field: ${field}, ID: ${value}`);
    const kind = field === "ancestry1" ? "ancestry1" : "ancestry2";

    if (value === "none" || !value) {
      clearCharacterChoiceCard(kind)
      return
    }

    if (cardsLoading) {
      console.warn('handleAncestryChange: Cards not loaded yet');
      return;
    }

    const ancestryCard = store.getCardById(value);
    if (ancestryCard && ancestryCard.type === CardType.Ancestry) {
      const result = selectCharacterChoiceCard(kind, { id: ancestryCard.id, name: ancestryCard.name }, ancestryCard)
      setupPrompt.handleSelectionResult(result)
    } else {
      console.warn(`handleAncestryChange: Ancestry card not found for ID: ${value} in field: ${field}`);
    }
  }

  const handleCommunityChange = (value: string) => {
    console.log(`handleCommunityChange called with ID: ${value}`);
    if (value === "none" || !value) {
      clearCharacterChoiceCard("community")
      return
    }

    if (cardsLoading) {
      console.warn('handleCommunityChange: Cards not loaded yet');
      return;
    }

    const communityCard = store.getCardById(value);
    if (communityCard && communityCard.type === CardType.Community) {
      const result = selectCharacterChoiceCard("community", { id: communityCard.id, name: communityCard.name }, communityCard)
      setupPrompt.handleSelectionResult(result)
    } else {
      console.warn(`handleCommunityChange: Community card not found for ID: ${value}`);
    }
  }

  const handleWeaponSelect = (input: WeaponSelectionInput) => {
    selectWeapon(currentWeaponSlot, input)
    setWeaponModalOpen(false)
  }

  const handleArmorSelect = (input: ArmorSelectionInput) => {
    selectArmorSlot(input)
    setArmorModalOpen(false)
  }

  const handlePortraitImageChange = async (imageBase64: string) => {
    if (!currentCharacterId) {
      setFormData((prev) => ({ ...prev, characterImage: imageBase64 }))
      return
    }

    try {
      const currentSheet = useSheetStore.getState().sheetData
      const nextSheet = imageBase64
        ? await setCharacterImageAsset(currentCharacterId, 'portrait', imageBase64, currentSheet)
        : await deleteCharacterImageAsset(currentCharacterId, 'portrait', currentSheet)
      replaceSheetData(nextSheet)
    } catch (error) {
      console.error(`[CharacterImage] Failed to update portrait for ${currentCharacterId}:`, error)
      alert('角色图像保存失败')
    }
  }

  // 模态框控制函数
  const openWeaponModal = (selection: WeaponSlotSelection) => {
    setCurrentWeaponSlot(selection)
    setWeaponModalOpen(true)
  }


  const openArmorModal = () => {
    setArmorModalOpen(true)
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


  const handleSubclassChange = (value: string) => {
    console.log(`handleSubclassChange called with ID: ${value}`);
    if (value === "none" || !value) {
      clearCharacterChoiceCard("subclass")
      return
    }

    if (cardsLoading) {
      console.warn('handleSubclassChange: Cards not loaded yet');
      return;
    }

    const subclassCard = store.getCardById(value);
    if (subclassCard && subclassCard.type === CardType.Subclass) {
      const result = selectCharacterChoiceCard("subclass", { id: subclassCard.id, name: subclassCard.name }, subclassCard)
      setupPrompt.handleSelectionResult(result)
    } else {
      console.warn(`handleSubclassChange: Subclass card not found for ID: ${value}`);
    }
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
                      onImageChange={(imageBase64) => void handlePortraitImageChange(imageBase64)}
                      onImageDelete={() => void handlePortraitImageChange("")}
                      width="6rem"
                      height="6rem"
                      placeholder={{ title: "角色图像", subtitle: "点击上传" }}
                      inputId="character-image-upload"
                    />
                  </div>

                  {/* Evasion Box */}
                  <div className="flex flex-col items-center justify-start">
                    <div className="w-24 h-24 flex flex-col rounded-lg overflow-hidden border border-gray-800">
                      <div className="bg-gray-800 text-white text-center py-1">
                        <div className="flex items-center justify-center text-ms font-bold">
                          闪避值
                          <ModifierFieldAnchor target="evasion" label="闪避" />
                        </div>
                      </div>
                      <div className="flex-1 bg-white flex flex-col items-center justify-end pb-2 px-1">
                        <input
                          type="text"
                          name="evasion"
                          value={evasionDraft ?? safeFormData.evasion}
                          onChange={handleInputChange}
                          onBlur={handleModifierTargetCommit}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              handleModifierTargetCommit(event)
                              event.currentTarget.blur()
                            }
                          }}
                          placeholder={safeFormData.cards[0]?.professionSpecial?.["起始闪避"]?.toString() || ""}
                          className="w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none text-xl font-bold text-gray-800 placeholder-gray-400 print-empty-hide pb-1"
                        />
                        {safeFormData.cards[0]?.professionSpecial?.["起始闪避"] !== undefined ? (
                          <div className="text-[8px] text-gray-600">
                            职业初始：{safeFormData.cards[0].professionSpecial["起始闪避"]}
                          </div>
                        ) : (
                          <div className="text-[8px] text-transparent">占位</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Armor Box and Grid */}
                  <div className="flex flex-col">
                    <div className="flex gap-2">
                      <div className="w-24 h-24 flex flex-col rounded-lg overflow-hidden border border-gray-800">
                        <div className="bg-gray-800 text-white text-center py-1">
                          <div className="flex items-center justify-center text-ms font-bold">
                            护甲值
                            <ModifierFieldAnchor target="armorMax" label="护甲值" />
                          </div>
                        </div>
                        <div className="flex-1 bg-white flex flex-col items-center justify-end pb-2 px-1">
                          <input
                            type="text"
                            name="armorMax"
                            value={armorMaxDraft ?? safeFormData.armorMax ?? ""}
                            onChange={handleInputChange}
                            onBlur={handleModifierTargetCommit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                handleModifierTargetCommit(event)
                                event.currentTarget.blur()
                              }
                            }}
                            placeholder={
                              safeFormData.equipment.armorSlot.baseArmorMax === null
                                ? ""
                                : String(safeFormData.equipment.armorSlot.baseArmorMax)
                            }
                            className="w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none text-xl font-bold text-gray-800 placeholder-gray-400 print-empty-hide pb-1"
                          />
                          <div className="text-[8px] text-transparent">占位</div>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <span className="test-center text-[10px] mr-1">护甲槽</span>
                        </div>
                        {/* Armor Boxes - 3 per row, 4 rows */}
                        <div className="grid grid-cols-3 gap-1">
                          {(() => {
                            const calculatedArmorValue = parseNumberExpressionOr(String(safeFormData.armorMax ?? "0"), 0);
                            return Array(12)
                              .fill(0)
                              .map((_, i) => (
                                <div
                                  key={`armor-box-${i}`}
                                  className={`w-4 h-4 border ${i < calculatedArmorValue
                                    ? "border-gray-800 cursor-pointer"
                                    : "border-gray-400 border-dashed"
                                    } ${armorBoxes?.[i] && i < calculatedArmorValue ? "bg-gray-800" : "bg-white"}`}
                                  onClick={() => i < calculatedArmorValue && updateArmorBox(i)}
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
                  <h3 className="text-xs font-bold text-center print:mb-1">装备</h3>

                  <div className="flex items-center gap-0.5 mb-1">
                    <span className="text-[10px]">熟练度</span>
                    <ModifierFieldAnchor target="proficiency" label="熟练度" size="compact" />
                    {Array(6)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={`prof-${i}`}
                          className={`w-3 h-3 rounded-full border-2 border-gray-800 cursor-pointer ${Array.isArray(proficiency) && proficiency[i] ? "bg-gray-800" : "bg-white"
                            }`}
                          onClick={() => updateProficiency(i)}
                        ></div>
                      ))}
                  </div>

                  <WeaponSection
                    isPrimary={true}
                    slotType="primary"
                    onOpenWeaponModal={openWeaponModal}
                  />

                  <WeaponSection
                    isPrimary={false}
                    slotType="secondary"
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
              <div className="col-span-1 space-y-1 -mt-1">
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
                <h3 className="flex items-center justify-center gap-1 text-xs font-bold">
                  <span>备用武器</span>
                  <EquipmentProviderAnchor
                    slotRef={{ type: "inventoryWeapon", index: 0 }}
                    fallbackLabel="备用武器 1"
                    size="compact"
                  />
                </h3>
                <InventoryWeaponSection
                  index={0}
                  onOpenWeaponModal={openWeaponModal}
                />

                <InventoryWeaponSection
                  index={1}
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
        weaponSlotType={currentWeaponSlot.slotType}
        onSelect={handleWeaponSelect}
        title="选择武器"
      />

      <ArmorSelectionModal
        isOpen={armorModalOpen}
        onClose={() => setArmorModalOpen(false)}
        onSelect={handleArmorSelect}
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
                ? "选择种族"
                : currentModal.type === "community"
                  ? "选择社群"
                  : "选择子职业"
          }
          cardType={getModalCardType(currentModal.type)} // Use the helper function here
          field={currentModal.field}
          levelFilter={currentModal.levelFilter}
        />
      )}
      {setupPrompt.dialog}
    </>
  )
}
