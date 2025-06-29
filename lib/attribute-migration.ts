import type { SheetData, AttributeValue } from "./sheet-data";

/**
 * 迁移属性数据，确保包含施法标记字段
 * 这个函数处理向后兼容性，为旧存档添加缺失的spellcasting字段
 */
export function migrateAttributeData(data: SheetData): SheetData {
    const attributeKeys = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'] as const;

    const migratedData = { ...data };

    attributeKeys.forEach(key => {
        const attrValue = migratedData[key];
        if (attrValue && typeof attrValue === 'object' && 'checked' in attrValue && 'value' in attrValue) {
            // 如果是有效的AttributeValue但缺少spellcasting字段，则添加默认值
            if (!('spellcasting' in attrValue)) {
                (migratedData[key] as AttributeValue).spellcasting = false;
            }
        }
    });

    return migratedData;
}

/**
 * 检查属性数据是否需要迁移
 */
export function needsAttributeMigration(data: SheetData): boolean {
    const attributeKeys = ['agility', 'strength', 'finesse', 'instinct', 'presence', 'knowledge'] as const;

    return attributeKeys.some(key => {
        const attrValue = data[key];
        return attrValue &&
            typeof attrValue === 'object' &&
            'checked' in attrValue &&
            'value' in attrValue &&
            !('spellcasting' in attrValue);
    });
}
