"use client"

import React from "react"
import { Loader2 } from "lucide-react"

interface ContentStatesProps {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  loadingMessage?: string
  children: React.ReactNode
}

export function ContentStates({
  loading = false, error = null, empty = false,
  emptyMessage = "没有数据", loadingMessage = "加载中...",
  children,
}: ContentStatesProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">{loadingMessage}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <p className="text-red-500 mb-2">加载失败</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return <>{children}</>
}
