/**
 * 调整值来源图标组件
 *
 * 为不同类型的调整值来源显示对应的图标
 */

import { Shield, Sword, Sparkles, TrendingUp, Circle } from 'lucide-react'
import type { ModifierSourceType } from '@/lib/modifier-tracker/types'

const ICON_MAP: Record<ModifierSourceType, React.ComponentType<{ className?: string }>> = {
  weapon: Sword,
  armor: Shield,
  card: Sparkles,
  upgrade: TrendingUp,
  base: Circle,
}

interface SourceTypeIconProps {
  type: ModifierSourceType
  className?: string
}

export function SourceTypeIcon({ type, className = "w-4 h-4" }: SourceTypeIconProps) {
  const Icon = ICON_MAP[type]
  if (!Icon) return null
  return <Icon className={className} />
}
