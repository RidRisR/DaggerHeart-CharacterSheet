import type { Metadata } from "next"
import Link from "next/link"
import { CardPackGuideNav, type CardPackGuideNavItem } from "@/components/guides/card-pack-guide-nav"
import { extractMarkdownHeadings } from "@/components/guides/markdown-heading-utils"
import { MarkdownGuide } from "@/components/guides/markdown-guide"
import { APP_TITLE } from "@/lib/seo"
import userGuideContent from "@/public/自定义卡包指南和示例/用户指南.md"
import aiPromptContent from "@/public/自定义卡包指南和示例/AI-卡包生成提示词.md"
import exampleJsonData from "@/public/自定义卡包指南和示例/神州战役卡牌包.json"

const exampleJsonContent = JSON.stringify(exampleJsonData, null, 2)

const guideNavItems: CardPackGuideNavItem[] = [
  {
    id: "user-guide",
    label: "用户指南",
    downloadHref: "/自定义卡包指南和示例/用户指南.md",
    downloadName: "用户指南",
    tocItems: extractMarkdownHeadings(userGuideContent, 3, "user-guide"),
  },
  {
    id: "ai-guide",
    label: "AI 生成提示词",
    downloadHref: "/自定义卡包指南和示例/AI-卡包生成提示词.md",
    downloadName: "AI 卡包生成提示词",
    tocItems: extractMarkdownHeadings(aiPromptContent, 3, "ai-guide"),
  },
  {
    id: "example-card-pack",
    label: "示例卡牌包",
    downloadHref: "/自定义卡包指南和示例/神州战役卡牌包.json",
    downloadName: "示例卡牌包",
  },
]

export const metadata: Metadata = {
  title: `DaggerHeart 高级卡包创作指南 | ${APP_TITLE}`,
  description:
    "DaggerHeart 自定义卡包制作指南，介绍卡包 JSON 结构、字段定义、卡牌导入、AI 卡包生成提示词、示例卡牌包和卡包编辑器使用方式。",
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

        <CardPackGuideNav items={guideNavItems} />

        <div className="space-y-8">
          <article id="user-guide" className="scroll-mt-24 rounded-lg border bg-white p-6 shadow-sm">
            <MarkdownGuide content={userGuideContent} headingIdPrefix="user-guide" />
          </article>

          <article id="ai-guide" className="scroll-mt-24 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b pb-3 text-2xl font-bold text-gray-900">
              AI 卡包生成提示词
            </h2>
            <MarkdownGuide content={aiPromptContent} headingIdPrefix="ai-guide" />
          </article>

          <article id="example-card-pack" className="scroll-mt-24 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b pb-3 text-2xl font-bold text-gray-900">
              示例卡牌包
            </h2>
            <p className="mb-4 text-sm leading-6 text-gray-600">
              这是原高级卡包创作指南中提供的示例卡牌包，可以直接下载并导入到卡牌管理器中测试。
            </p>
            <pre className="max-h-[640px] overflow-auto rounded-lg border bg-gray-50 p-4 text-xs leading-5 text-gray-800">
              <code>{exampleJsonContent}</code>
            </pre>
          </article>
        </div>
      </div>
    </main>
  )
}
