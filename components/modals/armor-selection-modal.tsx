"use client"
import { ArmorItem, armorItems } from "@/data/list/armor" // Changed import
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area" // Ensure ScrollBar is imported
import { useEffect, useState, useMemo } from "react"; // Added useEffect
import { Button } from "@/components/ui/button";

interface ArmorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (armorId: string) => void // Assuming armorId is the '名称'
  title: string
}

// Updated Armor interface to match Chinese keys in armor.ts
interface Armor {
  名称: string;
  等级: string;
  伤害阈值: string;
  护甲值: number;
  特性名称: string;
  描述: string;
  // Add an id for React key and selection, can be same as 名称 if unique
  id: string;
}

const LEVELS = ["T1", "T2", "T3", "T4"] as const;
type Level = typeof LEVELS[number];

export function ArmorSelectionModal({ isOpen, onClose, onSelect, title }: ArmorModalProps) {
  const [customName, setCustomName] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [levelFilter, setLevelFilter] = useState<Level | "">("");

  // 处理数据和筛选都放在组件体内，保证 Hook 顺序
  const processedArmorItems: Armor[] = useMemo(() => armorItems.map((armor: ArmorItem) => ({
    ...armor,
    id: armor.名称,
  })), []);

  const filteredArmorItems = useMemo(() => {
    return processedArmorItems.filter(a => {
      if (levelFilter && a.等级 !== levelFilter) return false;
      return true;
    });
  }, [processedArmorItems, levelFilter]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <h2 className="text-xl font-bold">{title}</h2>
          <Button
            variant="destructive"
            onClick={() => { setIsCustom(false); setCustomName(""); onSelect("none"); }}
            className="bg-red-500 hover:bg-red-600 text-white ml-2"
          >
            清除选择
          </Button>
        </div>
        {/* 筛选区域 */}
        <div className="flex flex-wrap gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 items-center">
          <select className="border rounded px-2 py-1 text-sm" value={levelFilter} onChange={e => setLevelFilter(e.target.value as Level | "")}>
            <option value="">等级(全部)</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => setLevelFilter("")}>重置筛选</Button>
          <Button
            size="sm"
            variant={isCustom ? "default" : "outline"}
            onClick={() => setIsCustom(true)}
            className={`ml-auto ${isCustom ? "bg-blue-500 text-white" : "text-blue-500 border-blue-500"}`}
          >
            {customName || "自定义护甲"}
          </Button>
        </div>
        {/* 自定义护甲输入区域，移到筛选区下方，仅在 isCustom 时显示 */}
        {isCustom && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200">
            <input
              className="border rounded px-2 py-1 text-sm flex-1"
              placeholder="自定义名称"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter' && customName) {
                  e.stopPropagation();
                  onSelect(customName);
                  setIsCustom(false);
                  setCustomName("");
                }
              }}
              autoFocus
            />
            <Button size="sm" onClick={e => { e.stopPropagation(); if (customName) { onSelect(customName); setIsCustom(false); setCustomName(""); } }} disabled={!customName}>
              确认
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => { setIsCustom(false); setCustomName(""); onSelect("none"); }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              清除自定义
            </Button>
          </div>
        )}
        <ScrollArea className="h-[calc(80vh-8rem)]">
          <div className="p-2">
            <table className="w-full border-collapse min-w-[max-content]">
              <thead className="bg-gray-800 text-white sticky top-0 z-10">
                <tr><th className="p-2 text-left whitespace-nowrap">名称</th><th className="p-2 text-left whitespace-nowrap">等级</th><th className="p-2 text-left whitespace-nowrap">伤害阈值</th><th className="p-2 text-left whitespace-nowrap">护甲值</th><th className="p-2 text-left whitespace-nowrap">特性名称</th><th className="p-2 text-left whitespace-nowrap">描述</th></tr>
              </thead>
              <tbody>
                {isCustom && customName && (
                  <tr className="bg-blue-50">
                    <td className="p-2 whitespace-nowrap">{customName}</td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                  </tr>
                )}
                {filteredArmorItems.map((armor) => (
                  <tr
                    key={armor.id}
                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => { setIsCustom(false); setCustomName(""); onSelect(armor.id); }}
                  >
                    <td className="p-2 whitespace-nowrap">{armor.名称}</td>
                    <td className="p-2 whitespace-nowrap">{armor.等级}</td>
                    <td className="p-2 whitespace-nowrap">{armor.伤害阈值}</td>
                    <td className="p-2 whitespace-nowrap">{armor.护甲值}</td>
                    <td className="p-2 whitespace-nowrap">{armor.特性名称}</td>
                    <td className="p-2 whitespace-nowrap">{armor.描述}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
}
