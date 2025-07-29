"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useSheetStore } from "@/lib/sheet-store"


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
  }) => {
  const [checked, setChecked] = useState(Array(checkboxes).fill(false));
  const maxCheckboxes = 3; // 最大格子数，用于对齐

  // 分离标题和描述
  const parts = title.split(/：|:/);
  const mainTitle = parts[0];
  const description = parts.length > 1 ? parts.slice(1).join(':').trim() : '';

  return (
    <div className="flex items-start gap-1.5 mb-0.5 text-[9pt] leading-[1.3]">
      {/* 格子区，右对齐，预留最大格子宽度 */}
      <span className="flex flex-shrink-0 items-center justify-end gap-0.5 mt-px" style={{ minWidth: '2.8em' }}>
        {Array(maxCheckboxes - checkboxes).fill(0).map((_, i) => (
          <span key={`empty-${i}`} className="inline-block align-middle w-[1em] h-[1em]" />
        ))}
        {Array(checkboxes).fill(0).map((_, i) => (
          <span
            key={i}
            className={`inline-block align-middle w-[1em] h-[1em] border border-gray-800 ${checked[i] ? 'bg-gray-800' : 'bg-white'} cursor-pointer transition-colors`}
            style={{ borderRadius: '2px', marginLeft: i === 0 && (maxCheckboxes - checkboxes) === 0 ? 0 : '0.08em' }}
            onClick={() => {
              const newChecked = [...checked];
              newChecked[i] = !newChecked[i];
              setChecked(newChecked);
            }}
            tabIndex={0}
            role="checkbox"
            aria-checked={checked[i]}
          ></span>
        ))}
      </span>
      {/* 标题、描述和花费信息 */}
      <div className="flex-1">
        <div>
          <span className="font-bold text-gray-800 mr-1">{mainTitle}</span>
          {description && <span className="text-gray-700">{description}</span>}
        </div>
        <div className="text-[9px] text-gray-500 leading-tight">{cost}</div>
        {tier && <div className="text-[9px] text-gray-500 font-semibold leading-tight">{tier}</div>}
      </div>
    </div>
  );
};

// Helper component for the scrap material list - compact version with number input
const ScrapItem = ({ 
  num, 
  name, 
  category, 
  index 
}: { 
  num: string
  name: string
  category: string
  index: number 
}) => {
  const { sheetData, updateScrapMaterial } = useSheetStore()
  const materials = sheetData.armorTemplate?.scrapMaterials
  const value = materials && (materials as any)[category] ? (materials as any)[category][index] : 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      updateScrapMaterial(category, index, numValue);
    }
  };

  const handleBlur = () => {
    // 失焦时确保显示正确的数值，这个逻辑已经在 store 中处理
  };

  return (
    <div className="flex items-center">
      <span className="text-xs text-gray-600 w-6">{num}.</span>
      <span className="text-xs w-12">{name}</span>
      <input
        type="text"
        value={value === 0 ? '' : value.toString()}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-12 text-center border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 h-4 text-xs print-empty-hide"
        placeholder="0"
      />
    </div>
  );
};


// Component for upgrade slots
const UpgradeSlots = () => {
  const { sheetData, updateUpgradeSlot, updateUpgradeSlotText } = useSheetStore()
  const slots = sheetData.armorTemplate?.upgradeSlots || []

  return (
    <div className="space-y-1 px-3">
      {slots.map((slot, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className={`w-4 h-4 border-2 mt-1 border-black rounded-full cursor-pointer transition-colors ${slot.checked ? 'bg-gray-800' : 'bg-white'}`}
            onClick={() => updateUpgradeSlot(i, !slot.checked, slot.text)}
            tabIndex={0}
            role="checkbox"
            aria-checked={slot.checked}
          ></div>
          <input
            type="text"
            value={slot.text}
            onChange={(e) => updateUpgradeSlotText(i, e.target.value)}
            className="flex-grow border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 h-4 text-sm mt-1 print-empty-hide"
            placeholder="强化件名称"
          />
        </div>
      ))}
    </div>
  );
};

export default function CharacterSheetModulePage() {
  const { sheetData, updateArmorTemplateField, updateScrapMaterial } = useSheetStore()
  const armorTemplate = sheetData.armorTemplate || {}
  return (
    <>
      {/* 固定位置的按钮 - 与其他页面保持一致 */}
      <div></div>

      <div className="w-full max-w-[210mm] mx-auto">
        <div
          className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
          style={{ width: "210mm" }}
        >
          {/* Header Section - 黑色顶盖 */}
          <div className="bg-gray-800 text-white p-1.5 flex items-center rounded-t-md mb-2">
            <div className="flex flex-col">
              <div className="text-[9px]">DAGGERHEART V20250520</div>
            </div>
          </div>
          
          {/* Page Title */}
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-gray-800">主板模块</h1>
          </div>

          {/* Name Section */}
          <div className="mb-1.5">
            <Input 
              type="text" 
              placeholder="武装名称" 
              className="h-8 w-full print-empty-hide"
              value={armorTemplate.weaponName || ''}
              onChange={(e) => updateArmorTemplateField('weaponName', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-[1fr,1.2fr] gap-x-6">
            {/* Left Column */}
            <div className="flex flex-col">
              {/* Iknis Section */}
              <div className="border-2 border-gray-800 p-2 rounded-md h-full">
                <h2 className="text-lg font-bold mb-1 text-center">伊科尼斯</h2>

                <div className="mb-1.5">
                  <h3 className="font-bold text-xs mb-0.5">武器属性</h3>
                  <ToggleGroup 
                    type="single" 
                    value={armorTemplate.weaponAttribute || ''} 
                    onValueChange={(value) => updateArmorTemplateField('weaponAttribute', value)}
                    className="grid grid-cols-3 gap-x-1.5 gap-y-0.5"
                  >
                    <ToggleGroupItem value="agility" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">敏捷</ToggleGroupItem>
                    <ToggleGroupItem value="strength" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">力量</ToggleGroupItem>
                    <ToggleGroupItem value="finesse" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">灵巧</ToggleGroupItem>
                    <ToggleGroupItem value="presence" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">风度</ToggleGroupItem>
                    <ToggleGroupItem value="instinct" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">本能</ToggleGroupItem>
                    <ToggleGroupItem value="knowledge" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">知识</ToggleGroupItem>
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
                      <ToggleGroupItem value="melee" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">近战-d12+1</ToggleGroupItem>
                      <ToggleGroupItem value="far" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">远-d8+1</ToggleGroupItem>
                      <ToggleGroupItem value="near" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">临近-d10+2</ToggleGroupItem>
                      <ToggleGroupItem value="very-far" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">极远-d6+1</ToggleGroupItem>
                      <ToggleGroupItem value="close" className="px-1.5 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">近距离-d10</ToggleGroupItem>
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
                    <ToggleGroupItem value="physical" className="px-2 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">物理</ToggleGroupItem>
                    <ToggleGroupItem value="tech" className="px-2 py-0.5 text-xs rounded border border-gray-400 data-[state=on]:bg-gray-800 data-[state=on]:text-white">科技</ToggleGroupItem>
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
                <div className="text-center font-bold bg-gray-300 -mt-2 -mx-2 mb-1.5 py-0.5 text-sm">
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
                <div className="text-center font-bold bg-gray-300 -mt-2 -mx-2 mb-1.5 py-0.5 text-sm">
                  强化件插槽
                </div>
                <p className="text-center text-xs mb-1.5">从两个插槽开始。每位阶解锁1个。</p>
                <UpgradeSlots />
              </div>
            </div>
          </div>

          {/* Upgrades Section */}
          <div className="border-2 border-gray-800 p-2 mt-2 rounded-md">
            <div className="text-center font-bold bg-gray-300 -mt-2 -mx-2 mb-2 py-0.5 text-sm">
              强化件
            </div>
            <div className="grid grid-cols-2 gap-x-2">
              {/* 左栏：基础强化件 */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-0.5">基础强化件</h4>
                <div className="space-y-1">
                  <UpgradeItem checkboxes={2} title="力量：+1伤害" cost="3齿轮, 2镜头, 4铝, 1电容器" />
                  <UpgradeItem title="屏蔽：+1护甲值" cost="3电线, 2银, 2铂金, 3保险丝" />
                  <UpgradeItem title="收敛：+1攻击检定" cost="4线圈, 2水晶, 5金, 3圆盘" />
                  <UpgradeItem title="增幅：额外掷一个伤害骰，然后弃掉结果中最小的一个骰子" cost="4水晶, 4钴, 4铜, 4电容器" />
                  <UpgradeItem checkboxes={2} title="扩域：将攻击范围增加一级（近战到邻近等）。" cost="5镜头, 3银, 2电路, 2继电器" />
                  <UpgradeItem title="拒绝：+2护甲值" cost="6线圈, 3线, 2铜, 4电池" />
                  <UpgradeItem title="指针：+2攻击检定" cost="10线, 7金, 5保险丝, 5电路, 2电池" />
                  <UpgradeItem title="拆分：当你进行攻击时，标记一个压力点以瞄准范围内的另一个生物。" cost="12齿轮, 5镜头, 15铝, 9继电器" />
                  <UpgradeItem checkboxes={2} title="修复：当你造成严重伤害时，恢复一点生命值" cost="6线圈, 4线, 1水晶, 5钴, 5银, 7继电器, 2电池" />
                  <UpgradeItem title="震慑：当你的攻击骰出关键成功时，目标必须标记一点压力。" cost="6触发器, 8铜, 9铝, 10光盘" />
                </div>
              </div>

              {/* 右栏：预编译强化件 */}
              <div className="space-y-2">
                {/* 预编译：二阶 */}
                <div>
                  <h4 className="text-xs font-bold text-blue-700 mb-0.5">预编译：二阶</h4>
                  <div className="space-y-1">
                    <UpgradeItem checkboxes={2} title="烧录：+2伤害" cost="11触发器, 11铂金, 11电路, 7光盘" />
                    <UpgradeItem title="捕获：你可以在受到伤害时额外标记一个护甲槽。" cost="26齿轮, 13金, 15继电器, 8电池" />
                    <UpgradeItem title="触发：在成功命中后，你可以标记两点压力让目标多标记一点生命值。" cost="33触发器, 13水晶, 23钴, 16圆盘" />
                  </div>
                </div>

                {/* 预编译：三阶 */}
                <div>
                  <h4 className="text-xs font-bold text-purple-700 mb-0.5">预编译：三阶</h4>
                  <div className="space-y-1">
                    <UpgradeItem title="阻塞：+3护甲值；-1闪避" cost="27水晶, 67铝, 33继电器, 4电容器, 5电池" />
                    <UpgradeItem title="压缩：在攻击的同时，你可以移动至远距离范围内的任意地点" cost="37线圈, 43银, 67保险丝, 12电容器" />
                    <UpgradeItem checkboxes={2} title="隐藏：+3伤害" cost="28触发器, 28电路, 28继电器, 1遗物" />
                  </div>
                </div>

                {/* 预编译：四阶 */}
                <div>
                  <h4 className="text-xs font-bold text-red-700 mb-0.5">预编译：四阶</h4>
                  <div className="space-y-1">
                    <UpgradeItem title="追踪：你可以标记2点压力以重新进行一次攻击检定" cost="75齿轮, 67透镜, 30铜, 33电路" />
                    <UpgradeItem title="覆写：你的攻击掷骰具有优势" cost="63电线, 71金, 58圆盘, 5遗物" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scrap & Electronic Coins Section */}
          <div className="grid grid-cols-[3fr_1fr] gap-x-2 mt-2">
            {/* Scrap List */}
            <div className="border-2 border-gray-800 p-2 rounded-md">
              <div className="text-center font-bold bg-gray-300 -mt-2 -mx-2 mb-1.5 py-0.5 text-sm">
                废料收集
              </div>
              <div className="grid grid-cols-4 gap-x-3 gap-y-1">
                {/* 碎片 (d6) */}
                <div>
                  <p className="font-bold text-xs mb-0.5">碎片 (d6)</p>
                  <div className="space-y-0">
                    <ScrapItem num="1" name="齿轮" category="fragments" index={0} />
                    <ScrapItem num="2" name="线圈" category="fragments" index={1} />
                    <ScrapItem num="3" name="线" category="fragments" index={2} />
                    <ScrapItem num="4" name="触发" category="fragments" index={3} />
                    <ScrapItem num="5" name="镜头" category="fragments" index={4} />
                    <ScrapItem num="6" name="水晶" category="fragments" index={5} />
                  </div>
                </div>
                {/* 金属 (D8) */}
                <div>
                  <p className="font-bold text-xs mb-0.5">金属 (D8)</p>
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
                  <p className="font-bold text-xs mb-0.5">组件 (D10)</p>
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
                  <p className="font-bold text-xs mb-0.5">遗物</p>
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
              <div className="text-center font-bold bg-gray-300 -mt-2 -mx-2 mb-1.5 py-0.5 text-sm">
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