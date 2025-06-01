import {
  getStandardCardsByType,
  CardType, // Import CardType
} from "@/data/card";
import type { SheetData, SheetCardReference } from "./sheet-data"; // Ensure SheetCardReference is imported if not already
import { defaultSheetData } from "./default-sheet-data";

// Moved getCardClass to module scope
const getCardClass = (cardId: string | undefined, cardType: CardType): string => {
  if (!cardId) return '()';
  const cardsOfType = getStandardCardsByType(cardType);
  const card = cardsOfType.find((c) => c.id === cardId);
  // Assuming card.class is a string. If it can be a number, convert to String.
  return card && card.class ? String(card.class) : '()';
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
export function exportCharacterData(formData: SheetData): void {
  try {
    if (!formData) {
      alert("没有可导出的角色数据");
      return;
    }

    // getCardClass is now defined at module scope

    const name = formData.name || '()';
    // Use ...Ref.id for getting card class
    const ancestry1Class = getCardClass(formData.ancestry1Ref?.id, CardType.Ancestry);
    const professionClass = getCardClass(formData.professionRef?.id, CardType.Profession);
    const ancestry2Class = getCardClass(formData.ancestry2Ref?.id, CardType.Ancestry);
    const communityClass = getCardClass(formData.communityRef?.id, CardType.Community);
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

const SELECTED_CARDS_KEY = "selected_card_ids";

export function saveSelectedCardIds(cardIds: string[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(SELECTED_CARDS_KEY, JSON.stringify(cardIds));
    }
  } catch (error) {
    console.error("保存选中卡牌ID失败:", error);
  }
}

export function loadSelectedCardIds(): string[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const savedData = localStorage.getItem(SELECTED_CARDS_KEY);
      return savedData ? JSON.parse(savedData) : [];
    }
    return [];
  } catch (error) {
    console.error("读取选中卡牌ID失败:", error);
    return [];
  }
}

const FOCUSED_CARDS_KEY = "focused_card_ids";

// Save focused card IDs to localStorage
export function saveFocusedCardIds(cardIds: string[]): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(FOCUSED_CARDS_KEY, JSON.stringify(cardIds));
      // Dispatch a custom event to notify other components of the change
      window.dispatchEvent(new CustomEvent('focusedCardsChanged'));
    }
  } catch (error) {
    console.error("保存聚焦卡牌ID失败:", error);
  }
}

// Load focused card IDs from localStorage
export function loadFocusedCardIds(): string[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const savedData = localStorage.getItem(FOCUSED_CARDS_KEY);
      return savedData ? JSON.parse(savedData) : [];
    }
    return [];
  } catch (error) {
    console.error("读取聚焦卡牌ID失败:", error);
    return [];
  }
}

export function loadPersistentFormData(): SheetData | null {
  if (typeof window !== "undefined") {
    const savedData = localStorage.getItem("persistentFormData")
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as SheetData;
        // Ensure all ...Ref fields are initialized after loading
        return {
          ...defaultSheetData, // Start with defaults
          ...parsedData,      // Override with saved data
          professionRef: parsedData.professionRef || defaultSheetData.professionRef,
          ancestry1Ref: parsedData.ancestry1Ref || defaultSheetData.ancestry1Ref,
          ancestry2Ref: parsedData.ancestry2Ref || defaultSheetData.ancestry2Ref,
          communityRef: parsedData.communityRef || defaultSheetData.communityRef,
          subclassRef: parsedData.subclassRef || defaultSheetData.subclassRef,
        };
      } catch (error) {
        console.error("Error parsing persistent form data from localStorage:", error)
        return null
      }
    }
  }
  return null
}

// Function to generate a printable name for the PDF
export function generatePrintableName(formData: SheetData): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`

  const characterName = formData.name || "UnnamedCharacter"
  // Use professionRef.name directly for a more user-friendly filename
  const professionName = formData.professionRef?.name || "NoProfession"

  return `DH_${characterName}_${professionName}_${dateStr}.pdf`
}
