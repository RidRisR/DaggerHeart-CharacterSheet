"use client"
import { armorItems } from "@/data/list/armor" // Changed import
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area" // Ensure ScrollBar is imported
import { useEffect, useState } from "react"; // Added useEffect
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
  基本分: number;
  特性名称: string;
  描述: string;
  // Add an id for React key and selection, can be same as 名称 if unique
  id: string;
}

export function ArmorSelectionModal({ isOpen, onClose, onSelect, title }: ArmorModalProps) {
  const [customName, setCustomName] = useState("");
  const [isCustom, setIsCustom] = useState(false);

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

  // Add id to each armor item, using '名称' as id
  const processedArmorItems: Armor[] = armorItems.map((armor) => ({
    ...armor,
    id: armor.名称, // Assuming '名称' is unique and can serve as an ID
  }));

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
        <ScrollArea className="h-[calc(80vh-8rem)]">
          <div className="p-2">
            <table className="w-full border-collapse min-w-[max-content]">
              <thead className="bg-gray-800 text-white sticky top-0 z-10">
                <tr><th className="p-2 text-left whitespace-nowrap">名称</th><th className="p-2 text-left whitespace-nowrap">等级</th><th className="p-2 text-left whitespace-nowrap">伤害阈值</th><th className="p-2 text-left whitespace-nowrap">基本分</th><th className="p-2 text-left whitespace-nowrap">特性名称</th><th className="p-2 text-left whitespace-nowrap">描述</th></tr>
              </thead>
              <tbody>
                <tr className={`border-b border-gray-200 hover:bg-gray-100 cursor-pointer ${isCustom ? 'bg-blue-50' : ''}`}
                  onClick={() => setIsCustom(true)}>
                  <td className="p-2 whitespace-nowrap" colSpan={6}>
                    {isCustom ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="border rounded px-2 py-1 text-sm w-32"
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
                      </div>
                    ) : (
                      <span className="text-blue-600">+ 自定义</span>
                    )}
                  </td>
                </tr>
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
                {processedArmorItems.map((armor) => (
                  <tr
                    key={armor.id}
                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => { setIsCustom(false); setCustomName(""); onSelect(armor.id); }}
                  ><td className="p-2 whitespace-nowrap">{armor.名称}</td><td className="p-2 whitespace-nowrap">{armor.等级}</td><td className="p-2 whitespace-nowrap">{armor.伤害阈值}</td><td className="p-2 whitespace-nowrap">{armor.基本分}</td><td className="p-2 whitespace-nowrap">{armor.特性名称}</td><td className="p-2 whitespace-nowrap">{armor.描述}</td></tr>
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
