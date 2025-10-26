"use client"

import { useEffect, useMemo, useRef, useState } from "react" // Added useState
import InfiniteScroll from 'react-infinite-scroll-component';
import {
  getCardClassOptionsByType,
  getCardClassOptionsForType,  // 🚀 新增：按需计算优化
  getLevelOptions,
  getVariantSubclassOptions,
  getCardTypeName,
} from "@/card/index"
import { CardType } from "@/card"; // Add this import
import { StandardCard, ALL_CARD_TYPES, CardCategory, getCardTypesByCategory, isVariantType } from "@/card/card-types"
import { createEmptyCard } from "@/card/card-types"
import { ImageCard } from "@/components/ui/image-card"
import { SelectableCard } from "@/components/ui/selectable-card"
import { useTextModeStore } from "@/lib/text-mode-store"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce";
import { useUnifiedCardStore } from "@/card/stores/unified-card-store";

const ITEMS_PER_PAGE = 30;

interface CardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (card: StandardCard) => void
  selectedCardIndex: number
  // Add the lifted state and setters as props
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  selectedClasses: string[];
  setSelectedClasses: React.Dispatch<React.SetStateAction<string[]>>;
  selectedLevels: string[];
  setSelectedLevels: React.Dispatch<React.SetStateAction<string[]>>;
}

export function CardSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedCardIndex,
  // Destructure the new props
  activeTab,
  setActiveTab,
  searchTerm,
  setSearchTerm,
  selectedClasses,
  setSelectedClasses,
  selectedLevels,
  setSelectedLevels,
}: CardSelectionModalProps) {
  const { isTextMode } = useTextModeStore()
  const [displayedCards, setDisplayedCards] = useState<StandardCard[]>([])
  const [filteredCards, setFilteredCards] = useState<StandardCard[]>([]) // Add state for filtered cards
  const [hasMore, setHasMore] = useState(true)
  const scrollableContainerRef = useRef<HTMLDivElement>(null)
  const [classDropdownOpen, setClassDropdownOpen] = useState(false); // Add state for class dropdown
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false); // Add state for level dropdown
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false); // Add state for source dropdown
  const [refreshTrigger, setRefreshTrigger] = useState(0); // 用于触发卡牌刷新动画

  // Add category state management
  const [expandedCategories, setExpandedCategories] = useState(new Set(['standard', 'extended'])); // Default: both expanded

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // 使用 unified-card-store 直接获取卡牌数据
  const cardStore = useUnifiedCardStore();

  // Group card types by category
  const cardTypesByCategory = useMemo(() => {
    // 定义期望的顺序
    const desiredOrder = [
      CardType.Domain,      // 领域
      CardType.Profession,  // 职业
      CardType.Subclass,    // 子职业
      CardType.Ancestry,    // 种族
      CardType.Community,   // 社群
    ];

    let standard = getCardTypesByCategory(CardCategory.Standard);
    const extended = getCardTypesByCategory(CardCategory.Extended);

    // 对 standard 数组进行排序
    standard.sort((a, b) => {
      const indexA = desiredOrder.indexOf(a as CardType);
      const indexB = desiredOrder.indexOf(b as CardType);

      // 如果 a 和 b 都在期望顺序中，按期望顺序排
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // 如果只有 a 在期望顺序中，a 排在前面
      if (indexA !== -1) {
        return -1;
      }
      // 如果只有 b 在期望顺序中，b 排在前面
      if (indexB !== -1) {
        return 1;
      }
      // 如果都不在，保持原有相对顺序（或按字母顺序）
      return a.localeCompare(b);
    });

    return { standard, extended };
  }, [cardStore.subclassCountIndex]);

  // Effect to set a default active tab when the modal opens and no tab is active
  useEffect(() => {
    if (isOpen && !activeTab) {
      // Default to the first standard card type
      const standardTypes = cardTypesByCategory.standard;
      if (standardTypes.length > 0) {
        setActiveTab(standardTypes[0]);
      }
    }
  }, [isOpen, activeTab, setActiveTab, cardTypesByCategory.standard]);

  // ESC键关闭模态框
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const classOptions = useMemo(() => {
    if (!activeTab) return []

    // 如果是变体类型，返回该类型的子类别作为class选项
    if (isVariantType(activeTab)) {
      return getVariantSubclassOptions(activeTab);
    }

    // 🚀 优化：按需计算当前类型的选项，而不是计算所有 5 种类型
    return getCardClassOptionsForType(activeTab);
  }, [activeTab, cardStore.subclassCountIndex]); // ✅ 添加 subclassCountIndex 作为依赖，确保数据更新时重新计算

  const levelOptions = useMemo(() => {
    // 如果是变体类型，返回该变体类型的等级选项
    if (isVariantType(activeTab)) {
      return getLevelOptions(activeTab);
    }

    // 否则返回标准卡牌类型的等级选项
    return getLevelOptions(activeTab as CardType)
  }, [activeTab]);

  const cardsForActiveTab = useMemo(() => {
    if (!activeTab || !cardStore.initialized) return [];
    const targetType = isVariantType(activeTab) ? CardType.Variant : (activeTab as CardType);
    return cardStore.loadCardsByType(targetType);
  }, [activeTab, cardStore.initialized, cardStore.loadCardsByType]);
  
  // 使用真实的加载状态
  const cardsLoading = cardStore.loading;
  const cardsError = cardStore.error;

  const fullyFilteredCards = useMemo(() => {
    // 提前检查必要条件
    if (!activeTab || !isOpen || !cardsForActiveTab.length) {
      return [];
    }
    
    let filtered = cardsForActiveTab;

    // 如果当前选中的是variant类型，需要按照真实的variant类型过滤
    if (isVariantType(activeTab)) {
      // 只显示匹配当前variant类型的卡牌
      filtered = filtered.filter(card => {
        // 对于variant卡牌，检查variantSpecial.realType是否匹配当前选中的variant类型
        return card.variantSpecial?.realType === activeTab;
      });
      // 如果过滤后没有卡牌，提前返回
      if (filtered.length === 0) return [];
    }

    // 搜索过滤
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((card) => {
        // 优化：使用短路求值，一旦匹配就返回
        return (card.name?.toLowerCase().includes(term)) ||
               (card.description?.toLowerCase().includes(term)) ||
               (card.cardSelectDisplay?.item1?.toLowerCase().includes(term)) ||
               (card.cardSelectDisplay?.item2?.toLowerCase().includes(term)) ||
               (card.cardSelectDisplay?.item3?.toLowerCase().includes(term));
      });
      // 如果搜索后没有结果，提前返回
      if (filtered.length === 0) return [];
    }

    // 类别过滤
    if (selectedClasses.length > 0 && classOptions.length > 0) {
      if (isVariantType(activeTab)) {
        filtered = filtered.filter((card) =>
          card.variantSpecial?.subCategory && selectedClasses.includes(card.variantSpecial.subCategory)
        );
      } else {
        filtered = filtered.filter((card) => card.class && selectedClasses.includes(card.class));
      }
      // 如果类别过滤后没有结果，提前返回
      if (filtered.length === 0) return [];
    }

    // 等级过滤
    if (selectedLevels.length > 0 && levelOptions.length > 0) {
      filtered = filtered.filter((card) => card.level && selectedLevels.includes(card.level.toString()));
    }
    
    return filtered;
  }, [cardsForActiveTab, debouncedSearchTerm, selectedClasses, selectedLevels, isOpen, activeTab, classOptions.length, levelOptions.length]);

  useEffect(() => {
    setFilteredCards(fullyFilteredCards);
    if (scrollableContainerRef.current) {
      scrollableContainerRef.current.scrollTop = 0;
    }
    setDisplayedCards(fullyFilteredCards.slice(0, ITEMS_PER_PAGE));
    setHasMore(fullyFilteredCards.length > ITEMS_PER_PAGE);
    // 触发卡牌刷新动画
    setRefreshTrigger(prev => prev + 1);
  }, [fullyFilteredCards]);

  const fetchMoreData = () => {
    if (displayedCards.length >= fullyFilteredCards.length) {
      setHasMore(false);
      return;
    }
    // Ensure displayedCards and fullyFilteredCards are correctly typed
    const newDisplayedCards = displayedCards.concat(
      fullyFilteredCards.slice(displayedCards.length, displayedCards.length + ITEMS_PER_PAGE)
    );
    setDisplayedCards(newDisplayedCards);
    setHasMore(newDisplayedCards.length < fullyFilteredCards.length);
  };

  const handleSelectCard = (selectedCard: StandardCard) => { // Ensure selectedCard is StandardCard
    try {
      if (!selectedCard.type) {
        selectedCard.type = activeTab
      }
      onSelect(selectedCard)
      onClose()
    } catch (error) {
      console.error("[CardSelectionModal] Error selecting card:", error);
    }
  }

  const handleClearSelection = () => {
    const emptyCard = createEmptyCard();
    onSelect(emptyCard);
    onClose();
  }

  if (!isOpen) return null

  const handleClassSelectAll = () => {
    const allClassValues = classOptions.map((opt: any) => opt.value);
    setSelectedClasses(allClassValues);
  };

  const handleClassInvertSelection = () => {
    const allClassValues = classOptions.map((opt: any) => opt.value);
    setSelectedClasses(prev => allClassValues.filter((val: any) => !prev.includes(val)));
  };

  const handleLevelSelectAll = () => {
    const allLevelValues = levelOptions.map(opt => opt.value);
    setSelectedLevels(allLevelValues);
  };

  const handleLevelInvertSelection = () => {
    const allLevelValues = levelOptions.map(opt => opt.value);
    setSelectedLevels(prev => allLevelValues.filter(val => !prev.includes(val)));
  };

  // Add category toggle function
  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Reset filters when tab changes
    setSearchTerm("");
    setSelectedClasses([]);
    setSelectedLevels([]);
    setClassDropdownOpen(false);
    setLevelDropdownOpen(false);
  };

  const positionTitle = `选择卡牌 #${selectedCardIndex + 1}`

  // 如果正在加载，显示加载状态
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">{positionTitle}</h2>
            <button
              onClick={handleClearSelection}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              清除选择
            </button>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="flex flex-col p-2">
              {/* Standard Category */}
              <div className="mb-2">
                <button
                  onClick={() => toggleCategoryExpansion('standard')}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
                >
                  <span>标准卡牌</span>
                  <span className={`transform transition-transform ${expandedCategories.has('standard') ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                </button>
                {expandedCategories.has('standard') && (
                  <div className="ml-2 mt-1 space-y-1">
                    {cardTypesByCategory.standard.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleTabChange(type)}
                        className={`w-full text-left px-4 py-2 text-sm rounded ${activeTab === type ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-gray-100 text-gray-600"}`}
                      >
                        {ALL_CARD_TYPES.get(type) || type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Extended Category */}
              <div className="mb-2">
                <button
                  onClick={() => toggleCategoryExpansion('extended')}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
                >
                  <span>扩展卡牌</span>
                  <span className={`transform transition-transform ${expandedCategories.has('extended') ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                </button>
                {expandedCategories.has('extended') && (
                  <div className="ml-2 mt-1 space-y-1">
                    {cardTypesByCategory.extended.map((type) => (
                      <button
                        key={type}
                        onClick={() => handleTabChange(type)}
                        className={`w-full text-left px-4 py-2 text-sm rounded ${activeTab === type ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-gray-100 text-gray-600"}`}
                      >
                        {getCardTypeName(type)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedClasses([]);
                    setSelectedLevels([]);
                    setClassDropdownOpen(false); // Reset dropdown state
                    setLevelDropdownOpen(false); // Reset dropdown state
                  }}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-400 whitespace-nowrap"
                >
                  重置筛选
                </button>
                <span className="text-sm font-medium">类别:</span>
                <DropdownMenu
                  open={classDropdownOpen}
                  onOpenChange={setClassDropdownOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-36 justify-start text-left font-normal">
                      {
                        classOptions.length === 0
                          ? "无类别"
                          : selectedClasses.length === classOptions.length
                            ? "全部类别"
                            : selectedClasses.length === 0
                              ? "未选类别"
                              : selectedClasses.length === 1
                                ? classOptions.find((o: any) => o.value === selectedClasses[0])?.label || "选择类别"
                                : `${selectedClasses.length} 类已选`
                      }
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52" align="start">
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                      <Button onClick={handleClassSelectAll} variant="ghost" size="sm" className="w-full justify-start">全选</Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                      <Button onClick={handleClassInvertSelection} variant="ghost" size="sm" className="w-full justify-start">反选</Button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-64">
                      {classOptions.map((option: any) => (
                        <DropdownMenuItem
                          key={option.value}
                          onSelect={(e) => e.preventDefault()}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center w-full">
                            <Checkbox
                              id={`class-${option.value}`}
                              checked={selectedClasses.includes(option.value)}
                              onCheckedChange={(checked) => {
                                setSelectedClasses(prev => {
                                  return checked
                                    ? [...prev, option.value]
                                    : prev.filter(v => v !== option.value);
                                });
                              }}
                            />
                            <label htmlFor={`class-${option.value}`} className="ml-2 cursor-pointer select-none flex-1">
                              {option.label}
                            </label>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-sm font-medium">等级:</span>
                <DropdownMenu
                  open={levelDropdownOpen}
                  onOpenChange={setLevelDropdownOpen}
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-36 justify-start text-left font-normal">
                      {
                        levelOptions.length === 0
                          ? "无等级"
                          : selectedLevels.length === levelOptions.length
                            ? "全部等级"
                            : selectedLevels.length === 0
                              ? "未选等级"
                              : selectedLevels.length === 1
                                ? levelOptions.find(o => o.value === selectedLevels[0])?.label || "选择等级"
                                : `${selectedLevels.length} 级已选`
                      }
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-52" align="start">
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                      <Button onClick={handleLevelSelectAll} variant="ghost" size="sm" className="w-full justify-start">全选</Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                      <Button onClick={handleLevelInvertSelection} variant="ghost" size="sm" className="w-full justify-start">反选</Button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-48">
                      {levelOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onSelect={(e) => e.preventDefault()}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center w-full">
                            <Checkbox
                              id={`level-${option.value}`}
                              checked={selectedLevels.includes(option.value)}
                              onCheckedChange={(checked) => {
                                setSelectedLevels(prev => {
                                  return checked
                                    ? [...prev, option.value]
                                    : prev.filter(v => v !== option.value);
                                });
                              }}
                            />
                            <label htmlFor={`level-${option.value}`} className="ml-2 cursor-pointer select-none flex-1">
                              {option.label}
                            </label>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <input
                type="text"
                placeholder="搜索卡牌名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-2 border border-gray-300 rounded-md w-full"
              />
            </div>

            <div id="scrollableDiv" ref={scrollableContainerRef} className="flex-1 overflow-y-auto p-4 pb-8">
              {/* 显示加载状态 */}
              {cardsLoading && (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-lg">加载卡牌中...</div>
                    <div className="text-sm text-gray-500">请稍候</div>
                  </div>
                </div>
              )}

              {/* 显示错误状态 */}
              {cardsError && !cardsLoading && (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center text-red-600">
                    <div className="text-lg">加载失败</div>
                    <div className="text-sm">{cardsError}</div>
                  </div>
                </div>
              )}

              {/* 显示卡牌内容 */}
              {!cardsLoading && !cardsError && (
                <InfiniteScroll
                  dataLength={displayedCards.length}
                  next={fetchMoreData}
                  hasMore={hasMore}
                  loader={<div className="text-center py-4">加载中...</div>}
                  endMessage={
                    <p style={{ textAlign: 'center' }} className="py-4">
                      <b>{fullyFilteredCards.length > 0 ? "已加载全部卡牌" : "未找到符合条件的卡牌"}</b>
                    </p>
                  }
                  scrollableTarget="scrollableDiv"
                  scrollThreshold="800px"
                >
                  <div className={`grid gap-4 justify-items-center ${isTextMode
                    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    }`}>
                    {displayedCards.map((card: StandardCard, index: number) => {
                      return isTextMode ? (
                        <SelectableCard
                          key={`${card.id}-${index}`}
                          card={card}
                          onClick={() => handleSelectCard(card)}
                          isSelected={false}
                        />
                      ) : (
                        <ImageCard
                          key={`${card.id}-${index}`}
                          card={card}
                          onClick={() => handleSelectCard(card)}
                          isSelected={false}
                          priority={index < 6}
                          refreshTrigger={refreshTrigger}
                        />
                      );
                    })}
                  </div>
                </InfiniteScroll>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
