"use client"

import React from "react"
import InfiniteScroll from "react-infinite-scroll-component"
import type { StandardCard, ExtendedStandardCard } from "@/card/card-types"
import { CardGrid } from "./CardGrid"
import { Loader2 } from "lucide-react"

interface InfiniteCardGridProps<T extends StandardCard | ExtendedStandardCard> {
  cards: T[]
  hasMore: boolean
  onLoadMore: () => void
  onCardClick?: (card: T) => void
  isTextMode?: boolean
  selectedCardId?: string
  refreshTrigger?: number
  scrollableTarget?: string
  totalCount?: number
  loader?: React.ReactNode
  endMessage?: React.ReactNode
  className?: string
}

export function InfiniteCardGrid<T extends StandardCard | ExtendedStandardCard>({
  cards, hasMore, onLoadMore, onCardClick,
  isTextMode, selectedCardId, refreshTrigger,
  scrollableTarget, totalCount, loader, endMessage, className,
}: InfiniteCardGridProps<T>) {
  const defaultLoader = (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <span className="ml-3 text-gray-600">
        加载中... ({cards.length}{totalCount ? ` / ${totalCount}` : ''})
      </span>
    </div>
  )

  const defaultEndMessage = totalCount ? (
    <p className="text-center py-4 text-gray-500">
      已加载全部 {totalCount} 张卡牌
    </p>
  ) : null

  return (
    <InfiniteScroll
      dataLength={cards.length}
      next={onLoadMore}
      hasMore={hasMore}
      loader={loader ?? defaultLoader}
      endMessage={endMessage ?? defaultEndMessage}
      scrollableTarget={scrollableTarget}
      scrollThreshold="800px"
    >
      <CardGrid
        cards={cards}
        onCardClick={onCardClick}
        isTextMode={isTextMode}
        selectedCardId={selectedCardId}
        refreshTrigger={refreshTrigger}
        className={className}
      />
    </InfiniteScroll>
  )
}
