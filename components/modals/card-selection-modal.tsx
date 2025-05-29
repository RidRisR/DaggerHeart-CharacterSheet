"use client"

import { useState, useEffect, useMemo } from "react" // Removed useRef as it's no longer used directly here after previous changes
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
import { useDebounce } from "@/hooks/use-debounce"; // Import useDebounce

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
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search term

  // Filter states - initialize as empty, effects will populate them.
  const [selectedClasses, setSelectedClasses] = useState<{ values: string[], staged: boolean }>({ values: [], staged: false });
  const [selectedLevels, setSelectedLevels] = useState<{ values: string[], staged: boolean }>({ values: [], staged: false });
  const [filteredCards, setFilteredCards] = useState<StandardCard[]>([])

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
    }
  }, [isOpen, availableCardTypes]); // Removed activeTab dependency

  // Effect to set default filters when activeTab changes or is initialized
  useEffect(() => {
    if (activeTab) {
      // Initialize filters as "unselected"
      setSelectedClasses({
        values: [], // Empty array means no specific class is selected, so all should show initially
        staged: false
      });
      setSelectedLevels({
        values: [], // Empty array means no specific level is selected, so all should show initially
        staged: false
      });
    } else {
      // activeTab is not set (e.g. initial state before isOpen effect runs, or no available types)
      setSelectedClasses({ values: [], staged: false });
      setSelectedLevels({ values: [], staged: false });
    }
  }, [activeTab]); // Runs when activeTab changes

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

  useEffect(() => {
    if (!activeTab || !isOpen) {
      setFilteredCards([]);
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

      // Apply class filter
      if (classOptions.length > 0) {
        // If specific classes are selected (i.e., values array is not empty)
        if (selectedClasses.values.length > 0) {
          // Filter to include only cards whose class is in the selectedClasses.values
          filtered = filtered.filter((card) => card.class && selectedClasses.values.includes(card.class));
        }
        // If selectedClasses.values is empty, no class filter is applied, so all classes for the tab are shown.
      }


      // Apply level filter
      if (levelOptions.length > 0) {
        // If specific levels are selected (i.e., values array is not empty)
        if (selectedLevels.values.length > 0) {
          // Filter to include only cards whose level is in the selectedLevels.values
          filtered = filtered.filter((card) => card.level && selectedLevels.values.includes(card.level.toString()));
        }
        // If selectedLevels.values is empty, no level filter is applied, so all levels for the tab are shown.
      }

      // If no filters are applied (meaning, no specific selections made that would narrow down the list,
      // and no search term), and the default is to show all for the tab,
      // this part might need adjustment based on desired behavior when filters are "all selected".
      // The current logic above handles "all selected" by not applying a restrictive filter.
      // This specific block for clearing might be redundant or counterproductive if defaults are "all selected".
      // Let's re-evaluate the "no filters applied" condition.
      // If activeTab is set, cards are already filtered by tab.
      // If selectedClasses and selectedLevels are at their "all selected" state (full length),
      // and searchTerm is empty, then 'filtered' should remain as is (all cards for the tab).
      // This block seems to be for the case where filters are *cleared* to an empty state, not "all selected".
      // Given that the default is "all selected", this might lead to showing 0 cards if not careful.
      // For now, let's assume the above filtering logic is sufficient.
      // The original condition was:
      // if (
      //   selectedClasses.values.length === 0 && // This implies NO classes selected
      //   selectedLevels.values.length === 0 && // This implies NO levels selected
      //   !searchTerm
      // ) {
      //   filtered = [];
      // }
      // This should be fine: if the user deselects all classes AND all levels, show no cards.

      setFilteredCards(filtered);
    } catch (error) {
      console.error("[CardSelectionModal] Error filtering cards:", error); // Keep error logs
      setFilteredCards([]);
    }
  }, [cardsForActiveTab, debouncedSearchTerm, selectedClasses.values, selectedLevels.values, isOpen, activeTab]); // Use debouncedSearchTerm

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

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center gap-4">
              {/* Class Filter Dropdown */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSearchTerm(""); // Clear search term immediately
                    // Default filters will be set by the activeTab useEffect if activeTab is already set,
                    // or when activeTab changes. If activeTab is stable, we might need to re-trigger filter reset here.
                    // For now, relying on activeTab effect to set defaults.
                    // To ensure filters reset if activeTab doesn't change, explicitly set them:
                    if (activeTab) {
                      const defaultClasses = (CARD_CLASS_OPTIONS_BY_TYPE[activeTab as keyof typeof CARD_CLASS_OPTIONS_BY_TYPE] || [])
                        .map(opt => opt.value);
                      setSelectedClasses({
                        values: defaultClasses,
                        staged: false
                      });
                      const defaultLevels = getLevelOptions(activeTab).map(opt => opt.value);
                      setSelectedLevels({
                        values: defaultLevels,
                        staged: false
                      });
                    } else {
                      setSelectedClasses({ values: [], staged: false });
                      setSelectedLevels({ values: [], staged: false });
                    }
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

            <div className="flex-1 overflow-y-auto p-4">
              {/* Adjusted grid columns for wider cards to match SelectableCard's w-72 (288px) */}
              {/* Max-w-6xl (1152px) for modal content area. 1152 / 288 = 4 cards. (288*4) + (16*3) = 1152 + 48 = 1200 (a bit over, but close) */}
              {/* Consider the sidebar width (w-48, 192px). Total modal width is max-w-6xl. Content area is roughly 1152-192 = 960px */}
              {/* 960px / 288px = ~3.33 cards. So 3 cards is a good fit. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {filteredCards.length > 0 ? (
                  filteredCards.map((cardData, index) => {
                    if (!cardData.id) {
                      cardData.id = `temp-${index}-${Math.random().toString(36).substring(2, 11)}`
                    }

                    return (
                      <SelectableCard
                        key={cardData.id}
                        card={cardData}
                        onClick={() => handleSelectCard(cardData)} isSelected={false} />
                    )
                  })
                ) : (
                  <div className="col-span-full flex justify-center items-center h-40">
                    <p className="text-gray-500">没有找到符合条件的卡牌</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
