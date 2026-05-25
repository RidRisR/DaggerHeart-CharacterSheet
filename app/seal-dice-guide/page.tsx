import type { Metadata } from "next"
import Link from "next/link"
import { DiceUsageGuideContent } from "@/components/guides/dice-usage-guide-content"
import { APP_TITLE } from "@/lib/seo"

export const metadata: Metadata = {
  title: `DaggerHeart 海豹骰使用指南 | ${APP_TITLE}`,
  description:
    "DaggerHeart 海豹骰插件使用指南，包含 .set dh、.sn dh、.dd、.ddr、.gm、角色属性导入和常见问题说明。",
  alternates: {
    canonical: "/seal-dice-guide",
  },
  openGraph: {
    url: "/seal-dice-guide",
    title: "DaggerHeart 海豹骰使用指南",
    description: "DaggerHeart 海豹骰插件命令、角色导入和检定流程说明。",
  },
}

export default function SealDiceGuidePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
            返回主站
          </Link>
          <a
            href="/配套骰子（适用于海豹骰子）/daggerheart.js"
            download
            className="text-blue-600 hover:text-blue-800 underline"
          >
            下载骰子脚本
          </a>
        </nav>

        <header className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="mb-3 text-3xl font-bold">DaggerHeart 海豹骰使用指南</h1>
          <p className="max-w-3xl text-sm leading-6 text-gray-600">
            这里说明如何把角色卡属性导出到海豹骰，并使用 DaggerHeart 检定、希望、恐惧、经历和 GM 恐惧值相关命令。
          </p>
        </header>

        <article className="rounded-lg border bg-white p-6 shadow-sm">
          <DiceUsageGuideContent />
        </article>
      </div>
    </main>
  )
}
