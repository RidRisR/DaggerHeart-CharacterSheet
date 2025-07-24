"use client"

import type React from "react"
import { Input } from "@/components/ui/input"

// Helper component for radio buttons to match the PDF style
const StyledRadio = ({ name, label }: { name: string; label: string }) => (
  <div className="flex items-center gap-1.5">
    <input type="radio" name={name} className="form-radio h-3.5 w-3.5 text-gray-800 focus:ring-gray-700 border-gray-500" />
    <label className="text-sm">{label}</label>
  </div>
);

// Helper component for upgrade items
const UpgradeItem = ({
  title,
  cost,
  tier,
  checkboxes = 1,
}: {
  title: string
  cost: string
  tier?: string
  checkboxes?: number
}) => (
  <div className="flex items-start gap-2">
    <div className="flex gap-1 mt-1">
      {Array(checkboxes).fill(0).map((_, i) => (
        <span key={i} className="inline-block w-4 h-4 border border-gray-800 bg-white" style={{ borderRadius: '2px' }}></span>
      ))}
    </div>
    <div>
      <p className="text-sm font-bold leading-tight">{title}</p>
      <p className="text-[10px] text-gray-600 leading-tight">{cost}</p>
      {tier && <p className="text-[10px] text-gray-500 font-semibold leading-tight">{tier}</p>}
    </div>
  </div>
);

// Helper component for the scrap material list
const ScrapItem = ({ num, name }: { num: string; name: string }) => (
  <div className="flex items-center gap-2">
    <span>{num}.</span>
    <span>{name}</span>
    <div className="flex-grow border-b-2 border-gray-400 h-4"></div>
  </div>
);


export default function CharacterSheetModulePage() {
  return (
    <>
      {/* This empty div is a placeholder for any fixed buttons, matching other pages */}
      <div></div>

      <div className="w-full max-w-[210mm] mx-auto">
        <div
          className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm" }}
        >
          {/* Page Header */}
          <div className="bg-gray-800 text-white p-2 mb-2 flex items-center justify-center rounded-t-md">
            <h1 className="text-2xl font-bold tracking-widest">主板模块</h1>
          </div>

          {/* Top Section: Name & Description */}
          <div className="grid grid-cols-2 gap-4 mb-2">
            <Input type="text" placeholder="名字" className="h-8" />
            <Input type="text" placeholder="描述你的武装" className="h-8" />
          </div>

          <div className="grid grid-cols-[1fr,1.2fr] gap-x-6">
            {/* Left Column */}
            <div className="flex flex-col">
              {/* Iknis Section */}
              <div className="border-2 border-gray-800 p-3 rounded-md mb-2">
                <h2 className="text-xl font-bold mb-2 text-center">伊克尼斯</h2>

                <div className="mb-3">
                  <h3 className="font-bold text-sm mb-1">选择一项使用武器的属性</h3>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                    <StyledRadio name="weapon-attr" label="敏捷" />
                    <StyledRadio name="weapon-attr" label="力量" />
                    <StyledRadio name="weapon-attr" label="灵巧" />
                    <StyledRadio name="weapon-attr" label="风度" />
                    <StyledRadio name="weapon-attr" label="本能" />
                    <StyledRadio name="weapon-attr" label="知识" />
                  </div>
                </div>

                <div className="mb-3">
                  <h3 className="font-bold text-sm mb-1">选择武器攻击范围和伤害骰</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <StyledRadio name="weapon-range" label="近战 - d12+1" />
                    <StyledRadio name="weapon-range" label="远 - d8+1" />
                    <StyledRadio name="weapon-range" label="临近 - d10+2" />
                    <StyledRadio name="weapon-range" label="极远 - d6+1" />
                    <StyledRadio name="weapon-range" label="近距离 - d10" />
                  </div>
                </div>

                <div className="mb-2">
                  <h3 className="font-bold text-sm mb-1">选择武器的伤害属性</h3>
                  <div className="flex gap-4">
                    <StyledRadio name="damage-type" label="物理" />
                    <StyledRadio name="damage-type" label="科技" />
                  </div>
                </div>

                <p className="text-xs bg-gray-100 p-1 rounded border border-gray-300">
                  <span className="font-bold">连结:</span> 你的伤害掷骰获得等同于你等级的加值。
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col">
              {/* Upgrade Slots */}
              <div className="border-2 border-gray-800 p-3 rounded-md h-full">
                <div className="text-center font-bold bg-gray-300 -mt-3 -mx-3 mb-2 py-1">
                  强化件插槽
                </div>
                <p className="text-center text-xs mb-3">从两个插槽开始。每位阶解锁1个。</p>
                <div className="space-y-3 px-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-6 h-6 border-2 border-black rounded-full"></div>
                      <div className="flex-grow border-b-2 border-gray-400 h-4"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upgrades Section */}
          <div className="border-2 border-gray-800 p-3 mt-3 rounded-md">
            <div className="text-center font-bold bg-gray-300 -mt-3 -mx-3 mb-3 py-1">
              强化件
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {/* Left Column of Upgrades */}
              <div className="space-y-3">
                <UpgradeItem checkboxes={2} title="力量: +1伤害" cost="3齿轮, 2镜头, 4铝, 1电容器" />
                <UpgradeItem title="屏蔽: +1护甲值" cost="3电线, 2银, 2铂金, 3保险丝" />
                <UpgradeItem title="收敛: +1攻击检定" cost="4线圈, 2水晶, 5金, 3圆盘" />
                <UpgradeItem title="增幅: 额外掷一个伤害骰, 然后弃掉结果中最小的一个骰子" cost="4水晶, 4钴, 4铜, 4电容器" />
                <UpgradeItem checkboxes={2} title="扩域: 将攻击范围增加一级 (近战到临近、近到远等)。" cost="5镜头, 3银, 2电路, 2继电器" />
                <UpgradeItem title="拒绝: +2护甲值" cost="6线圈, 3线, 2铜, 4电池" />
                <UpgradeItem title="指针: +2攻击检定" cost="10线, 7金, 5保险丝, 5电路, 2电池" />
                <UpgradeItem title="拆分: 当你进行攻击时, 标记一个压力点以瞄准范围内的另一个生物。" cost="12齿轮, 5镜头, 15铝, 9继电器" />
                <UpgradeItem checkboxes={2} title="修复: 当你造成严重伤害时, 清除一点你得生命值" cost="6线圈, 4线, 1水晶, 5钴, 5银, 7继电器, 2电池" />
                <UpgradeItem title="震慑: 当你的攻击骰出关键成功时, 目标必须标记一点压力。" cost="6触发器, 8铜, 9铝, 10光盘" />
              </div>
              {/* Right Column of Upgrades */}
              <div className="space-y-3">
                <UpgradeItem checkboxes={2} title="烧录: +2伤害" cost="11触发器, 11铂金, 11电路, 7光盘" tier="预编译: 二阶" />
                <UpgradeItem title="捕获: 你可以在受到伤害时额外标记一个护甲槽从而额外降低一点伤害。" cost="26齿轮, 13金, 15继电器, 8电池" tier="预编译: 二阶" />
                <UpgradeItem title="触发: 在成功命中后你可以标记两点压力来让目标多标记一点生命值" cost="33触发器, 13水晶, 23钴, 16圆盘" tier="预编译: 二阶" />
                <UpgradeItem title="阻塞: +3护甲值; -1闪避" cost="27水晶, 67铝, 33继电器, 4电容器, 5电池" tier="预编译: 三阶" />
                <UpgradeItem title="压缩: 在进行攻击的同时, 你可以移动至远距离范围内的任意地点" cost="37线圈, 43银, 67保险丝, 12电容器" tier="预编译: 三阶" />
                <UpgradeItem checkboxes={2} title="隐藏: +3伤害" cost="28触发器, 28电路, 28继电器, 1遗物" tier="预编译: 三阶" />
                <UpgradeItem title="追踪: 你可以标记2点压力以重新进行一次攻击检定" cost="75齿轮, 67透镜, 30铜, 33电路" tier="预编译: 四阶" />
                <UpgradeItem title="覆写: 你的攻击掷骰具有优势" cost="63电线, 71金, 58圆盘, 5遗物" tier="预编译: 四阶" />
              </div>
            </div>
          </div>

          {/* Scrap & Current Section */}
          <div className="grid grid-cols-[2fr_1fr] gap-x-6 mt-3">
            {/* Scrap List */}
            <div className="border-2 border-gray-800 p-3 rounded-md">
              <div className="text-center font-bold bg-gray-300 -mt-3 -mx-3 mb-3 py-1">
                废料系列
              </div>
              <div className="grid grid-cols-2 gap-x-8 text-sm">
                <div>
                  <p className="font-bold">碎片 (d6)</p>
                  <div className="pl-2 space-y-1 mt-1">
                    <ScrapItem num="1" name="齿轮" />
                    <ScrapItem num="2" name="线圈" />
                    <ScrapItem num="3" name="线" />
                    <ScrapItem num="4" name="触发" />
                    <ScrapItem num="5" name="镜头" />
                    <ScrapItem num="6" name="水晶" />
                  </div>
                </div>
                <div>
                  <p className="font-bold">金属 (D8)</p>
                  <div className="pl-2 space-y-1 mt-1">
                    <ScrapItem num="1" name="铝" />
                    <ScrapItem num="3" name="铜" />
                    <ScrapItem num="5" name="钴" />
                    <ScrapItem num="6" name="银" />
                    <ScrapItem num="7" name="铂" />
                    <ScrapItem num="8" name="金" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="font-bold">组件 (D10)</p>
                  <div className="pl-2 space-y-1 mt-1">
                    <ScrapItem num="1" name="保险丝" />
                    <ScrapItem num="3" name="电路" />
                    <ScrapItem num="6" name="碟片" />
                    <ScrapItem num="8" name="继电器" />
                    <ScrapItem num="9" name="电容器" />
                    <ScrapItem num="10" name="电池" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="font-bold">遗物</p>
                  <div className="pl-2 space-y-1 mt-1">
                    <div className="border-b-2 border-gray-400 h-5 mt-2"></div>
                    <div className="border-b-2 border-gray-400 h-5"></div>
                    <div className="border-b-2 border-gray-400 h-5"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Current Meter */}
            <div className="flex flex-col justify-center items-center">
              <p className="font-bold">电流量程</p>
              <div className="w-24 h-24 mt-2 border-4 border-gray-800 rounded-full flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-gray-500 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-left text-xs text-gray-400 mt-2">
            Daggerheart © Darrington Press 2025
          </div>
        </div>
      </div>
    </>
  )
}