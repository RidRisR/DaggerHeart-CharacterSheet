"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CharacterSheet from "@/components/character-sheet"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import CharacterSheetPageThree from "@/components/character-sheet-page-three"
import {
  getStandardCardsByTypeAsync,
  CardType,
} from "@/card"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { CardDisplaySection } from "@/components/card-display-section"
import CharacterSheetPageFour from "@/components/character-sheet-page-four"
import CharacterSheetPageFive from "@/components/character-sheet-page-five"
import { CharacterCreationGuide } from "@/components/guide/character-creation-guide"
import { CharacterManagementModal } from "@/components/modals/character-management-modal"
import { Button } from "@/components/ui/button"

// 内联图标组件
const EyeIcon = () => (
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
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
)

const EyeOffIcon = () => (
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
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a13.16 13.16 0 0 1-1.67 2.68"></path>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 8 11 8a9.74 9.74 0 0 0 5.39-1.61"></path>
    <line x1="2" y1="2" x2="22" y2="22"></line>
  </svg>
)
import { StandardCard } from "@/card/card-types"
import { SheetData, CharacterMetadata } from "@/lib/sheet-data"
import { exportCharacterData } from "@/lib/storage"
import {
  migrateToMultiCharacterStorage,
  loadCharacterList,
  loadCharacterById,
  saveCharacterById,
  getActiveCharacterId,
  setActiveCharacterId,
  createNewCharacter,
  addCharacterToMetadataList,
  updateCharacterInMetadataList,
  removeCharacterFromMetadataList,
  deleteCharacterById,
  duplicateCharacter,
  MAX_CHARACTERS
} from "@/lib/multi-character-storage"
import PrintHelper from "./print-helper"
import { exportToHTML, previewHTML } from "@/lib/html-exporter"

export default function Home() {
  // 多角色系统状态
  const [formData, setFormData] = useState(defaultSheetData)
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null)
  const [characterList, setCharacterList] = useState<CharacterMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMigrationCompleted, setIsMigrationCompleted] = useState(false)
  // 添加客户端挂载状态
  const [isClient, setIsClient] = useState(false)

  // UI状态
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [characterManagementModalOpen, setCharacterManagementModalOpen] = useState(false)

  // 客户端挂载检测
  useEffect(() => {
    setIsClient(true)
  }, [])

  const openCharacterManagementModal = () => {
    setCharacterManagementModalOpen(true)
  }

  const closeCharacterManagementModal = () => {
    setCharacterManagementModalOpen(false)
  }

  // 第三页导出控制
  const toggleIncludePageThreeInExport = () => {
    setFormData(prev => ({
      ...prev,
      includePageThreeInExport: !prev.includePageThreeInExport,
    }))
  }

  // 数据迁移处理 - 只在客户端执行
  useEffect(() => {
    if (!isClient) return

    const performMigration = async () => {
      try {
        console.log('[App] Starting data migration check...')
        migrateToMultiCharacterStorage()
        setIsMigrationCompleted(true)
        console.log('[App] Migration completed successfully')
      } catch (error) {
        console.error('[App] Migration failed:', error)
        // 迁移失败时保持在加载状态，显示错误
        return
      }
    }

    performMigration()
  }, [isClient])

  // 加载角色列表和活动角色 - 只在迁移完成且在客户端时执行
  useEffect(() => {
    if (!isMigrationCompleted || !isClient) return

    const loadInitialData = () => {
      try {
        console.log('[App] Loading initial character data...')

        // 加载角色列表
        const list = loadCharacterList()
        setCharacterList(list.characters)

        // 获取活动角色ID
        const activeId = getActiveCharacterId()

        if (activeId && list.characters.some(char => char.id === activeId)) {
          // 加载活动角色数据
          const characterData = loadCharacterById(activeId)
          if (characterData) {
            setCurrentCharacterId(activeId)
            setFormData(characterData)
            console.log(`[App] Loaded active character: ${activeId}`)
          } else {
            console.warn(`[App] Active character data not found: ${activeId}`)
            // 如果活动角色数据不存在，创建新角色
            createFirstCharacter()
          }
        } else if (list.characters.length > 0) {
          // 如果没有活动角色但有角色列表，选择第一个
          const firstCharacter = list.characters[0]
          const characterData = loadCharacterById(firstCharacter.id)
          if (characterData) {
            setCurrentCharacterId(firstCharacter.id)
            setActiveCharacterId(firstCharacter.id)
            setFormData(characterData)
            console.log(`[App] Set first character as active: ${firstCharacter.id}`)
          }
        } else {
          // 没有任何角色，创建第一个
          createFirstCharacter()
        }
      } catch (error) {
        console.error('[App] Error loading initial data:', error)
        createFirstCharacter()
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [isMigrationCompleted, isClient])

  const createFirstCharacter = () => {
    try {
      console.log('[App] Creating first character...')
      const newCharacterData = createNewCharacter("") // 空白角色名，用户后续填写
      const metadata = addCharacterToMetadataList("我的存档") // 默认存档名

      if (metadata) {
        saveCharacterById(metadata.id, newCharacterData)
        setActiveCharacterId(metadata.id)
        setCurrentCharacterId(metadata.id)
        setFormData(newCharacterData)
        setCharacterList([metadata])
        console.log(`[App] Created first character: ${metadata.id}`)
      }
    } catch (error) {
      console.error('[App] Error creating first character:', error)
      // 最后的退路：使用默认数据
      setFormData(defaultSheetData)
    }
  }

  // 自动保存当前角色数据（带防抖和更深层的变更检测）
  useEffect(() => {
    if (!isLoading && isMigrationCompleted && currentCharacterId && formData) {
      const saveTimeout = setTimeout(() => {
        try {
          // 检查是否真的需要保存 - 与localStorage中的数据比较
          const existingData = loadCharacterById(currentCharacterId)
          const formDataStr = JSON.stringify(formData)
          const existingDataStr = JSON.stringify(existingData)

          if (existingDataStr !== formDataStr) {
            saveCharacterById(currentCharacterId, formData)
            console.log(`[App] Auto-saved character: ${currentCharacterId}`)
          }
        } catch (error) {
          console.error(`[App] Error auto-saving character ${currentCharacterId}:`, error)
        }
      }, 300)

      return () => clearTimeout(saveTimeout)
    }
  }, [formData, currentCharacterId, isLoading, isMigrationCompleted])

  // 切换角色
  const switchToCharacter = (characterId: string) => {
    try {
      console.log(`[App] Switching to character: ${characterId}`)
      const characterData = loadCharacterById(characterId)

      if (characterData) {
        setCurrentCharacterId(characterId)
        setActiveCharacterId(characterId)
        setFormData(characterData)
        console.log(`[App] Successfully switched to character: ${characterId}`)
      } else {
        console.error(`[App] Character data not found: ${characterId}`)
        alert('角色数据加载失败')
      }
    } catch (error) {
      console.error(`[App] Error switching to character ${characterId}:`, error)
      alert('切换角色失败')
    }
  }

  // 创建新角色
  const createNewCharacterHandler = (saveName: string) => {
    try {
      if (characterList.length >= MAX_CHARACTERS) {
        alert(`最多只能创建${MAX_CHARACTERS}个角色`)
        return false
      }

      console.log(`[App] Creating new save: ${saveName}`)
      const newCharacterData = createNewCharacter("") // 空白角色名，用户后续填写
      const metadata = addCharacterToMetadataList(saveName) // 使用存档名

      if (metadata) {
        saveCharacterById(metadata.id, newCharacterData)
        setCharacterList(prev => [...prev, metadata])
        switchToCharacter(metadata.id)
        console.log(`[App] Successfully created new save: ${metadata.id}`)
        return true
      } else {
        console.error('[App] Failed to create character metadata')
        alert('创建存档失败')
        return false
      }
    } catch (error) {
      console.error(`[App] Error creating new save:`, error)
      alert('创建存档失败')
      return false
    }
  }

  // 删除角色
  const deleteCharacterHandler = (characterId: string) => {
    try {
      if (characterList.length <= 1) {
        alert('至少需要保留一个角色')
        return false
      }

      if (!confirm('确定要删除这个角色吗？此操作不可撤销。')) {
        return false
      }

      console.log(`[App] Deleting character: ${characterId}`)

      // 删除数据
      deleteCharacterById(characterId)
      removeCharacterFromMetadataList(characterId)

      // 更新状态
      const updatedList = characterList.filter(char => char.id !== characterId)
      setCharacterList(updatedList)

      // 如果删除的是当前角色，切换到第一个
      if (currentCharacterId === characterId && updatedList.length > 0) {
        switchToCharacter(updatedList[0].id)
      }

      console.log(`[App] Successfully deleted character: ${characterId}`)
      return true
    } catch (error) {
      console.error(`[App] Error deleting character ${characterId}:`, error)
      alert('删除角色失败')
      return false
    }
  }

  // 复制角色
  const duplicateCharacterHandler = (characterId: string, newSaveName: string) => {
    try {
      if (characterList.length >= MAX_CHARACTERS) {
        alert(`最多只能创建${MAX_CHARACTERS}个角色`)
        return false
      }

      console.log(`[App] Duplicating character: ${characterId}`)
      const duplicatedData = duplicateCharacter(characterId, "") // 复制角色数据，但角色名清空

      if (duplicatedData) {
        const metadata = addCharacterToMetadataList(newSaveName) // 使用新的存档名
        if (metadata) {
          saveCharacterById(metadata.id, duplicatedData)
          setCharacterList(prev => [...prev, metadata])
          switchToCharacter(metadata.id)
          console.log(`[App] Successfully duplicated character: ${metadata.id}`)
          return true
        }
      }

      console.error('[App] Failed to duplicate character')
      alert('复制角色失败')
      return false
    } catch (error) {
      console.error(`[App] Error duplicating character ${characterId}:`, error)
      alert('复制角色失败')
      return false
    }
  }

  // 重命名角色
  const renameCharacterHandler = (characterId: string, newSaveName: string) => {
    try {
      console.log(`[App] Renaming character: ${characterId} to "${newSaveName}"`)

      // 更新存档名称
      updateCharacterInMetadataList(characterId, { saveName: newSaveName })

      // 更新本地状态
      setCharacterList(prev =>
        prev.map(char =>
          char.id === characterId
            ? { ...char, saveName: newSaveName, lastModified: new Date().toISOString() }
            : char
        )
      )

      console.log(`[App] Successfully renamed character: ${characterId}`)
      return true
    } catch (error) {
      console.error(`[App] Error renaming character ${characterId}:`, error)
      alert('重命名存档失败')
      return false
    }
  }

  const handlePrintAll = async () => {
    const getCardClass = async (cardId: string | undefined, cardType: CardType): Promise<string> => {
      if (!cardId) return '()';
      try {
        const cardsOfType: StandardCard[] = await getStandardCardsByTypeAsync(cardType);
        const card = cardsOfType.find((c: StandardCard) => c.id === cardId);
        return card && card.class ? String(card.class) : '()';
      } catch (error) {
        console.error('Error getting card class:', error);
        return '()';
      }
    };

    const name = formData.name || '()';
    const ancestry1Class = await getCardClass(formData.ancestry1Ref?.id, CardType.Ancestry);
    const professionClass = await getCardClass(formData.professionRef?.id, CardType.Profession);
    const ancestry2Class = await getCardClass(formData.ancestry2Ref?.id, CardType.Ancestry);
    const communityClass = await getCardClass(formData.communityRef?.id, CardType.Community);
    const level = formData.level || '()';

    document.title = `${name}-${professionClass}-${ancestry1Class}-${ancestry2Class}-${communityClass}-LV${level}`;
    setIsPrintingAll(true);
  }

  // HTML导出功能
  const handleExportHTML = async () => {
    try {
      await exportToHTML(formData)
      console.log('[App] HTML导出完成')
    } catch (error) {
      console.error('[App] HTML导出失败:', error)
      alert('HTML导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // HTML预览功能
  const handlePreviewHTML = async () => {
    try {
      await previewHTML(formData)
      console.log('[App] HTML预览打开')
    } catch (error) {
      console.error('[App] HTML预览失败:', error)
      alert('HTML预览失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // JSON导出功能
  const handleExportJSON = () => {
    try {
      exportCharacterData(formData)
      console.log('[App] JSON导出完成')
    } catch (error) {
      console.error('[App] JSON导出失败:', error)
      alert('JSON导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // Effect for handling "Print All Pages" - 移除自动打印功能
  // useEffect(() => {
  //   if (isPrintingAll) {
  //     const printTimeout = setTimeout(() => {
  //       window.print();
  //       setIsPrintingAll(false);
  //     }, 500);

  //     return () => {
  //       clearTimeout(printTimeout);
  //     };
  //   }
  // }, [isPrintingAll])

  // 切换建卡指引显示状态
  const toggleGuide = () => {
    setIsGuideOpen(!isGuideOpen)
  }

  // 键盘快捷键 - Ctrl+数字键快速切换存档 + ESC退出预览
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC键退出导出预览
      if (event.key === 'Escape' && isPrintingAll) {
        event.preventDefault()
        setIsPrintingAll(false)
        console.log('[App] ESC键退出导出预览')
        return
      }

      // 检查是否按下Ctrl键和数字键（1-9, 0）
      if (event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
        const key = event.key
        let targetIndex = -1

        if (key >= '1' && key <= '9') {
          targetIndex = parseInt(key) - 1 // 1对应索引0
        } else if (key === '0') {
          targetIndex = 9 // 0对应索引9（第10个存档）
        }

        if (targetIndex >= 0 && targetIndex < characterList.length) {
          event.preventDefault()
          const targetCharacter = characterList[targetIndex]
          if (targetCharacter.id !== currentCharacterId) {
            switchToCharacter(targetCharacter.id)
            console.log(`[App] 快捷键切换到存档 ${targetIndex + 1}: ${targetCharacter.saveName}`)
          }
        }
      }
    }

    // 在导出预览模式下总是监听ESC键，在非模态框状态下监听其他快捷键
    if (isPrintingAll || !characterManagementModalOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [characterList, currentCharacterId, characterManagementModalOpen, isPrintingAll])

  // 已移除聚焦卡牌变更处理函数 - 功能由双卡组系统取代

  // 允许页面在客户端初始化的同时显示加载状态
  if (!isClient) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-lg">初始化中...</div>
        <div className="text-sm text-gray-500 mt-2">正在启动客户端...</div>
      </div>
    )
  }

  // 客户端已挂载，但数据还在加载
  if (!isMigrationCompleted || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-lg">
          {!isMigrationCompleted ? '正在迁移数据...' : '加载中...'}
        </div>
        <div className="text-sm text-gray-500 mt-2">
          {!isMigrationCompleted ? '首次运行需要迁移存储格式，请稍候' : '正在加载角色数据'}
        </div>
      </div>
    )
  }

  if (isPrintingAll) {
    return (
      <div className="print-all-pages">
        <PrintHelper />

        {/* 顶部提示横条 - 只在屏幕上显示，打印时隐藏 */}
        <div className="fixed top-0 left-0 right-0 z-[70] print:hidden">
          <div
            className="bg-black bg-opacity-50 text-white px-6 py-3 text-center cursor-pointer hover:bg-opacity-70 transition-all duration-200"
            onClick={() => setIsPrintingAll(false)}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm">
                按 <kbd className="px-2 py-1 bg-gray-700 rounded text-xs mx-1">ESC</kbd> 键或点击此处退出预览
              </span>
            </div>
          </div>
        </div>

        {/* 打印预览控制按钮，只在屏幕上显示，打印时隐藏 */}
        <div className="fixed bottom-4 right-4 z-[60] print:hidden print-control-buttons">
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => window.print()}
              className="bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap"
            >
              导出为PDF
            </Button>
            <Button
              onClick={handleExportHTML}
              className="bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap"
            >
              导出为HTML
            </Button>
            <Button
              onClick={handleExportJSON}
              className="bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap"
            >
              导出为JSON
            </Button>
            <Button
              onClick={() => setIsPrintingAll(false)}
              className="bg-red-600 text-white hover:bg-red-700 focus:outline-none whitespace-nowrap"
            >
              返回
            </Button>
          </div>
        </div>

        {/* 第一页 */}
        <div className="page-one flex justify-center items-start min-h-screen">
          <CharacterSheet formData={formData} setFormData={setFormData} />
        </div>

        {/* 第二页 */}
        <div className="page-two flex justify-center items-start min-h-screen">
          <CharacterSheetPageTwo formData={formData} setFormData={setFormData} />
        </div>

        {/* 第三页 - 条件渲染 */}
        {formData.includePageThreeInExport && (
          <div className="page-three flex justify-center items-start min-h-screen">
            <CharacterSheetPageThree formData={formData} onFormDataChange={setFormData} allCards={formData.cards} />
          </div>
        )}

        {/* 第四页（仅打印时显示） */}
        <div className="page-four flex justify-center items-start min-h-screen">
          <CharacterSheetPageFour formData={formData} />
        </div>

        {/* 第五页（仅打印时显示） */}
        <div className="page-five flex justify-center items-start min-h-screen">
          <CharacterSheetPageFive formData={formData} />
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
          <CardDisplaySection
            cards={formData.cards || []}
            inventoryCards={formData.inventory_cards || []}
          />
        </div>

        {/* 右侧角色卡区域 */}
        <div className="lg:w-3/4">
          <Tabs defaultValue="page1" className="w-full max-w-[210mm]">
            <TabsList className={`grid w-full max-w-[210mm] transition-all duration-200 ${!formData.includePageThreeInExport
                ? 'grid-cols-[1fr_1fr_auto]'
                : 'grid-cols-3'
              }`}>
              <TabsTrigger value="page1">第一页</TabsTrigger>
              <TabsTrigger value="page2">第二页</TabsTrigger>
              <TabsTrigger 
                value="page3" 
                className={`flex items-center justify-center transition-all duration-200 ${
                  !formData.includePageThreeInExport 
                  ? 'w-12 min-w-12 px-1'
                  : 'px-4'
                }`}
              >
                {formData.includePageThreeInExport && <span className="flex-grow text-center">第三页</span>}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleIncludePageThreeInExport()
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title={formData.includePageThreeInExport ? "点击关闭第三页导出" : "点击开启第三页导出"}
                >
                  {formData.includePageThreeInExport ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="page1">
              <CharacterSheet formData={formData} setFormData={setFormData} />
            </TabsContent>
            <TabsContent value="page2">
              <CharacterSheetPageTwo
                formData={formData}
                setFormData={setFormData}
              />
            </TabsContent>
            <TabsContent value="page3">
              <CharacterSheetPageThree
                formData={formData}
                onFormDataChange={setFormData}
                allCards={[
                  ...(formData.cards || []),
                  ...(formData.inventory_cards || [])
                ]}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 固定位置的按钮 - 移到父组件 */}
      <div className="print:hidden fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <button
          onClick={toggleGuide}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md focus:outline-none"
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
        <Button onClick={() => handlePrintAll().catch(console.error)} className="bg-gray-800 hover:bg-gray-700 focus:outline-none">
          导出预览
        </Button>
        <Button onClick={openCharacterManagementModal} className="bg-gray-800 hover:bg-gray-700 focus:outline-none">
          存档管理
        </Button>
        <Button
          onClick={() => {
            // 检测是否为本地构建版本
            const isLocalBuild = window.location.protocol === 'file:';

            if (isLocalBuild) {
              // 本地版本：跳转到资产目录下的卡牌管理页面
              window.location.href = './资产/card-manager.html';
            } else {
              // 在线版本：使用原有路径
              window.location.href = `/DaggerHeart-CharacterSheet/card-manager`;
            }
          }}
          className="bg-gray-800 hover:bg-gray-700 focus:outline-none"
        >
          卡牌管理
        </Button>
      </div>

      {/* 建卡指引组件 - 移到父组件 */}
      <CharacterCreationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} formData={formData} />

      {/* 存档管理模态框 */}
      <CharacterManagementModal
        isOpen={characterManagementModalOpen}
        onClose={closeCharacterManagementModal}
        characterList={characterList}
        currentCharacterId={currentCharacterId}
        formData={formData}
        onSwitchCharacter={switchToCharacter}
        onCreateCharacter={createNewCharacterHandler}
        onDeleteCharacter={deleteCharacterHandler}
        onDuplicateCharacter={duplicateCharacterHandler}
        onRenameCharacter={renameCharacterHandler}
        onImportData={(data: any) => {
          // 数据迁移：为旧存档添加缺失字段
          const mergedData = {
            ...defaultSheetData,
            ...data,
            inventory_cards: data.inventory_cards || Array(20).fill({ id: '', name: '', type: 'unknown', description: '' }),
            includePageThreeInExport: data.includePageThreeInExport ?? true // 确保第三页导出字段存在
          }
          setFormData(mergedData)
        }}
        onResetData={() => {
          setFormData(defaultSheetData)
        }}
      />
    </main>
  )
}
