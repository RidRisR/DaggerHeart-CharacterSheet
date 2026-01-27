"use client"

import { useState, useEffect, useRef } from "react"
import InfiniteScroll from 'react-infinite-scroll-component'
import type { ExtendedStandardCard } from "@/card/card-types"
import { ImageCard } from "@/components/ui/image-card"
import { SelectableCard } from "@/components/ui/selectable-card"
import { useTextModeStore } from "@/lib/text-mode-store"
import { Loader2 } from "lucide-react"

interface ViewCardsModalProps {
  isOpen: boolean
  onClose: () => void
  cards: ExtendedStandardCard[]
  title: string
}

const ITEMS_PER_PAGE = 30

export function ViewCardsModal({
  isOpen,
  onClose,
  cards,
  title,
}: ViewCardsModalProps) {
  const { isTextMode } = useTextModeStore()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [displayedCards, setDisplayedCards] = useState<ExtendedStandardCard[]>([])
  const [hasMore, setHasMore] = useState(true)
  const scrollableContainerRef = useRef<HTMLDivElement>(null)

  // 初始化时加载第一页
  useEffect(() => {
    if (!isOpen) return

    // 重置滚动位置
    if (scrollableContainerRef.current) {
      scrollableContainerRef.current.scrollTop = 0
    }

    setDisplayedCards(cards.slice(0, ITEMS_PER_PAGE))
    setHasMore(cards.length > ITEMS_PER_PAGE)
    setRefreshTrigger(prev => prev + 1)
  }, [isOpen, cards])

  // 加载更多
  const fetchMoreData = () => {
    if (displayedCards.length >= cards.length) {
      setHasMore(false)
      return
    }
    const newDisplayedCards = displayedCards.concat(
      cards.slice(displayedCards.length, displayedCards.length + ITEMS_PER_PAGE)
    )
    setDisplayedCards(newDisplayedCards)
  }

  // ESC键关闭模态框
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    } else {
      document.removeEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{title}</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                共 {cards.length} 张卡牌
              </span>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* 卡牌列表 */}
        <div
          id="viewCardsScrollable"
          ref={scrollableContainerRef}
          className="flex-1 overflow-y-auto p-6"
        >
          {cards.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-gray-500 mb-2">没有卡牌</p>
              </div>
            </div>
          ) : (
            <InfiniteScroll
              dataLength={displayedCards.length}
              next={fetchMoreData}
              hasMore={hasMore}
              loader={
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">
                    加载中... ({displayedCards.length} / {cards.length})
                  </span>
                </div>
              }
              endMessage={
                <p className="text-center py-4 text-gray-500">
                  已加载全部 {cards.length} 张卡牌
                </p>
              }
              scrollableTarget="viewCardsScrollable"
              scrollThreshold="800px"
            >
              <div
                className={`grid gap-4 ${
                  isTextMode
                    ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {displayedCards.map((card, index) =>
                  isTextMode ? (
                    <SelectableCard
                      key={`${card.id}-${index}`}
                      card={card}
                      onClick={() => {}}
                      isSelected={false}
                    />
                  ) : (
                    <ImageCard
                      key={`${card.id}-${index}`}
                      card={card}
                      onClick={() => {}}
                      isSelected={false}
                      priority={index < 6}
                      refreshTrigger={refreshTrigger}
                    />
                  )
                )}
              </div>
            </InfiniteScroll>
          )}
        </div>
      </div>
    </div>
  )
}
