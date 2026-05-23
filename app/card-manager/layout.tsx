import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "DaggerHeart 卡包管理 | 导入和管理自定义卡包",
  description:
    "导入、查看和管理 DaggerHeart 自定义卡牌包，支持 JSON、DHCB 和 ZIP 格式，数据保存在本地浏览器中。",
  alternates: {
    canonical: "/card-manager",
  },
  openGraph: {
    url: "/card-manager",
    title: "DaggerHeart 卡包管理 | 导入和管理自定义卡包",
    description: "导入、查看和管理 DaggerHeart 自定义卡牌包。",
  },
}

export default function CardManagerLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
