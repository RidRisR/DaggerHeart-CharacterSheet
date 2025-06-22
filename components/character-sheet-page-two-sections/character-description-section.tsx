"use client"

import type React from "react"
import { useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import type { SheetData } from "@/lib/sheet-data"

interface CharacterDescriptionSectionProps {
  formData: SheetData
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function CharacterDescriptionSection({ formData, handleInputChange }: CharacterDescriptionSectionProps) {
  // 计算textarea实际显示行数的函数
  const calculateActualLines = (textarea: HTMLTextAreaElement, text: string): number => {
    // 创建一个临时的div来测量文本行数
    const tempDiv = document.createElement('div')
    const style = window.getComputedStyle(textarea)

    // 复制textarea的样式到临时div
    tempDiv.style.position = 'absolute'
    tempDiv.style.visibility = 'hidden'
    tempDiv.style.height = 'auto'
    tempDiv.style.width = textarea.clientWidth + 'px'
    tempDiv.style.fontSize = style.fontSize
    tempDiv.style.fontFamily = style.fontFamily
    tempDiv.style.lineHeight = style.lineHeight
    tempDiv.style.padding = style.padding
    tempDiv.style.border = style.border
    tempDiv.style.boxSizing = style.boxSizing
    tempDiv.style.wordWrap = 'break-word'
    tempDiv.style.whiteSpace = 'pre-wrap'

    // 设置文本内容
    tempDiv.textContent = text

    // 添加到DOM中测量
    document.body.appendChild(tempDiv)

    // 计算行数
    const lineHeight = parseInt(style.lineHeight) || parseInt(style.fontSize) || 16
    const actualLines = Math.ceil(tempDiv.scrollHeight / lineHeight)

    // 清理临时元素
    document.body.removeChild(tempDiv)

    return actualLines
  }

  // 限制textarea最多20行和250字符的处理函数
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    const newValue = e.target.value

    // 首先检查字符数限制
    if (newValue.length > 250) {
      // 如果超过250字符，直接截断
      const limitedEvent = {
        ...e,
        target: {
          ...e.target,
          value: newValue.substring(0, 250)
        }
      }
      handleInputChange(limitedEvent as React.ChangeEvent<HTMLTextAreaElement>)
      return
    }

    // 计算新文本的实际行数
    const actualLines = calculateActualLines(textarea, newValue)

    if (actualLines <= 20) {
      handleInputChange(e)
    } else {
      // 如果超过20行，需要截断文本
      // 二分查找找到合适的文本长度
      let left = 0
      let right = Math.min(newValue.length, 250) // 确保不超过250字符
      let validText = ''

      while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        const testText = newValue.substring(0, mid)
        const testLines = calculateActualLines(textarea, testText)

        if (testLines <= 20 && testText.length <= 250) {
          validText = testText
          left = mid + 1
        } else {
          right = mid - 1
        }
      }

      // 创建修改后的事件对象
      const limitedEvent = {
        ...e,
        target: {
          ...e.target,
          value: validText
        }
      }
      handleInputChange(limitedEvent as React.ChangeEvent<HTMLTextAreaElement>)
    }
  }
  return (
    <div className="grid grid-cols-3 gap-1 mt-2 p-1">
      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">角色简介</h3>
        <Textarea
          name="characterBackground"
          value={formData.characterBackground}
          onChange={handleTextareaChange}
          className="flex-grow h-[190px] text-[10px] border-gray-400 print-empty-hide"
          placeholder="写下对您的角色的概括性介绍，包括他们的过去、经历和个性特征。请注意，角色真正的性格和背景特质应当在游戏中体现出来，这里只是简短的概括和提示。（最多20行，250字）"
        />
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">角色外形</h3>
        <Textarea
          name="characterAppearance"
          value={formData.characterAppearance}
          onChange={handleTextareaChange}
          className="flex-grow h-[190px] text-[10px] border-gray-400 print-empty-hide"
          placeholder="写下您的角色的性别、年龄、外貌和服装等外观特征。如果您的角色有什么特殊的形态或外观特征，也可以记录在这里。（最多20行，250字）"
        />
      </div>

      <div className="col-span-1 flex flex-col">
        <h3 className="text-[12px] font-bold text-center mb-1">角色动机</h3>
        <Textarea
          name="characterMotivation"
          value={formData.characterMotivation}
          onChange={handleTextareaChange}
          className="flex-grow h-[190px] text-[10px] border-gray-400 print-empty-hide"
          placeholder="写下您的角色的动机、目标和愿望。描述角色参与冒险的原因和主要驱动力。请注意，角色在游戏中随时可能成长和改变，随着故事发展，他们的动机可以发生转变。（最多20行，250字）"
        />
      </div>
    </div>
  )
}
