"use client"

import { useState, useEffect } from "react"
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

const BATCH_SIZE = 30 // 每批加载30张卡牌
const LOAD_DELAY = 50 // 每批之间延迟50ms，避免阻塞UI

export function ViewCardsModal({
  isOpen,
  onClose,
  cards,
  title,
}: ViewCardsModalProps) {
  const { isTextMode } = useTextModeStore()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [displayedCards, setDisplayedCards] = useState<ExtendedStandardCard[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 异步分批加载卡牌
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setIsLoading(true)
    setDisplayedCards([])

    // 使用 requestIdleCallback 或 setTimeout 进行分批加载
    const loadCardsBatch = async () => {
      const totalBatches = Math.ceil(cards.length / BATCH_SIZE)

      for (let i = 0; i < totalBatches; i++) {
        if (!isMounted) break

        const start = i * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, cards.length)
        const batch = cards.slice(start, end)

        // 使用 setTimeout 让出主线程，避免阻塞UI
        await new Promise((resolve) => setTimeout(resolve, LOAD_DELAY))

        if (isMounted) {
          setDisplayedCards((prev) => [...prev, ...batch])
        }
      }

      if (isMounted) {
        setIsLoading(false)
      }
    }

    loadCardsBatch()

    return () => {
      isMounted = false
    }
  }, [isOpen, cards])

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

  // 监听卡牌变化，触发刷新动画
  useEffect(() => {
    setRefreshTrigger((prev) => prev + 1)
  }, [displayedCards])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 卡牌列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {displayedCards.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <p className="text-gray-500 mb-2">没有卡牌</p>
              </div>
            </div>
          ) : (
            <>
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

              {/* 加载指示器 */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-gray-600">
                    加载中... ({displayedCards.length} / {cards.length})
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
