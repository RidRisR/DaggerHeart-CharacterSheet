'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { parseCardId, buildCardId, generateRobustCardId, isIdUniqueInPackage } from '@/app/card-editor/utils/id-generator'
import { useCardEditorStore } from '@/app/card-editor/store/card-editor-store'
import type { CardType } from '@/app/card-editor/types'

interface CardIdEditorProps {
  card: { id: string; 名称?: string; [key: string]: any }
  cardType: CardType
  cardIndex: number
  packageName: string
  author: string
}

export function CardIdEditor({
  card,
  cardType,
  cardIndex,
  packageName,
  author
}: CardIdEditorProps) {
  const { updateCard, packageData } = useCardEditorStore()
  const [isEditing, setIsEditing] = useState(false)
  const [customSuffix, setCustomSuffix] = useState('')
  const [error, setError] = useState('')

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

  const handleSave = () => {
    const newId = buildCardId(packageName, author, cardType, customSuffix)
    const validationError = validateId(newId)

    if (validationError) {
      setError(validationError)
      return
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

  const handleRegenerate = () => {
    const newId = generateRobustCardId(packageName, author, cardType, packageData)
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
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">卡牌 ID</label>
        <div className="flex gap-1">
          {!isEditing ? (
            <>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={startEditing} title="编辑ID">
                ✎
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleRegenerate} title="重新生成ID">
                ↻
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleSave}
                disabled={!!error || !customSuffix.trim()}
                title="保存"
              >
                ✓
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleCancel} title="取消">
                ×
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleRegenerate} title="重新生成">
                ↻
              </Button>
            </>
          )}
        </div>
      </div>

      {!isEditing ? (
        // 显示模式
        <Input value={card.id || ''} readOnly className="bg-muted text-xs font-mono" />
      ) : (
        // 编辑模式
        <div className="space-y-2">
          <div className="flex items-center gap-1 p-2 border rounded-md bg-background">
            <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">
              {prefix}
            </span>
            <Input
              value={customSuffix}
              onChange={(e) => handleSuffixChange(e.target.value)}
              placeholder="自定义后缀"
              className="flex-1 border-0 shadow-none p-0 h-auto font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <p className="text-xs text-muted-foreground">
            <strong>完整ID：</strong><span className="font-mono">{fullId}</span>
          </p>
        </div>
      )}

      {!parsed.isStandard && !isEditing && (
        <p className="text-xs text-yellow-600">
          ⚠️ 非标准格式ID，包名/作者变化时可能会重新生成
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        系统生成的唯一标识符
      </p>
    </div>
  )
}