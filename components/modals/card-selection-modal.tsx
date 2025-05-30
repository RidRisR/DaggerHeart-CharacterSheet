"use client"

import { useEffect, useMemo, useRef, useState } from "react" // Added useState
import InfiniteScroll from 'react-infinite-scroll-component';
import {
  ALL_CARD_TYPES,
  CARD_CLASS_OPTIONS_BY_TYPE,
  getLevelOptions,
} from "@/data/card/card-ui-config"
import { getStandardCardsByType, CardType } from "@/data/card"; // Add this import
import { StandardCard } from "@/data/card/card-types"
import { createEmptyCard } from "@/data/card/card-types"
import { SelectableCard } from "@/components/ui/selectable-card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce";

const ITEMS_PER_PAGE = 30;

interface CardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (card: any) => void
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
  const [displayedCards, setDisplayedCards] = useState<StandardCard[]>([])
  const [filteredCards, setFilteredCards] = useState<StandardCard[]>([]) // Add state for filtered cards
  const [hasMore, setHasMore] = useState(true)
  const scrollableContainerRef = useRef<HTMLDivElement>(null)
  const [classDropdownOpen, setClassDropdownOpen] = useState(false); // Add state for class dropdown
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false); // Add state for level dropdown

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const availableCardTypes = ALL_CARD_TYPES; // Define availableCardTypes

  // Effect to set a default active tab when the modal opens and no tab is active
  useEffect(() => {
    if (isOpen && !activeTab && availableCardTypes.length > 0) {
      setActiveTab(availableCardTypes[0].id); // Set to the first available type
    }
  }, [isOpen, activeTab, setActiveTab, availableCardTypes]);

  const handleTabChange = (tabId: string) => { // Define handleTabChange
    setActiveTab(tabId);
    // Reset filters when tab changes
    setSearchTerm("");
    setSelectedClasses([]);
    setSelectedLevels([]);
    setClassDropdownOpen(false);
    setLevelDropdownOpen(false);
  };

  const classOptions = useMemo(() => {
    if (!activeTab) return []
    return CARD_CLASS_OPTIONS_BY_TYPE[activeTab as keyof typeof CARD_CLASS_OPTIONS_BY_TYPE] || []
  }, [activeTab]);

  const levelOptions = useMemo(() => {
    return getLevelOptions(activeTab)
  }, [activeTab]);

  const cardsForActiveTab = useMemo(() => {
    if (!activeTab) return [];
    // Use getStandardCardsByType for efficiency.
    // Assumes activeTab is a clean type ID like "profession", "domain", etc.
    // and card.type is also a clean type ID.
    return getStandardCardsByType(activeTab as CardType); // Cast activeTab to CardType
  }, [activeTab]);

  const fullyFilteredCards = useMemo(() => {
    if (!activeTab || !isOpen) {
      return [];
    }
    let filtered = cardsForActiveTab;

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          (card.name && card.name.toLowerCase().includes(term)) ||
          (card.description && card.description.toLowerCase().includes(term)) ||
          (card.cardSelectDisplay?.item1 && card.cardSelectDisplay.item1.toLowerCase().includes(term)) ||
          (card.cardSelectDisplay?.item2 && card.cardSelectDisplay.item2.toLowerCase().includes(term)) ||
          (card.cardSelectDisplay?.item3 && card.cardSelectDisplay.item3.toLowerCase().includes(term))
      );
    }

    if (classOptions.length > 0) {
      if (selectedClasses.length > 0) {
        filtered = filtered.filter((card) => card.class && selectedClasses.includes(card.class));
      }
    }

    if (levelOptions.length > 0) {
      if (selectedLevels.length > 0) {
        filtered = filtered.filter((card) => card.level && selectedLevels.includes(card.level.toString()));
      }
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
    const allClassValues = classOptions.map(opt => opt.value);
    setSelectedClasses(allClassValues);
  };

  const handleClassInvertSelection = () => {
    const allClassValues = classOptions.map(opt => opt.value);
    setSelectedClasses(prev => allClassValues.filter(val => !prev.includes(val)));
  };

  const handleLevelSelectAll = () => {
    const allLevelValues = levelOptions.map(opt => opt.value);
    setSelectedLevels(allLevelValues);
  };

  const handleLevelInvertSelection = () => {
    const allLevelValues = levelOptions.map(opt => opt.value);
    setSelectedLevels(prev => allLevelValues.filter(val => !prev.includes(val)));
  };

  const positionTitle = `选择卡牌 #${selectedCardIndex + 1}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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
              {availableCardTypes.map((type: { id: string; name: string }) => ( // Add type for 'type'
                <button
                  key={type.id}
                  onClick={() => handleTabChange(type.id)} // Use new handler
                  className={`text-left px-4 py-2 rounded ${activeTab === type.id ? "bg-gray-200" : "hover:bg-gray-100"}`}
                >
                  {type.name}
                </button>
              ))}
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
                                ? classOptions.find(o => o.value === selectedClasses[0])?.label || "选择类别"
                                : `${selectedClasses.length} 类已选`
                      }
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="start">
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                      <Button onClick={handleClassSelectAll} variant="ghost" size="sm" className="w-full justify-start">全选</Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                      <Button onClick={handleClassInvertSelection} variant="ghost" size="sm" className="w-full justify-start">反选</Button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {classOptions.map((option) => (
                      <DropdownMenuItem key={option.value} onSelect={(e) => e.preventDefault()}>
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
                        <label htmlFor={`class-${option.value}`} className="ml-2 cursor-pointer select-none">
                          {option.label}
                        </label>
                      </DropdownMenuItem>
                    ))}
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
                  <DropdownMenuContent className="w-56" align="start">
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                      <Button onClick={handleLevelSelectAll} variant="ghost" size="sm" className="w-full justify-start">全选</Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                      <Button onClick={handleLevelInvertSelection} variant="ghost" size="sm" className="w-full justify-start">反选</Button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {levelOptions.map((option) => (
                      <DropdownMenuItem key={option.value} onSelect={(e) => e.preventDefault()}>
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
                        <label htmlFor={`level-${option.value}`} className="ml-2 cursor-pointer select-none">
                          {option.label}
                        </label>
                      </DropdownMenuItem>
                    ))}
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

            <div id="scrollableDiv" ref={scrollableContainerRef} className="flex-1 overflow-y-auto p-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {displayedCards.map((card: StandardCard, index: number) => ( // Added types for card and index
                    <SelectableCard
                      key={`${card.id}-${index}`}
                      card={card}
                      onClick={() => handleSelectCard(card)} // Changed onSelect to onClick
                      isSelected={false} // Assuming a default or placeholder for isSelected
                    />
                  ))}
                </div>
              </InfiniteScroll>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
