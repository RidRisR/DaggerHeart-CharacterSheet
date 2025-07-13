"use client"

import { useState, useEffect, useCallback } from "react"

interface UseImagesLoaderReturn {
  allImagesLoaded: boolean
  pageImagesLoaded: Record<string, boolean>
  registerPageImages: (pageId: string, imageCount: number) => void
  onPageImagesLoaded: (pageId: string) => void
  resetLoader: () => void
}

export function useImagesLoader(): UseImagesLoaderReturn {
  const [pageImagesLoaded, setPageImagesLoaded] = useState<Record<string, boolean>>({})
  const [registeredPages, setRegisteredPages] = useState<Record<string, number>>({})

  const registerPageImages = useCallback((pageId: string, imageCount: number) => {
    setRegisteredPages(prev => ({ ...prev, [pageId]: imageCount }))
    if (imageCount === 0) {
      setPageImagesLoaded(prev => ({ ...prev, [pageId]: true }))
    } else {
      setPageImagesLoaded(prev => ({ ...prev, [pageId]: false }))
    }
  }, [])

  const onPageImagesLoaded = useCallback((pageId: string) => {
    setPageImagesLoaded(prev => ({ ...prev, [pageId]: true }))
  }, [])

  const resetLoader = useCallback(() => {
    setPageImagesLoaded({})
    setRegisteredPages({})
  }, [])

  const allImagesLoaded = Object.keys(registeredPages).length > 0 && 
    Object.keys(registeredPages).every(pageId => pageImagesLoaded[pageId])

  return {
    allImagesLoaded,
    pageImagesLoaded,
    registerPageImages,
    onPageImagesLoaded,
    resetLoader
  }
}