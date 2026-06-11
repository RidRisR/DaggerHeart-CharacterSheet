import type { Metadata } from "next"
import Link from "next/link"
import { GuideReader, type GuideGroup } from "@/components/guides/guide-reader"
import { extractMarkdownHeadings } from "@/components/guides/markdown-heading-utils"
import { APP_TITLE } from "@/lib/seo"
import cardUserGuideContent from "@/public/自定义卡包指南和示例/用户指南.md"
import cardAiPromptContent from "@/public/自定义卡包指南和示例/AI-卡包生成提示词.md"
import cardExampleJsonData from "@/public/自定义卡包指南和示例/神州战役卡牌包.json"
import equipmentUserGuideContent from "@/public/自定义装备包指南和示例/用户指南.md"
import equipmentAiPromptContent from "@/public/自定义装备包指南和示例/AI-装备包生成提示词.md"
import equipmentSchemaJsonData from "@/public/schemas/equipment-pack.v1.schema.json"

const cardExampleJsonContent = JSON.stringify(cardExampleJsonData, null, 2)
const equipmentSchemaJsonContent = JSON.stringify(equipmentSchemaJsonData, null, 2)

const extractGuideToc = (content: string, idPrefix: string) => {
  const headings = extractMarkdownHeadings(content, 3, idPrefix)
  return headings[0]?.level === 1 ? headings.slice(1) : headings
}

const guideGroups: GuideGroup[] = [
  {
    id: "card-pack",
    label: "卡牌包",
    description: "创建职业、种族、社群、子职业、领域和扩展卡牌。",
    resources: [
      {
        id: "card-user-guide",
        label: "卡牌包用户指南",
        description: "面向手写 JSON 创作者的卡牌包结构说明、字段规则和导入建议。",
        downloadHref: "/自定义卡包指南和示例/用户指南.md",
        downloadName: "卡牌包用户指南",
        kind: "markdown",
        content: cardUserGuideContent,
        tocItems: extractGuideToc(cardUserGuideContent, "card-user-guide"),
      },
      {
        id: "card-ai-guide",
        label: "AI 卡包生成提示词",
        description: "用于约束 AI 把设定文稿转换为自定义卡牌包 JSON 的提示词。",
        downloadHref: "/自定义卡包指南和示例/AI-卡包生成提示词.md",
        downloadName: "AI 卡包生成提示词",
        kind: "markdown",
        content: cardAiPromptContent,
        tocItems: extractGuideToc(cardAiPromptContent, "card-ai-guide"),
      },
      {
        id: "example-card-pack",
        label: "示例卡牌包",
        description: "可直接下载并导入测试的示例卡牌包 JSON。",
        downloadHref: "/自定义卡包指南和示例/神州战役卡牌包.json",
        downloadName: "示例卡牌包",
        kind: "json",
        content: cardExampleJsonContent,
      },
    ],
  },
  {
    id: "equipment-pack",
    label: "装备包",
    description: "创建可导入内容包管理、并在角色卡装备选择中使用的武器和护甲模板。",
    resources: [
      {
        id: "equipment-user-guide",
        label: "装备包用户指南",
        description: "面向手写 JSON 创作者的装备包结构说明、枚举值、修正项和校验规则。",
        downloadHref: "/自定义装备包指南和示例/用户指南.md",
        downloadName: "装备包用户指南",
        kind: "markdown",
        content: equipmentUserGuideContent,
        tocItems: extractGuideToc(equipmentUserGuideContent, "equipment-user-guide"),
      },
      {
        id: "equipment-ai-guide",
        label: "AI 装备包生成提示词",
        description: "用于约束 AI 把装备设定、表格或草稿转换为装备包 JSON 的提示词。",
        downloadHref: "/自定义装备包指南和示例/AI-装备包生成提示词-含Schema.md",
        downloadName: "AI 装备包生成提示词",
        kind: "markdown",
        content: equipmentAiPromptContent,
        tocItems: extractGuideToc(equipmentAiPromptContent, "equipment-ai-guide"),
      },
      {
        id: "equipment-schema",
        label: "装备包 Schema",
        description: "装备包格式的机器校验规则，适合配置编辑器、校验器或 AI 输出约束。",
        downloadHref: "/自定义装备包指南和示例/equipment-pack.v1.schema.json",
        downloadName: "装备包 Schema",
        kind: "json",
        content: equipmentSchemaJsonContent,
      },
    ],
  },
]

export const metadata: Metadata = {
  title: `DaggerHeart 内容包创作指南 | ${APP_TITLE}`,
  description:
    "DaggerHeart 自定义内容包制作指南，介绍卡牌包、装备包 JSON 结构、导入验证、JSON Schema、AI 生成提示词和示例内容。",
  alternates: {
    canonical: "/card-pack-guide",
  },
  openGraph: {
    url: "/card-pack-guide",
    title: "DaggerHeart 内容包创作指南",
    description: "制作、导入和管理 DaggerHeart 自定义卡牌包与装备包的完整指南。",
  },
}

export default function CardPackGuidePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link href="/card-manager" className="text-blue-600 hover:text-blue-800 underline">
            返回内容包管理
          </Link>
          <Link href="/card-editor" className="text-blue-600 hover:text-blue-800 underline">
            打开内容包编辑器
          </Link>
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
            返回主站
          </Link>
        </nav>

        <header className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="mb-3 text-3xl font-bold">DaggerHeart 内容包创作指南</h1>
          <p className="max-w-3xl text-sm leading-6 text-gray-600">
            本页面整理卡牌包和装备包的创作资料，适合需要手写 JSON、使用 Schema 校验、让 AI 生成内容包，或维护自定义内容的玩家和主持人。
          </p>
        </header>

        <GuideReader groups={guideGroups} />
      </div>
    </main>
  )
}
