"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CharacterSheet from "@/components/character-sheet"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import { loadCharacterData, saveCharacterData, exportCharacterData } from "@/lib/storage"
import { CardDisplaySection } from "@/components/card-display-section"
import { CharacterCreationGuide } from "@/components/guide/character-creation-guide"
import { Button } from "@/components/ui/button"
import { ImportExportModal } from "@/components/modals/import-export-modal"
import PrintHelper from "@/app/print-helper"
import { createEmptyCard } from "@/data/card/card-types"

// 默认表单数据
const defaultFormData = {
  name: "",
  level: 1,
  proficiency: 0,
  ancestry: "",
  profession: "warrior",
  community: "",
  strength: 0,
  dexterity: 0,
  intelligence: 0,
  wisdom: 0,
  charisma: 0,
  constitution: 0,
  maxHitPoints: 10,
  currentHitPoints: 10,
  temporaryHitPoints: 0,
  armor: {
    name: "",
    armorClass: 10,
    type: "",
    properties: [],
    description: "",
  },
  weapons: [
    {
      name: "",
      damage: "",
      type: "",
      properties: [],
      description: "",
    },
  ],
  gold: 0,
  silver: 0,
  copper: 0,
  inventory: ["", "", "", "", ""], // 确保有5个空字符串
  experience: 0,
  hope: 3,
  characterBackground: "",
  characterAppearance: "",
  characterMotivation: "",
  cards: Array(20)
    .fill(0)
    .map(() => createEmptyCard()),
  checkedUpgrades: {
    tier1: {} as Record<number, boolean>,
    tier2: {} as Record<number, boolean>,
    tier3: {} as Record<number, boolean>,
  },
}

export default function Home() {
  // 确保默认表单数据包含完整的结构
  const [formData, setFormData] = useState({
    ...defaultFormData,
    inventory: ["", "", "", "", ""], // 确保有5个空字符串
    cards: Array(20)
      .fill(0)
      .map(() => createEmptyCard()),
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isPrintingAll, setIsPrintingAll] = useState(false) // Added state for printing all pages

  // 建卡指引状态 - 提升到父组件
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const [importExportModalOpen, setImportExportModalOpen] = useState(false)

  const openImportExportModal = () => {
    setImportExportModalOpen(true)
  }

  const closeImportExportModal = () => {
    setImportExportModalOpen(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const handlePrintAll = () => {
    setIsPrintingAll(true)
  }

  // Effect for handling "Print All Pages"
  useEffect(() => {
    if (isPrintingAll) {
      const printTimeout = setTimeout(() => {
        window.print()
      }, 500) // Delay to allow rendering of print content

      const handleAfterPrint = () => {
        setIsPrintingAll(false)
        window.removeEventListener("afterprint", handleAfterPrint)
      }
      window.addEventListener("afterprint", handleAfterPrint)

      return () => {
        clearTimeout(printTimeout)
        window.removeEventListener("afterprint", handleAfterPrint)
      }
    }
  }, [isPrintingAll])

  // 从 localStorage 加载数据
  useEffect(() => {
    try {
      setIsLoading(true)
      const savedData = loadCharacterData()

      // 确保合并后的数据包含完整的卡牌数组
      const mergedData = {
        ...defaultFormData,
        ...(savedData || {}),
      }

      // 确保卡牌数组至少有20个元素
      if (!mergedData.cards || !Array.isArray(mergedData.cards)) {
        mergedData.cards = Array(20)
          .fill(0)
          .map(() => createEmptyCard())
      } else if (mergedData.cards.length < 20) {
        // 如果卡牌数组长度不足20，补充空卡牌
        const emptyCards = Array(20 - mergedData.cards.length)
          .fill(0)
          .map(() => createEmptyCard())
        mergedData.cards = [...mergedData.cards, ...emptyCards]
      }

      // 确保其他数组属性也存在
      mergedData.armorBoxes = Array.isArray(mergedData.armorBoxes) ? mergedData.armorBoxes : Array(12).fill(false)
      mergedData.hp = Array.isArray(mergedData.hp) ? mergedData.hp : Array(18).fill(false)
      mergedData.stress = Array.isArray(mergedData.stress) ? mergedData.stress : Array(18).fill(false)
      mergedData.hope = Array.isArray(mergedData.hope) ? mergedData.hope : Array(6).fill(false)
      mergedData.gold = Array.isArray(mergedData.gold) ? mergedData.gold : Array(20).fill(false)

      // 确保 inventory 是一个包含5个元素的数组
      if (!Array.isArray(mergedData.inventory) || mergedData.inventory.length < 5) {
        mergedData.inventory = Array.isArray(mergedData.inventory)
          ? [...mergedData.inventory, ...Array(5 - mergedData.inventory.length).fill("")]
          : ["", "", "", "", ""]
      }

      mergedData.experience = Array.isArray(mergedData.experience) ? mergedData.experience : ["", "", "", "", ""]
      mergedData.experienceValues = Array.isArray(mergedData.experienceValues)
        ? mergedData.experienceValues
        : ["", "", "", "", ""]

      setFormData(mergedData)
    } catch (error) {
      console.error("Error loading character data:", error)
      // 如果加载失败，使用默认数据
      setFormData({
        ...defaultFormData,
        inventory: ["", "", "", "", ""], // 确保有5个空字符串
        cards: Array(20).fill(0).map(() => createEmptyCard()), // Ensure cards is array of StandardCard objects
      })
    } finally {
      setIsLoading(false)
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
            <TabsList className="grid w-full max-w-[210mm] grid-cols-2">
              <TabsTrigger value="page1">角色卡 - 第一页</TabsTrigger>
              <TabsTrigger value="page2">角色卡 - 第二页</TabsTrigger>
            </TabsList>
            <TabsContent value="page1">
              <CharacterSheet formData={formData} setFormData={setFormData} />
            </TabsContent>
            <TabsContent value="page2">
              <CharacterSheetPageTwo formData={formData} setFormData={setFormData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 固定位置的按钮 - 移到父组件 */}
      <div className="print:hidden fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <Button onClick={openImportExportModal} className="bg-gray-800 hover:bg-gray-700">
          导入/导出
        </Button>
        <Button onClick={handlePrintAll} className="bg-gray-800 hover:bg-gray-700"> {/* Changed Link to Button */}
          打印全部页面
        </Button>
        <Button onClick={handlePrint} className="bg-gray-800 hover:bg-gray-700">
          打印当前页面
        </Button>
        <button
          onClick={toggleGuide}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md"
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
          setFormData({ ...formData, ...data })
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
