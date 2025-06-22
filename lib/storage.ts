import {
  getStandardCardsByTypeAsync,
  CardType, // Import CardType
} from "@/card";
import { createEmptyCard } from "@/card/card-types"; // Import createEmptyCard
import type { SheetData, SheetCardReference } from "./sheet-data"; // Ensure SheetCardReference is imported if not already
import { defaultSheetData } from "./default-sheet-data";

// Moved getCardClass to module scope - now async
const getCardClass = async (cardId: string | undefined, cardType: CardType): Promise<string> => {
  if (!cardId) return '()';
  try {
    const cardsOfType = await getStandardCardsByTypeAsync(cardType);
    const card = cardsOfType.find((c) => c.id === cardId);
    // Assuming card.class is a string. If it can be a number, convert to String.
    return card && card.class ? String(card.class) : '()';
  } catch (error) {
    console.error('Error getting card class:', error);
    return '()';
  }
};

/**
 * 角色表数据存储和读取工具
 * 使用浏览器的 localStorage 来保存角色数据
 */

const STORAGE_KEY = "charactersheet_data"

// 保存角色数据到 localStorage
export function saveCharacterData(data: SheetData): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  } catch (error) {
    console.error("保存角色数据失败:", error)
  }
}

// 从 localStorage 读取角色数据
export function loadCharacterData(): SheetData | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const savedData = localStorage.getItem(STORAGE_KEY)
      return savedData ? (JSON.parse(savedData) as SheetData) : null
    }
    return null
  } catch (error) {
    console.error("读取角色数据失败:", error)
    return null
  }
}

// 合并部分数据到已保存的数据中
export function mergeAndSaveCharacterData(partialData: Partial<SheetData>): void {
  try {
    const existingData = loadCharacterData() || {} as SheetData
    const mergedData = { ...existingData, ...partialData }
    saveCharacterData(mergedData as SheetData)
  } catch (error) {
    console.error("合并角色数据失败:", error)
  }
}

// 清除保存的角色数据
export function clearCharacterData(): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.error("清除角色数据失败:", error)
  }
}

// 导出角色数据为JSON文件
export async function exportCharacterData(formData: SheetData): Promise<void> {
  try {
    if (!formData) {
      alert("没有可导出的角色数据");
      return;
    }

    // getCardClass is now defined at module scope and is async

    const name = formData.name || '()';
    // Use ...Ref.id for getting card class - now with await
    const ancestry1Class = await getCardClass(formData.ancestry1Ref?.id, CardType.Ancestry);
    const professionClass = await getCardClass(formData.professionRef?.id, CardType.Profession);
    const ancestry2Class = await getCardClass(formData.ancestry2Ref?.id, CardType.Ancestry);
    const communityClass = await getCardClass(formData.communityRef?.id, CardType.Community);
    const level = formData.level ? String(formData.level) : '()';

    const exportFileDefaultName = `${name}-${professionClass}-${ancestry1Class}-${ancestry2Class}-${communityClass}-LV${level}.json`;

    const dataStr = JSON.stringify(formData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  } catch (error) {
    console.error("导出角色数据失败:", error)
    alert("导出角色数据失败")
  }
}

// 从JSON文件导入角色数据
export function importCharacterData(file: File): Promise<SheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error("读取文件失败")
        }
        const data = JSON.parse(event.target.result as string) as SheetData
        saveCharacterData(data)
        resolve(data)
      } catch (error) {
        console.error("导入角色数据失败:", error)
        reject(error)
      }
    }

    reader.onerror = (error) => {
      reject(error)
    }

    reader.readAsText(file)
  })
}

// 已移除 FOCUSED_CARDS_KEY 和相关的聚焦卡牌函数
// 聚焦功能现在由双卡组系统直接管理

// Function to generate a printable name for the PDF
export function generatePrintableName(formData: SheetData): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`

  const characterName = formData.name || "UnnamedCharacter"
  // Use professionRef.name directly for a more user-friendly filename
  const professionName = formData.professionRef?.name || "NoProfession"

  return `DH_${characterName}_${professionName}_${dateStr}.pdf`
}

// ===== 多角色系统导入导出兼容函数 =====
// 这些函数与原有函数保持相同的API，但用于多角色系统

export function exportCharacterDataForMultiCharacter(data: SheetData): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.name || "character"}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function importCharacterDataForMultiCharacter(file: File): Promise<SheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // 基本验证
        if (!data || typeof data !== 'object') {
          throw new Error('无效的角色数据格式');
        }
        
        // 向后兼容：为旧存档添加 inventory_cards 字段
        if (!data.inventory_cards) {
          console.log('[Import] Adding inventory_cards to imported data');
          data.inventory_cards = Array(20).fill(0).map(() => createEmptyCard());
        }
        
        resolve(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '文件解析失败';
        reject(new Error(`导入失败：${errorMessage}`));
      }
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}
