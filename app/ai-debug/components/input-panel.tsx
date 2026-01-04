'use client'

import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FileText, Trash2 } from 'lucide-react'

interface InputPanelProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

// 测试数据
const TEST_DATA = {
  small: `## 职业卡：剑客
- 简介：以剑术为生的战士，擅长近战搏斗
- 领域1：武技
- 领域2：防御
- 起始生命：14
- 起始闪避：8
- 起始物品：长剑、皮甲、治疗药水x2
- 希望特性：剑术精通、战斗直觉
- 职业特性：***剑术大师***：当你使用近战武器攻击时，攻击掷骰获得+1加值。***钢铁意志***：当你的生命值低于最大值的一半时，你的防御掷骰获得优势。

## 种族卡：江湖侠士（类别1）
- 种族：江湖侠士
- 简介：行走江湖的游侠，重视义气和自由
- 效果：当你进行敏捷或灵巧检定时，你可以选择获得优势。每次长休后，你可以使用此能力一次。`,

  medium: `## 职业卡：剑客
- 简介：以剑术为生的战士，擅长近战搏斗，追求武道巅峰
- 领域1：武技
- 领域2：防御
- 起始生命：14
- 起始闪避：8
- 起始物品：长剑、皮甲、治疗药水x2、磨刀石
- 希望特性：剑术精通、战斗直觉、坚韧体魄
- 职业特性：***剑术大师***：当你使用近战武器攻击时，攻击掷骰获得+1加值。***钢铁意志***：当你的生命值低于最大值的一半时，你的防御掷骰获得优势。***反击***：当敌人近战攻击未命中你时，你可以使用反应进行一次机会攻击。

## 职业卡：法师
- 简介：掌握奥术魔法的学者，通过咒语操控元素之力
- 领域1：知识
- 领域2：秘法
- 起始生命：10
- 起始闪避：6
- 起始物品：法杖、法袍、魔法书、法术材料包
- 希望特性：奥术知识、元素亲和、法术专注
- 职业特性：***法术大师***：你可以准备额外1个法术。***元素掌控***：当你施放元素伤害的法术时，伤害+2。***法术反制***：每次短休后一次，你可以使用反应试图反制敌人的法术（知识检定vs对方施法检定）。

## 种族卡：江湖侠士（类别1）
- 种族：江湖侠士
- 简介：行走江湖的游侠，重视义气和自由
- 效果：当你进行敏捷或灵巧检定时，你可以选择获得优势。每次长休后，你可以使用此能力一次。

## 种族卡：江湖侠士（类别2）
- 种族：江湖侠士
- 简介：行走江湖的游侠，重视义气和自由
- 效果：你获得专长：轻功。你可以跳跃到平常两倍的距离，并且在坠落时受到的伤害减半。`,

  large: `${Array(3).fill(`## 职业卡：剑客
- 简介：以剑术为生的战士
- 领域1：武技
- 领域2：防御
- 起始生命：14
- 起始闪避：8

## 种族卡：江湖侠士（类别1）
- 种族：江湖侠士
- 简介：行走江湖的游侠
- 效果：获得敏捷优势

`).join('\n')}`
}

export function InputPanel({ value, onChange, disabled }: InputPanelProps) {
  const charCount = value.length
  const estimatedTokens = Math.ceil(charCount / 2.5)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-lg font-semibold">输入文本</Label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange(TEST_DATA.small)}
            disabled={disabled}
          >
            小文本 (~800字)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange(TEST_DATA.medium)}
            disabled={disabled}
          >
            中文本 (~2k字)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange(TEST_DATA.large)}
            disabled={disabled}
          >
            大文本 (~6k字)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange('')}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="输入或粘贴要转换的文本，或点击上方按钮加载测试数据..."
        className="flex-1 font-mono text-sm resize-none"
        disabled={disabled}
      />

      <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>{charCount} 字符</span>
        </div>
        <span>预估 {estimatedTokens.toLocaleString()} tokens</span>
      </div>
    </div>
  )
}
