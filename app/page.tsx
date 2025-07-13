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
import { CardDrawer } from "@/components/card-drawer"
import CharacterSheetPageFour from "@/components/character-sheet-page-four"
import CharacterSheetPageFive from "@/components/character-sheet-page-five"
import { CharacterCreationGuide } from "@/components/guide/character-creation-guide"
import { CharacterManagementModal } from "@/components/modals/character-management-modal"
import { Button } from "@/components/ui/button"
import { HoverMenu, HoverMenuItem } from "@/components/ui/hover-menu"
import { useSheetStore } from "@/lib/sheet-store"
import { getBasePath } from "@/lib/utils"
import { PrintReadyChecker } from "@/components/print-ready-checker"
import { usePrintContext } from "@/contexts/print-context"
import { usePinnedCardsStore } from "@/lib/pinned-cards-store"
import { PinnedCardWindow } from "@/components/ui/pinned-card-window"

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
import { CharacterMetadata } from "@/lib/sheet-data"
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
import { exportToHTML } from "@/lib/html-exporter"

export default function Home() {
  // 多角色系统状态
  const {
    sheetData: formData,
    setSheetData: setFormData,
    replaceSheetData
  } = useSheetStore();
  
  // 钉住卡牌状态
  const { pinnedCards } = usePinnedCardsStore();
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
  const [currentTabValue, setCurrentTabValue] = useState("page1")
  const [showShortcutHint, setShowShortcutHint] = useState(false)
  const [isCardDrawerOpen, setIsCardDrawerOpen] = useState(false)

  // 打印图片加载状态
  const { allImagesLoaded } = usePrintContext()

  // 客户端挂载检测
  useEffect(() => {
    setIsClient(true)
    // 设置默认页面标题
    document.title = "Character Sheet"

    // 显示快捷键提示（3秒后消失）
    const timer = setTimeout(() => {
      setShowShortcutHint(true)
      setTimeout(() => setShowShortcutHint(false), 3000)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

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
            replaceSheetData(characterData)
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
            replaceSheetData(characterData)
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
        replaceSheetData(newCharacterData)
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
        replaceSheetData(characterData)
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
    const level = formData.level || '()';

    // 并行获取所有卡片类名
    const [ancestry1Class, professionClass, ancestry2Class, communityClass] = await Promise.all([
      getCardClass(formData.ancestry1Ref?.id, CardType.Ancestry),
      getCardClass(formData.professionRef?.id, CardType.Profession),
      getCardClass(formData.ancestry2Ref?.id, CardType.Ancestry),
      getCardClass(formData.communityRef?.id, CardType.Community)
    ]);

    const title = `${name}-${professionClass}-${ancestry1Class}-${ancestry2Class}-${communityClass}-LV${level}`;
    console.log('[App] 设置页面标题:', title);
    document.title = title;
    setIsPrintingAll(true);
  }

  // HTML导出功能
  const handleExportHTML = async () => {
    try {
      console.log('[App] 开始HTML导出，正在等待图片加载并转换为Base64...')
      await exportToHTML(formData)
      console.log('[App] HTML导出完成')
    } catch (error) {
      console.error('[App] HTML导出失败:', error)
      alert('HTML导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
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

  // 等待图片加载完成和页面渲染的通用函数
  const waitForImagesLoaded = (): Promise<void> => {
    return new Promise((resolve) => {
      if (allImagesLoaded) {
        // 图片已经加载完成，等待300ms让页面完全渲染
        setTimeout(resolve, 300)
        return
      }

      // 检查图片加载状态的间隔检查
      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime

        if (allImagesLoaded) {
          // 图片加载完成，等待300ms后resolve
          clearInterval(checkInterval)
          setTimeout(resolve, 300)
        } else if (elapsedTime > 1000) {
          // 3秒超时，直接继续
          clearInterval(checkInterval)
          console.log('[App] 图片加载超时，继续执行操作')
          resolve()
        }
      }, 100)
    })
  }

  // 快速导出功能 - 通过切换到预览页面实现
  const handleQuickExportPDF = async () => {
    try {
      console.log('[App] 快速PDF导出 - 进入预览页面')
      // 设置标题
      await handlePrintAll()
      // 等待图片加载完成后自动触发打印
      await waitForImagesLoaded()
      // 给浏览器一点时间更新document.title
      window.print()
      // 打印完成后自动返回主页面
      setTimeout(() => {
        setIsPrintingAll(false)
        document.title = "Character Sheet" // 重置标题
      }, 300)
    } catch (error) {
      console.error('[App] 快速PDF导出失败:', error)
      alert('PDF导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  const handleQuickExportHTML = async () => {
    try {
      console.log('[App] 快速HTML导出 - 进入预览页面')
      // 进入预览页面
      await handlePrintAll()
      // 等待图片加载完成后调用HTML导出并返回
      await waitForImagesLoaded()
      await handleExportHTML()
      setIsPrintingAll(false) // 返回主页面
      document.title = "Character Sheet" // 重置标题
    } catch (error) {
      console.error('[App] 快速HTML导出失败:', error)
      alert('HTML导出失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  const handleQuickExportJSON = async () => {
    try {
      console.log('[App] 快速JSON导出 - 进入预览页面')
      // 进入预览页面
      await handlePrintAll()
      // 等待图片加载完成后调用JSON导出并返回
      await waitForImagesLoaded()
      handleExportJSON()
      setIsPrintingAll(false) // 返回主页面
      document.title = "Character Sheet" // 重置标题
    } catch (error) {
      console.error('[App] 快速JSON导出失败:', error)
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


  // 快速新建存档
  const handleQuickCreateArchive = () => {
    const saveName = prompt('请输入存档名称:')
    if (saveName && saveName.trim()) {
      createNewCharacterHandler(saveName.trim())
    }
  }

  // 页面切换逻辑
  const getAvailablePages = () => {
    if (formData.includePageThreeInExport) {
      return ["page1", "page2", "page3"]
    } else {
      return ["page1", "page2"] // 跳过收起的第三页
    }
  }

  const switchToNextPage = () => {
    const pages = getAvailablePages()
    const currentIndex = pages.indexOf(currentTabValue)
    // 循环：如果在最后一页，跳转到第一页
    const nextIndex = currentIndex < pages.length - 1 ? currentIndex + 1 : 0
    setCurrentTabValue(pages[nextIndex])
  }

  const switchToPrevPage = () => {
    const pages = getAvailablePages()
    const currentIndex = pages.indexOf(currentTabValue)
    // 循环：如果在第一页，跳转到最后一页
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : pages.length - 1
    setCurrentTabValue(pages[prevIndex])
  }

  const switchToPage = (pageValue: string) => {
    const pages = getAvailablePages()
    if (pages.includes(pageValue)) {
      setCurrentTabValue(pageValue)
    }
  }


  // 从HTML导入新建存档
  const handleQuickImportFromHTML = () => {
    // 创建文件输入元素
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.html'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const { importCharacterFromHTMLFile } = await import('@/lib/html-importer')
          const result = await importCharacterFromHTMLFile(file)

          if (result.success && result.data) {
            // 从导入的数据中提取角色名称作为默认存档名
            const characterName = result.data.name || "未命名角色"
            const defaultSaveName = `${characterName} (HTML导入)`

            // 提示用户输入存档名称
            const saveName = prompt('请输入新存档的名称:', defaultSaveName)
            if (saveName && saveName.trim()) {
              // 先创建新存档
              const success = createNewCharacterHandler(saveName.trim())
              if (success) {
                // 创建成功后导入数据
                setFormData(result.data)
                if (result.warnings && result.warnings.length > 0) {
                  alert(`HTML导入成功并创建新存档"${saveName}"，但有以下警告：\n${result.warnings.join('\n')}`)
                } else {
                  alert(`HTML导入成功并创建新存档"${saveName}"`)
                }
              } else {
                alert('创建新存档失败，可能已达到存档数量上限')
              }
            }
          } else {
            alert(`HTML导入失败：${result.error}`)
          }
        } catch (error) {
          console.error('HTML导入失败:', error)
          alert('HTML导入失败: ' + (error instanceof Error ? error.message : '未知错误'))
        }
      }
    }
    input.click()
  }


  // 键盘快捷键 - 页面切换 + 存档切换 + ESC退出预览
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC键退出导出预览
      if (event.key === 'Escape' && isPrintingAll) {
        event.preventDefault()
        setIsPrintingAll(false)
        console.log('[App] ESC键退出导出预览')
        return
      }

      // 页面切换快捷键（无修饰键）
      if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && !isPrintingAll && !characterManagementModalOpen && !isGuideOpen) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault()
            switchToPrevPage()
            console.log('[App] 箭头键切换到上一页')
            break
          case 'ArrowRight':
            event.preventDefault()
            switchToNextPage()
            console.log('[App] 箭头键切换到下一页')
            break
          case '1':
            event.preventDefault()
            switchToPage('page1')
            console.log('[App] 数字键切换到第一页')
            break
          case '2':
            event.preventDefault()
            switchToPage('page2')
            console.log('[App] 数字键切换到第二页')
            break
          case '3':
            event.preventDefault()
            switchToPage('page3')
            console.log('[App] 数字键切换到第三页')
            break
        }
      }

      // Ctrl+数字键切换存档
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

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [characterList, currentCharacterId, characterManagementModalOpen, isPrintingAll, isGuideOpen, currentTabValue, formData.includePageThreeInExport])

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
      <PrintReadyChecker>
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
          <div className="fixed bottom-4 left-0 right-0 z-[60] print:hidden print-control-buttons">
            <div className="flex justify-center">
              <div className="flex items-center gap-4">
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
          </div>

        {/* 第一页 */}
        <div className="page-one flex justify-center items-start min-h-screen">
          <CharacterSheet />
        </div>

        {/* 第二页 */}
        <div className="page-two flex justify-center items-start min-h-screen">
          <CharacterSheetPageTwo />
        </div>

        {/* 第三页 - 条件渲染 */}
        {formData.includePageThreeInExport && (
          <div className="page-three flex justify-center items-start min-h-screen">
            <CharacterSheetPageThree />
          </div>
        )}

        {/* 第四页（仅打印时显示） */}
        <div className="page-four flex justify-center items-start min-h-screen">
          <CharacterSheetPageFour />
        </div>

        {/* 第五页（仅打印时显示） */}
        <div className="page-five flex justify-center items-start min-h-screen">
          <CharacterSheetPageFive />
        </div>
        </div>
      </PrintReadyChecker>
    )
  }

  return (
    <main className="min-w-0 w-full max-w-full mx-auto px-0 md:px-4 py-4 pb-20 container">

      {/* 底部抽屉式卡牌展示 - 打印时隐藏 */}
      <div className="print:hidden">
        <CardDrawer
          cards={formData.cards || []}
          inventoryCards={formData.inventory_cards || []}
          isOpen={isCardDrawerOpen}
          onClose={() => setIsCardDrawerOpen(false)}
        />
      </div>

      <div className="flex justify-center px-0">
        {/* 角色卡区域 - 带相对定位 */}
        <div className="relative w-full md:max-w-[220mm]">
          <Tabs value={currentTabValue} onValueChange={setCurrentTabValue} className="w-full md:max-w-[210mm]">
            <TabsList className={`grid w-[210mm] transition-all duration-200 ${!formData.includePageThreeInExport
              ? 'grid-cols-[1fr_1fr_auto]'
              : 'grid-cols-3'
              }`}>
              <TabsTrigger value="page1">第一页</TabsTrigger>
              <TabsTrigger value="page2">第二页</TabsTrigger>
              <TabsTrigger
                value="page3"
                className={`flex items-center justify-center transition-all duration-200 ${!formData.includePageThreeInExport
                  ? 'w-12 min-w-12 px-1'
                  : 'px-4'
                  }`}
              >
                {formData.includePageThreeInExport && <span className="flex-grow text-center">第三页</span>}
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleIncludePageThreeInExport()
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  title={formData.includePageThreeInExport ? "点击关闭第三页导出" : "点击开启第三页导出"}
                >
                  {formData.includePageThreeInExport ? <EyeIcon /> : <EyeOffIcon />}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="page1">
              <CharacterSheet />
            </TabsContent>
            <TabsContent value="page2">
              <CharacterSheetPageTwo />
            </TabsContent>
            <TabsContent value="page3">
              <CharacterSheetPageThree />
            </TabsContent>
          </Tabs>

          {/* 左侧切换区域 - 仅桌面端显示 */}
          <div
            className="print:hidden hidden md:block absolute -left-20 top-0 bottom-0 w-16 flex items-center justify-center cursor-pointer group z-20"
            onClick={switchToPrevPage}
            title="上一页 (←) - 循环切换"
          >
            {/* 悬停时显示的背景 */}
            <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-50 transition-opacity duration-200 rounded-l-lg"></div>
            {/* 箭头图标 */}
            <div className="relative bg-white shadow-md group-hover:shadow-lg p-2 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110 group-active:scale-95">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </div>

          {/* 右侧切换区域 - 仅桌面端显示 */}
          <div
            className="print:hidden hidden md:block absolute -right-20 top-0 bottom-0 w-16 flex items-center justify-center cursor-pointer group z-20"
            onClick={switchToNextPage}
            title="下一页 (→) - 循环切换"
          >
            {/* 悬停时显示的背景 */}
            <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-50 transition-opacity duration-200 rounded-r-lg"></div>
            {/* 箭头图标 */}
            <div className="relative bg-white shadow-md group-hover:shadow-lg p-2 rounded-full opacity-60 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110 group-active:scale-95">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

        </div>
      </div>

      {/* 底部功能按钮区域 */}
      <div className="fixed bottom-4 left-0 right-0 z-30 print:hidden">
        <div className="flex justify-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsCardDrawerOpen(!isCardDrawerOpen)}
              className="bg-gray-800 hover:bg-gray-700 text-white w-12 h-12 rounded-full p-0 flex items-center justify-center"
            >
              🎴
            </Button>

          <Button
            onClick={toggleGuide}
            className="bg-blue-800 text-white hover:bg-blue-700 focus:outline-none whitespace-nowrap"
          >
            建卡指引
          </Button>

          {/* 导出按钮 */}
          <HoverMenu
            align="end"
            side="top"
            trigger={
              <Button 
                onClick={handlePrintAll}
                className="bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap"
              >
                导出页面
              </Button>
            }
          >
            <HoverMenuItem onClick={handlePrintAll}>
              导出预览
            </HoverMenuItem>
            <HoverMenuItem onClick={handleQuickExportPDF}>
              导出PDF
            </HoverMenuItem>
            <HoverMenuItem onClick={handleQuickExportHTML}>
              导出HTML
            </HoverMenuItem>
            <HoverMenuItem onClick={handleQuickExportJSON}>
              导出JSON
            </HoverMenuItem>
          </HoverMenu>

          {/* 存档管理按钮 */}
          <HoverMenu
            align="end"
            side="top"
            trigger={
              <Button 
                onClick={() => setCharacterManagementModalOpen(true)}
                className="bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap"
              >
                存档管理
              </Button>
            }
          >
            <HoverMenuItem
              onClick={handleQuickCreateArchive}
              disabled={characterList.length >= MAX_CHARACTERS}
            >
              新建存档
            </HoverMenuItem>
            <HoverMenuItem
              onClick={handleQuickImportFromHTML}
              disabled={characterList.length >= MAX_CHARACTERS}
            >
              从HTML新建
            </HoverMenuItem>
          </HoverMenu>

          <Button
            onClick={() => {
              window.location.href = `${getBasePath()}/card-manager`;
            }}
            className="bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap"
          >
            卡牌管理
          </Button>
          </div>
        </div>
      </div>

      {/* 快捷键提示 */}
      {showShortcutHint && (
        <div className="print:hidden fixed top-4 right-4 z-40 animate-in slide-in-from-top duration-300">
          <div className="bg-black bg-opacity-80 text-white px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
            <div className="font-medium mb-2">⌨️ 快捷键提示</div>
            <div className="space-y-1 text-xs">
              <div>← → 切换页面</div>
              <div>1 2 3 直接跳转</div>
              <div>Ctrl+数字 切换存档</div>
            </div>
          </div>
        </div>
      )}

      {/* 建卡指引组件 - 移到父组件 */}
      <CharacterCreationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* 存档管理模态框 */}
      <CharacterManagementModal
        isOpen={characterManagementModalOpen}
        onClose={closeCharacterManagementModal}
        characterList={characterList}
        currentCharacterId={currentCharacterId}
        onSwitchCharacter={switchToCharacter}
        onCreateCharacter={createNewCharacterHandler}
        onDeleteCharacter={deleteCharacterHandler}
        onDuplicateCharacter={duplicateCharacterHandler}
        onRenameCharacter={renameCharacterHandler}
      />

      {/* 钉住的卡牌窗口 - 全局渲染，不受页面切换影响 */}
      {pinnedCards.map((pinnedCard) => (
        <PinnedCardWindow
          key={pinnedCard.id}
          pinnedCard={pinnedCard}
        />
      ))}
    </main>
  )
}
