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
  const [isInitialized, setIsInitialized] = useState(false)

  // 添加初始化标志，确保至少等待一个渲染周期
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true)
    }, 50) // 短暂延迟确保组件有时间注册
    return () => clearTimeout(timer)
  }, [])

  const registerPageImages = useCallback((pageId: string, imageCount: number) => {
    console.log(`[useImagesLoader] 注册页面 ${pageId}，图片数量: ${imageCount}`)
    setRegisteredPages(prev => {
      // 避免不必要的更新
      if (prev[pageId] === imageCount) {
        return prev
      }
      return { ...prev, [pageId]: imageCount }
    })
    
    setPageImagesLoaded(prev => {
      const shouldBeLoaded = imageCount === 0
      console.log(`[useImagesLoader] 设置页面 ${pageId} 加载状态: ${shouldBeLoaded}`)
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
    console.log('[useImagesLoader] 重置加载器')
    setPageImagesLoaded({})
    setRegisteredPages({})
    setIsInitialized(false)
    // 重新开始初始化计时器
    setTimeout(() => {
      setIsInitialized(true)
    }, 50)
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
    // 如果还没有初始化，返回 false 等待组件注册
    if (!isInitialized) {
      console.log('[useImagesLoader] 还未初始化，等待中...')
      return false
    }
    
    const registeredPageCount = Object.keys(registeredPages).length
    console.log(`[useImagesLoader] 已注册页面数量: ${registeredPageCount}`)
    
    // 如果没有注册任何页面，认为所有图片都已加载完成
    if (registeredPageCount === 0) {
      console.log('[useImagesLoader] 没有注册页面，认为加载完成')
      return true
    }
    
    // 否则检查所有注册的页面是否都已加载完成
    const allLoaded = Object.keys(registeredPages).every(pageId => {
      const loaded = pageImagesLoaded[pageId]
      console.log(`[useImagesLoader] 页面 ${pageId} 加载状态: ${loaded}`)
      return loaded
    })
    
    console.log(`[useImagesLoader] 所有图片加载完成: ${allLoaded}`)
    return allLoaded
  }, [registeredPages, pageImagesLoaded, isInitialized])

  return {
    allImagesLoaded,
    pageImagesLoaded,
    registerPageImages,
    onPageImagesLoaded,
    resetLoader,
    forceAllImagesLoaded
  }
}