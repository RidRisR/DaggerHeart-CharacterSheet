"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"
import { CharacterCreationGuide } from "./character-creation-guide"

interface GuideButtonProps {
  formData: any
}

export function GuideButton({ formData }: GuideButtonProps) {
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const toggleGuide = () => {
    setIsGuideOpen(!isGuideOpen)
  }

  return (
    <>
      <Button onClick={toggleGuide} className="bg-gray-800 hover:bg-gray-700 flex items-center gap-2">
        <HelpCircle size={16} />
        建卡指引
      </Button>

      <CharacterCreationGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} formData={formData} />
    </>
  )
}
