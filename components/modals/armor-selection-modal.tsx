"use client"
import { armorData } from "@/data/game-data"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ArmorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (armorId: string) => void
  title: string
}

export function ArmorSelectionModal({ isOpen, onClose, onSelect, title }: ArmorModalProps) {
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
                  <th className="p-2 text-left">基础值</th>
                  <th className="p-2 text-left">特性</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                  onClick={() => onSelect("none")}
                >
                  <td className="p-2" colSpan={3}>
                    --清除选择--
                  </td>
                </tr>
                {armorData.map((armor) => (
                  <tr
                    key={armor.id}
                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => onSelect(armor.id)}
                  >
                    <td className="p-2">{armor.name}</td>
                    <td className="p-2">{armor.baseScore}</td>
                    <td className="p-2">{armor.feature}</td>
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
