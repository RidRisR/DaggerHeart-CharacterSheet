"use client"

import { useState, useEffect, useCallback, useRef, RefObject } from "react"

// 配置常量
const DEFAULT_TIMEOUT = 10000      // 10 秒超时
const DEFAULT_CHECK_INTERVAL = 100 // 100ms 检查间隔

interface UsePrintReadyOptions {
  /** 超时时间（毫秒），默认 10000 */
  timeout?: number
  /** 检查间隔（毫秒），默认 100 */
  checkInterval?: number
  /** 是否启用，默认 true */
  enabled?: boolean
}

interface UsePrintReadyReturn {
  /** 是否就绪（所有图片加载完成或超时） */
  isReady: boolean
  /** 加载进度 */
  progress: {
    loaded: number
    total: number
  }
  /** 是否因超时而就绪 */
  timedOut: boolean
  /** 强制设置为就绪状态 */
  forceReady: () => void
}

/**
 * 监控容器内所有图片的加载状态
 *
 * 核心原理：
 * 1. 查询容器内所有 <img> 元素
 * 2. 使用 img.complete 属性判断是否完成（包含成功和失败）
 * 3. 监听 load/error 事件触发重新检查
 * 4. 超时后自动就绪
 */
export function usePrintReady(
  containerRef: RefObject<HTMLElement | null>,
  options: UsePrintReadyOptions = {}
): UsePrintReadyReturn {
  const {
    timeout = DEFAULT_TIMEOUT,
    checkInterval = DEFAULT_CHECK_INTERVAL,
    enabled = true
  } = options

  const [state, setState] = useState({
    loaded: 0,
    total: 0,
    isReady: false,
    timedOut: false
  })

  // 使用 ref 避免闭包问题
  const stateRef = useRef(state)
  stateRef.current = state

  // 追踪已添加监听器的图片，避免重复添加
  const trackedImagesRef = useRef(new WeakSet<HTMLImageElement>())

  // 追踪开始时间
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) {
      setState({ loaded: 0, total: 0, isReady: true, timedOut: false })
      return
    }

    // 等待 containerRef 就绪
    if (!containerRef.current) {
      return
    }

    // 重置状态
    startTimeRef.current = Date.now()
    trackedImagesRef.current = new WeakSet()

    const checkImages = () => {
      const container = containerRef.current
      if (!container) return

      const images = container.querySelectorAll('img')
      let loaded = 0
      const total = images.length

      images.forEach(img => {
        // 为新图片添加事件监听器
        if (!trackedImagesRef.current.has(img)) {
          trackedImagesRef.current.add(img)

          const handleComplete = () => {
            // 图片完成（成功或失败），触发重新检查
            checkImages()
          }

          // 使用 once 确保监听器只触发一次
          img.addEventListener('load', handleComplete, { once: true })
          img.addEventListener('error', handleComplete, { once: true })
        }

        // img.complete 在图片加载成功、加载失败、或无 src 时都为 true
        if (img.complete) {
          loaded++
        }
      })

      const elapsed = Date.now() - startTimeRef.current
      const timedOut = elapsed >= timeout
      const isReady = total === 0 || loaded === total || timedOut

      // 避免不必要的状态更新
      const prev = stateRef.current
      if (prev.loaded !== loaded || prev.total !== total || prev.isReady !== isReady || prev.timedOut !== timedOut) {
        setState({ loaded, total, isReady, timedOut })
      }
    }

    // 初始检查
    checkImages()

    // 定期轮询（处理动态添加的图片）
    const intervalId = setInterval(checkImages, checkInterval)

    // 超时保底
    const timeoutId = setTimeout(() => {
      setState(prev => {
        if (prev.isReady) return prev
        return { ...prev, isReady: true, timedOut: true }
      })
    }, timeout)

    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [containerRef, timeout, checkInterval, enabled])

  const forceReady = useCallback(() => {
    setState(prev => ({ ...prev, isReady: true }))
  }, [])

  return {
    isReady: state.isReady,
    progress: { loaded: state.loaded, total: state.total },
    timedOut: state.timedOut,
    forceReady
  }
}
