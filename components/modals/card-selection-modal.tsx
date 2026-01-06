"use client"

import { useEffect, useMemo, useRef, useState } from "react" // Added useState
import InfiniteScroll from 'react-infinite-scroll-component';
import {
  getCardClassOptionsForType,  // 🚀 新增：按需计算优化
  getLevelOptions,
  getVariantSubclassOptions,
  getCardTypeName,
} from "@/card/index"
import { CardType } from "@/card"; // Add this import
import { StandardCard, ALL_CARD_TYPES, CardCategory, getCardTypesByCategory, isVariantType, isVariantCard } from "@/card/card-types"
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
  selectedBatches: string[];
  setSelectedBatches: React.Dispatch<React.SetStateAction<string[]>>;
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
  selectedBatches,
  setSelectedBatches,
}: CardSelectionModalProps) {
  const { isTextMode } = useTextModeStore()
  const [displayedCards, setDisplayedCards] = useState<StandardCard[]>([])
  const [hasMore, setHasMore] = useState(true)
  const scrollableContainerRef = useRef<HTMLDivElement>(null)
  const [classDropdownOpen, setClassDropdownOpen] = useState(false); // Add state for class dropdown
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false); // Add state for level dropdown
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false); // Add state for batch dropdown
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
  }, []); // 🚀 优化：卡牌类型列表是静态的，不需要依赖 subclassCountIndex

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

  // ⚡ Step 1: 统计卡包关键词（优化版 - 直接读取 customFieldDefinitions）
  const batchClassSet = useMemo(() => {
    if (selectedBatches.length === 0) return null;

    const classSet = new Set<string>();

    for (const batchId of selectedBatches) {
      const batch = cardStore.batches.get(batchId);
      if (!batch || batch.disabled) continue;

      // 🚀 直接读取元数据，无需遍历卡牌
      const classesForActiveTab = batch.customFieldDefinitions?.[activeTab];

      if (classesForActiveTab && Array.isArray(classesForActiveTab)) {
        classesForActiveTab.forEach(cls => {
          if (cls && cls !== '__no_subclass__') {
            classSet.add(cls);
          }
        });
      }
    }

    return classSet;
  }, [selectedBatches, activeTab, cardStore.batches]);

  // 等级统计（需要遍历卡牌，因为没有预处理的等级元数据）
  const batchLevelSet = useMemo(() => {
    if (selectedBatches.length === 0) return null;

    const levelSet = new Set<string>();

    for (const batchId of selectedBatches) {
      const batch = cardStore.batches.get(batchId);
      if (!batch || batch.disabled) continue;

      for (const cardId of batch.cardIds) {
        const card = cardStore.cards.get(cardId);
        if (!card || !card.level) continue;

        const cardType = isVariantCard(card)
          ? card.variantSpecial?.realType
          : card.type;

        if (cardType !== activeTab) continue;

        levelSet.add(card.level.toString());
      }
    }

    return levelSet;
  }, [selectedBatches, activeTab, cardStore.batches, cardStore.cards]);

  // Step 2-3: 获取全局关键词列表并求交集
  const classOptions = useMemo(() => {
    if (!activeTab) return []

    // Step 2: 获取全局关键词列表
    const allGlobalOptions = isVariantType(activeTab)
      ? getVariantSubclassOptions(activeTab)
      : getCardClassOptionsForType(activeTab);

    // 如果没有卡包筛选，直接返回全局列表
    if (!batchClassSet) {
      return allGlobalOptions;
    }

    // Step 3: 求交集 - 验证数据一致性
    // 只保留同时在卡包中存在且在全局索引中有效的关键词
    return allGlobalOptions.filter(option =>
      batchClassSet.has(option.value)
    );
  }, [activeTab, batchClassSet, cardStore.subclassCountIndex]);

  const levelOptions = useMemo(() => {
    // 获取全局等级选项
    const allGlobalOptions = isVariantType(activeTab)
      ? getLevelOptions(activeTab)
      : getLevelOptions(activeTab as CardType);

    // 如果没有卡包筛选，直接返回全局列表
    if (!batchLevelSet) {
      return allGlobalOptions;
    }

    // 求交集 - 只保留卡包中存在的等级
    return allGlobalOptions.filter(option =>
      batchLevelSet.has(option.value)
    );
  }, [activeTab, batchLevelSet]);

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
    if (!activeTab || !isOpen) {
      return [];
    }

    const isVariant = isVariantType(activeTab);
    const hasClassFilter = selectedClasses.length > 0 && classOptions.length > 0;
    const hasLevelFilter = selectedLevels.length > 0 && levelOptions.length > 0;
    const hasSearchTerm = !!debouncedSearchTerm;

    // 🚀 优化：只在有筛选条件时使用索引，否则直接用原始数组
    const shouldUseIndex = hasClassFilter || hasLevelFilter;

    if (!shouldUseIndex) {
      // 没有类别/等级筛选，直接对原始数组进行 variant/搜索过滤
      let filtered = cardsForActiveTab;

      if (!filtered.length) return [];

      // 合并 variant 和搜索过滤为单次遍历
      if (isVariant || hasSearchTerm) {
        const term = hasSearchTerm ? debouncedSearchTerm.toLowerCase() : '';

        filtered = filtered.filter(card => {
          // Variant 类型检查
          if (isVariant && card.variantSpecial?.realType !== activeTab) {
            return false;
          }

          // 搜索检查
          if (hasSearchTerm) {
            const matches =
              (card.name?.toLowerCase().includes(term)) ||
              (card.description?.toLowerCase().includes(term)) ||
              (card.cardSelectDisplay?.item1?.toLowerCase().includes(term)) ||
              (card.cardSelectDisplay?.item2?.toLowerCase().includes(term)) ||
              (card.cardSelectDisplay?.item3?.toLowerCase().includes(term));
            if (!matches) return false;
          }

          return true;
        });
      }

      return filtered;
    }

    // 🚀 Step 1: 使用索引快速获取候选卡牌 ID
    let candidateIds: Set<string> | null = null;

    // 类别筛选 - 使用 subclassCardIndex
    if (hasClassFilter) {
      if (!cardStore.subclassCardIndex) {
        console.warn('[CardSelectionModal] subclassCardIndex not initialized');
        return [];
      }

      const typeIndex = cardStore.subclassCardIndex[activeTab];
      if (!typeIndex) {
        // 这个类型在索引中不存在 = 没有卡牌
        return [];
      }

      // 🚀 优化：直接合并到 Set，避免 flatMap 创建中间数组
      candidateIds = new Set<string>();
      for (const cls of selectedClasses) {
        const ids = typeIndex[cls];
        if (ids) {
          for (const id of ids) {
            candidateIds.add(id);
          }
        }
      }

      if (candidateIds.size === 0) {
        // 选中的类别没有卡牌
        return [];
      }
    }

    // 等级筛选 - 使用 levelCardIndex
    if (hasLevelFilter) {
      if (!cardStore.levelCardIndex) {
        console.warn('[CardSelectionModal] levelCardIndex not initialized');
        return [];
      }

      const levelIndex = cardStore.levelCardIndex[activeTab];
      if (!levelIndex) {
        // 这个类型没有等级信息 = 没有卡牌
        return [];
      }

      if (candidateIds) {
        // 🚀 优化：构建等级 ID Set，然后遍历较小的集合计算交集
        const levelSet = new Set<string>();
        for (const lvl of selectedLevels) {
          const ids = levelIndex[lvl];
          if (ids) {
            for (const id of ids) {
              levelSet.add(id);
            }
          }
        }

        // 🚀 优化：遍历较小的集合
        if (levelSet.size < candidateIds.size) {
          // 等级集合较小，遍历等级集合
          const intersection = new Set<string>();
          for (const id of levelSet) {
            if (candidateIds.has(id)) {
              intersection.add(id);
            }
          }
          candidateIds = intersection;
        } else {
          // 类别集合较小或相等，遍历类别集合（原地删除）
          for (const id of candidateIds) {
            if (!levelSet.has(id)) {
              candidateIds.delete(id);
            }
          }
        }

        if (candidateIds.size === 0) {
          // 交集为空
          return [];
        }
      } else {
        // 只有等级筛选
        candidateIds = new Set<string>();
        for (const lvl of selectedLevels) {
          const ids = levelIndex[lvl];
          if (ids) {
            for (const id of ids) {
              candidateIds.add(id);
            }
          }
        }

        if (candidateIds.size === 0) {
          return [];
        }
      }
    }

    // 🚀 Step 2: 通过 ID 获取卡牌对象
    let filtered: StandardCard[];
    if (candidateIds) {
      // 从索引获取的 ID 集合中提取卡牌对象
      filtered = [];
      for (const id of candidateIds) {
        const card = cardStore.cards.get(id);
        if (card) {
          filtered.push(card);
        }
      }
    } else {
      // 没有类别/等级筛选，使用全部卡牌
      filtered = cardsForActiveTab;
    }

    // 🚀 Step 3: 应用其他过滤（variant 类型、搜索）- 合并为单次遍历
    if (isVariant || hasSearchTerm) {
      const term = hasSearchTerm ? debouncedSearchTerm.toLowerCase() : '';

      filtered = filtered.filter(card => {
        // Variant 类型检查
        if (isVariant && card.variantSpecial?.realType !== activeTab) {
          return false;
        }

        // 搜索检查
        if (hasSearchTerm) {
          const matches =
            (card.name?.toLowerCase().includes(term)) ||
            (card.description?.toLowerCase().includes(term)) ||
            (card.cardSelectDisplay?.item1?.toLowerCase().includes(term)) ||
            (card.cardSelectDisplay?.item2?.toLowerCase().includes(term)) ||
            (card.cardSelectDisplay?.item3?.toLowerCase().includes(term));
          if (!matches) return false;
        }

        return true;
      });
    }

    // Step 5: 应用卡包筛选 - 只保留属于选中卡包的卡牌
    if (selectedBatches.length > 0) {
      const batchSet = new Set(selectedBatches);
      filtered = filtered.filter(card =>
        card.batchId && batchSet.has(card.batchId)
      );
    }

    return filtered;
  }, [cardsForActiveTab, debouncedSearchTerm, selectedClasses, selectedLevels, selectedBatches, isOpen, activeTab,
      classOptions.length, levelOptions.length, cardStore.subclassCardIndex, cardStore.levelCardIndex]);

  // 🚀 优化：fullyFilteredCards 变化时更新显示状态
  useEffect(() => {
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
                  <div className={`grid gap-6 ${isTextMode
                    ? 'grid-cols-2 md:grid-cols-2 xl:grid-cols-3 justify-items-center md:justify-items-stretch'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center sm:justify-items-stretch'
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
