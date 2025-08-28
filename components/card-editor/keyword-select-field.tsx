'use client'

import React, { useState } from 'react'
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

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === '__add_new__') {
      setIsAddingNew(true)
      setNewKeywordValue('')
    } else {
      onChange(selectedValue)
    }
  }

  const handleAddNewKeyword = () => {
    const trimmedValue = newKeywordValue.trim()
    
    if (!trimmedValue) {
      return
    }

    if (keywords.includes(trimmedValue)) {
      // 如果关键字已存在，直接选择它
      onChange(trimmedValue)
    } else {
      // 添加新关键字到列表
      onAddKeyword(trimmedValue)
      // 设置为当前选中值
      onChange(trimmedValue)
    }
    
    // 重置状态
    setIsAddingNew(false)
    setNewKeywordValue('')
  }

  const handleCancelAddNew = () => {
    setIsAddingNew(false)
    setNewKeywordValue('')
  }

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

  return (
    <Select value={value} onValueChange={handleSelectChange} disabled={disabled}>
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