"use client"

import React, { useEffect, useRef, useCallback } from "react"
import { usePrintContext } from "@/contexts/print-context"
import { useProgressModal } from "@/components/ui/unified-progress-modal"

interface PrintReadyCheckerProps {
  /** 就绪时的回调 */
  onPrintReady?: () => void
  /** 跳过等待时的回调 */
  onSkipWaiting?: () => void
  children?: React.ReactNode
}

/**
 * 打印就绪检查器
 *
 * 显示图片加载进度，就绪后关闭弹窗。
 * 使用 PrintContext 获取加载状态。
 */
export function PrintReadyChecker({
  onPrintReady,
  onSkipWaiting,
  children
}: PrintReadyCheckerProps) {
  const { isReady, progress, timedOut, forceReady } = usePrintContext()
  const progressModal = useProgressModal()
  const hasNotifiedRef = useRef(false)

  // 处理跳过等待
  const handleSkipWaiting = useCallback(() => {
    forceReady()
    progressModal.close()
    onSkipWaiting?.()
  }, [forceReady, progressModal, onSkipWaiting])

  // 监听就绪状态
  useEffect(() => {
    if (isReady) {
      // 已就绪，关闭弹窗并通知
      if (progressModal.isVisible()) {
        progressModal.close()
      }
      if (!hasNotifiedRef.current) {
        hasNotifiedRef.current = true
        onPrintReady?.()
      }
    } else {
      // 未就绪，显示进度
      const message = progress.total > 0
        ? `正在加载图片 ${progress.loaded}/${progress.total}...`
        : "正在准备打印内容..."

      progressModal.showLoading(
        "正在准备打印预览",
        message,
        !!onSkipWaiting,
        handleSkipWaiting,
        "跳过加载"
      )
    }
  }, [isReady, progress.loaded, progress.total, onPrintReady, onSkipWaiting, handleSkipWaiting, progressModal])

  // 更新进度消息（不重新显示弹窗）
  useEffect(() => {
    if (!isReady && progressModal.isVisible() && progress.total > 0) {
      progressModal.updateLoading(`正在加载图片 ${progress.loaded}/${progress.total}...`)
    }
  }, [progress.loaded, progress.total, isReady, progressModal])

  // 超时提示
  useEffect(() => {
    if (timedOut && progressModal.isVisible()) {
      progressModal.updateLoading("部分图片加载超时，已自动继续")
    }
  }, [timedOut, progressModal])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (progressModal.isVisible()) {
        progressModal.close()
      }
    }
  }, [progressModal])

  // 设置 DOM 属性供 HTML 导出器使用
  useEffect(() => {
    let printContextElement = document.querySelector('[data-print-context]') as HTMLElement
    if (!printContextElement) {
      printContextElement = document.createElement('div')
      printContextElement.setAttribute('data-print-context', 'true')
      printContextElement.style.display = 'none'
      document.body.appendChild(printContextElement)
    }
    printContextElement.setAttribute('data-all-images-loaded', isReady.toString())

    return () => {
      const el = document.querySelector('[data-print-context]')
      if (el && document.body.contains(el)) {
        document.body.removeChild(el)
      }
    }
  }, [isReady])

  return <>{children}</>
}
