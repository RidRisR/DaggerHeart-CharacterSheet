"use client"

import { useState, useEffect } from "react"
import type { ExtendedStandardCard } from "@/card/card-types"
import { BaseCardModal, ModalHeader } from "./base"
import { ContentStates, InfiniteCardGrid } from "./display"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"

interface ViewCardsModalProps {
  isOpen: boolean
  onClose: () => void
  cards: ExtendedStandardCard[]
  title: string
}

export function ViewCardsModal({
  isOpen,
  onClose,
  cards,
  title,
}: ViewCardsModalProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { displayedItems, hasMore, loadMore, reset, scrollRef } = useInfiniteScroll({
    items: cards,
    pageSize: 30,
  })

  // 打开时重置并触发刷新动画
  useEffect(() => {
    if (isOpen) {
      reset()
      setRefreshTrigger(prev => prev + 1)
    }
  }, [isOpen, cards, reset])

  return (
    <BaseCardModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      header={
        <ModalHeader
          title={title}
          subtitle={`共 ${cards.length} 张卡牌`}
          onClose={onClose}
        />
      }
    >
      <div
        id="viewCardsScrollable"
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6"
      >
        <ContentStates empty={cards.length === 0} emptyMessage="没有卡牌">
          <InfiniteCardGrid
            cards={displayedItems}
            hasMore={hasMore}
            onLoadMore={loadMore}
            totalCount={cards.length}
            scrollableTarget="viewCardsScrollable"
            refreshTrigger={refreshTrigger}
          />
        </ContentStates>
      </div>
    </BaseCardModal>
  )
}
