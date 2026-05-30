import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: {
    absolute: "关于 DHSheet | 匕首之心车卡器",
  },
  description:
    "关于 DHSheet：一个由玩家维护的免费开源、非官方 DaggerHeart（匕首之心）车卡器。",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    url: "/about",
    title: "关于 DHSheet",
    description:
      "一个由玩家维护的免费开源、非官方 DaggerHeart（匕首之心）角色卡生成器。",
  },
}

const featureItems = [
  "纯本地使用，角色数据保存在自己的浏览器里，不需要账号，也不会同步到我的服务器",
  "建角色、改角色、在浏览器里保存角色卡",
  "把角色卡打印出来，或者导出成 PDF、HTML、JSON",
  "管理内置卡牌和自定义卡包，也可以自己做卡包",
  "把角色属性导出到海豹骰，线上跑团的时候少抄一点数据",
  "换电脑或换浏览器前，可以先导出角色数据再导入",
]

const roadmapItems = [
  "引入装备卡包，以及对应的导入和管理功能。",
  "做一套 DSL 系统，让卡牌效果可以逐步自动化，而不是所有东西都靠手填。",
  "最近在考虑做国际化。之后可能会有英文版本，所以最近也开始补 SEO，看看能不能吸点歪果人的流量。",
]

const supportItems = [
  "曾经我考虑在这里放一个收款码，但后来想想也算了，我并不需要靠这个东西赚钱。",
  "如果你实在想支持我的话，请在 GitHub 上给这个项目点一个 Star。我看到会很高兴的。",
  "或许等我把所有想做的工作都做完之后，会在这里放一个反馈板，如果真的帮到了你，可以给我吹点彩虹屁。",
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
          <p className="text-sm font-medium text-gray-500">匕首之心车卡器</p>
          <h1 className="mt-2 text-3xl font-bold">DHSheet</h1>
          <p className="mt-4 leading-7 text-gray-700">
            DHSheet 是我做来给自己和朋友跑 DaggerHeart（匕首之心）用的车卡器。一开始只是觉得半位面那个官方网页连导出都没有实在垃圾到没法用，就随手写了个网页工具。没想到一年过去居然还有这么多人在使用，实在是承蒙错爱，不胜感激。
          </p>
          <p className="mt-4 leading-7 text-gray-700">
            它不是 DaggerHeart 官方作品，作者也只有我一个人。一开始它甚至连名字都没有，有些朋友私下叫它“猫猫头车卡器”（因为我曾经的QQ头像是一只猫猫），我觉得也挺好记。
          </p>
          <section className="mt-8">
            <h2 className="text-xl font-semibold">它现在能做这些事</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {featureItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">接下来大概会做什么</h2>
            <p className="mt-3 leading-7 text-gray-700">
              这个项目已经陆陆续续开发了一年多，现在主体功能差不多接近尾声了。后面不会再乱铺很多大功能，主要会集中在几个方向上：
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {roadmapItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">你可以怎么支持我</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              {supportItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">你可能会用到</h2>
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
