import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "DaggerHeart 内容包编辑器 | 可视化制作自定义内容包",
  description:
    "可视化编辑 DaggerHeart 自定义内容包，支持卡牌包、装备包、实时预览和导入导出。",
  alternates: {
    canonical: "/card-editor",
  },
  openGraph: {
    url: "/card-editor",
    title: "DaggerHeart 内容包编辑器 | 可视化制作自定义内容包",
    description: "可视化编辑 DaggerHeart 自定义内容包，支持卡牌包和装备包。",
  },
}

export default function CardEditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
