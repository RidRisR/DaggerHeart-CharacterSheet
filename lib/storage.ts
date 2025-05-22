/**
 * 角色表数据存储和读取工具
 * 使用浏览器的 localStorage 来保存角色数据
 */

const STORAGE_KEY = "charactersheet_data"

// 保存角色数据到 localStorage
export function saveCharacterData(data: any): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  } catch (error) {
    console.error("保存角色数据失败:", error)
  }
}

// 从 localStorage 读取角色数据
export function loadCharacterData(): any {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const savedData = localStorage.getItem(STORAGE_KEY)
      return savedData ? JSON.parse(savedData) : null
    }
    return null
  } catch (error) {
    console.error("读取角色数据失败:", error)
    return null
  }
}

// 合并部分数据到已保存的数据中
export function mergeAndSaveCharacterData(partialData: any): void {
  try {
    const existingData = loadCharacterData() || {}
    const mergedData = { ...existingData, ...partialData }
    saveCharacterData(mergedData)
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
export function exportCharacterData(safeFormData: any): void {
  try {
    const data = loadCharacterData()
    if (!data) {
      alert("没有可导出的角色数据")
      return
    }

    const dataStr = JSON.stringify(data, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`

    const exportFileDefaultName = `character-${new Date().toISOString().slice(0, 10)}.json`

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", exportFileDefaultName)
    linkElement.click()
  } catch (error) {
    console.error("导出角色数据失败:", error)
    alert("导出角色数据失败")
  }
}

// 从JSON文件导入角色数据
export function importCharacterData(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error("读取文件失败")
        }

        const data = JSON.parse(event.target.result as string)
        saveCharacterData(data)
        resolve(true)
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
