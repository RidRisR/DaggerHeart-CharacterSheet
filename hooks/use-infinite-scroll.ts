"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions<T> {
  items: T[]
  pageSize?: number
}

interface UseInfiniteScrollReturn<T> {
  displayedItems: T[]
  hasMore: boolean
  loadMore: () => void
  reset: () => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}

export function useInfiniteScroll<T>({
  items,
  pageSize = 30,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [displayedItems, setDisplayedItems] = useState<T[]>([])
  const [hasMore, setHasMore] = useState(true)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const reset = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
    setDisplayedItems(items.slice(0, pageSize))
    setHasMore(items.length > pageSize)
  }, [items, pageSize])

  useEffect(() => {
    reset()
  }, [reset])

  const loadMore = useCallback(() => {
    if (displayedItems.length >= items.length) {
      setHasMore(false)
      return
    }
    const newItems = items.slice(0, displayedItems.length + pageSize)
    setDisplayedItems(newItems)
    setHasMore(newItems.length < items.length)
  }, [displayedItems.length, items, pageSize])

  return { displayedItems, hasMore, loadMore, reset, scrollRef }
}
