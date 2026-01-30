"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { Trash2, Plus, RefreshCw, GripVertical } from "lucide-react"
import type { NotebookDiceLine, NotebookDie } from "@/lib/sheet-data"

interface DiceLineProps {
  line: NotebookDiceLine
  lineHeight: number
  onUpdate: (updates: Partial<NotebookDiceLine>) => void
  onDelete: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

// 可用的骰子类型
const DICE_TYPES = [4, 6, 8, 10, 12, 20] as const

// 六边形骰子组件
function HexDie({
  die,
  index,
  onRoll,
  onEdit,
  isRolling
}: {
  die: NotebookDie
  index: number
  onRoll: () => void
  onEdit: (value: number) => void
  isRolling: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(die.value.toString())
  const [rotation, setRotation] = useState(0)
  const prevIsRolling = useRef(false)

  // 当 isRolling 从 false 变为 true 时，增加旋转角度
  useEffect(() => {
    if (isRolling && !prevIsRolling.current) {
      setRotation(prev => prev + 360)
    }
    prevIsRolling.current = isRolling
  }, [isRolling])

  const handleSave = () => {
    const val = Math.max(1, Math.min(die.sides, parseInt(editValue) || 1))
    onEdit(val)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex flex-col items-center gap-1">
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-10 h-8 text-center text-sm border border-amber-400 rounded bg-white"
          min={1}
          max={die.sides}
          autoFocus
        />
        <span className="text-[10px] text-gray-400">d{die.sides}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0.5 relative group/hex">
      {/* 编辑按钮 - 左上角 */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsEditing(true)
        }}
        className="absolute -top-1 -left-1 w-4 h-4 bg-amber-500 text-white rounded-full opacity-0 group-hover/hex:opacity-100 transition-opacity flex items-center justify-center z-10 text-[10px] font-bold"
        title="编辑数值"
      >
        ✎
      </button>

      {/* 六边形骰子 */}
      <div
        onClick={onRoll}
        className="relative w-10 h-11 flex items-center justify-center cursor-pointer"
        title="点击重投"
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: 'linear-gradient(135deg, #F5F5DC 0%, #DDD8C4 100%)',
          boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.1)',
          transform: `rotate(${rotation}deg) scale(${isRolling ? 1.1 : 1})`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* 边框效果 */}
        <div
          className="absolute inset-0.5"
          style={{
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: '2px solid #8B7355',
          }}
        />
        {/* 数值 */}
        <span className="relative z-10 text-lg font-bold text-amber-900">
          {die.value}
        </span>
      </div>
      {/* 骰子类型标签 */}
      <span className="text-[10px] text-gray-500 font-medium">d{die.sides}</span>
    </div>
  )
}

export function DiceLine({ line, lineHeight, onUpdate, onDelete, dragHandleProps }: DiceLineProps) {
  const [rollingDice, setRollingDice] = useState<Set<number>>(new Set())
  const [isAddingDie, setIsAddingDie] = useState(false)
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editLabel, setEditLabel] = useState(line.label)
  const labelInputRef = useRef<HTMLInputElement>(null)

  // 聚焦输入框
  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus()
      labelInputRef.current.select()
    }
  }, [isEditingLabel])

  // 保存标签
  const handleSaveLabel = () => {
    onUpdate({ label: editLabel || '骰子' })
    setIsEditingLabel(false)
  }

  // 投掷单个骰子
  const rollDie = useCallback((index: number) => {
    setRollingDice(prev => new Set(prev).add(index))

    setTimeout(() => {
      const die = line.dice[index]
      const newValue = Math.floor(Math.random() * die.sides) + 1
      const newDice = [...line.dice]
      newDice[index] = { ...die, value: newValue }
      onUpdate({ dice: newDice })
      setRollingDice(prev => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }, 300)
  }, [line.dice, onUpdate])

  // 投掷所有骰子
  const rollAllDice = useCallback(() => {
    const allIndices = new Set(line.dice.map((_, i) => i))
    setRollingDice(allIndices)

    setTimeout(() => {
      const newDice = line.dice.map(die => ({
        ...die,
        value: Math.floor(Math.random() * die.sides) + 1
      }))
      onUpdate({ dice: newDice })
      setRollingDice(new Set())
    }, 300)
  }, [line.dice, onUpdate])

  // 编辑骰子值
  const editDieValue = useCallback((index: number, value: number) => {
    const newDice = [...line.dice]
    newDice[index] = { ...newDice[index], value }
    onUpdate({ dice: newDice })
  }, [line.dice, onUpdate])

  // 添加骰子
  const addDie = useCallback((sides: number) => {
    if (line.dice.length >= 6) return
    const newDie: NotebookDie = { sides, value: Math.floor(Math.random() * sides) + 1 }
    onUpdate({ dice: [...line.dice, newDie] })
    setIsAddingDie(false)
  }, [line.dice, onUpdate])

  // 删除骰子
  const removeDie = useCallback((index: number) => {
    const newDice = line.dice.filter((_, i) => i !== index)
    onUpdate({ dice: newDice })
  }, [line.dice, onUpdate])

  return (
    <div
      className="flex flex-col gap-1 py-2"
      style={{ minHeight: Math.max(lineHeight * 2, 64) }}
    >
      {/* 标题行：拖拽手柄 + 标题 + 操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 拖拽手柄 */}
        <div
          {...dragHandleProps}
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* 标题 - 点击可编辑 */}
        {isEditingLabel ? (
          <input
            ref={labelInputRef}
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSaveLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveLabel()
              if (e.key === 'Escape') {
                setEditLabel(line.label)
                setIsEditingLabel(false)
              }
            }}
            className="text-xs font-medium text-gray-700 min-w-[48px] px-1 py-0.5 border border-amber-400 rounded bg-white outline-none"
          />
        ) : (
          <span
            onClick={() => {
              setEditLabel(line.label)
              setIsEditingLabel(true)
            }}
            className="text-xs font-medium text-gray-700 min-w-[48px] cursor-text hover:bg-amber-50 px-1 py-0.5 rounded transition-colors"
            title="点击编辑名称"
          >
            {line.label}
          </span>
        )}

        {/* 全部重投按钮 */}
        <button
          onClick={rollAllDice}
          className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
          title="重投所有骰子"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* 删除行按钮 */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
          title="删除此行"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 骰子展示区 - 占据整行 */}
      <div className="flex items-end gap-2 flex-wrap pl-5">
        {line.dice.map((die, index) => (
          <div key={index} className="relative group/die">
            <HexDie
              die={die}
              index={index}
              onRoll={() => rollDie(index)}
              onEdit={(value) => editDieValue(index, value)}
              isRolling={rollingDice.has(index)}
            />
            {/* 删除单个骰子按钮 */}
            {line.dice.length > 1 && (
              <button
                onClick={() => removeDie(index)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover/die:opacity-100 transition-opacity flex items-center justify-center"
                title="移除此骰子"
              >
                <span className="text-[10px] leading-none">×</span>
              </button>
            )}
          </div>
        ))}

        {/* 添加骰子按钮 */}
        {line.dice.length < 6 && (
          <div className="relative">
            <button
              onClick={() => setIsAddingDie(!isAddingDie)}
              className="w-10 h-11 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-amber-400 hover:text-amber-600 transition-colors"
              style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              }}
              title="添加骰子"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 骰子类型选择菜单 - 使用 Popover 样式，显示在标题行旁边 */}
        {isAddingDie && (
          <div className="ml-2 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 flex gap-1">
            {DICE_TYPES.map(sides => (
              <button
                key={sides}
                onClick={() => addDie(sides)}
                className="px-2 py-1 text-xs hover:bg-amber-100 rounded transition-colors"
              >
                d{sides}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
