/**
 * 护甲调整值提供者
 *
 * 从护甲数据中收集调整值声明
 */

import type { IModifierProvider } from '../provider-interface'
import type { Modifier, ModifierDeclaration } from '../types'
import { ModifierSourceType, ModifierType } from '../types'
import type { SheetData } from '@/lib/sheet-data'
import { armorItems } from '@/data/list/armor'

export class ArmorModifierProvider implements IModifierProvider {
  readonly name = 'ArmorProvider'

  getModifiers(sheetData: SheetData): Modifier[] {
    const modifiers: Modifier[] = []

    if (sheetData.armorName) {
      const armor = armorItems.find(a => a.名称 === sheetData.armorName)
      if (armor?.modifiers) {
        modifiers.push(...this.convertDeclarations(
          armor.modifiers,
          ModifierSourceType.Armor,
          armor.名称
        ))
      }
    }

    return modifiers
  }

  /**
   * 将数据源的声明转换为运行时 Modifier
   *
   * @private
   */
  private convertDeclarations(
    declarations: ModifierDeclaration[],
    sourceType: ModifierSourceType,
    sourceName: string
  ): Modifier[] {
    return declarations.map((decl, index) => ({
      id: `${sourceType}-${sourceName}-${index}`,
      attribute: decl.attribute,
      sourceType,
      sourceName,
      modifierType: decl.type as ModifierType,
      value: decl.value,
      description: decl.description
    }))
  }
}
