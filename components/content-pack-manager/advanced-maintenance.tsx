"use client"

import { Button } from "@/components/ui/button"

export function AdvancedMaintenance({ onResetAll }: { onResetAll(): void }) {
  return (
    <details className="rounded-lg border bg-white p-4">
      <summary className="cursor-pointer font-medium text-red-700">高级维护</summary>
      <div className="mt-3 text-sm text-muted-foreground">
        此操作会删除角色存档、自定义卡牌包、装备包、图片缓存和系统设置。请确认已经备份重要数据。
      </div>
      <Button className="mt-3" variant="destructive" onClick={onResetAll}>
        强制初始化所有数据
      </Button>
    </details>
  )
}
