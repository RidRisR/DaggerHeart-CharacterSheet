"use client"

import { useState, useEffect } from "react"
import CharacterSheet from "@/components/character-sheet"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import PrintHelper from "@/app/print-helper"
import { loadCharacterData } from "@/lib/storage"

// 默认表单数据，确保包含所有必要的字段
const defaultFormData = {
  characterImage: "",
  characterName: "",
  pronouns: "",
  ancestry1: "",
  ancestry2: "",
  community: "",
  subclass: "",
  level: "",
  profession: "warrior",
  professionSubtitle: "",
  agility: { checked: false, value: "" },
  strength: { checked: false, value: "" },
  finesse: { checked: false, value: "" },
  instinct: { checked: false, value: "" },
  presence: { checked: false, value: "" },
  knowledge: { checked: false, value: "" },
  evasion: "",
  armorValue: "",
  armorBonus: "",
  armorMax: 6,
  armorBoxes: Array(12).fill(false),
  hpMax: 6,
  stressMax: 6,
  hp: Array(18).fill(false),
  stress: Array(18).fill(false),
  minorThreshold: "",
  majorThreshold: "",
  hope: Array(6).fill(false),
  primaryWeaponName: "",
  primaryWeaponTrait: "",
  primaryWeaponDamage: "",
  primaryWeaponFeature: "",
  secondaryWeaponName: "",
  secondaryWeaponTrait: "",
  secondaryWeaponDamage: "",
  secondaryWeaponFeature: "",
  armorName: "",
  armorBaseScore: "",
  armorFeature: "",
  inventory: ["", "", "", "", ""], // 确保有5个空字符串
  inventoryWeapon1Name: "",
  inventoryWeapon1Trait: "",
  inventoryWeapon1Damage: "",
  inventoryWeapon1Feature: "",
  inventoryWeapon1Primary: false,
  inventoryWeapon1Secondary: false,
  inventoryWeapon2Name: "",
  inventoryWeapon2Trait: "",
  inventoryWeapon2Damage: "",
  inventoryWeapon2Feature: "",
  inventoryWeapon2Primary: false,
  inventoryWeapon2Secondary: false,
  gold: Array(20).fill(false),
  experience: ["", "", "", "", ""],
  experienceValues: ["", "", "", "", ""],
  cards: Array(20)
    .fill(0)
    .map(() => ({
      name: "",
      type: "",
      rarity: "",
      level: "",
      description: "",
      imageUrl: "",
    })),
  checkedUpgrades: {
    tier1: {},
    tier2: {},
    tier3: {},
  },
}

export default function PrintAllPages() {
  // 添加状态来存储加载的角色数据
  const [formData, setFormData] = useState<any>(defaultFormData)
  const [isLoading, setIsLoading] = useState(true)

  // 从本地存储加载角色数据
  useEffect(() => {
    try {
      const savedData = loadCharacterData()
      if (savedData) {
        // 确保合并后的数据包含完整的结构
        const mergedData = {
          ...defaultFormData,
          ...savedData,
        }

        // 确保 inventory 是一个包含5个元素的数组
        if (!Array.isArray(mergedData.inventory) || mergedData.inventory.length < 5) {
          mergedData.inventory = Array.isArray(mergedData.inventory)
            ? [...mergedData.inventory, ...Array(5 - mergedData.inventory.length).fill("")]
            : ["", "", "", "", ""]
        }

        setFormData(mergedData)
      }
    } catch (error) {
      console.error("Error loading character data:", error)
      // 如果加载失败，使用默认数据
      setFormData(defaultFormData)
    }
    setIsLoading(false)
  }, [])

  // 页面加载后自动触发打印
  useEffect(() => {
    // 只有在数据加载完成后才触发打印
    if (!isLoading) {
      // 给浏览器一点时间来渲染页面
      const timer = setTimeout(() => {
        window.print()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isLoading])

  // 如果数据还在加载中，显示加载提示
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">加载中...</div>
  }

  return (
    <div className="print-all-pages">
      <PrintHelper />

      {/* 打印时的返回按钮，只在屏幕上显示，打印时隐藏 */}
      <div className="fixed top-4 left-4 z-50 print:hidden">
        <button
          onClick={() => window.history.back()}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          返回
        </button>
      </div>

      {/* 第一页 */}
      <div className="page-one">
        <CharacterSheet formData={formData} setFormData={setFormData} />
      </div>

      {/* 第二页 */}
      <div className="page-two">
        <CharacterSheetPageTwo formData={formData} setFormData={setFormData} />
      </div>
    </div>
  )
}
