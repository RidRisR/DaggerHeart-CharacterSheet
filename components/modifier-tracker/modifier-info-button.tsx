"use client"

/**
 * 调整值信息按钮组件
 *
 * 点击后打开调整值详情弹窗
 */

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { ModifierInfoDialog } from './modifier-info-dialog'
import { cn } from '@/lib/utils'

interface ModifierInfoButtonProps {
  /**
   * 属性名称
   * @example 'evasion', 'armorValue'
   */
  attribute: string

  /**
   * 自定义样式类名
   */
  className?: string
}

export function ModifierInfoButton({ attribute, className }: ModifierInfoButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center",
          "w-4 h-4 rounded-full",
          "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
          "transition-colors print:hidden",
          className
        )}
        title="查看调整值明细"
        type="button"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      <ModifierInfoDialog
        attribute={attribute}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
