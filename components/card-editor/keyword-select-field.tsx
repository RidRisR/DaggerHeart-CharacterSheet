'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Check, X } from 'lucide-react'

interface KeywordSelectFieldProps {
  value: string
  onChange: (value: string) => void
  keywords: string[]
  onAddKeyword: (newKeyword: string) => void
  placeholder?: string
  disabled?: boolean
}

export function KeywordSelectField({
  value,
  onChange,
  keywords,
  onAddKeyword,
  placeholder = "请选择",
  disabled = false
}: KeywordSelectFieldProps) {
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newKeywordValue, setNewKeywordValue] = useState('')

  const handleSelectChange = useCallback((selectedValue: string) => {
    // 防止重复调用 - 如果新值与当前值相同，直接返回
    if (selectedValue === value && selectedValue !== '__add_new__') {
      return
    }

    if (selectedValue === '__add_new__') {
      setIsAddingNew(true)
      setNewKeywordValue('')
    } else {
      // 仅在值实际改变时调用 onChange
      onChange(selectedValue)
    }
  }, [value, onChange])

  const handleAddNewKeyword = useCallback(() => {
    const trimmedValue = newKeywordValue.trim()
    
    if (!trimmedValue) {
      return
    }

    if (keywords.includes(trimmedValue)) {
      // 如果关键字已存在，直接选择它
      if (trimmedValue !== value) {
        onChange(trimmedValue)
      }
    } else {
      // 添加新关键字到列表
      onAddKeyword(trimmedValue)
      // 设置为当前选中值
      if (trimmedValue !== value) {
        onChange(trimmedValue)
      }
    }
    
    // 重置状态
    setIsAddingNew(false)
    setNewKeywordValue('')
  }, [newKeywordValue, keywords, value, onChange, onAddKeyword])

  const handleCancelAddNew = useCallback(() => {
    setIsAddingNew(false)
    setNewKeywordValue('')
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddNewKeyword()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelAddNew()
    }
  }

  if (isAddingNew) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={newKeywordValue}
          onChange={(e) => setNewKeywordValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入新选项"
          autoFocus
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAddNewKeyword}
          disabled={!newKeywordValue.trim()}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCancelAddNew}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // 确保 value 在有效范围内，避免 Select 组件出错
  const validValue = value && (keywords.includes(value) || value === '') ? value : ''

  return (
    <Select value={validValue} onValueChange={handleSelectChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {keywords.map((keyword) => (
          <SelectItem key={keyword} value={keyword}>
            {keyword}
          </SelectItem>
        ))}
        {keywords.length > 0 && (
          <div className="border-t my-1"></div>
        )}
        <SelectItem value="__add_new__" className="text-muted-foreground">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            添加新选项
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}