import { SheetData } from './sheet-data';

/**
 * 遍历 SheetData 中的所有卡牌，确保每张卡牌都有一个 values 对象。
 * 如果卡牌没有 values 字段，就为其初始化为 {}。
 * @param sheetData 要迁移的角色数据
 * @returns 迁移后的角色数据
 */
export function migrateSheetData(sheetData: SheetData): SheetData {
    const migrateCards = (cards: any[] | undefined) => {
        if (!cards) return [];
        return cards.map(card => ({
            ...card,
            values: card.values || {},
        }));
    };

    return {
        ...sheetData,
        cards: migrateCards(sheetData.cards),
        inventory_cards: migrateCards(sheetData.inventory_cards),
    };
}
