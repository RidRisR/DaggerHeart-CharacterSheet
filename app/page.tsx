"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CharacterSheet from "@/components/character-sheet"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import CharacterSheetPageThree from "@/components/character-sheet-page-three"; // Import the new page
import CharacterSheetPageFour from "@/components/character-sheet-page-four"
import { loadCharacterData, saveCharacterData, exportCharacterData } from "@/lib/storage"
import { CardDisplaySection } from "@/components/card-display-section"
import { CharacterCreationGuide } from "@/components/guide/character-creation-guide"
import { Button } from "@/components/ui/button"
import { ImportExportModal } from "@/components/modals/import-export-modal"
import PrintHelper from "@/app/print-helper"
import type { FormData } from "@/lib/form-data";
import { createEmptyCard, StandardCard } from "@/data/card/card-types"

// 默认表单数据
const defaultFormData: FormData = {
  name: "",
  level: 1,
  proficiency: Array(6).fill(false),
  ancestry1: "",
  ancestry2: "",
  profession: "",
  community: "",
  agility: { checked: false, value: "" },
  strength: { checked: false, value: "" },
  finesse: { checked: false, value: "" },
  instinct: { checked: false, value: "" },
  presence: { checked: false, value: "" },
  knowledge: { checked: false, value: "" },
  gold: Array(20).fill(false),
  experience: ["", "", "", "", ""],
  experienceValues: ["", "", "", "", ""],
  hope: Array(6).fill(false),
  hp: Array(18).fill(false),
  stress: Array(18).fill(false),
  armorBoxes: Array(12).fill(false),
  inventory: ["", "", "", "", ""],
  characterBackground: "",
  characterAppearance: "",
  characterMotivation: "",
  cards: Array(20).fill(0).map(() => createEmptyCard()),
  checkedUpgrades: {
    tier1: {},
    tier2: {},
    tier3: {},
  },
  minorThreshold: "",
  majorThreshold: "",
  armorValue: "",
  armorBonus: "",
  armorMax: 0,
  hpMax: 0,
  stressMax: 0,
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
  armorThreshold: "",
  armorFeature: "",
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
  // 伙伴相关
  companionImage: "",
  companionDescription: "",
  companionRange: "",
  companionStress: Array(18).fill(false),
  companionEvasion: "",
  companionStressMax: 0,
  evasion: "",
  subclass: "",
  companionName: "",
  companionWeapon: "",
  companionExperience: ["", "", "", "", ""],
  companionExperienceValue: ["", "", "", "", ""],
  // 伙伴训练
  trainingOptions: {
    intelligent: Array(3).fill(false),
    radiantInDarkness: [false],
    creatureComfort: [false],
    armored: [false],
    vicious: Array(3).fill(false),
    resilient: Array(3).fill(false),
    bonded: [false],
    aware: Array(3).fill(false),
  },
}

export default function Home() {
  // 类型安全 useState
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrintingAll, setIsPrintingAll] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);

  const openImportExportModal = () => {
    setImportExportModalOpen(true)
  }

  const closeImportExportModal = () => {
    setImportExportModalOpen(false)
  }

  const handlePrintAll = () => {
    const getCardClass = (cardId: string | undefined, cardType: string, allCards: StandardCard[]): string => {
      if (!cardId || !allCards || !Array.isArray(allCards)) return '()';
      const card = allCards.find((c) => c.id === cardId && c.type === cardType);
      return card && card.class ? String(card.class) : '()';
    };

    const name = formData.name || '()';
    const ancestry1Class = getCardClass(formData.ancestry1, 'ancestry', formData.cards);
    const professionClass = getCardClass(formData.profession, 'profession', formData.cards);
    const ancestry2Class = getCardClass(formData.ancestry2, 'ancestry', formData.cards);
    const communityClass = getCardClass(formData.community, 'community', formData.cards);
    const level = formData.level ? String(formData.level) : '()';

    document.title = `${name}-${professionClass}-${ancestry1Class}-${ancestry2Class}-${communityClass}-LV${level}`;
    setIsPrintingAll(true);
  }

  // Effect for handling "Print All Pages"
  useEffect(() => {
    if (isPrintingAll) {
      const printTimeout = setTimeout(() => {
        window.print();
        setIsPrintingAll(false); // Automatically exit print mode after printing
      }, 500); // Delay to allow rendering of print content

      return () => {
        clearTimeout(printTimeout);
      };
    }
  }, [isPrintingAll])

  // 从 localStorage 加载数据
  useEffect(() => {
    try {
      setIsLoading(true);
      const savedData = loadCharacterData();
      // 类型安全合并，优先以 defaultFormData 结构为准
      const mergedData: FormData = { ...defaultFormData, ...(savedData || {}) };
      setFormData(mergedData);
    } catch (error) {
      console.error("Error loading character data:", error);
      setFormData(defaultFormData);
    } finally {
      setIsLoading(false);
    }
  }, [])

  // 当表单数据变化时自动保存
  useEffect(() => {
    if (!isLoading && formData) {
      try {
        saveCharacterData(formData)
      } catch (error) {
        console.error("Error saving character data:", error)
      }
    }
  }, [formData, isLoading])

  // 切换建卡指引显示状态
  const toggleGuide = () => {
    setIsGuideOpen(!isGuideOpen)
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">加载中...</div>
  }

  if (isPrintingAll) {
    return (
      <div className="print-all-pages">
        <PrintHelper />
        {/* 打印时的返回按钮，只在屏幕上显示，打印时隐藏 */}
        <div className="fixed top-4 left-4 z-50 print:hidden">
          <button
            onClick={() => setIsPrintingAll(false)} // Allows user to cancel print mode
            className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            返回
          </button>
        </div>

        {/* 第一页 */}
        <div className="page-one">
          <CharacterSheet formData={formData} setFormData={setFormData} />
        </div>

        {/* 第二页 */}
        <div className="page-two">
          <CharacterSheetPageTwo formData={formData} setFormData={setFormData} />
        </div>

        {/* 第三页 */}
        <div className="page-three">
          <CharacterSheetPageThree formData={formData} onFormDataChange={setFormData} allCards={formData.cards} />
        </div>

        {/* 第四页（仅打印时显示） */}
        <div className="page-four">
          <CharacterSheetPageFour formData={formData} />
        </div>
      </div>
    )
  }

  return (
    <main className="container mx-auto py-4">
      <h1 className="text-2xl font-bold text-center mb-4">Daggerheart 角色卡</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左侧卡牌展示区域 - 打印时隐藏 */}
        <div className="lg:w-1/4 print:hidden">
          <CardDisplaySection cards={formData.cards} />
        </div>

        {/* 右侧角色卡区域 */}
        <div className="lg:w-3/4">
          <Tabs defaultValue="page1" className="w-full max-w-[210mm]">
            <TabsList className="grid w-full max-w-[210mm] grid-cols-3"> {/* Changed grid-cols-2 to grid-cols-3 */}
              <TabsTrigger value="page1">角色卡 - 第一页</TabsTrigger>
              <TabsTrigger value="page2">角色卡 - 第二页</TabsTrigger>
              <TabsTrigger value="page3">角色卡 - 第三页</TabsTrigger> {/* Added trigger for page 3 */}
            </TabsList>
            <TabsContent value="page1">
              <CharacterSheet formData={formData} setFormData={setFormData} />
            </TabsContent>
            <TabsContent value="page2">
              <CharacterSheetPageTwo formData={formData} setFormData={setFormData} />
            </TabsContent>
            <TabsContent value="page3"> {/* Added content for page 3 */}
              <CharacterSheetPageThree formData={formData} onFormDataChange={setFormData} allCards={formData.cards} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 固定位置的按钮 - 移到父组件 */}
      <div className="print:hidden fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button onClick={openImportExportModal} className="bg-gray-800 hover:bg-gray-700">
          保存/读取
        </Button>
        <Button onClick={handlePrintAll} className="bg-gray-800 hover:bg-gray-700"> {/* Changed Link to Button */}
          导出PDF
        </Button>
        <button
          onClick={toggleGuide}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          建卡指引
        </button>
      </div>

      {/* 建卡指引组件 - 移到父组件 */}
      <CharacterCreationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} formData={formData} />

      {/* 导入/导出模态框 */}
      <ImportExportModal
        isOpen={importExportModalOpen}
        onClose={closeImportExportModal}
        onExport={() => exportCharacterData(formData)}
        onImport={(data) => {
          setFormData({ ...defaultFormData, ...data })
          closeImportExportModal()
        }}
        onReset={() => {
          if (confirm("确定要重置所有角色数据吗？此操作不可撤销。")) {
            setFormData(defaultFormData)
            closeImportExportModal()
          }
        }}
      />
    </main>
  )
}
