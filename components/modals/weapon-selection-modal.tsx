"use client"
import { allWeapons } from "@/data/list/all-weapons";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect, useState, useRef } from 'react'; // Added useRef
import InfiniteScroll from 'react-infinite-scroll-component'; // Added import

const ITEMS_PER_PAGE = 30; // Define items per page

const LEVELS = ["T1", "T2", "T3", "T4"] as const;
const CHECKS = ["敏捷", "灵巧", "知识", "力量", "本能", "风度"] as const;
const ATTRIBUTES = ["物理", "魔法"] as const;
const RANGES = ["近战", "邻近", "近距离", "远距离", "极远"] as const;
const LOADS = ["单手", "双手"] as const;

type Level = typeof LEVELS[number];
type Check = typeof CHECKS[number];
type Attribute = typeof ATTRIBUTES[number];
type Range = typeof RANGES[number];
type Load = typeof LOADS[number];

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
  const [customLevel, setCustomLevel] = useState<Level | "">("");
  const [customCheck, setCustomCheck] = useState<Check | "">("");
  const [customAttribute, setCustomAttribute] = useState<Attribute | "">("");
  const [customRange, setCustomRange] = useState<Range | "">("");
  const [customDamage, setCustomDamage] = useState("");
  const [customLoad, setCustomLoad] = useState<Load | "">("");
  const [customFeatureName, setCustomFeatureName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  // 新增筛选状态
  const [levelFilter, setLevelFilter] = useState<Level | "">("");
  const [checkFilter, setCheckFilter] = useState<Check | "">("");
  const [attributeFilter, setAttributeFilter] = useState<Attribute | "">("");
  const [rangeFilter, setRangeFilter] = useState<Range | "">("");
  // 新增主/副武器筛选
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<"" | "primary" | "secondary">("");

  // State for pagination
  const [displayedWeapons, setDisplayedWeapons] = useState<Weapon[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);


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

  // Effect to update displayed weapons when filters change or modal opens
  useEffect(() => {
    if (isOpen) {
      const initialDisplay = filteredWeapons.slice(0, ITEMS_PER_PAGE);
      setDisplayedWeapons(initialDisplay);
      setHasMore(filteredWeapons.length > ITEMS_PER_PAGE);
      if (scrollableContainerRef.current) {
        scrollableContainerRef.current.scrollTop = 0; // Reset scroll position
      }
    }
  }, [isOpen, filteredWeapons]);


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
      setCustomLevel("");
      setCustomCheck("");
      setCustomAttribute("");
      setCustomRange("");
      setCustomDamage("");
      setCustomLoad("");
      setCustomFeatureName("");
      setCustomDescription("");
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Function to fetch more data for infinite scroll
  const fetchMoreData = () => {
    if (displayedWeapons.length >= filteredWeapons.length) {
      setHasMore(false);
      return;
    }
    const nextItems = filteredWeapons.slice(
      displayedWeapons.length,
      displayedWeapons.length + ITEMS_PER_PAGE
    );
    setDisplayedWeapons(prevItems => [...prevItems, ...nextItems]);
    setHasMore((displayedWeapons.length + nextItems.length) < filteredWeapons.length);
  };

  // 选择自定义武器类型
  const customWeaponType: 'primary' | 'secondary' = weaponSlotType === 'secondary' ? 'secondary' : 'primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <h2 className="text-lg sm:text-xl font-bold flex-1">{title}</h2>
          <Button
            variant="destructive"
            onClick={() => {
              setIsCustom(false);
              setCustomName("");
              setCustomLevel("");
              setCustomCheck("");
              setCustomAttribute("");
              setCustomRange("");
              setCustomDamage("");
              setCustomLoad("");
              setCustomFeatureName("");
              setCustomDescription("");
              onSelect("none", customWeaponType);
            }}
            className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto min-h-[2.5rem]"
            size="sm"
          >
            清除选择
          </Button>
        </div>
        {/* 筛选区域 */}
        <div className="flex flex-wrap gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gray-50 border-b border-gray-200 items-center">
          {/* 等级 */}
          <select className="border rounded px-1 sm:px-2 py-1 text-xs sm:text-sm min-h-[2rem] sm:min-h-[2.25rem]" value={levelFilter} onChange={e => setLevelFilter(e.target.value as Level | "")}>
            <option value="">等级(全部)</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {/* 类型 - Conditionally render this filter */}
          {weaponSlotType === "inventory" && (
            <select className="border rounded px-1 sm:px-2 py-1 text-xs sm:text-sm min-h-[2rem] sm:min-h-[2.25rem]" value={weaponTypeFilter} onChange={e => setWeaponTypeFilter(e.target.value as "" | "primary" | "secondary")}>
              <option value="">类型(全部)</option>
              <option value="primary">主武器</option>
              <option value="secondary">副武器</option>
            </select>
          )}
          {/* 属性 */}
          <select className="border rounded px-1 sm:px-2 py-1 text-xs sm:text-sm min-h-[2rem] sm:min-h-[2.25rem]" value={attributeFilter} onChange={e => setAttributeFilter(e.target.value as Attribute | "")}>
            <option value="">属性(全部)</option>
            {ATTRIBUTES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {/* 范围 */}
          <select className="border rounded px-1 sm:px-2 py-1 text-xs sm:text-sm min-h-[2rem] sm:min-h-[2.25rem]" value={rangeFilter} onChange={e => setRangeFilter(e.target.value as Range | "")}>
            <option value="">范围(全部)</option>
            {RANGES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {/* 检定 */}
          <select className="border rounded px-1 sm:px-2 py-1 text-xs sm:text-sm min-h-[2rem] sm:min-h-[2.25rem]" value={checkFilter} onChange={e => setCheckFilter(e.target.value as Check | "")}>
            <option value="">检定(全部)</option>
            {CHECKS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => { setLevelFilter(""); setCheckFilter(""); setAttributeFilter(""); setRangeFilter(""); setWeaponTypeFilter(""); }} className="text-xs sm:text-sm min-h-[2rem] sm:min-h-[2.25rem] px-2 sm:px-3">重置筛选</Button>
          <Button
            size="sm"
            variant={isCustom ? "default" : "outline"}
            onClick={() => {
              if (isCustom) {
                // 如果当前是自定义模式，关闭并清空所有字段
                setIsCustom(false);
                setCustomName("");
                setCustomLevel("");
                setCustomCheck("");
                setCustomAttribute("");
                setCustomRange("");
                setCustomDamage("");
                setCustomLoad("");
                setCustomFeatureName("");
                setCustomDescription("");
              } else {
                // 如果当前不是自定义模式，打开自定义
                setIsCustom(true);
              }
            }}
            className={`${isCustom ? "bg-blue-500 text-white" : "text-blue-500 border-blue-500"} text-xs sm:text-sm min-h-[2rem] sm:min-h-[2.25rem] px-2 sm:px-3`}
          >
            {customName || "自定义武器"}
          </Button>
        </div>
        {/* 自定义武器输入区域，移到筛选区下方，仅在 isCustom 时显示 */}
        {isCustom && (
          <div className="px-2 sm:px-4 py-3 bg-blue-50 border-b border-blue-200 min-h-[45vh] max-h-[65vh] sm:min-h-[40vh] sm:max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">名称</label>
                <input
                  className="w-full border rounded px-2 py-2 text-sm min-h-[2.5rem]"
                  placeholder="自定义武器名称"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">等级</label>
                <select
                  className="w-full border rounded px-2 py-2 text-sm min-h-[2.5rem]"
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">检定</label>
                <select
                  className="w-full border rounded px-2 py-2 text-sm min-h-[2.5rem]"
                  value={customCheck}
                  onChange={e => setCustomCheck(e.target.value as Check | "")}
                >
                  <option value="">选择检定</option>
                  {CHECKS.map(check => (
                    <option key={check} value={check}>{check}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">属性</label>
                <select
                  className="w-full border rounded px-2 py-2 text-sm min-h-[2.5rem]"
                  value={customAttribute}
                  onChange={e => setCustomAttribute(e.target.value as Attribute | "")}
                >
                  <option value="">选择属性</option>
                  {ATTRIBUTES.map(attr => (
                    <option key={attr} value={attr}>{attr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">范围</label>
                <select
                  className="w-full border rounded px-2 py-2 text-sm min-h-[2.5rem]"
                  value={customRange}
                  onChange={e => setCustomRange(e.target.value as Range | "")}
                >
                  <option value="">选择范围</option>
                  {RANGES.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">伤害</label>
                <input
                  className="w-full border rounded px-2 py-2 text-sm min-h-[2.5rem]"
                  placeholder="例如: d6"
                  value={customDamage}
                  onChange={e => setCustomDamage(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">负荷</label>
                <select
                  className="w-full border rounded px-2 py-2 text-sm min-h-[2.5rem]"
                  value={customLoad}
                  onChange={e => setCustomLoad(e.target.value as Load | "")}
                >
                  <option value="">选择负荷</option>
                  {LOADS.map(load => (
                    <option key={load} value={load}>{load}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">特性名称</label>
                <input
                  className="w-full border rounded px-2 py-2 text-sm min-h-[2.5rem]"
                  placeholder="特性名称"
                  value={customFeatureName}
                  onChange={e => setCustomFeatureName(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  className="w-full border rounded px-2 py-2 text-sm min-h-[4rem] resize-none"
                  placeholder="武器描述"
                  rows={3}
                  value={customDescription}
                  onChange={e => setCustomDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => {
                  if (customName) {
                    const customWeaponData = {
                      名称: customName,
                      等级: customLevel || "",
                      检定: customCheck || "",
                      属性: customAttribute || "",
                      范围: customRange || "",
                      伤害: customDamage,
                      负荷: customLoad,
                      特性名称: customFeatureName,
                      描述: customDescription,
                      weaponType: customWeaponType
                    };
                    onSelect(JSON.stringify(customWeaponData), customWeaponType);
                    setIsCustom(false);
                    setCustomName("");
                    setCustomLevel("");
                    setCustomCheck("");
                    setCustomAttribute("");
                    setCustomRange("");
                    setCustomDamage("");
                    setCustomLoad("");
                    setCustomFeatureName("");
                    setCustomDescription("");
                  }
                }}
                disabled={!customName}
                className="min-h-[2.5rem] w-full sm:w-auto"
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
                  setCustomCheck("");
                  setCustomAttribute("");
                  setCustomRange("");
                  setCustomDamage("");
                  setCustomLoad("");
                  setCustomFeatureName("");
                  setCustomDescription("");
                  onSelect("none", customWeaponType);
                }}
                className="bg-red-500 hover:bg-red-600 text-white min-h-[2.5rem] w-full sm:w-auto"
              >
                取消
              </Button>
            </div>
          </div>
        )}
        <div className="p-4">
        </div>
        {/* Replace ScrollArea with a div for InfiniteScroll target */}
        <div id="scrollableWeaponDiv" ref={scrollableContainerRef} className="flex-1 overflow-auto"> {/* Changed to flex-1 for better responsive height */}
          <InfiniteScroll
            dataLength={displayedWeapons.length}
            next={fetchMoreData}
            hasMore={hasMore}
            loader={<div className="text-center py-4 text-sm">加载中...</div>}
            endMessage={
              <p style={{ textAlign: 'center' }} className="py-4 text-sm">
                <b>{filteredWeapons.length > 0 ? "已加载全部武器" : "未找到符合条件的武器"}</b>
              </p>
            }
            scrollableTarget="scrollableWeaponDiv"
            scrollThreshold="800px" // Added scrollThreshold
          >
            <div className="p-1 sm:p-2">
              <table className="w-full border-collapse min-w-[max-content]">
                <thead className="bg-gray-800 text-white sticky top-0 z-10">
                  <tr><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">等级</th><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">名称</th><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">类型</th><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">属性</th><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">负荷</th><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">范围</th><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">检定</th><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">伤害</th><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">特性</th><th className="p-1 sm:p-2 text-left whitespace-nowrap text-xs sm:text-sm">描述</th></tr>
                </thead>
                <tbody>
                  {isCustom && customName && (
                    <tr className="bg-blue-50">
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customLevel}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customName}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customWeaponType === 'primary' ? '主武器' : '副武器'}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customAttribute}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customLoad}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customRange}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customCheck}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customDamage}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customFeatureName}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{customDescription}</td>
                    </tr>
                  )}
                  {/* Map over displayedWeapons instead of filteredWeapons */}
                  {displayedWeapons.map((weapon) => (
                    <tr
                      key={weapon.id}
                      className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setIsCustom(false);
                        setCustomName("");
                        setCustomLevel("");
                        setCustomCheck("");
                        setCustomAttribute("");
                        setCustomRange("");
                        setCustomDamage("");
                        setCustomLoad("");
                        setCustomFeatureName("");
                        setCustomDescription("");
                        onSelect(weapon.id, weapon.weaponType);
                      }}
                    ><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.等级}</td><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.名称}</td><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.weaponType === "primary" ? "主武器" : "副武器"}</td><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.属性}</td><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.负荷}</td><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.范围}</td><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.检定}</td><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.伤害}</td><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.特性名称}</td><td className="p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm">{weapon.描述}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* ScrollBar might not be needed here if the parent div handles scrolling */}
          </InfiniteScroll>
          {/* Removed ScrollArea and ScrollBar as InfiniteScroll handles its own scroll container */}
        </div>
      </div>
    </div>
  );
}
