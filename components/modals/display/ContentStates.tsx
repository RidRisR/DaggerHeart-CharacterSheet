"use client"

import React from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

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
  emptyMessage, loadingMessage,
  children,
}: ContentStatesProps) {
  const t = useTranslation()
  const resolvedEmptyMessage = emptyMessage ?? t("contentStates.empty")
  const resolvedLoadingMessage = loadingMessage ?? t("contentStates.loading")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">{resolvedLoadingMessage}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <p className="text-red-500 mb-2">{t("contentStates.failed")}</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-gray-500">{resolvedEmptyMessage}</p>
      </div>
    )
  }

  return <>{children}</>
}
