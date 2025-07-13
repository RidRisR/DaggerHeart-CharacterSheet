"use client"

import React, { useEffect } from "react"
import { usePrintContext } from "@/contexts/print-context"

interface PrintReadyCheckerProps {
  onPrintReady?: () => void
  children?: React.ReactNode
}

export function PrintReadyChecker({ onPrintReady, children }: PrintReadyCheckerProps) {
  const { allImagesLoaded } = usePrintContext()

  useEffect(() => {
    if (allImagesLoaded) {
      onPrintReady?.()
    }
  }, [allImagesLoaded, onPrintReady])

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
    }
  }, [])

  return (
    <>
      {children}
      {!allImagesLoaded && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg">正在加载图片，请稍候...</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}