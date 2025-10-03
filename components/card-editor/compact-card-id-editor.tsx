'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { parseCardId, buildCardId, generateRobustCardId, isIdUniqueInPackage } from '@/app/card-editor/utils/id-generator'
import { useCardEditorStore } from '@/app/card-editor/store/card-editor-store'
import type { CardType } from '@/app/card-editor/types'

interface CompactCardIdEditorProps {
  card: { id: string; 名称?: string; [key: string]: any }
  cardType: CardType
  cardIndex: number
  packageName: string
  author: string
}

export function CompactCardIdEditor({
  card,
  cardType,
  cardIndex,
  packageName,
  author
}: CompactCardIdEditorProps) {
  const { updateCard, packageData } = useCardEditorStore()
  const [isEditing, setIsEditing] = useState(false)
  const [customSuffix, setCustomSuffix] = useState('')
  const [error, setError] = useState('')
  const editingRef = useRef<HTMLDivElement>(null)

  // 解析当前ID
  const parsed = parseCardId(card.id || '', packageName, author, cardType)
  const prefix = parsed.prefix
  const fullId = buildCardId(packageName, author, cardType, customSuffix)

  // 初始化自定义后缀
  useEffect(() => {
    if (parsed.isStandard) {
      setCustomSuffix(parsed.customSuffix)
    } else {
      setCustomSuffix(parsed.customSuffix)
    }
  }, [card.id, packageName, author, cardType])

  // 验证ID唯一性
  const validateId = (newId: string): string => {
    if (!newId.trim()) {
      return 'ID不能为空'
    }

    if (newId === card.id) {
      return '' // 没有变化
    }

    // 检查是否与其他卡牌ID重复
    if (!isIdUniqueInPackage(newId, packageData, card)) {
      return 'ID已存在，请使用其他ID'
    }

    return ''
  }

  const handleSuffixChange = (value: string) => {
    setCustomSuffix(value)
    const newFullId = buildCardId(packageName, author, cardType, value)
    const validationError = validateId(newFullId)
    setError(validationError)
  }

  const handleSave = async () => {
    const newId = buildCardId(packageName, author, cardType, customSuffix)
    const validationError = validateId(newId)

    if (validationError) {
      setError(validationError)
      return
    }

    // Migrate image if ID changed
    if (card.id !== newId) {
      try {
        const { renameImageKey } = await import('@/app/card-editor/utils/image-db-helpers')
        await renameImageKey(card.id, newId)
      } catch (error) {
        console.error('[CompactCardIdEditor] Failed to migrate image:', error)
      }
    }

    updateCard(cardType, cardIndex, { id: newId })
    setIsEditing(false)
    setError('')
  }

  const handleCancel = () => {
    // 恢复原始值
    if (parsed.isStandard) {
      setCustomSuffix(parsed.customSuffix)
    } else {
      setCustomSuffix(parsed.customSuffix)
    }
    setIsEditing(false)
    setError('')
  }

  // 处理回车键保存
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  // 处理点击外部保存
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && editingRef.current && !editingRef.current.contains(event.target as Node)) {
        handleSave()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing, customSuffix, error])

  const handleRegenerate = async () => {
    const newId = generateRobustCardId(packageName, author, cardType, packageData)

    // Migrate image if ID changed
    if (card.id !== newId) {
      try {
        const { renameImageKey } = await import('@/app/card-editor/utils/image-db-helpers')
        await renameImageKey(card.id, newId)
      } catch (error) {
        console.error('[CompactCardIdEditor] Failed to migrate image:', error)
      }
    }

    updateCard(cardType, cardIndex, { id: newId })
    setIsEditing(false)
    setError('')
  }

  const startEditing = () => {
    setIsEditing(true)
    // 如果是非标准格式，尝试提取有用的后缀
    if (!parsed.isStandard) {
      // 可能是旧格式，尝试智能提取
      const parts = card.id.split('-')
      if (parts.length > 3) {
        setCustomSuffix(parts.slice(3).join('-'))
      } else {
        setCustomSuffix(card.id)
      }
    }
  }

  return (
    <div className="mt-1">
      {!isEditing ? (
        // 紧凑显示模式
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground font-mono break-all">
              ID: {card.id || ''}
            </span>
            {!parsed.isStandard && (
              <span className="text-xs text-yellow-600 ml-1">⚠️</span>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 text-xs"
              onClick={startEditing}
              title="编辑ID"
            >
              ✎
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0 text-xs"
              onClick={handleRegenerate}
              title="重新生成ID"
            >
              ↻
            </Button>
          </div>
        </div>
      ) : (
        // 编辑模式
        <div ref={editingRef} className="space-y-2 border rounded-md p-2 bg-muted/20">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
              {prefix}
            </span>
            <Input
              value={customSuffix}
              onChange={(e) => handleSuffixChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="自定义后缀"
              className="flex-1 h-6 text-xs font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-mono break-all flex-1 min-w-0">
              {fullId}
            </p>
            <div className="flex gap-1 ml-2 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-xs"
                onClick={handleSave}
                disabled={!!error || !customSuffix.trim()}
                title="保存"
              >
                ✓
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-xs"
                onClick={handleCancel}
                title="取消"
              >
                ×
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 text-xs"
                onClick={handleRegenerate}
                title="重新生成"
              >
                ↻
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}