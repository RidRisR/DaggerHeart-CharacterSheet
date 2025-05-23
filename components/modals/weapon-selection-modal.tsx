"use client"
import { primaryWeapons } from "@/data/list/primary-weapon";
import { secondaryWeapons } from "@/data/list/secondary-weapon";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMemo, useEffect } from 'react';

interface WeaponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (weaponId: string, weaponType: 'primary' | 'secondary') => void;
  title: string;
  weaponSlotType: "primary" | "secondary" | "inventory";
}

interface Weapon {
  名称: string;
  等级: string;
  检定: string;
  属性: string;
  范围: string;
  伤害: string;
  负荷: string;
  特性名称: string;
  描述: string;
  id: string;
  weaponType: "primary" | "secondary";
}

export function WeaponSelectionModal({ isOpen, onClose, onSelect, title, weaponSlotType }: WeaponModalProps) {
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

  if (!isOpen) return null;

  const availableWeapons: Weapon[] = useMemo(() => {
    let weapons: Weapon[] = [];
    if (weaponSlotType === "primary" || weaponSlotType === "inventory") {
      weapons = weapons.concat(
        primaryWeapons.map((w) => ({ ...w, id: w.名称, weaponType: "primary" }))
      );
    }
    if (weaponSlotType === "secondary" || weaponSlotType === "inventory") {
      weapons = weapons.concat(
        secondaryWeapons.map((w) => ({ ...w, id: w.名称, weaponType: "secondary" }))
      );
    }
    return weapons;
  }, [weaponSlotType]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <ScrollArea className="h-[calc(80vh-8rem)]">
          <div className="p-2">
            <table className="w-full border-collapse min-w-[max-content]">
              <thead className="bg-gray-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left whitespace-nowrap">等级</th>
                  <th className="p-2 text-left whitespace-nowrap">名称</th>
                  <th className="p-2 text-left whitespace-nowrap">类型</th>
                  <th className="p-2 text-left whitespace-nowrap">属性</th>
                  <th className="p-2 text-left whitespace-nowrap">负荷</th>
                  <th className="p-2 text-left whitespace-nowrap">范围</th>
                  <th className="p-2 text-left whitespace-nowrap">检定</th>
                  <th className="p-2 text-left whitespace-nowrap">伤害</th>
                  <th className="p-2 text-left whitespace-nowrap">特性</th>
                  <th className="p-2 text-left whitespace-nowrap">描述</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                  onClick={() => onSelect("none", "primary")}
                >
                  <td className="p-2 whitespace-nowrap" colSpan={10}>
                    --清除选择--
                  </td>
                </tr>
                {availableWeapons.map((weapon) => (
                  <tr
                    key={weapon.id}
                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => onSelect(weapon.id, weapon.weaponType)}
                  >
                    <td className="p-2 whitespace-nowrap">{weapon.等级}</td>
                    <td className="p-2 whitespace-nowrap">{weapon.名称}</td>
                    <td className="p-2 whitespace-nowrap">{weapon.weaponType === "primary" ? "主武器" : "副武器"}</td>
                    <td className="p-2 whitespace-nowrap">{weapon.属性}</td>
                    <td className="p-2 whitespace-nowrap">{weapon.负荷}</td>
                    <td className="p-2 whitespace-nowrap">{weapon.范围}</td>
                    <td className="p-2 whitespace-nowrap">{weapon.检定}</td>
                    <td className="p-2 whitespace-nowrap">{weapon.伤害}</td>
                    <td className="p-2 whitespace-nowrap">{weapon.特性名称}</td>
                    <td className="p-2 whitespace-nowrap">{weapon.描述}</td>
                  </tr>
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
