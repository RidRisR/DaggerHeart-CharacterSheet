"use client"

import { useState, useEffect, useMemo, useRef } from "react" // Added useRef
import {
  ALL_CARD_TYPES,
  ALL_STANDARD_CARDS,
  CARD_CLASS_OPTIONS_BY_TYPE,
  getLevelOptions, // Added
} from "@/data/card"
import type { StandardCard } from "@/data/card/card-types"
import { createEmptyCard } from "@/data/card/card-types"
import { SelectableCard } from "@/components/ui/selectable-card"
import { Checkbox } from "@/components/ui/checkbox" // Added
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu" // Added
import { Button } from "@/components/ui/button" // Added

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
      console.log("[Effect isOpen] Modal is open.");
      if (availableCardTypes.length > 0 && !activeTab) {
        const initialTab = availableCardTypes[0].id;
        console.log("[Effect isOpen] Setting initial activeTab to:", initialTab);
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, availableCardTypes]); // Removed activeTab dependency

  // Effect to set default filters when activeTab changes or is initialized
  useEffect(() => {
    if (activeTab) {
      console.log("[Effect activeTab] ActiveTab is now:", activeTab, ". Setting default filters.");
      const defaultClasses = (CARD_CLASS_OPTIONS_BY_TYPE[activeTab as keyof typeof CARD_CLASS_OPTIONS_BY_TYPE] || [])
        .map(opt => opt.value);
      console.log("[Effect activeTab] Default class options for new tab:", defaultClasses);
      setSelectedClasses({
        values: defaultClasses,
        staged: false
      });

      const defaultLevels = getLevelOptions(activeTab).map(opt => opt.value);
      console.log("[Effect activeTab] Default level options for new tab:", defaultLevels);
      setSelectedLevels({
        values: defaultLevels,
        staged: false
      });
      setSearchTerm(""); // Reset search term when tab changes
    } else {
      // activeTab is not set (e.g. initial state before isOpen effect runs, or no available types)
      console.log("[Effect activeTab] ActiveTab is not set. Clearing filters.");
      setSelectedClasses({ values: [], staged: false });
      setSelectedLevels({ values: [], staged: false });
      setSearchTerm("");
    }
  }, [activeTab]); // Runs when activeTab changes

  const classOptions = useMemo(() =>
    CARD_CLASS_OPTIONS_BY_TYPE[activeTab as keyof typeof CARD_CLASS_OPTIONS_BY_TYPE] ||
    // Ensure "all" is only added if classOptions would otherwise be empty or specifically designed to have it.
    // For now, we assume CARD_CLASS_OPTIONS_BY_TYPE provides the full list including any "all" type options if necessary.
    (CARD_CLASS_OPTIONS_BY_TYPE[activeTab as keyof typeof CARD_CLASS_OPTIONS_BY_TYPE]?.length > 0
      ? []
      : [{ value: "all", label: "全部" }])
    , [activeTab]);

  // Use CARD_LEVEL_OPTIONS_BY_TYPE for level dropdown rendering
  const levelOptions = useMemo(() => getLevelOptions(activeTab), [activeTab]);

  useEffect(() => {
    if (!activeTab || !isOpen) {
      setFilteredCards([]); // Clear cards if tab is not set or modal is closed
      return;
    }

    try {
      let filtered = ALL_STANDARD_CARDS.filter((card) => {
        if (!card.type) {
          card.type = "unknown"; // Assign a default if type is missing
        }
        const cardTypeProcessed = card.type.replace(/卡$/, "");
        const activeTabProcessed = activeTab.replace(/卡$/, "");

        return cardTypeProcessed === activeTabProcessed;
      });

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
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
      if (selectedClasses.values.length > 0 && !selectedClasses.values.includes("all")) {
        filtered = filtered.filter((card) => card.class && selectedClasses.values.includes(card.class));
      }

      // Apply level filter
      if (selectedLevels.values.length > 0 && !selectedLevels.values.includes("all")) {
        filtered = filtered.filter((card) => card.level && selectedLevels.values.includes(card.level.toString()));
      }

      // If no filters are applied, clear the filtered cards
      if (
        selectedClasses.values.length === 0 &&
        selectedLevels.values.length === 0 &&
        !searchTerm
      ) {
        filtered = [];
      }

      setFilteredCards(filtered);
    } catch (error) {
      console.error("[CardSelectionModal] 过滤卡牌时出错:", error);
      setFilteredCards([]);
    }
  }, [activeTab, searchTerm, selectedClasses.values, selectedLevels.values, isOpen])

  const handleSelectCard = (selectedCard: StandardCard) => {
    try {
      if (!selectedCard.type) {
        selectedCard.type = activeTab
      }

      onSelect(selectedCard)
      onClose()
    } catch (error) {
      console.error("[CardSelectionModal] 选择卡牌时出错:", error)
    }
  }

  const handleClearSelection = () => {
    const emptyCard = createEmptyCard(); // Correctly invoke createEmptyCard
    onSelect(emptyCard);
    onClose();
  }

  if (!isOpen) return null

  const handleClassSelectAll = () => {
    const allClassValues = classOptions.map(opt => opt.value).filter(val => val !== "all");
    setSelectedClasses((prev) => ({ ...prev, values: allClassValues }));
  };

  const handleClassInvertSelection = () => {
    const allClassValues = classOptions.map(opt => opt.value).filter(val => val !== "all");
    setSelectedClasses(prev =>
      ({ ...prev, values: allClassValues.filter(val => !prev.values.includes(val)) })
    );
  };

  const handleLevelSelectAll = () => { // Added
    const allLevelValues = levelOptions.map(opt => opt.value).filter(val => val !== "all");
    setSelectedLevels((prev) => ({ ...prev, values: allLevelValues }));
  };

  const handleLevelInvertSelection = () => { // Added
    const allLevelValues = levelOptions.map(opt => opt.value).filter(val => val !== "all");
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
                    setSearchTerm("");
                    setSelectedClasses({ values: [], staged: false });
                    setSelectedLevels({ values: [], staged: false });
                  }}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-400 whitespace-nowrap"
                >
                  重置筛选
                </button>
                <span className="text-sm font-medium">类别:</span>
                <DropdownMenu
                  open={selectedClasses.staged}
                  onOpenChange={(open) => {
                    setSelectedClasses((prev) => ({ ...prev, staged: open }));
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-36 justify-start text-left font-normal">
                      {selectedClasses.values.length === 0 || (selectedClasses.values.length === classOptions.filter(o => o.value !== 'all').length && classOptions.length > 1)
                        ? "全部类别"
                        : selectedClasses.values.length === 1
                          ? classOptions.find(o => o.value === selectedClasses.values[0])?.label || "选择类别"
                          : `${selectedClasses.values.length} 类已选`}
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
                      <DropdownMenuItem key={option.value} onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                        <Checkbox
                          id={`class-${option.value}`}
                          checked={selectedClasses.values.includes(option.value)}
                          onCheckedChange={(checked) => {
                            setSelectedClasses((prev) => ({
                              ...prev,
                              values: checked
                                ? [...prev.values, option.value]
                                : prev.values.filter((item) => item !== option.value),
                            }));
                          }}
                        />
                        <label htmlFor={`class-${option.value}`} className="ml-2 cursor-pointer flex-1">{option.label}</label>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="text-sm font-medium">等级:</span>
                <DropdownMenu
                  open={selectedLevels.staged}
                  onOpenChange={(open) => {
                    setSelectedLevels((prev) => ({ ...prev, staged: open }));
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-36 justify-start text-left font-normal">
                      {selectedLevels.values.length === 0 || (levelOptions.length > 0 && selectedLevels.values.length === levelOptions.length)
                        ? "全部等级"
                        : selectedLevels.values.length === 1
                          ? levelOptions.find(o => o.value === selectedLevels.values[0])?.label || "选择等级"
                          : `${selectedLevels.values.length} 级已选`}
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
                      <DropdownMenuItem key={option.value} onSelect={(e) => e.preventDefault()} className="flex items-center gap-2">
                        <Checkbox
                          id={`level-${option.value}`}
                          checked={selectedLevels.values.includes(option.value)}
                          onCheckedChange={(checked) => {
                            setSelectedLevels((prev) => ({
                              ...prev,
                              values: checked
                                ? [...prev.values, option.value]
                                : prev.values.filter((item) => item !== option.value),
                            }));
                          }}
                        />
                        <label htmlFor={`level-${option.value}`} className="ml-2 cursor-pointer flex-1">{option.label}</label>
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
