"use client"
import { allWeapons } from "@/data/list/all-weapons"; // Updated import
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect, useState } from 'react';

const LEVELS = ["T1", "T2", "T3", "T4"] as const;
const CHECKS = ["敏捷", "灵巧", "知识", "力量", "本能", "风度"] as const;
const ATTRIBUTES = ["物理", "魔法"] as const;
const RANGES = ["近战", "邻近", "近距离", "远距离", "极远"] as const;

type Level = typeof LEVELS[number];
type Check = typeof CHECKS[number];
type Attribute = typeof ATTRIBUTES[number];
type Range = typeof RANGES[number];

interface WeaponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (weaponId: string, weaponType: 'primary' | 'secondary') => void;
  title: string;
  weaponSlotType: "primary" | "secondary" | "inventory";
}

interface Weapon {
  名称: string;
  等级: Level; // Changed from string
  检定: Check; // Changed from string
  属性: Attribute; // Changed from string
  范围: Range; // Changed from string
  伤害: string;
  负荷: string;
  特性名称: string;
  描述: string;
  id: string;
  weaponType: "primary" | "secondary";
}

export function WeaponSelectionModal({ isOpen, onClose, onSelect, title, weaponSlotType }: WeaponModalProps) {
  const [customName, setCustomName] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  // 新增筛选状态
  const [levelFilter, setLevelFilter] = useState<Level | "">("");
  const [checkFilter, setCheckFilter] = useState<Check | "">("");
  const [attributeFilter, setAttributeFilter] = useState<Attribute | "">("");
  const [rangeFilter, setRangeFilter] = useState<Range | "">("");
  // 新增主/副武器筛选
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<"" | "primary" | "secondary">("");

  const availableWeapons: Weapon[] = useMemo(() => {
    if (weaponSlotType === "inventory") {
      return allWeapons; // Use allWeapons directly
    }
    return allWeapons.filter(w => w.weaponType === weaponSlotType);
  }, [weaponSlotType]);

  // 组合筛选逻辑
  const filteredWeapons = useMemo(() => {
    return availableWeapons.filter(w => {
      if (levelFilter && w.等级 !== levelFilter) return false;
      if (checkFilter && w.检定 !== checkFilter) return false;
      if (attributeFilter && w.属性 !== attributeFilter) return false;
      if (rangeFilter && w.范围 !== rangeFilter) return false;
      if (weaponTypeFilter && w.weaponType !== weaponTypeFilter) return false;
      return true;
    });
  }, [availableWeapons, levelFilter, checkFilter, attributeFilter, rangeFilter, weaponTypeFilter]);

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
      // 关闭时清空所有筛选条件和自定义状态
      setLevelFilter("");
      setCheckFilter("");
      setAttributeFilter("");
      setRangeFilter("");
      setWeaponTypeFilter("");
      setIsCustom(false);
      setCustomName("");
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 选择自定义武器类型
  const customWeaponType: 'primary' | 'secondary' = weaponSlotType === 'secondary' ? 'secondary' : 'primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
          <h2 className="text-xl font-bold">{title}</h2>
          <Button
            variant="destructive"
            onClick={() => { setIsCustom(false); setCustomName(""); onSelect("none", customWeaponType); }}
            className="bg-red-500 hover:bg-red-600 text-white ml-2"
          >
            清除选择
          </Button>
        </div>
        {/* 筛选区域 */}
        <div className="flex flex-wrap gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 items-center">
          {/* 等级 */}
          <select className="border rounded px-2 py-1 text-sm" value={levelFilter} onChange={e => setLevelFilter(e.target.value as Level | "")}>
            <option value="">等级(全部)</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {/* 类型 - Conditionally render this filter */}
          {weaponSlotType === "inventory" && (
            <select className="border rounded px-2 py-1 text-sm" value={weaponTypeFilter} onChange={e => setWeaponTypeFilter(e.target.value as "" | "primary" | "secondary")}>
              <option value="">类型(全部)</option>
              <option value="primary">主武器</option>
              <option value="secondary">副武器</option>
            </select>
          )}
          {/* 属性 */}
          <select className="border rounded px-2 py-1 text-sm" value={attributeFilter} onChange={e => setAttributeFilter(e.target.value as Attribute | "")}>
            <option value="">属性(全部)</option>
            {ATTRIBUTES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {/* 范围 */}
          <select className="border rounded px-2 py-1 text-sm" value={rangeFilter} onChange={e => setRangeFilter(e.target.value as Range | "")}>
            <option value="">范围(全部)</option>
            {RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {/* 检定 */}
          <select className="border rounded px-2 py-1 text-sm" value={checkFilter} onChange={e => setCheckFilter(e.target.value as Check | "")}>
            <option value="">检定(全部)</option>
            {CHECKS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => { setLevelFilter(""); setCheckFilter(""); setAttributeFilter(""); setRangeFilter(""); setWeaponTypeFilter(""); }}>重置筛选</Button>
          <Button
            size="sm"
            variant={isCustom ? "default" : "outline"}
            onClick={() => setIsCustom(true)}
            className={`ml-auto ${isCustom ? "bg-blue-500 text-white" : "text-blue-500 border-blue-500"}`}
          >
            {customName || "自定义武器"}
          </Button>
        </div>
        {/* 自定义武器输入区域，移到筛选区下方，仅在 isCustom 时显示 */}
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
                  onSelect(customName, customWeaponType);
                  setIsCustom(false);
                  setCustomName("");
                }
              }}
              autoFocus
            />
            <Button size="sm" onClick={e => { e.stopPropagation(); if (customName) { onSelect(customName, customWeaponType); setIsCustom(false); setCustomName(""); } }} disabled={!customName}>
              确认
            </Button>
          </div>
        )}
        <div className="p-4">
        </div>
        <ScrollArea className="h-[calc(80vh-8rem)]">
          <div className="p-2">
            <table className="w-full border-collapse min-w-[max-content]">
              <thead className="bg-gray-800 text-white sticky top-0 z-10">
                <tr><th className="p-2 text-left whitespace-nowrap">等级</th><th className="p-2 text-left whitespace-nowrap">名称</th><th className="p-2 text-left whitespace-nowrap">类型</th><th className="p-2 text-left whitespace-nowrap">属性</th><th className="p-2 text-left whitespace-nowrap">负荷</th><th className="p-2 text-left whitespace-nowrap">范围</th><th className="p-2 text-left whitespace-nowrap">检定</th><th className="p-2 text-left whitespace-nowrap">伤害</th><th className="p-2 text-left whitespace-nowrap">特性</th><th className="p-2 text-left whitespace-nowrap">描述</th></tr>
              </thead>
              <tbody>
                {isCustom && customName && (
                  <tr className="bg-blue-50">
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap">{customName}</td>
                    <td className="p-2 whitespace-nowrap">{customWeaponType === 'primary' ? '主武器' : '副武器'}</td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                    <td className="p-2 whitespace-nowrap"></td>
                  </tr>
                )}
                {filteredWeapons.map((weapon) => (
                  <tr
                    key={weapon.id}
                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => { setIsCustom(false); setCustomName(""); onSelect(weapon.id, weapon.weaponType); }}
                  ><td className="p-2 whitespace-nowrap">{weapon.等级}</td><td className="p-2 whitespace-nowrap">{weapon.名称}</td><td className="p-2 whitespace-nowrap">{weapon.weaponType === "primary" ? "主武器" : "副武器"}</td><td className="p-2 whitespace-nowrap">{weapon.属性}</td><td className="p-2 whitespace-nowrap">{weapon.负荷}</td><td className="p-2 whitespace-nowrap">{weapon.范围}</td><td className="p-2 whitespace-nowrap">{weapon.检定}</td><td className="p-2 whitespace-nowrap">{weapon.伤害}</td><td className="p-2 whitespace-nowrap">{weapon.特性名称}</td><td className="p-2 whitespace-nowrap">{weapon.描述}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
