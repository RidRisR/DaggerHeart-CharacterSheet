import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "DaggerHeart 卡包编辑器 | 可视化制作自定义卡牌",
  description:
    "可视化编辑 DaggerHeart 自定义卡包，支持富文本编辑、实时预览、字段定义管理和卡包导入导出。",
  alternates: {
    canonical: "/card-editor",
  },
  openGraph: {
    url: "/card-editor",
    title: "DaggerHeart 卡包编辑器 | 可视化制作自定义卡牌",
    description: "可视化编辑 DaggerHeart 自定义卡包，支持实时预览和导入导出。",
  },
}

export default function CardEditorLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
