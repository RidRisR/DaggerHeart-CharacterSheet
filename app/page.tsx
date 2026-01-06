"use client"

import { useState, useEffect } from "react"
import CharacterSheet from "@/components/character-sheet"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import CharacterSheetPageThree from "@/components/character-sheet-page-ranger-companion"
import CharacterSheetPageAdventureNotes from "@/components/character-sheet-page-adventure-notes"
import { isEmptyCard, type StandardCard } from "@/card/card-types"
import { CardDrawer } from "@/components/card-drawer"
import { showFadeNotification } from "@/components/ui/fade-notification"
import { CardSelectionModal } from "@/components/modals/card-selection-modal"
import { CharacterSheetPageFour, CharacterSheetPageFive } from "@/components/character-sheet-page-card-print"
import ArmorTemplatePage from "@/components/character-sheet-page-iknis"
import { CharacterCreationGuide } from "@/components/guide/character-creation-guide"
import { CharacterManagementModal } from "@/components/modals/character-management-modal"
import { SealDiceExportModal } from "@/components/modals/seal-dice-export-modal"
import { Button } from "@/components/ui/button"
import { HoverMenu, HoverMenuItem, HoverMenuDivider } from "@/components/ui/hover-menu"
import { useSheetStore, useCardActions } from "@/lib/sheet-store"
import { navigateToPage } from "@/lib/utils"
import { PrintReadyChecker } from "@/components/print/print-ready-checker"
import { usePrintContext } from "@/contexts/print-context"
import { usePinnedCardsStore } from "@/lib/pinned-cards-store"
import { PinnedCardWindow } from "@/components/ui/pinned-card-window"
import { PageVisibilityDropdown } from "@/components/ui/page-visibility-dropdown"
import { useTextModeStore } from "@/lib/text-mode-store"
import { useDualPageStore } from "@/lib/dual-page-store"
import { DualPageToggle } from "@/components/ui/dual-page-toggle"
import { registerPages, getTabPages } from "@/lib/page-registry"
import { PageDisplay } from "@/components/layout/page-display"
import { PrintPageRenderer } from "@/components/print/print-page-renderer"
import { SaveSwitcher } from "@/components/ui/save-switcher"

// EyeIcon和EyeOffIcon已移除 - 现在使用PageVisibilityDropdown

// 文字模式图标
const TextIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4 7 4 4 20 4 20 7"></polyline>
    <line x1="9" y1="20" x2="15" y2="20"></line>
    <line x1="12" y1="4" x2="12" y2="20"></line>
  </svg>
)

// 图片模式图标
const ImageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
)
import { useCharacterManagement } from "@/hooks/use-character-management"
import { useExportHandlers } from "@/hooks/use-export-handlers"
import PrintHelper from "./print-helper"

// 注册所有页面
registerPages([
  {
    id: 'page1',
    label: '第一页',
    component: CharacterSheet,
    printClass: 'page-one',
    visibility: { type: 'always' },
    printOrder: 1,
    showInTabs: true
  },
  {
    id: 'page2',
    label: '第二页',
    component: CharacterSheetPageTwo,
    printClass: 'page-two',
    visibility: { type: 'always' },
    printOrder: 2,
    showInTabs: true
  },
  {
    id: 'page3',
    label: '游侠伙伴',
    component: CharacterSheetPageThree,
    printClass: 'page-three',
    visibility: { type: 'config', configKey: 'rangerCompanion' },
    printOrder: 3,
    showInTabs: true
  },
  {
    id: 'page4',
    label: '主板扩展',
    component: ArmorTemplatePage,
    printClass: 'page-iknis',
    visibility: { type: 'config', configKey: 'armorTemplate' },
    printOrder: 4,
    showInTabs: true
  },
  {
    id: 'adventure-notes',
    label: '冒险笔记',
    component: CharacterSheetPageAdventureNotes,
    printClass: 'page-adventure-notes',
    visibility: { type: 'config', configKey: 'adventureNotes' },
    printOrder: 5,
    showInTabs: true
  },
  {
    id: 'focused-cards',
    label: '聚焦卡组',
    component: CharacterSheetPageFour,
    printClass: 'page-four',
    visibility: {
      type: 'data',
      dataCheck: (data) => {
        // 检查聚焦卡组（排除第一张卡）
        return data.cards && data.cards.length > 1 &&
          data.cards.slice(1).some(card => card && !isEmptyCard(card))
      }
    },
    printOrder: 6,
    showInTabs: false  // 不在Tab中显示
  },
  {
    id: 'inventory-cards',
    label: '库存卡组',
    component: CharacterSheetPageFive,
    printClass: 'page-five',
    visibility: {
      type: 'data',
      dataCheck: (data) => {
        // 检查库存卡组
        return !!(data.inventory_cards && data.inventory_cards.length > 0 &&
          data.inventory_cards.some(card => card && !isEmptyCard(card)))
      }
    },
    printOrder: 7,
    showInTabs: false  // 不在Tab中显示
  }
])

export default function Home() {
  // 多角色系统状态
  const {
    sheetData: formData,
    setSheetData: setFormData
  } = useSheetStore();

  // 钉住卡牌状态
  const { pinnedCards } = usePinnedCardsStore();
  // 卡牌操作方法
  const { deleteCard, moveCard, updateCard } = useCardActions();
  // 文字模式状态
  const { isTextMode, toggleTextMode } = useTextModeStore();
  // 双页模式状态
  const { 
    isDualPageMode, 
    leftPageId, 
    rightPageId, 
    leftTabValue, 
    rightTabValue, 
    setLeftTab, 
    setRightTab 
  } = useDualPageStore();
  // 添加客户端挂载状态
  const [isClient, setIsClient] = useState(false)
  // 添加移动设备检测
  const [isMobile, setIsMobile] = useState(false)
  
  // UI状态
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [characterManagementModalOpen, setCharacterManagementModalOpen] = useState(false)
  const [sealDiceExportModalOpen, setSealDiceExportModalOpen] = useState(false)
  const [currentTabValue, setCurrentTabValue] = useState("page1")
  const [showShortcutHint, setShowShortcutHint] = useState(false)
  const [isCardDrawerOpen, setIsCardDrawerOpen] = useState(false)

  // 添加卡牌相关状态
  const [pendingCardIndex, setPendingCardIndex] = useState<number | null>(null)
  const [pendingCardIsInventory, setPendingCardIsInventory] = useState<boolean>(false)
  const [cardSelectionModalOpen, setCardSelectionModalOpen] = useState(false)

  // CardSelectionModal 的筛选状态
  const [cardModalActiveTab, setCardModalActiveTab] = useState<string>("")
  const [cardModalSearchTerm, setCardModalSearchTerm] = useState<string>("")
  const [cardModalSelectedClasses, setCardModalSelectedClasses] = useState<string[]>([])
  const [cardModalSelectedLevels, setCardModalSelectedLevels] = useState<string[]>([])
  const [cardModalSelectedBatches, setCardModalSelectedBatches] = useState<string[]>([])
  
  // 使用角色管理Hook
  const {
    currentCharacterId,
    characterList,
    isLoading,
    switchToCharacter,
    createNewCharacterHandler,
    deleteCharacterHandler,
    duplicateCharacterHandler,
    renameCharacterHandler,
    handleQuickCreateArchive,
  } = useCharacterManagement({ isClient, setCurrentTabValue })
  
  // 打印图片加载状态
  const { allImagesLoaded } = usePrintContext()
  
  // 额外需要的MAX_CHARACTERS常量
  const MAX_CHARACTERS = 10
  
  // 使用导出功能Hook
  const {
    handlePrintAll,
    handleExportHTML,
    handleExportJSON,
    handleQuickExportPDF,
    handleQuickExportHTML,
    handleQuickExportJSON,
  } = useExportHandlers({ formData, allImagesLoaded, setIsPrintingAll })

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

  // 移动设备检测
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const closeCharacterManagementModal = () => {
    setCharacterManagementModalOpen(false)
  }

  // 移除旧的第三页导出控制函数 - 现在使用 PageVisibilityDropdown

  // 生成可见的tab配置
  const getVisibleTabs = () => {
    // 防护条件：如果formData不存在，返回空数组
    if (!formData) {
      return []
    }

    return getTabPages(formData)
  }


  // 自动保存当前角色数据（带防抖和更深层的变更检测）
  useEffect(() => {
    if (!isLoading && currentCharacterId && formData) {
      const saveTimeout = setTimeout(() => {
        try {
          // 保存到localStorage
          localStorage.setItem(`dh_character_${currentCharacterId}`, JSON.stringify(formData))
          console.log(`[App] Auto-saved character: ${currentCharacterId}`)
        } catch (error) {
          console.error(`[App] Error auto-saving character ${currentCharacterId}:`, error)
        }
      }, 300)

      return () => clearTimeout(saveTimeout)
    }
  }, [formData, currentCharacterId, isLoading])









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

  // 页面切换逻辑 - 基于页面注册系统
  const getAvailablePages = () => {
    const tabs = getVisibleTabs()
    return tabs.map(tab => tab.tabValue || tab.id)
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

      // 检查是否在输入框中
      const isInputFocused = document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement).contentEditable === 'true'
      )

      // 页面切换快捷键（无修饰键）
      if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && !isPrintingAll && !characterManagementModalOpen && !isGuideOpen && !isInputFocused) {
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
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            event.preventDefault()
            // 动态映射数字键到可见的tabs
            const keyNumber = parseInt(event.key)
            const availablePages = getAvailablePages()
            if (keyNumber > 0 && keyNumber <= availablePages.length) {
              const targetPage = availablePages[keyNumber - 1]
              switchToPage(targetPage)
              console.log(`[App] 数字键${keyNumber}切换到页面`)
            }
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
  }, [characterList, currentCharacterId, characterManagementModalOpen, isPrintingAll, isGuideOpen, currentTabValue, formData?.pageVisibility])

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
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-lg">
          加载中...
        </div>
        <div className="text-sm text-gray-500 mt-2">
          正在加载角色数据
        </div>
      </div>
    )
  }

  if (isPrintingAll) {
    const handleSkipWaiting = () => {
      console.log('[App] 用户选择跳过图片加载等待，页面将立即显示')
    }

    return (
      <PrintReadyChecker onSkipWaiting={handleSkipWaiting}>
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
          <div className={`fixed left-0 right-0 z-[60] print:hidden print-control-buttons ${isMobile ? 'bottom-8' : 'bottom-4'
            }`}>
            <div className="flex justify-center">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => window.print()}
                  className={`bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap ${isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                    }`}
                >
                  导出为PDF
                </Button>
                <Button
                  onClick={handleExportHTML}
                  className={`bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap ${isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                    }`}
                >
                  导出为HTML
                </Button>
                <Button
                  onClick={handleExportJSON}
                  className={`bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap ${isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                    }`}
                >
                  导出为JSON
                </Button>
                <Button
                  onClick={() => {
                    setSealDiceExportModalOpen(true)
                    setIsPrintingAll(false)
                  }}
                  className={`bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap ${isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                    }`}
                >
                  导出到骰子
                </Button>
                <Button
                  onClick={() => setIsPrintingAll(false)}
                  className={`bg-red-600 text-white hover:bg-red-700 focus:outline-none whitespace-nowrap ${isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                    }`}
                >
                  返回
                </Button>
              </div>
            </div>
          </div>

          {/* 使用动态页面渲染器 */}
          <PrintPageRenderer sheetData={formData} />
        </div >
      </PrintReadyChecker >
    )
  }

  // 处理添加卡牌
  const handleAddCard = (index: number, isInventory: boolean) => {
    if (index === -1) {
      showFadeNotification({
        message: "卡组已满，无法添加更多卡牌",
        type: "error"
      });
      return;
    }
    setPendingCardIndex(index);
    setPendingCardIsInventory(isInventory);
    setCardSelectionModalOpen(true);
  }

  // 处理卡牌选择
  const handleCardSelect = (card: StandardCard) => {
    if (pendingCardIndex !== null) {
      updateCard(pendingCardIndex, card, pendingCardIsInventory);
      setCardSelectionModalOpen(false);
      setPendingCardIndex(null);
      setPendingCardIsInventory(false);
      showFadeNotification({
        message: `卡牌已添加到${pendingCardIsInventory ? '库存' : '聚焦'}卡组`,
        type: "success"
      });
    }
  }

  return (
    <main className={`min-w-0 w-full max-w-full mx-auto px-0 container ${isMobile ? 'pb-32' : 'pb-20'
      }`}>

      {/* 底部抽屉式卡牌展示 - 打印时隐藏 */}
      <div className="print:hidden">
        <CardDrawer
          cards={formData.cards || []}
          inventoryCards={formData.inventory_cards || []}
          isOpen={isCardDrawerOpen}
          onClose={() => setIsCardDrawerOpen(false)}
          onDeleteCard={deleteCard}
          onMoveCard={moveCard}
          onAddCard={handleAddCard}
          isModalOpen={cardSelectionModalOpen}
        />
      </div>

      <div className="flex justify-center px-0">
        <div className={`w-full transition-all duration-300 ${isDualPageMode && !isMobile ? 'overflow-x-auto' : 'md:max-w-[220mm]'}`}>
          {/* 角色卡区域 - 带相对定位 */}
          <div>
            {/* 页面标题 - 打印时隐藏 */}
            <div className={`print:hidden mb-3 text-center transition-all duration-300 ${isDualPageMode && !isMobile ? 'w-[425mm] min-w-[425mm]' : 'w-[210mm]'}`}>
              <SaveSwitcher
                characterList={characterList}
                currentCharacterId={currentCharacterId}
                onRenameCharacter={renameCharacterHandler}
              />
            </div>

            {/* 页面显示组件 */}
            <PageDisplay
              isDualPageMode={isDualPageMode}
              isMobile={isMobile}
              leftPageId={leftPageId}
              rightPageId={rightPageId}
              leftTabValue={leftTabValue}
              rightTabValue={rightTabValue}
              currentTabValue={currentTabValue}
              formData={formData}
              onSetLeftTab={setLeftTab}
              onSetRightTab={setRightTab}
              onSetCurrentTab={setCurrentTabValue}
              onSwitchToPrevPage={switchToPrevPage}
              onSwitchToNextPage={switchToNextPage}
            />

          </div>

          {/* 文字模式切换开关 - 胶囊型，在容器外右下角 */}
          <div className={`print:hidden mt-3 flex justify-end gap-3 transition-all duration-300 ${isDualPageMode && !isMobile ? 'w-[425mm] min-w-[425mm]' : 'w-[210mm]'}`}>
            <div
              className="bg-gray-200 dark:bg-gray-700 rounded-full p-0.5 shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg scale-90"
              onClick={toggleTextMode}
            >
              <div className="flex items-center">
                <div
                  className={`
                    px-2 py-1 rounded-full flex items-center gap-1 transition-all duration-300 text-xs
                    ${!isTextMode
                      ? 'bg-white dark:bg-gray-900 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  <ImageIcon />
                  <span className="font-medium">图片</span>
                </div>
                <div
                  className={`
                    px-2 py-1 rounded-full flex items-center gap-1 transition-all duration-300 text-xs
                    ${isTextMode
                      ? 'bg-white dark:bg-gray-900 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  <TextIcon />
                  <span className="font-medium">文字</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部功能按钮区域 */}
      <div className={`fixed left-0 right-0 z-30 print:hidden ${isMobile ? 'bottom-8' : 'bottom-4'
        }`}>
        <div className="flex justify-center">
          <div className="flex items-center gap-4 relative">
            {/* 双页模式切换按钮 - 绝对定位到最右边，仅桌面端显示 */}
            <div className="hidden md:block absolute right-[-60px]">
              <DualPageToggle />
            </div>
            <Button
              onClick={() => setIsCardDrawerOpen(!isCardDrawerOpen)}
              className={`bg-gray-800 hover:bg-gray-700 text-white rounded-full p-0 flex items-center justify-center ${isMobile ? 'w-14 h-14 text-lg' : 'w-12 h-12 text-base'
                }`}
            >
              🎴
            </Button>

            <Button
              onClick={toggleGuide}
              className={`bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap ${isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                }`}
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
                  className={`bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap ${isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                    }`}
                >
                  导出页面
                </Button>
              }
            >
              <HoverMenuItem 
                onClick={handlePrintAll}
              >
                打开导出预览界面
              </HoverMenuItem>
              <HoverMenuDivider />
              <HoverMenuItem 
                onClick={() => setSealDiceExportModalOpen(true)}
              >
                导出到骰子
              </HoverMenuItem>
              <HoverMenuItem 
                onClick={handleQuickExportJSON}
              >
                导出JSON
              </HoverMenuItem>
              <HoverMenuItem 
                onClick={handleQuickExportPDF}
              >
                导出PDF
              </HoverMenuItem>
              <HoverMenuItem 
                onClick={handleQuickExportHTML}
              >
                导出HTML
              </HoverMenuItem>

            </HoverMenu>

            {/* 存档管理按钮 */}
            <HoverMenu
              align="end"
              side="top"
              trigger={
                <Button
                  onClick={() => setCharacterManagementModalOpen(true)}
                  className={`bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap ${isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                    }`}
                >
                  存档管理
                </Button>
              }
            >
              <HoverMenuItem 
                onClick={() => setCharacterManagementModalOpen(true)}
              >
                打开存档管理器
              </HoverMenuItem>
              <HoverMenuDivider />
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
                从HTML导入
              </HoverMenuItem>
            </HoverMenu>

            <Button
              onClick={() => {
                navigateToPage('/card-manager');
              }}
              className={`bg-gray-800 text-white hover:bg-gray-700 focus:outline-none whitespace-nowrap ${isMobile ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
                }`}
            >
              卡包管理
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

      {/* 添加卡牌选择模态框 */}
      {pendingCardIndex !== null && (
        <CardSelectionModal
          isOpen={cardSelectionModalOpen}
          onClose={() => {
            setCardSelectionModalOpen(false);
            setPendingCardIndex(null);
            setPendingCardIsInventory(false);
          }}
          onSelect={handleCardSelect}
          selectedCardIndex={pendingCardIndex}
          activeTab={cardModalActiveTab}
          setActiveTab={setCardModalActiveTab}
          searchTerm={cardModalSearchTerm}
          setSearchTerm={setCardModalSearchTerm}
          selectedClasses={cardModalSelectedClasses}
          setSelectedClasses={setCardModalSelectedClasses}
          selectedLevels={cardModalSelectedLevels}
          setSelectedLevels={setCardModalSelectedLevels}
          selectedBatches={cardModalSelectedBatches}
          setSelectedBatches={setCardModalSelectedBatches}
        />
      )}

      {/* 骰子导出模态框 */}
      <SealDiceExportModal
        isOpen={sealDiceExportModalOpen}
        onClose={() => setSealDiceExportModalOpen(false)}
        sheetData={formData}
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
