import {
  getStandardCardsByTypeAsync,
  CardType, // Import CardType
} from "@/card";
import type { SheetData } from "./sheet-data";

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

// Function to generate a printable name for the PDF
export function generatePrintableName(formData: SheetData): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`

  const characterName = formData.name || "UnnamedCharacter"
  // Use professionRef.name directly for a more user-friendly filename
  const professionName = formData.professionRef?.name || "NoProfession"

  return `DH_${characterName}_${professionName}_${dateStr}.pdf`
}
