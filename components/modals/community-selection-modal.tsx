"use client"
import { Button } from "@/components/ui/button"
import { CardType } from "@/data/card"
import { useState, useEffect } from "react"
import type { StandardCard } from "@/data/card/card-types"
import { SelectableCard } from "@/components/ui/selectable-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCardsByType } from "@/hooks/use-cards"

interface CommunityModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (communityId: string) => void
  title: string
}

export function CommunitySelectionModal({ isOpen, onClose, onSelect, title }: CommunityModalProps) {
  const [selectedClass, setSelectedClass] = useState<string>("All")
  const [availableClasses, setAvailableClasses] = useState<string[]>(["All"])

  // 使用Hook获取卡牌数据
  const {
    cards: communityCards,
    loading: cardsLoading,
    error: cardsError
  } = useCardsByType(CardType.Community, {
    enabled: isOpen
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
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
  }, [isOpen, onClose]);

  // 当卡牌数据加载完成时，更新可用类别
  useEffect(() => {
    if (communityCards.length > 0) {
      const uniqueClasses = Array.from(new Set(communityCards.flatMap((card: StandardCard) => card.class || []).filter((cls: string) => cls)))
      setAvailableClasses(["All", ...uniqueClasses])
    }
  }, [communityCards])

  if (!isOpen) return null

  const filteredCards = communityCards.filter(card =>
    selectedClass === "All" || (card.class && card.class.includes(selectedClass))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      {/* Removed p-4 from this div */}
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Changed className for padding and consistency */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Select
              value={selectedClass}
              onValueChange={setSelectedClass}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="筛选职业类别" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls === "All" ? "全部类别" : cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              onClick={() => onSelect("none")}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              清除选择
            </Button>
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        {/* New structure for content area */}
        <div className="flex-1 flex flex-col overflow-hidden"> {/* Outer content wrapper */}
          <div className="flex-1 overflow-y-auto p-4"> {/* Inner scrollable grid area, changed pr-4 to p-4 */}
            
            {/* 显示加载状态 */}
            {cardsLoading && (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="text-lg">加载社群卡牌中...</div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCards.map((card) => (
                  <SelectableCard key={card.id} card={card} onClick={() => onSelect(card.id)} isSelected={false} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
