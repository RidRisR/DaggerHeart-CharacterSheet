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
import { CharacterCreationGuide } from "@/components/guide/character-creation-guide"
import { ImportExportModal } from "@/components/modals/import-export-modal"
import { Button } from "@/components/ui/button"
import { StandardCard } from "@/card/card-types"
import { SheetData, CharacterMetadata } from "@/lib/sheet-data"
import { exportCharacterData, importCharacterDataForMultiCharacter } from "@/lib/storage"
import {
  migrateToMultiCharacterStorage,
  loadCharacterList,
  loadCharacterById,
  saveCharacterById,
  getActiveCharacterId,
  setActiveCharacterId,
  createNewCharacter,
  addCharacterToMetadataList,
  removeCharacterFromMetadataList,
  deleteCharacterById,
  duplicateCharacter,
  MAX_CHARACTERS
} from "@/lib/multi-character-storage"
import PrintHelper from "./print-helper"

export default function Home() {
  // 多角色系统状态
  const [formData, setFormData] = useState(defaultSheetData)
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null)
  const [characterList, setCharacterList] = useState<CharacterMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMigrationCompleted, setIsMigrationCompleted] = useState(false)
  
  // UI状态
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [importExportModalOpen, setImportExportModalOpen] = useState(false)

  const openImportExportModal = () => {
    setImportExportModalOpen(true)
  }

  const closeImportExportModal = () => {
    setImportExportModalOpen(false)
  }

  // 数据迁移处理
  useEffect(() => {
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
  }, [])

  // 加载角色列表和活动角色
  useEffect(() => {
    if (!isMigrationCompleted) return

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
  }, [isMigrationCompleted])

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

  // Effect for handling "Print All Pages"
  useEffect(() => {
    if (isPrintingAll) {
      const printTimeout = setTimeout(() => {
        window.print();
        setIsPrintingAll(false);
      }, 500);

      return () => {
        clearTimeout(printTimeout);
      };
    }
  }, [isPrintingAll])

  // 切换建卡指引显示状态
  const toggleGuide = () => {
    setIsGuideOpen(!isGuideOpen)
  }

  // 处理聚焦卡牌变更（带深度比较防止循环）
  const handleFocusedCardsChange = (focusedCardIds: string[]) => {
    setFormData(prev => {
      // 深度比较，避免不必要的更新
      const currentIds = prev.focused_card_ids || []
      if (JSON.stringify(currentIds.sort()) === JSON.stringify(focusedCardIds.sort())) {
        return prev // 没有变化，直接返回原对象
      }

      console.log(`[App] 聚焦卡牌变更: ${currentIds.length} -> ${focusedCardIds.length}`)
      return {
        ...prev,
        focused_card_ids: focusedCardIds
      }
    })
  }

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
          <CardDisplaySection 
            cards={formData.cards} 
            focusedCardIds={formData.focused_card_ids || []} 
          />
        </div>

        {/* 右侧角色卡区域 */}
        <div className="lg:w-3/4">
          <Tabs defaultValue="page1" className="w-full max-w-[210mm]">
            <TabsList className="grid w-full max-w-[210mm] grid-cols-4">
              {/* 角色选择器作为第一个Tab */}
              <TabsTrigger value="characters" className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                角色管理
              </TabsTrigger>
              <TabsTrigger value="page1">第一页</TabsTrigger>
              <TabsTrigger value="page2">第二页</TabsTrigger>
              <TabsTrigger value="page3">第三页</TabsTrigger>
            </TabsList>
            
            {/* 角色管理标签页 */}
            <TabsContent value="characters" className="mt-4">
              <div className="bg-white p-6 rounded-lg border">
                <h2 className="text-xl font-semibold mb-4">存档管理</h2>
                
                {/* 当前存档信息 */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">当前存档</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-blue-800">
                        {characterList.find(c => c.id === currentCharacterId)?.saveName || "未命名存档"}
                      </span>
                      <span className="text-sm text-blue-700 mt-1">
                        角色名称: {formData.name || "未填写"}
                      </span>
                    </div>
                    <span className="text-sm text-blue-600">
                      {characterList.find(c => c.id === currentCharacterId)?.lastModified 
                        ? new Date(characterList.find(c => c.id === currentCharacterId)!.lastModified).toLocaleString()
                        : ''}
                    </span>
                  </div>
                </div>

                {/* 存档列表 */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">所有存档 ({characterList.length}/{MAX_CHARACTERS})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {characterList.map((character) => {
                      // 获取角色数据以显示角色名
                      const characterData = loadCharacterById(character.id);
                      return (
                        <div
                          key={character.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${currentCharacterId === character.id
                              ? 'bg-blue-100 border-blue-300'
                              : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                            }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium">{character.saveName}</div>
                            <div className="text-sm text-gray-500">
                              角色: {characterData?.name || "未填写"} | 
                              创建：{new Date(character.createdAt).toLocaleDateString()}
                              {character.lastModified && (
                                <span className="ml-2">
                                  修改：{new Date(character.lastModified).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {currentCharacterId !== character.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => switchToCharacter(character.id)}
                              >
                                切换
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newSaveName = prompt('请输入复制存档的名称:', `${character.saveName} (副本)`)
                                if (newSaveName) {
                                  duplicateCharacterHandler(character.id, newSaveName)
                                }
                              }}
                              disabled={characterList.length >= MAX_CHARACTERS}
                            >
                              复制
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => deleteCharacterHandler(character.id)}
                              disabled={characterList.length <= 1}
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 新建存档 */}
                <div className="border-t pt-4">
                  <Button
                    onClick={() => {
                      const saveName = prompt('请输入新存档的名称:', '我的存档')
                      if (saveName) {
                        createNewCharacterHandler(saveName)
                      }
                    }}
                    disabled={characterList.length >= MAX_CHARACTERS}
                    className="w-full"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    新建存档 ({characterList.length}/{MAX_CHARACTERS})
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="page1">
              <CharacterSheet formData={formData} setFormData={setFormData} />
            </TabsContent>
            <TabsContent value="page2">
              <CharacterSheetPageTwo 
                formData={formData} 
                setFormData={setFormData}
                onFocusedCardsChange={handleFocusedCardsChange}
              />
            </TabsContent>
            <TabsContent value="page3">
              <CharacterSheetPageThree formData={formData} onFormDataChange={setFormData} allCards={formData.cards} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 固定位置的按钮 - 移到父组件 */}
      <div className="print:hidden fixed bottom-4 right-4 z-50 flex flex-col gap-2">
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
        <Button onClick={() => handlePrintAll().catch(console.error)} className="bg-gray-800 hover:bg-gray-700">
          导出PDF
        </Button>
        <Button onClick={openImportExportModal} className="bg-gray-800 hover:bg-gray-700">
          存档与重置
        </Button>
        <Button
          onClick={() => {
            window.location.href = `/DaggerHeart-CharacterSheet/card-manager`;
          }}
          className="bg-gray-800 hover:bg-gray-700"
        >
          卡牌管理
        </Button>
      </div>

      {/* 建卡指引组件 - 移到父组件 */}
      <CharacterCreationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} formData={formData} />

      {/* 导入/导出模态框 */}
      <ImportExportModal
        isOpen={importExportModalOpen}
        onClose={closeImportExportModal}
        onExport={() => exportCharacterData(formData).catch(console.error)}
        onImport={(data) => {
          // 导入数据到当前角色
          const mergedData = { ...defaultSheetData, ...data, focused_card_ids: data.focused_card_ids || [] }
          setFormData(mergedData)
          closeImportExportModal()
        }}
        onReset={() => {
          if (confirm("确定要重置当前角色数据吗？此操作不可撤销。")) {
            setFormData(defaultSheetData)
            closeImportExportModal()
          }
        }}
      />
    </main>
  )
}
