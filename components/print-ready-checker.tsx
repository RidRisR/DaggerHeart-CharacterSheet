"use client"

import React, { useEffect } from "react"
import { usePrintContext } from "@/contexts/print-context"
import { useProgressModal } from "@/components/ui/unified-progress-modal"

interface PrintReadyCheckerProps {
  onPrintReady?: () => void
  children?: React.ReactNode
}

export function PrintReadyChecker({ onPrintReady, children }: PrintReadyCheckerProps) {
  const { allImagesLoaded } = usePrintContext()
  const progressModal = useProgressModal()

  useEffect(() => {
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
        "正在加载图片，请稍候..."
      )
    }
  }, [allImagesLoaded, onPrintReady, progressModal])

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