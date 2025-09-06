"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"

interface EditableDualLineProps {
  name: string;
  value: string;
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxLength?: number;
  className?: string;
}

// 智能分割单字段内容为两行显示
const splitValueToLines = (value: string): [string, string] => {
  if (!value) return ["", ""];
  
  // 如果包含换行符，按换行符分割
  if (value.includes('\n')) {
    const parts = value.split('\n', 2);
    return [parts[0] || "", parts[1] || ""];
  }
  
  // 如果长度超过29字符，智能分割
  const maxCharsPerLine = 29;
  if (value.length <= maxCharsPerLine) {
    return [value, ""];
  }
  
  // 寻找合适的分割点
  let splitIndex = maxCharsPerLine;
  for (let i = maxCharsPerLine; i >= Math.max(0, maxCharsPerLine - 5); i--) {
    const char = value[i];
    const nextChar = value[i + 1];
    
    if (char === ' ') {
      splitIndex = i + 1;
      break;
    }
    
    const punctuation = ['，', '。', '：', ';', ',', ':'];
    if (punctuation.includes(char) && nextChar && punctuation.includes(nextChar)) {
      splitIndex = i + 1;
      break;
    }
  }
  
  return [
    value.substring(0, splitIndex).trim(),
    value.substring(splitIndex).trim()
  ];
};

export function EditableDualLine({
  name,
  value,
  placeholder,
  onChange,
  maxLength = 59,
  className = "w-full border-b border-gray-400 focus:outline-none print-empty-hide text-sm"
}: EditableDualLineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const [line1, line2] = splitValueToLines(value)
  
  const handleStartEdit = () => {
    setTempValue(value)
    setIsEditing(true)
  }
  
  const handleSave = () => {
    const syntheticEvent = {
      target: {
        name,
        value: tempValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent)
    setIsEditing(false)
  }
  
  const handleCancel = () => {
    setTempValue(value)
    setIsEditing(false)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }
  
  // 自动聚焦到 textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // 将光标移到末尾
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }
  }, [isEditing])
  
  if (isEditing) {
    return (
      <div className="space-y-1">
        <textarea
          ref={textareaRef}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full border border-gray-400 rounded p-2 text-sm min-h-[2.5rem] resize-none focus:outline-none focus:border-blue-500"
          rows={2}
        />
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Ctrl/Cmd + Enter 保存 • Esc 取消</span>
          <span>{tempValue.length}/{maxLength}</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-1">
      <input
        type="text"
        value={line1}
        placeholder={placeholder}
        onClick={handleStartEdit}
        readOnly
        className={`${className} cursor-text hover:bg-gray-50`}
      />
      <input
        type="text"
        value={line2}
        onClick={handleStartEdit}
        readOnly
        className={`${className} cursor-text hover:bg-gray-50`}
      />
    </div>
  )
}