import type { Metadata } from "next"
import { GithubPagesLegacyNotice } from "@/components/github-pages-legacy-notice"
import HomeClientApp from "@/components/home-client-app"

export const metadata: Metadata = {
  title: {
    absolute: "DHSheet | 匕首之心车卡器",
  },
  description:
    "DHSheet 是免费开源、非官方的 DaggerHeart（匕首之心）车卡器和角色卡生成器，支持在线创建、编辑、保存、打印角色卡，管理自定义卡包，并导出海豹骰数据。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    title: "DHSheet | 匕首之心车卡器",
    description:
      "免费开源、非官方的 DaggerHeart（匕首之心）角色卡生成器，支持在线编辑、打印导出、自定义卡包和海豹骰数据导出。",
  },
  twitter: {
    card: "summary",
    title: "DHSheet | 匕首之心车卡器",
    description:
      "免费开源、非官方的 DaggerHeart（匕首之心）角色卡生成器和管理工具。",
  },
}

export default function HomePage() {
  return (
    <>
      <GithubPagesLegacyNotice />
      <HomeClientApp />
    </>
  )
}
