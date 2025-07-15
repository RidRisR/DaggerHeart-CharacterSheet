"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { guideSteps, canProceedToNextStep, getProfessionSpecificContent } from "@/components/guide/guide-content"
import type { SheetData } from "@/lib/sheet-data"
import { useSheetStore } from "@/lib/sheet-store"

interface CharacterCreationGuideProps {
  isOpen: boolean
  onClose: () => void
}

export function CharacterCreationGuide({ isOpen, onClose }: CharacterCreationGuideProps) {
  const { sheetData: formData } = useSheetStore()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [canProceed, setCanProceed] = useState(false)
  
  // 拖拽状态
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hasBeenMoved, setHasBeenMoved] = useState(false)
  const guideRef = useRef<HTMLDivElement>(null)

  const currentStep = guideSteps[currentStepIndex]

  // 检查当前步骤是否可以进入下一步
  useEffect(() => {
    if (currentStep) {
      const allCards = formData?.cards || [];
      setCanProceed(canProceedToNextStep(currentStep, formData, allCards));
    }
  }, [currentStep, formData])

  // 获取当前步骤的内容（考虑职业特定内容）
  const getStepContent = () => {
    if (!currentStep) return ""
    const allCards = formData?.cards || []
    return getProfessionSpecificContent(currentStep, formData?.profession || "", formData || {}, allCards)
  }

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const goToNextStep = () => {
    if (canProceed && currentStepIndex < guideSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  // 拖拽事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    
    // 如果还没有移动过，计算当前实际位置
    let currentX = position.x
    let currentY = position.y
    
    if (!hasBeenMoved && guideRef.current) {
      const rect = guideRef.current.getBoundingClientRect()
      currentX = rect.left
      currentY = rect.top
    }
    
    setDragStart({
      x: e.clientX - currentX,
      y: e.clientY - currentY
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    // 限制拖拽范围在视口内
    const maxX = window.innerWidth - 320 // 320是组件宽度
    const maxY = window.innerHeight - 400 // 大概的组件高度
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
    
    if (!hasBeenMoved) {
      setHasBeenMoved(true)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // 监听全局鼠标事件
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  if (!isOpen) return null

  return (
    <div 
      ref={guideRef}
      className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 print:hidden"
      style={{
        left: hasBeenMoved ? `${position.x}px` : 'auto',
        top: hasBeenMoved ? `${position.y}px` : '80px',
        right: !hasBeenMoved ? '16px' : 'auto',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      <div className="p-4">
        <div 
          className="flex justify-between items-center mb-4 cursor-grab active:cursor-grabbing bg-gray-50 hover:bg-gray-100 -mx-4 -mt-4 px-4 pt-4 pb-2 rounded-t-lg transition-colors select-none"
          onMouseDown={handleMouseDown}
          title="拖拽这里移动窗口"
        >
          <h3 className="text-lg font-bold pointer-events-none">{currentStep?.title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 pointer-events-auto cursor-pointer hover:bg-gray-200 p-1 rounded"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="mb-6 min-h-[200px] text-sm whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: getStepContent() }}
        ></div>

        <div className="flex justify-between">
          <Button
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <ChevronLeft size={16} className="mr-1" /> 上一步
          </Button>

          <Button
            onClick={goToNextStep}
            disabled={!canProceed || currentStepIndex === guideSteps.length - 1}
            variant="default"
            size="sm"
            className={`flex items-center ${canProceed ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-400"}`}
          >
            下一步 <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      </div>

      <div className="bg-gray-100 px-4 py-2 text-xs text-gray-500 rounded-b-lg">
        步骤 {currentStepIndex + 1} / {guideSteps.length}
      </div>
    </div>
  )
}
