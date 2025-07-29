"use client"

import React, { useEffect, useCallback, useRef } from "react"
import { usePrintContext } from "@/contexts/print-context"
import { useProgressModal } from "@/components/ui/unified-progress-modal"

interface PrintReadyCheckerProps {
  onPrintReady?: () => void
  onSkipWaiting?: () => void
  children?: React.ReactNode
}

export function PrintReadyChecker({ onPrintReady, onSkipWaiting, children }: PrintReadyCheckerProps) {
  const { allImagesLoaded, forceAllImagesLoaded } = usePrintContext()
  const progressModal = useProgressModal()
  const hasSkippedRef = useRef(false) // 记录是否已经跳过等待

  const handleSkipWaiting = useCallback(() => {
    console.log('[PrintReadyChecker] 用户跳过图片加载等待')
    hasSkippedRef.current = true // 标记已跳过
    // 强制设置所有图片为已加载状态
    forceAllImagesLoaded()
    // 同时设置DOM属性供HTML导出器使用
    const printContextElement = document.querySelector('[data-print-context]') as HTMLElement
    if (printContextElement) {
      printContextElement.setAttribute('data-all-images-loaded', 'true')
    }
    // 关闭进度条
    progressModal.close()
    // 执行原始的跳过回调
    onSkipWaiting?.()
  }, [forceAllImagesLoaded, progressModal, onSkipWaiting])

  useEffect(() => {
    // 如果已经跳过等待，直接返回，不再显示进度条
    if (hasSkippedRef.current) {
      return
    }
    
    if (allImagesLoaded) {
      onPrintReady?.()
      // 图片加载完成，关闭进度条
      if (progressModal.isVisible()) {
        progressModal.close()
      }
    } else {
      // 图片未加载完成，显示等待进度条
      progressModal.showLoading(
        "正在准备打印预览", 
        "正在加载图片，请稍候...",
        !!onSkipWaiting, // 如果有跳过回调，显示跳过按钮
        handleSkipWaiting, // 使用内部的跳过处理函数
        "跳过加载"       // 按钮文本
      )
    }
  }, [allImagesLoaded, onPrintReady, handleSkipWaiting, progressModal])

  // 在DOM上设置数据属性，供HTML导出器使用
  useEffect(() => {
    // 查找或创建打印上下文元素
    let printContextElement = document.querySelector('[data-print-context]') as HTMLElement
    if (!printContextElement) {
      printContextElement = document.createElement('div')
      printContextElement.setAttribute('data-print-context', 'true')
      printContextElement.style.display = 'none'
      document.body.appendChild(printContextElement)
    }
    
    printContextElement.setAttribute('data-all-images-loaded', allImagesLoaded.toString())
  }, [allImagesLoaded])

  // 清理函数在组件卸载时执行
  useEffect(() => {
    return () => {
      const existingElement = document.querySelector('[data-print-context]')
      if (existingElement && document.body.contains(existingElement)) {
        document.body.removeChild(existingElement)
      }
      
      // 组件卸载时关闭进度条
      if (progressModal.isVisible()) {
        progressModal.close()
      }
    }
  }, [progressModal])

  return <>{children}</>
}