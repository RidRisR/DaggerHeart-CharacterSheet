"use client"

import { useState, useEffect, useMemo, useRef } from "react" // Added useRef
import InfiniteScroll from 'react-infinite-scroll-component'; // Import InfiniteScroll
import {
  ALL_CARD_TYPES,
  ALL_STANDARD_CARDS,
  CARD_CLASS_OPTIONS_BY_TYPE,
  getLevelOptions,
} from "@/data/card"
import type { StandardCard } from "@/data/card/card-types"
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

const ITEMS_PER_PAGE = 30; // Define batch size

interface CardSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (card: any) => void
  selectedCardIndex: number
}

export function CardSelectionModal({ isOpen, onClose, onSelect, selectedCardIndex }: CardSelectionModalProps) {

  const availableCardTypes = ALL_CARD_TYPES

  const [activeTab, setActiveTab] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [selectedClasses, setSelectedClasses] = useState<{ values: string[], staged: boolean }>({ values: [], staged: false });
  const [selectedLevels, setSelectedLevels] = useState<{ values: string[], staged: boolean }>({ values: [], staged: false });
  const [filteredCards, setFilteredCards] = useState<StandardCard[]>([])

  // State for infinite scroll
  const [displayedCards, setDisplayedCards] = useState<StandardCard[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedClasses.staged) {
          event.preventDefault();
          event.stopPropagation();
          setSelectedClasses((prev) => ({ ...prev, staged: false }));
        } else if (selectedLevels.staged) {
          event.preventDefault();
          event.stopPropagation();
          setSelectedLevels((prev) => ({ ...prev, staged: false }));
        } else if (isOpen) {
          // Only close modal if no dropdown was open
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, selectedClasses.staged, selectedLevels.staged, onClose]);

  // Effect to set initial activeTab when modal opens
  useEffect(() => {
    if (isOpen) {
      if (availableCardTypes.length > 0 && !activeTab) {
        const initialTab = availableCardTypes[0].id;
        setActiveTab(initialTab);
      }
      // Reset scroll and displayed cards when modal opens
      if (scrollableContainerRef.current) {
        scrollableContainerRef.current.scrollTop = 0;
      }
      setDisplayedCards(filteredCards.slice(0, ITEMS_PER_PAGE));
      setHasMore(filteredCards.length > ITEMS_PER_PAGE);
    }
  }, [isOpen, availableCardTypes]); // Keep filteredCards out to avoid loop, handle reset in filteredCards effect

  // Effect to set default filters when activeTab changes or is initialized
  useEffect(() => {
    if (activeTab) {
      setSelectedClasses({
        values: [], 
        staged: false
      });
      setSelectedLevels({
        values: [], 
        staged: false
      });
      // setSearchTerm(""); // Clearing search term here might be too aggressive if user just switches tabs
    } else {
      setSelectedClasses({ values: [], staged: false });
      setSelectedLevels({ values: [], staged: false });
    }
    // When activeTab changes, reset displayed cards and scroll
    if (scrollableContainerRef.current) {
      scrollableContainerRef.current.scrollTop = 0;
    }
    // setDisplayedCards will be reset by the main filtering useEffect's dependency on activeTab
  }, [activeTab]);

  const classOptions = useMemo(() => {
    return CARD_CLASS_OPTIONS_BY_TYPE[activeTab as keyof typeof CARD_CLASS_OPTIONS_BY_TYPE] || []
  }, [activeTab]);

  const levelOptions = useMemo(() => {
    return getLevelOptions(activeTab)
  }, [activeTab]);

  const cardsForActiveTab = useMemo(() => {
    if (!activeTab) return [];
    return ALL_STANDARD_CARDS.filter(card => {
      const cardTypeProcessed = (card.type || "unknown").replace(/卡$/, "");
      const activeTabProcessed = activeTab.replace(/卡$/, "");
      return cardTypeProcessed === activeTabProcessed;
    });
  }, [activeTab]);

  // Main filtering logic
  useEffect(() => {
    if (!activeTab || !isOpen) {
      setFilteredCards([]);
      setDisplayedCards([]);
      setHasMore(false);
      return;
    }

    try {
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
        if (selectedClasses.values.length > 0) {
          filtered = filtered.filter((card) => card.class && selectedClasses.values.includes(card.class));
        }
      }

      if (levelOptions.length > 0) {
        if (selectedLevels.values.length > 0) {
          filtered = filtered.filter((card) => card.level && selectedLevels.values.includes(card.level.toString()));
        }
      }

      setFilteredCards(filtered);
      // Reset for infinite scroll
      if (scrollableContainerRef.current) {
        scrollableContainerRef.current.scrollTop = 0;
      }
      setDisplayedCards(filtered.slice(0, ITEMS_PER_PAGE));
      setHasMore(filtered.length > ITEMS_PER_PAGE);

    } catch (error) {
      console.error("[CardSelectionModal] Error filtering cards:", error);
      setFilteredCards([]);
      setDisplayedCards([]);
      setHasMore(false);
    }
  }, [cardsForActiveTab, debouncedSearchTerm, selectedClasses.values, selectedLevels.values, isOpen, activeTab, classOptions.length, levelOptions.length]); // Added classOptions.length, levelOptions.length for robustness

  const fetchMoreData = () => {
    if (displayedCards.length >= filteredCards.length) {
      setHasMore(false);
      return;
    }
    // Simulate a delay for loading more items if needed, or directly update
    // setTimeout(() => {
    setDisplayedCards(prevDisplayedCards =>
      prevDisplayedCards.concat(
        filteredCards.slice(prevDisplayedCards.length, prevDisplayedCards.length + ITEMS_PER_PAGE)
      )
    );
    // }, 500); // Example delay
  };

  useEffect(() => {
    setHasMore(displayedCards.length < filteredCards.length);
  }, [displayedCards, filteredCards]);


  const handleSelectCard = (selectedCard: StandardCard) => {
    try {
      if (!selectedCard.type) {
        selectedCard.type = activeTab
      }

      onSelect(selectedCard)
      onClose()
    } catch (error) {
      console.error("[CardSelectionModal] Error selecting card:", error); // Keep error logs
    }
  }

  const handleClearSelection = () => {
    const emptyCard = createEmptyCard(); // Correctly invoke createEmptyCard
    onSelect(emptyCard);
    onClose();
  }

  if (!isOpen) return null

  const handleClassSelectAll = () => {
    const allClassValues = classOptions.map(opt => opt.value);
    setSelectedClasses((prev) => ({ ...prev, values: allClassValues }));
  };

  const handleClassInvertSelection = () => {
    const allClassValues = classOptions.map(opt => opt.value);
    setSelectedClasses(prev =>
      ({ ...prev, values: allClassValues.filter(val => !prev.values.includes(val)) })
    );
  };

  const handleLevelSelectAll = () => {
    const allLevelValues = levelOptions.map(opt => opt.value);
    setSelectedLevels((prev) => ({ ...prev, values: allLevelValues }));
  };

  const handleLevelInvertSelection = () => {
    const allLevelValues = levelOptions.map(opt => opt.value);
    setSelectedLevels(prev =>
      ({ ...prev, values: allLevelValues.filter(val => !prev.values.includes(val)) })
    );
  };

  const positionTitle = `选择卡牌 #${selectedCardIndex + 1}`

  // Define the dropdown open change handlers at the top level of the component
  const handleClassDropdownOpenChange = (open: boolean) => {
    setSelectedClasses((prev) => ({ ...prev, staged: open }));
  };

  const handleLevelDropdownOpenChange = (open: boolean) => {
    setSelectedLevels((prev) => ({ ...prev, staged: open }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
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
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="flex flex-col p-2">
              {availableCardTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`text-left px-4 py-2 rounded ${activeTab === type.id ? "bg-gray-200" : "hover:bg-gray-100"
                    }`}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    // Reset filters to "unselected" (empty arrays)
                    setSelectedClasses({ values: [], staged: false });
                    setSelectedLevels({ values: [], staged: false });
                    // The main filtering useEffect will handle resetting displayedCards and scroll
                  }}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-400 whitespace-nowrap"
                >
                  重置筛选
                </button>
                <span className="text-sm font-medium">类别:</span>
                <DropdownMenu
                  open={selectedClasses.staged}
                  onOpenChange={handleClassDropdownOpenChange} // Use the defined handler
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-36 justify-start text-left font-normal">
                      {
                        classOptions.length === 0
                          ? "无类别"
                          : selectedClasses.values.length === classOptions.length
                            ? "全部类别"
                            : selectedClasses.values.length === 0
                              ? "未选类别"
                              : selectedClasses.values.length === 1
                                ? classOptions.find(o => o.value === selectedClasses.values[0])?.label || "选择类别"
                                : `${selectedClasses.values.length} 类已选`
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
                          checked={selectedClasses.values.includes(option.value)}
                          onCheckedChange={(checked) => {
                            setSelectedClasses(prev => {
                              const newValues = checked
                                ? [...prev.values, option.value]
                                : prev.values.filter(v => v !== option.value);
                              return { ...prev, values: newValues };
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
                  open={selectedLevels.staged}
                  onOpenChange={handleLevelDropdownOpenChange} // Use the defined handler
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-36 justify-start text-left font-normal">
                      {
                        levelOptions.length === 0
                          ? "无等级"
                          : selectedLevels.values.length === levelOptions.length
                            ? "全部等级"
                            : selectedLevels.values.length === 0
                              ? "未选等级"
                              : selectedLevels.values.length === 1
                                ? levelOptions.find(o => o.value === selectedLevels.values[0])?.label || "选择等级"
                                : `${selectedLevels.values.length} 级已选`
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
                          checked={selectedLevels.values.includes(option.value)}
                          onCheckedChange={(checked) => {
                            setSelectedLevels(prev => {
                              const newValues = checked
                                ? [...prev.values, option.value]
                                : prev.values.filter(v => v !== option.value);
                              return { ...prev, values: newValues };
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
                <input
                  type="text"
                  placeholder="搜索卡牌..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-flex border border-gray-300 rounded px-3 py-1"
                />
              </div>
            </div>

            {/* Card List - Scrollable Area */}
            <div
              id="scrollableCardList" // ID for InfiniteScroll target
              ref={scrollableContainerRef} // Ref for manual scroll reset
              className="flex-1 overflow-y-auto p-4"
            >
              <InfiniteScroll
                dataLength={displayedCards.length}
                next={fetchMoreData}
                hasMore={hasMore}
                loader={<div className="col-span-full text-center p-4"><h4>加载中...</h4></div>}
                endMessage={
                  <div className="col-span-full text-center p-4">
                    <p>{filteredCards.length > 0 ? "已加载全部卡牌" : ""}</p> {/* Avoid showing message if no cards initially */}
                  </div>
                }
                scrollableTarget="scrollableCardList"
              // className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4" // Apply grid to the direct child
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                  {displayedCards.length > 0 ? (
                    displayedCards.map((cardData, index) => {
                      if (!cardData.id) {
                        // Ensure unique key if id is missing, though ideally all cards should have stable IDs
                        cardData.id = `temp-${activeTab}-${index}-${Math.random().toString(36).substring(2, 11)}`
                      }
                      return (
                        <SelectableCard
                          key={cardData.id} // Use a truly unique and stable key
                          card={cardData}
                          onClick={() => handleSelectCard(cardData)} isSelected={false} />
                      )
                    })
                  ) : (
                      !hasMore && filteredCards.length === 0 && // Only show "no cards" if not loading and filtered is empty
                    <div className="col-span-full flex justify-center items-center h-40">
                      <p className="text-gray-500">没有找到符合条件的卡牌</p>
                    </div>
                  )}
                </div>
              </InfiniteScroll>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
