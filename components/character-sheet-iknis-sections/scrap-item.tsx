"use client"

import React from "react"
import { useSheetStore } from "@/lib/sheet-store"
import type { ScrapMaterials } from './types'

interface ScrapItemProps {
  num: string
  name: string
  category: string
  index: number
}

export const ScrapItem = ({ 
  num, 
  name, 
  category, 
  index 
}: ScrapItemProps) => {
  const { sheetData, updateScrapMaterial } = useSheetStore()
  const materials = sheetData.armorTemplate?.scrapMaterials
  
  const getValue = (): number | string => {
    if (!materials) return 0
    const categoryData = materials[category as keyof ScrapMaterials]
    if (!categoryData || !Array.isArray(categoryData)) return 0
    return categoryData[index] || 0
  }
  
  const value = getValue()

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
      <span className="text-sm text-gray-600 w-6">{num}.</span>
      <span className="text-sm w-12">{name}</span>
      <input
        type="text"
        value={value === 0 ? '' : value.toString()}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-12 text-center border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150 h-4 text-sm print-empty-hide"
        placeholder="0"
      />
    </div>
  );
};