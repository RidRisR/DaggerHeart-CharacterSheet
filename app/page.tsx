"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CharacterSheet from "@/components/character-sheet"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import CharacterSheetPageThree from "@/components/character-sheet-page-three"; // Import the new page
import {
  getStandardCardsByTypeAsync,
  CardType, // Import CardType
} from "@/card";
import { defaultSheetData } from "@/lib/default-sheet-data"; // Import the unified defaultFormData
import { CardDisplaySection } from "@/components/card-display-section"
import CharacterSheetPageFour from "@/components/character-sheet-page-four"
import { CharacterCreationGuide } from "@/components/guide/character-creation-guide"
import { ImportExportModal } from "@/components/modals/import-export-modal"
import { Button } from "@/components/ui/button"
import { StandardCard } from "@/card/card-types"
import { SheetData } from "@/lib/sheet-data"
import { loadCharacterData, saveCharacterData, exportCharacterData } from "@/lib/storage"
import PrintHelper from "./print-helper"

export default function Home() {
  // 类型安全 useState
  const [formData, setFormData] = useState(defaultSheetData);
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

  const handlePrintAll = async () => {
    const getCardClass = async (cardId: string | undefined, cardType: CardType): Promise<string> => { // Changed cardType to CardType and made async
      if (!cardId) return '()';
      try {
        const cardsOfType: StandardCard[] = await getStandardCardsByTypeAsync(cardType); // Now async
        const card = cardsOfType.find((c: StandardCard) => c.id === cardId);
        return card && card.class ? String(card.class) : '()';
      } catch (error) {
        console.error('Error getting card class:', error);
        return '()';
      }
    };

    const name = formData.name || '()';
    const ancestry1Class = await getCardClass(formData.ancestry1Ref?.id, CardType.Ancestry); // Now with await
    const professionClass = await getCardClass(formData.professionRef?.id, CardType.Profession); // Now with await
    const ancestry2Class = await getCardClass(formData.ancestry2Ref?.id, CardType.Ancestry); // Now with await
    const communityClass = await getCardClass(formData.communityRef?.id, CardType.Community); // Now with await
    const level = formData.level || '()';

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
      const mergedData: SheetData = { ...defaultSheetData, ...(savedData || {}) };
      setFormData(mergedData);
    } catch (error) {
      console.error("Error loading character data:", error);
      setFormData(defaultSheetData);
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
          存档与重置
        </Button>
        <Button onClick={() => handlePrintAll().catch(console.error)} className="bg-gray-800 hover:bg-gray-700"> {/* Changed Link to Button and handle async */}
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
        onExport={() => exportCharacterData(formData).catch(console.error)}
        onImport={(data) => {
          setFormData({ ...defaultSheetData, ...data })
          closeImportExportModal()
        }}
        onReset={() => {
          if (confirm("确定要重置所有角色数据吗？此操作不可撤销。")) {
            setFormData(defaultSheetData)
            closeImportExportModal()
          }
        }}
      />
    </main>
  )
}
