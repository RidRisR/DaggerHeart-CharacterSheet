/**
 * 武器调整值提供者
 *
 * 从主武器和副武器中收集调整值声明
 */

import type { IModifierProvider } from '../provider-interface'
import type { Modifier, ModifierDeclaration } from '../types'
import { ModifierSourceType, ModifierType } from '../types'
import type { SheetData } from '@/lib/sheet-data'
import { primaryWeapons } from '@/data/list/primary-weapon'
import { secondaryWeapons } from '@/data/list/secondary-weapon'

export class WeaponModifierProvider implements IModifierProvider {
  readonly name = 'WeaponProvider'

  getModifiers(sheetData: SheetData): Modifier[] {
    const modifiers: Modifier[] = []

    // 收集主武器的调整值
    if (sheetData.primaryWeaponName) {
      const weapon = primaryWeapons.find(w => w.名称 === sheetData.primaryWeaponName)
      if (weapon?.modifiers) {
        modifiers.push(...this.convertDeclarations(
          weapon.modifiers,
          ModifierSourceType.Weapon,
          weapon.名称
        ))
      }
    }

    // 收集副武器的调整值
    if (sheetData.secondaryWeaponName) {
      const weapon = secondaryWeapons.find(w => w.名称 === sheetData.secondaryWeaponName)
      if (weapon?.modifiers) {
        modifiers.push(...this.convertDeclarations(
          weapon.modifiers,
          ModifierSourceType.Weapon,
          weapon.名称
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
