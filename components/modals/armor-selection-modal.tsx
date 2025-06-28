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
  const [customLevel, setCustomLevel] = useState<Level | "">("");
  const [customDamageThreshold1, setCustomDamageThreshold1] = useState("");
  const [customDamageThreshold2, setCustomDamageThreshold2] = useState("");
  const [customArmorValue, setCustomArmorValue] = useState<number | "">("");
  const [customFeatureName, setCustomFeatureName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
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
      // 重置所有自定义字段
      setCustomName("");
      setCustomLevel("");
      setCustomDamageThreshold1("");
      setCustomDamageThreshold2("");
      setCustomArmorValue("");
      setCustomFeatureName("");
      setCustomDescription("");
      setIsCustom(false);
      setLevelFilter("");
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
            onClick={() => {
              setIsCustom(false);
              setCustomName("");
              setCustomLevel("");
              setCustomDamageThreshold1("");
              setCustomDamageThreshold2("");
              setCustomArmorValue("");
              setCustomFeatureName("");
              setCustomDescription("");
              onSelect("none");
            }}
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
            onClick={() => {
              if (isCustom) {
                // 如果当前是自定义模式，关闭并清空所有字段
                setIsCustom(false);
                setCustomName("");
                setCustomLevel("");
                setCustomDamageThreshold1("");
                setCustomDamageThreshold2("");
                setCustomArmorValue("");
                setCustomFeatureName("");
                setCustomDescription("");
              } else {
                // 如果当前不是自定义模式，打开自定义
                setIsCustom(true);
              }
            }}
            className={`${isCustom ? "bg-blue-500 text-white" : "text-blue-500 border-blue-500"}`}
          >
            {customName || "自定义护甲"}
          </Button>
        </div>
        {/* 自定义护甲输入区域，移到筛选区下方，仅在 isCustom 时显示 */}
        {isCustom && (
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="自定义护甲名称"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">等级</label>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={customLevel}
                  onChange={e => setCustomLevel(e.target.value as Level | "")}
                >
                  <option value="">选择等级</option>
                  {LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">伤害阈值</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="重伤阈值"
                    value={customDamageThreshold1}
                    onChange={e => setCustomDamageThreshold1(e.target.value)}
                  />
                  <span className="text-gray-500">/</span>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="严重阈值"
                    value={customDamageThreshold2}
                    onChange={e => setCustomDamageThreshold2(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">护甲值</label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="护甲值"
                  value={customArmorValue}
                  onChange={e => setCustomArmorValue(e.target.value ? parseInt(e.target.value) : "")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">特性名称</label>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="特性名称"
                  value={customFeatureName}
                  onChange={e => setCustomFeatureName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder="护甲描述"
                  rows={2}
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => {
                  if (customName) {
                    const damageThreshold = customDamageThreshold1 && customDamageThreshold2
                      ? `${customDamageThreshold1}/${customDamageThreshold2}`
                      : (customDamageThreshold1 || customDamageThreshold2 || "");
                    const customArmorData = {
                      名称: customName,
                      等级: customLevel || "",
                      伤害阈值: damageThreshold,
                      护甲值: customArmorValue || 0,
                      特性名称: customFeatureName,
                      描述: customDescription
                    };
                    onSelect(JSON.stringify(customArmorData));
                    setIsCustom(false);
                    setCustomName("");
                    setCustomLevel("");
                    setCustomDamageThreshold1("");
                    setCustomDamageThreshold2("");
                    setCustomArmorValue("");
                    setCustomFeatureName("");
                    setCustomDescription("");
                  }
                }}
                disabled={!customName}
              >
                确认添加
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setIsCustom(false);
                  setCustomName("");
                  setCustomLevel("");
                  setCustomDamageThreshold1("");
                  setCustomDamageThreshold2("");
                  setCustomArmorValue("");
                  setCustomFeatureName("");
                  setCustomDescription("");
                  onSelect("none");
                }}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                取消
              </Button>
            </div>
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
                    <td className="p-2 whitespace-nowrap">{customLevel}</td>
                    <td className="p-2 whitespace-nowrap">
                      {customDamageThreshold1 && customDamageThreshold2
                        ? `${customDamageThreshold1}/${customDamageThreshold2}`
                        : (customDamageThreshold1 || customDamageThreshold2 || "")}
                    </td>
                    <td className="p-2 whitespace-nowrap">{customArmorValue}</td>
                    <td className="p-2 whitespace-nowrap">{customFeatureName}</td>
                    <td className="p-2 whitespace-nowrap">{customDescription}</td>
                  </tr>
                )}
                {filteredArmorItems.map((armor) => (
                  <tr
                    key={armor.id}
                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setIsCustom(false);
                      setCustomName("");
                      setCustomLevel("");
                      setCustomDamageThreshold1("");
                      setCustomDamageThreshold2("");
                      setCustomArmorValue("");
                      setCustomFeatureName("");
                      setCustomDescription("");
                      onSelect(armor.id);
                    }}
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
