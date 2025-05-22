"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { guideSteps, canProceedToNextStep, getProfessionSpecificContent } from "@/data/guide-content"

interface CharacterCreationGuideProps {
  isOpen: boolean
  onClose: () => void
  formData: any
}

export function CharacterCreationGuide({ isOpen, onClose, formData }: CharacterCreationGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [canProceed, setCanProceed] = useState(false)

  const currentStep = guideSteps[currentStepIndex]

  // 检查当前步骤是否可以进入下一步
  useEffect(() => {
    if (currentStep) {
      setCanProceed(canProceedToNextStep(currentStep, formData))
    }
  }, [currentStep, formData])

  // 获取当前步骤的内容（考虑职业特定内容）
  const getStepContent = () => {
    if (!currentStep) return ""
    return getProfessionSpecificContent(currentStep, formData.profession)
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

  if (!isOpen) return null

  return (
    <div className="fixed right-4 top-20 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 print:hidden">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{currentStep?.title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="mb-6 min-h-[200px] text-sm whitespace-pre-line">{getStepContent()}</div>

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
