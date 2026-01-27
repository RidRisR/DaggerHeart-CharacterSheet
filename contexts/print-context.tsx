"use client"

import React, { createContext, useContext, ReactNode, RefObject } from "react"
import { usePrintReady } from "@/hooks/use-print-ready"

interface PrintContextType {
  /** 是否就绪 */
  isReady: boolean
  /** 加载进度 */
  progress: { loaded: number; total: number }
  /** 是否因超时而就绪 */
  timedOut: boolean
  /** 强制设置为就绪状态 */
  forceReady: () => void
}

const PrintContext = createContext<PrintContextType | undefined>(undefined)

interface PrintProviderProps {
  children: ReactNode
  /** 要监控的容器引用 */
  containerRef: RefObject<HTMLElement | null>
  /** 是否启用监控 */
  enabled?: boolean
  /** 超时时间（毫秒） */
  timeout?: number
}

/**
 * 打印就绪状态提供者
 *
 * 监控 containerRef 内所有图片的加载状态，
 * 通过 Context 向下传递就绪状态。
 */
export function PrintProvider({
  children,
  containerRef,
  enabled = true,
  timeout = 10000
}: PrintProviderProps) {
  const { isReady, progress, timedOut, forceReady } = usePrintReady(containerRef, {
    enabled,
    timeout
  })

  return (
    <PrintContext.Provider value={{ isReady, progress, timedOut, forceReady }}>
      {children}
    </PrintContext.Provider>
  )
}

/**
 * 获取打印就绪状态
 */
export function usePrintContext(): PrintContextType {
  const context = useContext(PrintContext)
  if (context === undefined) {
    throw new Error("usePrintContext must be used within a PrintProvider")
  }
  return context
}

/**
 * 兼容旧 API 的空实现
 * @deprecated 使用新的 usePrintReady hook 代替
 */
export function useLegacyPrintContext() {
  return {
    allImagesLoaded: true,
    pageImagesLoaded: {} as Record<string, boolean>,
    registerPageImages: () => {},
    onPageImagesLoaded: () => {},
    resetLoader: () => {},
    forceAllImagesLoaded: () => {}
  }
}
