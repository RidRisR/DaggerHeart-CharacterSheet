'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KeywordComboboxProps {
  value: string
  onChange: (value: string) => void
  keywords: string[]
  onAddKeyword: (newKeyword: string) => void
  placeholder?: string
  disabled?: boolean
}

export function KeywordCombobox({
  value,
  onChange,
  keywords,
  onAddKeyword,
  placeholder = "输入或选择...",
  disabled = false
}: KeywordComboboxProps) {
  const [inputValue, setInputValue] = useState(value || '')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 同步外部value到内部inputValue
  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  // 过滤选项 - 支持模糊匹配
  const filteredOptions = useMemo(() => {
    if (!inputValue) return keywords
    
    const searchTerm = inputValue.toLowerCase()
    return keywords.filter(keyword => 
      keyword.toLowerCase().includes(searchTerm)
    )
  }, [inputValue, keywords])

  // 检查是否有完全匹配
  const exactMatch = useMemo(() => {
    return keywords.some(keyword => 
      keyword.toLowerCase() === inputValue.toLowerCase()
    )
  }, [inputValue, keywords])

  // 是否显示"创建新选项"
  const showCreateOption = useMemo(() => {
    return inputValue.trim() && !exactMatch
  }, [inputValue, exactMatch])

  // 所有可选项（包括创建新选项）
  const allOptions = useMemo(() => {
    const options = [...filteredOptions]
    if (showCreateOption) {
      options.push(`__create__:${inputValue.trim()}`)
    }
    return options
  }, [filteredOptions, showCreateOption, inputValue])

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowDropdown(true)
    setHighlightedIndex(-1)
  }

  // 选择选项
  const selectOption = (option: string) => {
    if (option.startsWith('__create__:')) {
      // 创建新选项
      const newKeyword = option.substring(11)  // '__create__:' 长度为11
      onAddKeyword(newKeyword)
      onChange(newKeyword)
      setInputValue(newKeyword)
    } else {
      // 选择现有选项
      onChange(option)
      setInputValue(option)
    }
    setShowDropdown(false)
    setHighlightedIndex(-1)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setShowDropdown(true)
      return
    }

    if (!showDropdown) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < allOptions.length - 1 ? prev + 1 : 0
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : allOptions.length - 1
        )
        break
      
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < allOptions.length) {
          selectOption(allOptions[highlightedIndex])
        } else if (showCreateOption && inputValue.trim()) {
          // 如果没有高亮选项但有输入值，创建新选项
          selectOption(`__create__:${inputValue.trim()}`)
        }
        break
      
      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        setHighlightedIndex(-1)
        // 恢复原值
        setInputValue(value || '')
        break
      
      case 'Tab':
        // 允许Tab正常工作，关闭下拉框
        setShowDropdown(false)
        setHighlightedIndex(-1)
        break
    }
  }

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setHighlightedIndex(-1)
        // 如果输入值不在选项中且不为空，恢复原值
        if (inputValue && !keywords.includes(inputValue)) {
          setInputValue(value || '')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [inputValue, keywords, value])

  // 处理输入框失焦
  const handleBlur = () => {
    // 延迟执行，让点击事件先触发
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowDropdown(false)
        setHighlightedIndex(-1)
        // 如果输入值有效，触发onChange
        if (inputValue && inputValue !== value) {
          if (keywords.includes(inputValue)) {
            onChange(inputValue)
          } else if (inputValue.trim()) {
            // 自动创建新选项
            onAddKeyword(inputValue.trim())
            onChange(inputValue.trim())
          }
        }
      }
    }, 200)
  }

  // 高亮匹配的文字
  const highlightMatch = (text: string, search: string) => {
    if (!search) return text
    
    const parts = text.split(new RegExp(`(${search})`, 'gi'))
    return (
      <span>
        {parts.map((part, index) => 
          part.toLowerCase() === search.toLowerCase() ? (
            <span key={index} className="font-semibold bg-yellow-100">
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </span>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowDropdown(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full",
          showDropdown && allOptions.length > 0 && "rounded-b-none"
        )}
      />
      
      {showDropdown && allOptions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full bg-white border border-t-0 border-gray-200 rounded-b-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.map((option, index) => {
            const optionIndex = allOptions.indexOf(option)
            return (
              <div
                key={option}
                className={cn(
                  "px-3 py-2 cursor-pointer transition-colors",
                  "hover:bg-gray-100",
                  highlightedIndex === optionIndex && "bg-gray-100",
                  option === value && "font-medium"
                )}
                onMouseEnter={() => setHighlightedIndex(optionIndex)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectOption(option)
                }}
              >
                <div className="flex items-center justify-between">
                  <span>{highlightMatch(option, inputValue)}</span>
                  {option === value && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              </div>
            )
          })}
          
          {showCreateOption && (
            <>
              {filteredOptions.length > 0 && (
                <div className="border-t border-gray-200 my-1" />
              )}
              <div
                className={cn(
                  "px-3 py-2 cursor-pointer transition-colors",
                  "hover:bg-blue-50 text-blue-600",
                  highlightedIndex === allOptions.length - 1 && "bg-blue-50"
                )}
                onMouseEnter={() => setHighlightedIndex(allOptions.length - 1)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectOption(`__create__:${inputValue.trim()}`)
                }}
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>创建新选项: "{inputValue.trim()}"</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}