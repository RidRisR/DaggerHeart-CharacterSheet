"use client"

import { useState } from "react"
import { AlertTriangle, ExternalLink, X } from "lucide-react"

import { Button } from "@/components/ui/button"

const DEADLINE_LABEL = "2026年6月30日"
const PRIMARY_SITE_URL = "https://dhsheet.site/"

export function GithubPagesLegacyNotice() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) {
    return null
  }

  return (
    <section className="print:hidden w-full px-3 pt-4 pb-3">
      <div className="mx-auto max-w-5xl rounded-md border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
              <span>GitHub Pages 旧站数据导出提醒</span>
            </div>
            <div className="space-y-2 text-sm leading-6">
              <p>
                我们现在已经提供新的正式站点：
                <a
                  href={PRIMARY_SITE_URL}
                  className="ml-1 font-medium underline underline-offset-4 hover:text-amber-800"
                >
                  {PRIMARY_SITE_URL}
                </a>
              </p>
              <p>
                继续同时维护 GitHub Pages 旧站和新的正式站点，可能会导致浏览器本地数据不同步，并造成两个版本长期分叉。
                为了让后续更新、修复和数据行为保持一致，GitHub Pages 版本将在
                <strong className="mx-1">{DEADLINE_LABEL}</strong>
                后不再作为独立站点维护，并将跳转到正式站点。
              </p>
              <p>
                当前，您的所有数据（包括角色卡和卡包数据）都保存在当前浏览器本地，因此保存在 GitHub Pages 地址下的数据不会自动出现在新站。
                建议你现在打开正式站点使用；如果这里还有旧数据，请在截止日前从本页面底部「导出」菜单导出，并在正式站点导入。
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
            <Button asChild className="bg-amber-900 text-white hover:bg-amber-800">
              <a href={PRIMARY_SITE_URL} target="_blank" rel="noopener noreferrer">
                打开正式站点
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-amber-300 bg-white/60 text-amber-950 hover:bg-amber-100"
              onClick={() => setIsVisible(false)}
            >
              关闭提示
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
