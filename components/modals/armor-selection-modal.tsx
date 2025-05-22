"use client"
import { armorItems } from "@/data/list/armor" // Changed import
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area" // Ensure ScrollBar is imported

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
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <ScrollArea className="h-[calc(80vh-8rem)]">
          <div className="p-2"> {/* Removed overflow-x-auto */}
            <table className="w-full border-collapse min-w-[max-content]"> {/* Added min-w-[max-content] */}
              <thead className="bg-gray-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left whitespace-nowrap">名称</th> {/* Added whitespace-nowrap */}
                  <th className="p-2 text-left whitespace-nowrap">等级</th> {/* Added whitespace-nowrap */}
                  <th className="p-2 text-left whitespace-nowrap">伤害阈值</th> {/* Added whitespace-nowrap */}
                  <th className="p-2 text-left whitespace-nowrap">基本分</th> {/* Added whitespace-nowrap */}
                  <th className="p-2 text-left whitespace-nowrap">特性名称</th> {/* Added whitespace-nowrap */}
                  <th className="p-2 text-left whitespace-nowrap">描述</th> {/* Added whitespace-nowrap */}
                </tr>
              </thead>
              <tbody>
                <tr
                  className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                  onClick={() => onSelect("none")}
                >
                  <td className="p-2 whitespace-nowrap" colSpan={6}>{/* Added whitespace-nowrap */}
                    --清除选择--
                  </td>
                </tr>
                {processedArmorItems.map((armor) => (
                  <tr
                    key={armor.id} // Use the added id
                    className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
                    onClick={() => onSelect(armor.id)} // Use the added id
                  >
                    {/* Updated to use Chinese keys */}
                    <td className="p-2 whitespace-nowrap">{armor.名称}</td>{/* Added whitespace-nowrap */}
                    <td className="p-2 whitespace-nowrap">{armor.等级}</td>{/* Added whitespace-nowrap */}
                    <td className="p-2 whitespace-nowrap">{armor.伤害阈值}</td>{/* Added whitespace-nowrap */}
                    <td className="p-2 whitespace-nowrap">{armor.基本分}</td>{/* Added whitespace-nowrap */}
                    <td className="p-2 whitespace-nowrap">{armor.特性名称}</td>{/* Added whitespace-nowrap */}
                    <td className="p-2 whitespace-nowrap">{armor.描述}</td>{/* Added whitespace-nowrap */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" /> {/* Added horizontal scrollbar */}
        </ScrollArea>
      </div>
    </div>
  )
}
