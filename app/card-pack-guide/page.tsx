import type { Metadata } from "next"
import Link from "next/link"
import { MarkdownGuide } from "@/components/guides/markdown-guide"
import { APP_TITLE } from "@/lib/seo"
import userGuideContent from "@/public/自定义卡包指南和示例/用户指南.md"
import aiGuideContent from "@/public/自定义卡包指南和示例/AI-卡包创作指南.md"

export const metadata: Metadata = {
  title: `DaggerHeart 高级卡包创作指南 | ${APP_TITLE}`,
  description:
    "DaggerHeart 自定义卡包制作指南，介绍卡包 JSON 结构、字段定义、卡牌导入、AI 辅助创作和卡包编辑器使用方式。",
  alternates: {
    canonical: "/card-pack-guide",
  },
  openGraph: {
    url: "/card-pack-guide",
    title: "DaggerHeart 高级卡包创作指南",
    description: "制作、导入和管理 DaggerHeart 自定义卡包的完整指南。",
  },
}

export default function CardPackGuidePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link href="/card-manager" className="text-blue-600 hover:text-blue-800 underline">
            返回卡牌管理
          </Link>
          <Link href="/card-editor" className="text-blue-600 hover:text-blue-800 underline">
            打开卡包编辑器
          </Link>
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
            返回主站
          </Link>
        </nav>

        <header className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="mb-3 text-3xl font-bold">DaggerHeart 高级卡包创作指南</h1>
          <p className="max-w-3xl text-sm leading-6 text-gray-600">
            本页面整理自工具内的卡包创作说明，适合需要制作、导入、维护 DaggerHeart 自定义卡牌包的玩家和主持人。
          </p>
        </header>

        <div className="space-y-8">
          <article className="rounded-lg border bg-white p-6 shadow-sm">
            <MarkdownGuide content={userGuideContent} />
          </article>

          <article className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b pb-3 text-2xl font-bold text-gray-900">
              AI 辅助卡包创作指南
            </h2>
            <MarkdownGuide content={aiGuideContent} />
          </article>
        </div>
      </div>
    </main>
  )
}
