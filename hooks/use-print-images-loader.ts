"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

interface UseImagesLoaderReturn {
  allImagesLoaded: boolean
  pageImagesLoaded: Record<string, boolean>
  registerPageImages: (pageId: string, imageCount: number) => void
  onPageImagesLoaded: (pageId: string) => void
  resetLoader: () => void
  forceAllImagesLoaded: () => void
}

export function useImagesLoader(): UseImagesLoaderReturn {
  const [pageImagesLoaded, setPageImagesLoaded] = useState<Record<string, boolean>>({})
  const [registeredPages, setRegisteredPages] = useState<Record<string, number>>({})

  const registerPageImages = useCallback((pageId: string, imageCount: number) => {
    setRegisteredPages(prev => {
      // 避免不必要的更新
      if (prev[pageId] === imageCount) {
        return prev
      }
      return { ...prev, [pageId]: imageCount }
    })
    
    setPageImagesLoaded(prev => {
      const shouldBeLoaded = imageCount === 0
      // 避免不必要的更新
      if (prev[pageId] === shouldBeLoaded) {
        return prev
      }
      return { ...prev, [pageId]: shouldBeLoaded }
    })
  }, [])

  const onPageImagesLoaded = useCallback((pageId: string) => {
    setPageImagesLoaded(prev => {
      // 避免不必要的更新
      if (prev[pageId] === true) {
        return prev
      }
      return { ...prev, [pageId]: true }
    })
  }, [])

  const resetLoader = useCallback(() => {
    setPageImagesLoaded({})
    setRegisteredPages({})
  }, [])

  const forceAllImagesLoaded = useCallback(() => {
    setPageImagesLoaded(prev => {
      const newState = { ...prev }
      Object.keys(registeredPages).forEach(pageId => {
        newState[pageId] = true
      })
      return newState
    })
  }, [registeredPages])

  const allImagesLoaded = useMemo(() => {
    return Object.keys(registeredPages).length > 0 && 
      Object.keys(registeredPages).every(pageId => pageImagesLoaded[pageId])
  }, [registeredPages, pageImagesLoaded])

  return {
    allImagesLoaded,
    pageImagesLoaded,
    registerPageImages,
    onPageImagesLoaded,
    resetLoader,
    forceAllImagesLoaded
  }
}