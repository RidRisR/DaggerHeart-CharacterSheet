import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: {
    absolute: "关于匕首之心车卡器 | DaggerHeart Character Sheet",
  },
  description:
    "了解 DaggerHeart（匕首之心）车卡器的功能、开源项目地址、角色卡创建、打印导出、自定义卡包和海豹骰导出支持。",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    url: "/about",
    title: "关于匕首之心车卡器",
    description:
      "免费开源的 DaggerHeart（匕首之心）角色卡生成器和管理工具说明。",
  },
}

const featureItems = [
  "在线创建、编辑和保存 DaggerHeart / 匕首之心角色卡",
  "支持角色卡打印、PDF、HTML、JSON 导出和本地存档管理",
  "提供内置卡牌浏览、卡包管理和自定义卡包编辑器",
  "支持将角色属性导出到海豹骰，方便线上跑团使用",
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 flex flex-wrap gap-3 text-sm">
          <Link href="/" className="text-blue-600 underline hover:text-blue-800">
            返回车卡器
          </Link>
          <Link href="/card-pack-guide" className="text-blue-600 underline hover:text-blue-800">
            自定义卡包指南
          </Link>
          <Link href="/seal-dice-guide" className="text-blue-600 underline hover:text-blue-800">
            海豹骰指南
          </Link>
        </nav>

        <article className="rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">DaggerHeart Character Sheet</p>
          <h1 className="mt-2 text-3xl font-bold">匕首之心车卡器</h1>
          <p className="mt-4 leading-7 text-gray-700">
            这是一个免费开源的 DaggerHeart（匕首之心）角色卡生成器和管理工具，面向需要在线创建角色、维护角色卡、管理卡牌与打印导出的玩家和主持人。
          </p>
          <p className="mt-4 leading-7 text-gray-700">
            项目支持中英双语内容、本地浏览器存档、自定义卡包导入和可视化卡包编辑。所有角色数据默认保存在你的浏览器本地，不需要账号或服务器同步。
          </p>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">主要功能</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {featureItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">相关入口</h2>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/card-manager" className="rounded border px-3 py-2 text-blue-700 hover:bg-blue-50">
                卡包管理
              </Link>
              <Link href="/card-editor" className="rounded border px-3 py-2 text-blue-700 hover:bg-blue-50">
                卡包编辑器
              </Link>
              <Link href="/card-pack-guide" className="rounded border px-3 py-2 text-blue-700 hover:bg-blue-50">
                自定义卡包指南
              </Link>
              <Link href="/seal-dice-guide" className="rounded border px-3 py-2 text-blue-700 hover:bg-blue-50">
                海豹骰指南
              </Link>
              <a
                href="https://github.com/RidRisR/DaggerHeart-CharacterSheet"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded border px-3 py-2 text-blue-700 hover:bg-blue-50"
              >
                GitHub 项目
              </a>
            </div>
          </section>
        </article>
      </div>
    </main>
  )
}
