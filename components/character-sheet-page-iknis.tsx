"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSheetStore } from "@/lib/sheet-store"
import { PageHeader } from "@/components/page-header"

// 导入拆分的组件
import { UpgradeItem } from "@/components/character-sheet-iknis-sections/upgrade-item"
import { ScrapItem } from "@/components/character-sheet-iknis-sections/scrap-item"
import { UpgradeSlots } from "@/components/character-sheet-iknis-sections/upgrade-slots"
import {
  UPGRADE_CONFIGS,
  PRECOMPILED_TIER2_CONFIGS,
  PRECOMPILED_TIER3_CONFIGS,
  PRECOMPILED_TIER4_CONFIGS
} from "@/components/character-sheet-iknis-sections/upgrade-configs"

export default function CharacterSheetModulePage() {
  const { sheetData, updateArmorTemplateField, updateScrapMaterial } = useSheetStore()
  const armorTemplate = sheetData.armorTemplate || {}
  const scrapMaterials = armorTemplate.scrapMaterials

  return (
    <>

      <div className="w-full max-w-[210mm] mx-auto">
        <div
          className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm" }}
        >
          {/* Header Section - 黑色顶盖 */}
          <PageHeader />

          {/* Page Title */}
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-800">主板模块</h1>
          </div>


          <div className="grid grid-cols-[1fr,1.2fr] gap-x-6">
            {/* Left Column */}
            <div className="flex flex-col">
              {/* Iknis Section */}
              <div className="border-2 border-gray-800 p-2 rounded-md h-full">
                <Input
                  type="text"
                  placeholder="伊科尼斯武装名称"
                  className="h-8 w-full mb-1 text-center font-bold print-empty-hide"
                  value={armorTemplate.weaponName || ''}
                  onChange={(e) => updateArmorTemplateField('weaponName', e.target.value)}
                />

                <div className="mb-1.5">
                  <h3 className="font-bold text-xs mb-0.5">武器属性</h3>
                  <ToggleGroup
                    type="single"
                    value={armorTemplate.weaponAttribute || ''}
                    onValueChange={(value) => updateArmorTemplateField('weaponAttribute', value)}
                    className="grid grid-cols-3 gap-x-1.5 gap-y-0.5"
                  >
                    <ToggleGroupItem value="agility" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">敏捷</ToggleGroupItem>
                    <ToggleGroupItem value="strength" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">力量</ToggleGroupItem>
                    <ToggleGroupItem value="finesse" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">灵巧</ToggleGroupItem>
                    <ToggleGroupItem value="presence" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">风度</ToggleGroupItem>
                    <ToggleGroupItem value="instinct" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">本能</ToggleGroupItem>
                    <ToggleGroupItem value="knowledge" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">知识</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="mb-1.5">
                  <h3 className="font-bold text-xs mb-0.5">攻击范围和伤害骰</h3>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <ToggleGroup
                      type="single"
                      value={armorTemplate.attackRange || ''}
                      onValueChange={(value) => updateArmorTemplateField('attackRange', value)}
                      className="contents"
                    >
                      <ToggleGroupItem value="melee" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">近战  d12+1</ToggleGroupItem>
                      <ToggleGroupItem value="far" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">远  d8+1</ToggleGroupItem>
                      <ToggleGroupItem value="near" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">邻近  d10+2</ToggleGroupItem>
                      <ToggleGroupItem value="very-far" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">极远  d6+1</ToggleGroupItem>
                      <ToggleGroupItem value="close" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">近距离  d10</ToggleGroupItem>
                    </ToggleGroup>
                    <input
                      type="text"
                      value={armorTemplate.customRangeAndDamage || ''}
                      onChange={(e) => updateArmorTemplateField('customRangeAndDamage', e.target.value)}
                      className="border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 px-1.5 py-0.5 text-xs text-center print-empty-hide"
                      placeholder="强化后范围和伤害骰"
                    />
                  </div>
                </div>

                <div className="mb-1">
                  <h3 className="font-bold text-xs mb-0.5">伤害属性</h3>
                  <ToggleGroup
                    type="single"
                    value={armorTemplate.damageType || ''}
                    onValueChange={(value) => updateArmorTemplateField('damageType', value)}
                    className="flex gap-2"
                  >
                    <ToggleGroupItem value="physical" className="px-2 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">物理</ToggleGroupItem>
                    <ToggleGroupItem value="tech" className="px-2 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-300 data-[state=on]:text-black">科技</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <p className="text-xs bg-gray-100 px-1 py-0.5 rounded border border-gray-300">
                  <span className="font-bold">连结:</span> 你的伤害掷骰获得等同于你等级的加值。
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col h-full space-y-3">
              {/* Weapon Description */}
              <div className="border-2 border-gray-800 p-2 rounded-md flex-1 flex flex-col">
                <div className="text-center font-bold bg-gray-300 text-black -mt-2 -mx-2 mb-1.5 py-0.5 text-sm">
                  武装描述
                </div>
                <textarea
                  placeholder="描述你的武装的外观、特性和背景故事..."
                  value={armorTemplate.description || ''}
                  onChange={(e) => updateArmorTemplateField('description', e.target.value)}
                  className="flex-1 w-full min-h-[3rem] p-1.5 text-xs border border-gray-300 rounded bg-gray-50 print:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none print-empty-hide"
                />
              </div>
              {/* Upgrade Slots */}
              <div className="border-2 border-gray-800 p-2 rounded-md flex-1">
                <div className="text-center font-bold bg-gray-300 text-black -mt-2 -mx-2 mb-1.5 py-0.5 text-sm">
                  强化件插槽
                </div>
                <p className="text-center text-xs mb-1.5">从两个插槽开始。每位阶解锁1个。</p>
                <UpgradeSlots />
              </div>
            </div>
          </div>

          {/* Upgrades Section */}
          <div className="border-2 border-gray-800 p-2 mt-2 rounded-md">
            <div className="text-center font-bold bg-gray-300 text-black -mt-2 -mx-2 mb-2 py-0.5 text-sm">
              强化件
            </div>
            <div className="grid grid-cols-2 gap-x-2">
              {/* 左栏：基础强化件 */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-0.5">基础强化件</h4>
                <div className="space-y-1">
                  {UPGRADE_CONFIGS.map((config, index) => (
                    <UpgradeItem
                      key={index}
                      title={config.title}
                      cost={config.cost}
                      checkboxes={config.checkboxes}
                      scrapMaterials={scrapMaterials}
                    />
                  ))}
                </div>
              </div>

              {/* 右栏：预编译强化件 */}
              <div className="space-y-2">
                {/* 预编译：二阶 */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-0.5">预编译：二阶</h4>
                  <div className="space-y-1">
                    {PRECOMPILED_TIER2_CONFIGS.map((config, index) => (
                      <UpgradeItem
                        key={index}
                        title={config.title}
                        cost={config.cost}
                        checkboxes={config.checkboxes}
                        scrapMaterials={scrapMaterials}
                      />
                    ))}
                  </div>
                </div>

                {/* 预编译：三阶 */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-0.5">预编译：三阶</h4>
                  <div className="space-y-1">
                    {PRECOMPILED_TIER3_CONFIGS.map((config, index) => (
                      <UpgradeItem
                        key={index}
                        title={config.title}
                        cost={config.cost}
                        checkboxes={config.checkboxes}
                        scrapMaterials={scrapMaterials}
                      />
                    ))}
                  </div>
                </div>

                {/* 预编译：四阶 */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-0.5">预编译：四阶</h4>
                  <div className="space-y-1">
                    {PRECOMPILED_TIER4_CONFIGS.map((config, index) => (
                      <UpgradeItem
                        key={index}
                        title={config.title}
                        cost={config.cost}
                        checkboxes={config.checkboxes}
                        scrapMaterials={scrapMaterials}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scrap & Electronic Coins Section */}
          <div className="grid grid-cols-[3fr_1fr] gap-x-2 mt-2">
            {/* Scrap List */}
            <div className="border-2 border-gray-800 p-2 rounded-md">
              <div className="text-center font-bold bg-gray-300 text-black -mt-2 -mx-2 mb-1.5 py-0.5 text-sm">
                废料收集
              </div>
              <div className="grid grid-cols-4 gap-x-3 gap-y-1">
                {/* 碎片 (d6) */}
                <div>
                  <p className="font-bold text-sm mb-0.5">碎片 (d6)</p>
                  <div className="space-y-0">
                    <ScrapItem num="1" name="齿轮" category="fragments" index={0} />
                    <ScrapItem num="2" name="线圈" category="fragments" index={1} />
                    <ScrapItem num="3" name="缆线" category="fragments" index={2} />
                    <ScrapItem num="4" name="扳机" category="fragments" index={3} />
                    <ScrapItem num="5" name="镜头" category="fragments" index={4} />
                    <ScrapItem num="6" name="水晶" category="fragments" index={5} />
                  </div>
                </div>
                {/* 金属 (D8) */}
                <div>
                  <p className="font-bold text-sm mb-0.5">金属 (D8)</p>
                  <div className="space-y-0">
                    <ScrapItem num="1" name="铝" category="metals" index={0} />
                    <ScrapItem num="3" name="铜" category="metals" index={1} />
                    <ScrapItem num="5" name="钴" category="metals" index={2} />
                    <ScrapItem num="6" name="银" category="metals" index={3} />
                    <ScrapItem num="7" name="铂" category="metals" index={4} />
                    <ScrapItem num="8" name="金" category="metals" index={5} />
                  </div>
                </div>
                {/* 组件 (D10) */}
                <div>
                  <p className="font-bold text-sm mb-0.5">组件 (D10)</p>
                  <div className="space-y-0">
                    <ScrapItem num="1" name="保险丝" category="components" index={0} />
                    <ScrapItem num="3" name="电路" category="components" index={1} />
                    <ScrapItem num="6" name="碟片" category="components" index={2} />
                    <ScrapItem num="8" name="继电器" category="components" index={3} />
                    <ScrapItem num="9" name="电容器" category="components" index={4} />
                    <ScrapItem num="10" name="电池" category="components" index={5} />
                  </div>
                </div>
                {/* 遗物 */}
                <div>
                  <p className="font-bold text-sm mb-0.5">遗物</p>
                  <div className="space-y-0.5">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <input
                        key={index}
                        type="text"
                        value={armorTemplate.scrapMaterials?.relics?.[index] || ''}
                        onChange={(e) => updateScrapMaterial('relics', index, e.target.value)}
                        className="w-full border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 h-4 text-xs print-empty-hide"
                        placeholder="遗物名称"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Electronic Coins */}
            <div className="border-2 border-gray-800 p-2 rounded-md flex flex-col">
              <div className="text-center font-bold bg-gray-300 text-black -mt-2 -mx-2 mb-1.5 py-0.5 text-sm">
                量子币
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-gray-800 rounded-full flex items-center justify-center">
                  <div className="w-16 h-16 border-2 border-gray-500 rounded-full flex items-center justify-center">
                    <input
                      type="text"
                      value={armorTemplate.electronicCoins === 0 ? '' : (armorTemplate.electronicCoins || '').toString()}
                      onChange={(e) => {
                        const inputValue = e.target.value.trim();
                        // 只允许数字输入
                        if (inputValue === '' || /^\d+$/.test(inputValue)) {
                          let numValue = 0;
                          if (inputValue !== '') {
                            const parsed = parseInt(inputValue, 10);
                            if (!isNaN(parsed) && parsed >= 0) {
                              numValue = parsed;
                            }
                          }
                          updateArmorTemplateField('electronicCoins', numValue);
                        }
                      }}
                      className="w-14 text-center bg-transparent focus:outline-none text-lg font-bold print-empty-hide"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}