"use client"
import { weaponData } from "@/data/game-data"
import { ScrollArea } from "@/components/ui/scroll-area"

interface WeaponModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (weaponId: string) => void
  title: string
}

export function WeaponSelectionModal({ isOpen, onClose, onSelect, title }: WeaponModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <ScrollArea className="h-[calc(80vh-8rem)]">
          <div className="p-2">
            <table className="w-full border-collapse">
              <thead className="bg-gray-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left">名称</th>
                  <th className="p-2 text-left">等级</th>
                  <th className="p-2 text-left">判定</th>
                  <th className="p-2 text-left">属性</th>
                  <th className="p-2 text-left">范围</th>
                  <th className="p-2 text-left">伤害</th>
                  <th className="p-2 text-left">负荷</th>
                  <th className="p-2 text-left">特性</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                  onClick={() => onSelect("none")}
                >
                  <td className="p-2" colSpan={7}>
                    --清除选择--
                  </td>
                </tr>
                {weaponData.map((weapon) => (
                  <tr
                    key={weapon.id}
                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => onSelect(weapon.id)}
                  >
                    <td className="p-2">{weapon.name}</td>
                    <td className="p-2">{weapon.trait.split(",")[0]}</td>
                    <td className="p-2">物理</td>
                    <td className="p-2">{weapon.trait.includes("Ranged") ? "远距离" : "近战"}</td>
                    <td className="p-2">{weapon.damage}</td>
                    <td className="p-2">{weapon.trait.includes("Two-handed") ? "双手" : "单手"}</td>
                    <td className="p-2">{weapon.feature}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
